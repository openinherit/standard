#!/usr/bin/env node
/**
 * Lockstep gate: docs/policies/conformance-declaration.md ↔ v3/conformance-declaration.json.
 *
 * The policy is what an implementer reads to write a declaration, so it has to
 * describe the schema that will judge it. Nothing tied the two together: the
 * policy pointed at a v2 URL removed in 6.6.0, left two schema fields out of its
 * tables, and had no way to say which document root (estate or catalogue) a
 * declaration claims.
 *
 * Checks:
 *   1. the schema declares `root`, with both document roots as values
 *   2. every top-level schema property has a row in the policy's field tables
 *   3. every `root` value has a row in the policy
 *   4. the policy cites the schema's $id, and no v1/v2 schema URL or path
 *   5. every declaration example in the policy validates against the schema
 *
 * Exit 0 in step · 1 drift (each finding printed) · 2 cannot answer (a file is
 * missing or unreadable). Never read 2 as clear.
 *
 * Usage: node scripts/check-conformance-declaration-policy.mjs [--schema <path>] [--policy <path>]
 */
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCUMENT_ROOTS = ['estate', 'catalogue'];

// Everything that can stop the gate from answering exits 2, never 1: a 1 must
// always come with findings.
const cannotAnswer = (why) => {
  console.error(`CANNOT ANSWER — ${why}`);
  process.exit(2);
};
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const value = process.argv[i + 1];
  if (!value || value.startsWith('--')) cannotAnswer(`${name} needs a path`);
  return resolve(value);
};
const schemaPath = arg('--schema', join(ROOT, 'v3/conformance-declaration.json'));
const policyPath = arg('--policy', join(ROOT, 'docs/policies/conformance-declaration.md'));

let schema, policy, ajv, validate;
try {
  schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  policy = readFileSync(policyPath, 'utf8');
  ajv = new Ajv({ allErrors: true, strict: false, validateFormats: true });
  addFormats(ajv);
  const commonDir = join(ROOT, 'v3/common');
  for (const f of readdirSync(commonDir).filter((f) => f.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(join(commonDir, f), 'utf8'));
    if (s.$id) ajv.addSchema(s);
  }
  validate = ajv.compile(schema);
} catch (e) {
  cannotAnswer(e.message);
}

const findings = [];
const tableRow = (key) => new RegExp('^\\|\\s*`' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`\\s*\\|', 'm');

// 1. The capability itself
const rootEnum = schema.properties?.root?.enum ?? [];
for (const r of DOCUMENT_ROOTS) {
  if (!rootEnum.includes(r)) findings.push(`schema: root cannot name the '${r}' document root`);
}

// 2 + 3. Every field and every root value is documented
for (const key of Object.keys(schema.properties ?? {})) {
  if (!tableRow(key).test(policy)) findings.push(`policy: no table row for schema property \`${key}\``);
}
for (const value of rootEnum) {
  if (!tableRow(value).test(policy)) findings.push(`policy: no table row for root value \`${value}\``);
}

// 4. Points at the schema that exists
if (!policy.includes(schema.$id)) findings.push(`policy: does not cite the schema $id ${schema.$id}`);
// Any v1/v2 path segment: a URL, a bare path, a `code` span or a [link](target)
for (const m of policy.matchAll(/(?<![\w-])(v[12]\/[\w./-]*)/g)) {
  findings.push(`policy: cites removed path ${m[1]}`);
}

// 5. Every example declaration validates
const examples = [...policy.matchAll(/```json\n([\s\S]*?)```/g)]
  .map((m) => m[1])
  .filter((block) => block.includes('"implementation"'));
if (examples.length === 0) findings.push('policy: carries no example declaration');
examples.forEach((block, i) => {
  let doc;
  try {
    doc = JSON.parse(block);
  } catch (e) {
    findings.push(`policy: example ${i + 1} is not valid JSON — ${e.message}`);
    return;
  }
  if (!validate(doc)) {
    findings.push(`policy: example ${i + 1} (${doc.implementation}) fails the schema — ${ajv.errorsText(validate.errors)}`);
  }
});

if (findings.length) {
  console.error(`✗ conformance-declaration policy is out of step with its schema — ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`✓ conformance-declaration policy in step — ${Object.keys(schema.properties).length} properties, roots [${rootEnum.join(', ')}], ${examples.length} example(s) valid`);
