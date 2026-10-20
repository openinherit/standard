#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-release-wiring.mjs.
 *
 * Each case copies the real workflows, package manifests and release.sh into a
 * temporary directory, mutates one of them, and runs the check there. Covers A6
 * (the contents check runs before the first publish), A7 (the kit's release zip
 * carries every path its npm tarball packs), A8-A10 (the dist-tag and the
 * support window are enforced, and the policy says what the machinery does)
 * and A1, the assertion the rest depend on. Every case is shown going red, so a
 * green means something.
 */
import { spawnSync } from 'child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-release-wiring.mjs');
const work = mkdtempSync(join(tmpdir(), 'release-wiring-'));
const PUBLISH = '.github/workflows/publish.yml';
const RELEASE = 'scripts/release.sh';
const KIT_MANIFEST = 'packages/conformance/package.json';
const POLICY_DOC = 'docs/policies/versioning.md';
const POLICY_STEP = /\n {6}- name: Refuse a release the support window does not allow\n {8}run: node scripts\/release-policy\.mjs --version "\$\{GITHUB_REF_NAME#v\}"\n/;
const CHECK_STEP = /\n {6}- name: Refuse to publish a tarball that is not the standard\n {8}run: node scripts\/check-release-contents\.mjs --tag "\$\{GITHUB_REF_NAME\}"\n/;

let n = 0;
function tree(mutate = (s) => s) {
  const t = join(work, `tree-${++n}`);
  cpSync(join(ROOT, '.github/workflows'), join(t, '.github/workflows'), { recursive: true });
  for (const dir of readdirSync(join(ROOT, 'packages'))) {
    const manifest = join(ROOT, 'packages', dir, 'package.json');
    if (!existsSync(manifest)) continue;
    mkdirSync(join(t, 'packages', dir), { recursive: true });
    cpSync(manifest, join(t, 'packages', dir, 'package.json'));
  }
  mkdirSync(join(t, 'scripts'), { recursive: true });
  cpSync(join(ROOT, RELEASE), join(t, RELEASE));
  mkdirSync(join(t, 'docs/policies'), { recursive: true });
  cpSync(join(ROOT, POLICY_DOC), join(t, POLICY_DOC));
  const p = join(t, PUBLISH);
  const before = readFileSync(p, 'utf8');
  const after = mutate(before);
  writeFileSync(p, after);
  return t;
}
/** A tree whose release.sh is mutated instead of the publish workflow. */
function releaseTree(mutate) {
  const t = tree();
  const p = join(t, RELEASE);
  const before = readFileSync(p, 'utf8');
  const after = mutate(before);
  if (after === before) throw new Error('fixture drift: the release.sh mutation changed nothing');
  writeFileSync(p, after);
  return t;
}
/** A tree whose versioning policy is mutated. */
function docTree(mutate) {
  const t = tree();
  const p = join(t, POLICY_DOC);
  const before = readFileSync(p, 'utf8');
  const after = mutate(before);
  if (after === before) throw new Error('fixture drift: the versioning.md mutation changed nothing');
  writeFileSync(p, after);
  return t;
}
/** Remove `needle` once, and refuse to pass silently if it is not there. */
const once = (needle, by = '') => (s) => {
  if (!s.includes(needle)) throw new Error(`fixture drift: ${JSON.stringify(needle)} not found`);
  return s.replace(needle, by);
};
const withoutPolicyStep = (s) => {
  if (!POLICY_STEP.test(s)) throw new Error('fixture drift: the release-policy step is not where this test expects it');
  return s.replace(POLICY_STEP, '\n');
};
/** A tree whose conformance package.json `files` list gains an entry. */
function kitFilesTree(extra) {
  const t = tree();
  const p = join(t, KIT_MANIFEST);
  const pkg = JSON.parse(readFileSync(p, 'utf8'));
  pkg.files.push(extra);
  writeFileSync(p, JSON.stringify(pkg, null, 2));
  return t;
}
const KIT_ZIP = /^(\s*zip\b[^\n]*openinherit-conformance-[^\n]*)$/m;
const dropFromKitZip = (word) => (s) => s.replace(KIT_ZIP, (line) => line.replace(` ${word}`, ''));
const withoutStep = (s) => {
  if (!CHECK_STEP.test(s)) throw new Error('fixture drift: the contents-check step is not where this test expects it');
  return s.replace(CHECK_STEP, '\n');
};

