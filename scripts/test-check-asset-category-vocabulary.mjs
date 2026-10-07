#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-asset-category-vocabulary.mjs.
 *
 * Each case builds a temporary tree holding every file the gate reads (the
 * register and every file it names). Unchanged files are symlinks to the real
 * ones, so a case costs almost nothing. The case then mutates one file and
 * asserts the exit code and the rule that fired. That proves every rule can go
 * red, so a green from the gate means something.
 */
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-asset-category-vocabulary.mjs');
const REGISTER = 'scripts/data/asset-category-copies.json';
const reg = JSON.parse(readFileSync(join(ROOT, REGISTER), 'utf8'));
const FILES = [
  ...new Set([
    REGISTER,
    reg.source.file,
    reg.source.tests,
    ...reg.routingSchemas.files,
    ...reg.keyed.map((k) => k.file),
    ...reg.consumers.flatMap((c) => [c.file, c.subcategoriesFrom]),
    ...Object.keys(reg.generated.files),
    ...Object.keys(reg.usage.files),
  ]),
];
const base = mkdtempSync(join(tmpdir(), 'asset-category-vocabulary-'));

let n = 0;
const tree = () => {
  const dir = join(base, `t${++n}`);
  for (const f of FILES) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    symlinkSync(join(ROOT, f), join(dir, f));
  }
  return dir;
};
// Replace the symlink at `f` with a real file holding `text`.
const put = (dir, f, text) => {
  const p = join(dir, f);
  try { unlinkSync(p); } catch { /* new file */ }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
};
const text = (f) => readFileSync(join(ROOT, f), 'utf8');
const json = (f) => JSON.parse(text(f));
const editJson = (f, fn) => (dir) => { const d = json(f); fn(d); put(dir, f, JSON.stringify(d, null, 2)); };
const editText = (f, fn) => (dir) => put(dir, f, fn(text(f)));
const ASSET = 'v3/asset.json';
const general = (d) => d.allOf.find((b) => Array.isArray(b.if?.properties?.category?.enum)).if.properties.category;
const run = (dir, extra = []) => spawnSync('node', [GATE, '--root', dir, ...extra], { encoding: 'utf8' });

