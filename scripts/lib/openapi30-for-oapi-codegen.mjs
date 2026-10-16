#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Finish the OpenAPI 3.1 → 3.0 conversion that @apiture/openapi-down-convert
 * leaves undone, so oapi-codegen can read the result. Step 2 of
 * packages/sdk-go/models/generate.sh.
 *
 * Two things survive the down-convert that 3.0's Schema Object cannot carry:
 *
 * - if/then/else. Left in, oapi-codegen turns an object whose allOf carries a
 *   conditional into interface{} (Space, Schema). A Go struct cannot say "required only when
 *   spaceType is on-site" anyway, so the conditional is dropped and the field
 *   stays optional, which is what the top-level `required` already says. An
 *   allOf member left carrying nothing but annotations goes with it.
 *
 * - numeric exclusiveMinimum / exclusiveMaximum (3.1), which 3.0 spells as
 *   minimum/maximum plus a boolean.
 *
 * And one thing oapi-codegen cannot resolve on its own: openapi/openapi.yaml
 * names each document type twice, a PascalCase alias (`Catalogue`, a $ref plus a
 * description) beside the v3/ schema it points at (`catalogue`). Both become the
 * Go name `Catalogue`, and oapi-codegen keeps whichever it meets first — for
 * Catalogue that is the alias, which comes out as `type Catalogue = Catalogue`.
 * Such an alias is folded into its target and every $ref to it repointed; the Go
 * name is the same either way, so nothing a Go caller uses is renamed.
 *
 *   node scripts/lib/openapi30-for-oapi-codegen.mjs <in.json> <out.json>
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const CONDITIONAL = new Set(['if', 'then', 'else']);
// Keys whose value maps NAMES to schemas: a property called "if" is not a keyword.
const NAME_MAPS = new Set(['properties', 'patternProperties', '$defs', 'definitions', 'schemas']);
// Keys whose value is instance data, never a schema: an example carrying an "if"
// key is left exactly as written.
const DATA = new Set(['example', 'examples', 'default', 'enum', 'const']);
// Keys that annotate a schema without constraining it.
const ANNOTATION = new Set(['description', 'title', '$comment']);

const isSchema = (s) => s && typeof s === 'object' && !Array.isArray(s);
const saysNothing = (s) => Object.keys(s).every((k) => ANNOTATION.has(k) || k.startsWith('x-'));

// Rebuild every schema object bottom-up, applying `fix` to each; name maps are
// walked through without treating their keys as keywords.
function walk(node, fix) {
  if (Array.isArray(node)) return node.map((v) => walk(v, fix));
  if (!isSchema(node)) return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (DATA.has(k) || k.startsWith('x-')) out[k] = v;
    else out[k] = NAME_MAPS.has(k) && isSchema(v)
      ? Object.fromEntries(Object.entries(v).map(([name, s]) => [name, walk(s, fix)]))
      : walk(v, fix);
  }
  return fix(out);
}

function dropConditionals(out) {
  for (const k of CONDITIONAL) delete out[k];
  if (Array.isArray(out.allOf)) {
    // A member carrying only annotations accepts everything, so it adds nothing
    // to the allOf — and oapi-codegen turns a bare {} member into interface{}.
    const kept = out.allOf.filter((m) => !(isSchema(m) && saysNothing(m)));
    if (kept.length) out.allOf = kept;
    else delete out.allOf;
  }
  return out;
}

function booleanBounds(out) {
  for (const [exclusive, bound] of [['exclusiveMinimum', 'minimum'], ['exclusiveMaximum', 'maximum']]) {
    if (typeof out[exclusive] === 'number') {
      out[bound] = out[exclusive];
      out[exclusive] = true;
    }
  }
  return out;
}

// oapi-codegen's ToCamelCase (pkg/codegen/utils.go), which SchemaNameToTypeName applies.
const SEPARATORS = new Set([...'.-+:;_~ (){}[]']);
export function goTypeName(name) {
  let out = '';
  let capNext = true;
  for (const c of name.trim()) {
    const upper = c !== c.toLowerCase();
    const lower = c !== c.toUpperCase();
    if (upper || /\p{Nd}/u.test(c)) out += c;
    else if (lower) out += capNext ? c.toUpperCase() : c;
    capNext = SEPARATORS.has(c);
  }
  return out;
}

const PREFIX = '#/components/schemas/';

export function foldCollidingAliases(doc) {
  const schemas = doc.components?.schemas ?? {};
  const fold = new Map();
  for (const [name, s] of Object.entries(schemas)) {
    const target = typeof s?.$ref === 'string' && s.$ref.startsWith(PREFIX) ? s.$ref.slice(PREFIX.length) : null;
    const onlyRef = isSchema(s) && Object.keys(s).every((k) => k === '$ref' || ANNOTATION.has(k) || k.startsWith('x-'));
    if (target && target !== name && target in schemas && onlyRef && goTypeName(target) === goTypeName(name)) {
      fold.set(PREFIX + name, PREFIX + target);
    }
  }
  if (!fold.size) return doc;
  // Follow alias → alias → schema to the end, so no $ref lands on a folded name.
  const end = (ref) => {
    for (const seen = new Set(); fold.has(ref) && !seen.has(ref); ref = fold.get(ref)) seen.add(ref);
    return ref;
  };
  const repoint = (node) => {
    if (Array.isArray(node)) return node.map(repoint);
    if (!isSchema(node)) return node;
    return Object.fromEntries(Object.entries(node).map(([k, v]) =>
      [k, k === '$ref' && fold.has(v) ? end(v) : repoint(v)]));
  };
  const out = repoint(doc);
  out.components.schemas = Object.fromEntries(
    Object.entries(out.components.schemas).filter(([name]) => !fold.has(PREFIX + name)));
  return out;
}

export const stripConditionals = (doc) => walk(doc, dropConditionals);

export const forOapiCodegen = (doc) =>
  foldCollidingAliases(walk(doc, (out) => booleanBounds(dropConditionals(out))));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('usage: openapi30-for-oapi-codegen.mjs <in.json> <out.json>');
    process.exit(2);
  }
  writeFileSync(output, JSON.stringify(forOapiCodegen(JSON.parse(readFileSync(input, 'utf8'))), null, 2) + '\n');
}