const cases = [
  ['the real publish workflow', tree(), 0, null],
  ['the contents check is removed', tree(withoutStep), 1, 'A6'],
  ['the contents check is commented out', tree((s) => s.replace('run: node scripts/check-release-contents.mjs', '# run: node scripts/check-release-contents.mjs')), 1, 'A6'],
  ['the contents check runs without --tag', tree((s) => s.replace(' --tag "${GITHUB_REF_NAME}"', '')), 1, 'A6'],
  ['the contents check moves after the first publish', tree((s) => {
    const match = s.match(CHECK_STEP);
    return withoutStep(s).trimEnd() + match[0].replace(/^\n/, '\n\n');
  }), 1, 'A6'],
  ['the workflow no longer fires on a tag', tree((s) => s.replace(/- "v\*"/, '- "release-*"')), 1, 'A1'],
  ['the release zip of the kit leaves out its manifest', releaseTree(dropFromKitZip('manifest.json')), 1, 'A7'],
  ['the release zip of the kit leaves out its test documents', releaseTree(dropFromKitZip('estate/')), 1, 'A7'],
  ['the kit gains a packed path the release zip does not carry', kitFilesTree('new-dir/'), 1, 'A7'],
  ['the kit zip line is commented out', releaseTree((s) => s.replace(KIT_ZIP, (line) => `# ${line.trimStart()}`)), 1, 'A7'],
  ['a publish step loses --tag latest', tree(once('publish --tag latest --provenance', 'publish --provenance')), 1, 'A8'],
  ['a publish step uses another dist-tag', tree(once('publish --tag latest --provenance', 'publish --tag next --provenance')), 1, 'A8'],
  ['the release-policy step is removed', tree(withoutPolicyStep), 1, 'A9'],
  ['the release-policy step moves after the first publish', tree((s) => {
    const match = s.match(POLICY_STEP);
    if (!match) throw new Error('fixture drift: the release-policy step is not where this test expects it');
    return withoutPolicyStep(s).trimEnd() + match[0].replace(/^\n/, '\n\n');
  }), 1, 'A9'],
  ['release.sh stops running the release policy', releaseTree((s) => s.replace(/^([^#\n]*node[^\n]*scripts\/release-policy\.mjs)/m, '# $1')), 1, 'A9'],
  ['the policy loses its support window', docTree(once('## Support window', '## Support')), 1, 'A10'],
  ['the policy loses its distribution tags', docTree(once('## Distribution tags', '## Tags')), 1, 'A10'],
  ['the policy stops naming the dist-tag', docTree((s) => s.replaceAll('`latest`', '`stable`')), 1, 'A10'],
  ['release.sh is gone', (() => { const t = tree(); rmSync(join(t, RELEASE)); return t; })(), 1, 'A7'],
];

let failed = 0;
for (const [name, cwd, want, rule] of cases) {
  const r = spawnSync(process.execPath, [GATE], { cwd, encoding: 'utf8' });
  const fired = [...new Set([...r.stderr.matchAll(/\[(A\d+)\]/g)].map((m) => m[1]))];
  const rightRule = !rule || fired.includes(rule);
  if (r.status === want && rightRule) {
    console.log(`  ok   ${name} (exit ${want})`);
  } else {
    failed++;
    console.log(`  FAIL ${name}: expected exit ${want}${rule ? ` with ${rule}` : ''}, got ${r.status} (fired: ${fired.join(', ') || 'none'})\n${r.stdout}${r.stderr}`);
  }
}
rmSync(work, { recursive: true, force: true });
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
