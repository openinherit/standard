#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-release-wiring.mjs.
 *
 * Each case copies the real workflows and package manifests into a temporary
 * directory, mutates the publish workflow, and runs the check there. Covers A6
 * (the contents check runs before the first publish) and A1, the assertion the
 * rest depend on. Every case is shown going red, so a green means something.
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
  const p = join(t, PUBLISH);
  const before = readFileSync(p, 'utf8');
  const after = mutate(before);
  writeFileSync(p, after);
  return t;
}
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
];

let failed = 0;
for (const [name, cwd, want, rule] of cases) {
  const r = spawnSync(process.execPath, [GATE], { cwd, encoding: 'utf8' });
  const fired = [...new Set([...r.stderr.matchAll(/\[(A\d)\]/g)].map((m) => m[1]))];
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
