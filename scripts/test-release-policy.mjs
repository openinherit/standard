#!/usr/bin/env node
/**
 * Hermetic tests for scripts/release-policy.mjs.
 *
 * The released set is injected (--released-file) or read through a fake npm
 * (NPM_BIN), so no case touches the registry. Every refusal is shown going
 * red, and the "cannot answer" path is shown returning 2, never 0.
 */
import { spawnSync } from 'child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/release-policy.mjs');
const work = mkdtempSync(join(tmpdir(), 'release-policy-'));

const RELEASED = ['1.0.0', '5.9.0', '6.0.0', '6.5.1', '6.6.0'];
const releasedFile = join(work, 'released.json');
writeFileSync(releasedFile, JSON.stringify(RELEASED));

/** A tree with two publishable packages and one private one, and no git. */
function tree() {
  const t = join(work, 'tree');
  for (const [dir, pkg] of [
    ['schema', { name: '@x/schema', version: '0.0.0' }],
    ['sdk', { name: '@x/sdk', version: '0.0.0' }],
    ['internal', { name: '@x/internal', version: '0.0.0', private: true }],
  ]) {
    mkdirSync(join(t, 'packages', dir), { recursive: true });
    writeFileSync(join(t, 'packages', dir, 'package.json'), JSON.stringify(pkg));
  }
  return t;
}
const T = tree();

/** A fake npm whose `view <name> versions --json` behaves as `script` says. */
function fakeNpm(name, body) {
  const p = join(work, name);
  writeFileSync(p, `#!/bin/sh\n${body}\n`);
  chmodSync(p, 0o755);
  return p;
}
const npmOk = fakeNpm('npm-ok', `
case "$2" in
  @x/schema) echo '["6.5.0","6.6.0"]' ;;
  @x/sdk) echo '"6.6.0"' ;;
  *) echo "npm error code E404" >&2; exit 1 ;;
esac`);
const npmNew = fakeNpm('npm-new', `
case "$2" in
  @x/schema) echo '["6.6.0"]' ;;
  *) echo "npm error code E404" 1>&2; echo "npm error 404 Not Found" 1>&2; exit 1 ;;
esac`);
const npmDown = fakeNpm('npm-down', 'echo "npm error code ENOTFOUND" >&2; exit 1');
const npmGarbage = fakeNpm('npm-garbage', `echo '["6.6.0","not-a-version"]'`);
// A release that reached one package and failed before the next: 6.7.0 is on
// @x/schema only. Re-running the publish must be allowed to finish it.
const npmPartial = fakeNpm('npm-partial', `
case "$2" in
  @x/schema) echo '["6.6.0","6.7.0"]' ;;
  *) echo '["6.6.0"]' ;;
esac`);
const npmAsksPrivate = fakeNpm('npm-asks-private', `
case "$2" in
  @x/internal) echo '["99.0.0"]' ;;
  *) echo '["6.6.0"]' ;;
esac`);

function run(args, env = {}) {
  const r = spawnSync('node', [GATE, ...args], {
    encoding: 'utf8',
    cwd: T,
    env: { ...process.env, GIT_DIR: join(work, 'no-git'), ...env },
  });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), stdout: (r.stdout || '').trim() };
}
const injected = (v) => run(['--root', T, '--version', v, '--released-file', releasedFile]);
const viaNpm = (v, npm) => run(['--root', T, '--version', v], { NPM_BIN: npm });

const cases = [
  // name, result, expected exit, text the output must contain
  ['a new patch on the newest release', injected('6.6.1'), 0, 'latest'],
  ['a new minor', injected('6.7.0'), 0, 'latest'],
  ['a new major', injected('7.0.0'), 0, 'latest'],
  ['the version already released', injected('6.6.0'), 1, 'already released'],
  ['a backport patch on an older minor', injected('6.5.2'), 1, 'not newer than 6.6.0'],
  ['a backport patch on the previous major', injected('5.9.1'), 1, 'not newer than 6.6.0'],
  ['a prerelease', injected('7.0.0-rc.1'), 1, 'MAJOR.MINOR.PATCH'],
  ['a tag name instead of a version', injected('v7.0.0'), 1, 'MAJOR.MINOR.PATCH'],
  ['two components', injected('7.0'), 1, 'MAJOR.MINOR.PATCH'],
  ['a leading zero', injected('07.0.0'), 1, 'MAJOR.MINOR.PATCH'],
  ['no --version', run(['--root', T, '--released-file', releasedFile]), 2, 'CANNOT ANSWER'],
  ['an unreadable released file', run(['--root', T, '--version', '7.0.0', '--released-file', join(work, 'absent.json')]), 2, 'CANNOT ANSWER'],
  ['registry: newer than every package', viaNpm('6.6.1', npmOk), 0, 'latest'],
  ['registry: equal to a published version', viaNpm('6.6.0', npmOk), 1, 'already released'],
  ['registry: a never-published package is not an error', viaNpm('6.6.1', npmNew), 0, 'latest'],
  ['registry: unreachable is CANNOT ANSWER, not "nothing released"', viaNpm('99.0.0', npmDown), 2, 'CANNOT ANSWER'],
  ['registry: an unparseable released version', viaNpm('99.0.0', npmGarbage), 2, 'CANNOT ANSWER'],
  ['registry: finishing a release that reached only some packages', viaNpm('6.7.0', npmPartial), 0, 'latest'],
  ['registry: a partial release does not reopen an older version', viaNpm('6.6.0', npmPartial), 1, 'already released'],
  ['registry: nor allow one below it', viaNpm('6.6.1', npmPartial), 1, 'not newer than 6.7.0'],
  ['registry: private packages are not consulted', viaNpm('7.0.0', npmAsksPrivate), 0, 'latest'],
];

let failed = 0;
for (const [name, r, want, text] of cases) {
  const ok = r.status === want && r.out.includes(text);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: exit ${r.status} (want ${want}${text ? `, "${text}"` : ''})`);
  if (!ok) console.log(r.out.split('\n').map((l) => `       ${l}`).join('\n'));
}
// On success the dist-tag is the ONLY thing on stdout, so a workflow can capture it.
const clean = injected('6.6.1');
if (clean.stdout !== 'latest') {
  failed++;
  console.log(`FAIL stdout is exactly the dist-tag: got ${JSON.stringify(clean.stdout)}`);
} else console.log('ok   stdout is exactly the dist-tag');

rmSync(work, { recursive: true, force: true });
console.log(`\nrelease policy: ${cases.length + 1 - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