const cases = [
  ['the real tree is clear', () => {}, 0, 'OK'],

  ['C1 the source enum is missing', editJson(ASSET, (d) => delete d.properties.category.enum), 2, 'CANNOT ANSWER'],
  ['C1 the source enum repeats a value', editJson(ASSET, (d) => d.properties.category.enum.push('art')), 1, 'C1'],

  ['C2 the general branch drops a value', editJson(ASSET, (d) => {
    general(d).enum = general(d).enum.filter((v) => v !== 'wine_spirits');
  }), 1, 'C2 "wine_spirits" is routed to no category schema'],
  ['C2 a value is routed twice', editJson(ASSET, (d) => general(d).enum.push('vehicle')), 1, 'C2 "vehicle" is routed to 2'],
  ['C2 a branch routes a value the enum does not have', editJson(ASSET, (d) => general(d).enum.push('ceramics')), 1, 'C2 "ceramics" is routed but is not in the source'],

  ['C3 category-guidance loses a key', editJson('reference-data/category-guidance.json', (d) => delete d.categories.art), 1, 'C3 reference-data/category-guidance.json'],
  ['C3 enum-descriptions gains a key', editJson('reference-data/enum-descriptions.json', (d) => { d.enums['asset.category'].ceramics = 'x'; }), 1, 'C3 reference-data/enum-descriptions.json'],
  ['C3 local-term-mappings loses a key', editJson('reference-data/local-term-mappings.json', (d) => delete d.mappings.categoryType.other), 1, 'C3 reference-data/local-term-mappings.json'],
  ['C3 a GPC mapping is repeated', editJson('reference-data/gpc-category-mapping.json', (d) => d.mappings.push(d.mappings[0])), 1, 'C3 reference-data/gpc-category-mapping.json'],

  ['C4 brand-registry names an unknown category', editJson('reference-data/brand-registry.json', (d) => { d.brands.ceramics = {}; }), 1, 'C4 reference-data/brand-registry.json'],
  ['C4 the GPC reverse index names an unknown category', editJson('reference-data/gpc-category-mapping.json', (d) => {
    const k = Object.keys(d._reverseIndex).find((x) => Array.isArray(d._reverseIndex[x]));
    d._reverseIndex[k][0].inheritCategory = 'ceramics';
  }), 1, 'C4 reference-data/gpc-category-mapping.json'],

  ['C4b a task names a value that is neither category nor subcategory', editJson('reference-data/agent-task-definitions.json', (d) => {
    d.tasks.identify_item.applicableCategories.push('ceramicz');
  }), 1, 'C4b reference-data/agent-task-definitions.json: "ceramicz"'],
  ['C4b a pinned offender is fixed but still pinned', editJson('reference-data/agent-task-definitions.json', (d) => {
    for (const t of Object.values(d.tasks)) {
      if (t.applicableCategories) t.applicableCategories = t.applicableCategories.map((v) => (v === 'vehicles' ? 'vehicle' : v));
    }
  }), 1, 'RATCHET'],

  ['C5 a vendored bundle drops a value', editText('packages/sdk-go/schemas/inherit-v3-bundled.json', (s) => {
    const d = JSON.parse(s);
    const walk = (o) => {
      if (Array.isArray(o)) {
        const i = o.indexOf('islamic_financial');
        if (i >= 0 && o.length === 16) { o.splice(i, 1); return true; }
        return o.some(walk);
      }
      return o && typeof o === 'object' ? Object.values(o).some(walk) : false;
    };
    walk(d);
    return JSON.stringify(d);
  }), 1, 'C5 packages/sdk-go/schemas/inherit-v3-bundled.json'],
  ['C5 a TypeScript union is stale', editText('generated/typescript/types.gen.ts', (s) => s.replace("| 'islamic_financial' ", '')), 1, 'C5 generated/typescript/types.gen.ts'],
  ['C5 the zod enum is stale', editText('packages/sdk/src/zod/zod.gen.ts', (s) => s.replace("        'islamic_financial',\n", '')), 1, 'C5 packages/sdk/src/zod/zod.gen.ts'],
  ['C5 the Python enum is stale', editText('packages/sdk-python/openinherit/models.py', (s) => s.replace("    islamic_financial = 'islamic_financial'\n", '')), 1, 'C5 packages/sdk-python/openinherit/models.py'],
  ['C5 the OpenAPI bundle is stale', editText('openapi/openapi-bundled.yaml', (s) => s.replace(/\n( +)- islamic_financial\n/, '\n')), 1, 'C5 openapi/openapi-bundled.yaml'],
  ['C5 the generated reference doc is stale', editText('docs/reference/asset.md', (s) => s.replace(', `islamic_financial`', '')), 1, 'C5 docs/reference/asset.md'],
  ['C5 the enum catalogue is stale', editText('docs/releases/enum-reference.md', (s) => s.replace(/\| `islamic_financial` \|[^\n]*\n/, '')), 1, 'C5 docs/releases/enum-reference.md'],
  ['C5 a generated file stops carrying its copies', editText('packages/sdk-python/openinherit/models.py', (s) => s.replace(/class Category\(Enum\):[\s\S]*?\n\n/, '')), 2, 'CANNOT ANSWER'],

  ['C6 the category $comment stops describing a value', editJson(ASSET, (d) => {
    d.properties.category.$comment = d.properties.category.$comment.replace('wine_spirits:', 'wine and spirits:');
  }), 1, 'C6 v3/asset.json: the category $comment does not describe "wine_spirits"'],
  ['C6 a category schema names a retired category', editJson('v3/asset-categories/vehicle.json', (d) => {
    d.$comment = "Use when category is 'pension'.";
  }), 1, 'C6 v3/asset-categories/vehicle.json: names category "pension"'],

  ['C7 a value has no valid test case', editJson('tests/v3/asset/asset.test.json', (d) => {
    d.tests = d.tests.filter((t) => !(t.valid && t.data?.category === 'wine_spirits'));
  }), 1, 'C7 "wine_spirits" has no valid test case'],

  ['C8 a new file copies the vocabulary unregistered', (dir) => put(dir, 'reference-data/new-copy.json', JSON.stringify({ c: ['jewellery_watches'] })), 1, 'C8 reference-data/new-copy.json'],
  ['C8 a registered file has gone', (dir) => unlinkSync(join(dir, 'docs/policies/taxonomy-provenance.md')), 2, 'CANNOT ANSWER'],

  ['an unparsable copy cannot be answered', (dir) => put(dir, 'reference-data/category-guidance.json', '{'), 2, 'CANNOT ANSWER'],
];

let failed = 0;
for (const [name, mutate, wantCode, wantText] of cases) {
  const dir = tree();
  mutate(dir);
  const r = run(dir);
  const out = `${r.stdout}${r.stderr}`;
  const ok = r.status === wantCode && out.includes(wantText);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name} — exit ${r.status}${ok ? '' : ` (want ${wantCode} + ${JSON.stringify(wantText)})\n${out}`}`);
}

// --write regenerates the derived general branch from the source.
{
  const dir = tree();
  editJson(ASSET, (d) => { general(d).enum = general(d).enum.filter((v) => v !== 'wine_spirits'); })(dir);
  const before = run(dir).status;
  const w = run(dir, ['--write']);
  const after = run(dir);
  const fixed = general(JSON.parse(readFileSync(join(dir, ASSET), 'utf8'))).enum;
  const ok = before === 1 && w.status === 0 && after.status === 0 && fixed.includes('wine_spirits')
    && fixed.join() === general(json(ASSET)).enum.join();
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} --write regenerates the general branch — before ${before}, write ${w.status}, after ${after.status}${ok ? '' : `\n${w.stdout}${w.stderr}${run(dir).stderr}`}`);
}

rmSync(base, { recursive: true, force: true });
const total = cases.length + 1;
console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
