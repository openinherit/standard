#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

/**
 * Generate the INHERIT schema reference (docs/reference/) from v3/.
 *
 * One Markdown page per schema — core entities, common types, asset
 * categories and jurisdiction extensions — plus an index. Every page is a
 * projection of its JSON Schema and nothing else, so the reference can never
 * say something the schema does not.
 *
 * Usage:
 *   node scripts/generate-reference-docs.mjs            # (re)write docs/reference/
 *   node scripts/generate-reference-docs.mjs --check    # regenerate in memory and diff
 *   ... --root <dir>                                    # operate on another tree (tests)
 *
 * Exit codes (--check):
 *   0 — docs/reference/ is exactly what the schemas generate
 *   1 — at least one page is STALE, MISSING or ORPHAN (a page with no schema)
 *   2 — cannot answer: no v3/ tree, or no schemas found. Never read 2 as clean.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = 'docs/reference';

// Every JSON file under v3/ gets a page unless a rule here says why not, so a
// schema added somewhere new is documented by default rather than missed.
const SKIP = [
  [(rel) => rel === 'v3/dialect.json', 'the metaschema, not a data schema'],
  [(rel) => rel.startsWith('v3/vocab/'), 'vocabulary metaschemas'],
  [(rel) => rel.startsWith('v3/context/'), 'JSON-LD contexts, not schemas'],
  [(rel) => /^v3\/extensions\/[^/]+\/extension\.json$/.test(rel), 'extension manifests, not schemas'],
];

const SECTIONS = [
  ['', 'Core entities'],
  ['common', 'Common types'],
  ['asset-categories', 'Asset categories'],
  ['extensions', 'Jurisdiction extensions'],
];

// Codepoint order, never locale order: the output must be byte-identical on
// every machine or --check reds for a contributor whose LANG differs from CI's.
const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ── Discovery ──────────────────────────────────────────────────────

function discover(root) {
  const found = [];
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const child = posix.join(rel, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith('.json')) found.push(child);
    }
  };
  if (existsSync(join(root, 'v3'))) walk('v3');
  return found.filter((rel) => !SKIP.some(([rule]) => rule(rel))).sort(byCodepoint);
}

const pageFor = (schemaRel) => `${OUT}/${schemaRel.replace(/^v3\//, '').replace(/\.json$/, '')}.md`;

// ── Rendering helpers ──────────────────────────────────────────────

const cell = (text) =>
  String(text ?? '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\s+/g, ' ')
    .trim();

const prose = (text) => String(text ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();

const anchor = (name) => `def-${String(name).replace(/[^A-Za-z0-9_-]/g, '-')}`;

const row = (cells) => '|' + cells.map((c) => (c === '' ? ' |' : ` ${c} |`)).join('');

// Escapes | because every code span here may land in a table cell.
const code = (v) => '`' + (typeof v === 'string' ? v : JSON.stringify(v)).replace(/\|/g, '\\|') + '`';

const ENUM_LIMIT = 20;

function refLink(ref, ctx) {
  const [filePart, fragment = ''] = ref.split('#');
  const defName = fragment.startsWith('/$defs/') ? fragment.slice('/$defs/'.length) : null;

  if (filePart === '') {
    if (defName && ctx.defs.has(defName)) return `[${defName}](#${anchor(defName)})`;
    return code(`$ref: ${ref}`);
  }
  // A pointer into some other part of a schema (e.g. #/properties/people) has
  // no page of its own; linking the whole schema would misstate the type.
  if (fragment && !defName) return code(`$ref: ${ref}`);

  const url = new URL(filePart, `https://openinherit.org/${ctx.schemaRel}`);
  const rel = url.pathname.slice(1);
  const onHost = url.host === 'openinherit.org' || url.host === 'www.openinherit.org';
  const target = onHost && ctx.schemas.get(rel);
  if (!target) return code(`$ref: ${ref}`);

  const href = posix.relative(posix.dirname(ctx.page), pageFor(rel));
  const title = target.title ?? posix.basename(rel, '.json');
  if (defName) return `[${title}.${defName}](${href}#${anchor(defName)})`;
  return `[${title}](${href})`;
}

function typeOf(node, ctx) {
  if (!node || typeof node !== 'object') return '';
  if (node.$ref) return refLink(node.$ref, ctx);
  if (Array.isArray(node.allOf) && node.allOf.length === 1) return typeOf(node.allOf[0], ctx);
  for (const k of ['oneOf', 'anyOf']) {
    if (Array.isArray(node[k])) return node[k].map((n) => typeOf(n, ctx) || 'any').join(' or ');
  }
  if ('const' in node) return `const ${code(node.const)}`;

  const types = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
  let base;
  if (types.length === 1 && types[0] === 'array') {
    const items = typeOf(node.items, ctx);
    base = items ? `array of ${items}` : code('array');
  } else if (types.length) {
    base = types.map(code).join(' or ');
  } else {
    base = node.properties ? code('object') : '';
  }
  if (node.format) base += ` (${node.format})`;

  if (Array.isArray(node.enum)) {
    const shown = node.enum.slice(0, ENUM_LIMIT).map(code).join(', ');
    const more = node.enum.length > ENUM_LIMIT ? `, … (+${node.enum.length - ENUM_LIMIT} more)` : '';
    base = `${base ? base + ' — ' : ''}one of ${shown}${more}`;
  }
  return base;
}

// A property's own description, else — for a bare local `#/$defs/X` ref, or an
// array of them — the definition's. Cross-file refs are left to their link.
function describe(node, ctx) {
  if (!node || typeof node !== 'object') return '';
  if (node.description) return node.description;
  const ref = node.$ref ?? node.items?.$ref;
  if (typeof ref === 'string' && ref.startsWith('#/$defs/')) {
    return ctx.defs.get(ref.slice('#/$defs/'.length))?.description ?? '';
  }
  return '';
}

function propertyTable(node, ctx) {
  const props = node.properties ?? {};
  const names = Object.keys(props);
  if (!names.length) return '';
  const required = new Set(node.required ?? []);
  const lines = [
    '| Property | Type | Required | Description |',
    '| --- | --- | --- | --- |',
    ...names.map((n) =>
      row([code(n), typeOf(props[n], ctx), required.has(n) ? 'yes' : '', cell(describe(props[n], ctx))]),
    ),
  ];
  return lines.join('\n') + '\n';
}

function patternNote(node) {
  const patterns = Object.keys(node.patternProperties ?? {});
  if (!patterns.length) return '';
  return `\nAlso accepts properties whose names match ${patterns.map(code).join(', ')}.\n`;
}

// ── Pages ──────────────────────────────────────────────────────────

function renderSchema(schemaRel, schema, schemas) {
  const page = pageFor(schemaRel);
  const defs = new Map(Object.entries(schema.$defs ?? {}).sort(([a], [b]) => byCodepoint(a, b)));
  const ctx = { schemaRel, page, schemas, defs };
  const sourceHref = posix.relative(posix.dirname(page), schemaRel);

  const out = [
    `<!-- GENERATED by scripts/generate-reference-docs.mjs from ${schemaRel}. ` +
      'Do not edit by hand: run `pnpm run docs:reference`. -->',
    '',
    `# ${schema.title ?? posix.basename(schemaRel, '.json')}`,
    '',
  ];
  if (schema.description) out.push(prose(schema.description), '');
  out.push(`Source: [\`${schemaRel}\`](${sourceHref})`, '');
  if (schema.$id) out.push(`Schema \`$id\`: \`${schema.$id}\``, '');

  const table = propertyTable(schema, ctx);
  if (table) out.push('## Properties', '', table.trimEnd());
  const note = patternNote(schema);
  if (note) out.push(note.trimEnd());
  if (!table && !defs.size) {
    const t = typeOf(schema, ctx);
    if (t) out.push(`Type: ${t}`);
  }

  if (defs.size) {
    out.push('', '## Definitions');
    for (const [name, def] of defs) {
      out.push('', `<a id="${anchor(name)}"></a>`, '', `### ${name}`, '');
      if (def?.description) out.push(prose(def.description), '');
      const dt = propertyTable(def ?? {}, ctx);
      if (dt) out.push(dt.trimEnd());
      else {
        const t = typeOf(def, ctx);
        if (t) out.push(`Type: ${t}`);
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

const ABBREVIATION = /\b(e\.g|i\.e|etc|cf|vs|incl|approx|No|St)\.$/i;

// The first sentence, where a sentence ends at . ! or ? followed by a space and
// a capital — and not at "e.g." / "i.e." / "etc.", which end in a full stop
// without ending anything.
function firstSentence(s) {
  const text = cell(s);
  const boundary = /[.!?](?=\s+[A-Z])/g;
  let m;
  while ((m = boundary.exec(text))) {
    const candidate = text.slice(0, m.index + 1);
    if (!ABBREVIATION.test(candidate)) return candidate;
  }
  return text;
}

function renderIndex(schemas) {
  const out = [
    '<!-- GENERATED by scripts/generate-reference-docs.mjs from v3/. ' +
      'Do not edit by hand: run `pnpm run docs:reference`. -->',
    '',
    '# INHERIT schema reference',
    '',
    'One page per JSON Schema in `v3/`, generated from the schemas themselves. ' +
      'For a walkthrough, start with the [quickstart](../../QUICKSTART.md).',
  ];
  const sectionOf = (rel) => {
    const sub = rel.replace(/^v3\//, '');
    const top = sub.includes('/') ? sub.split('/')[0] : '';
    return SECTIONS.some(([dir]) => dir === top) ? top : null;
  };
  for (const [dir, heading] of [...SECTIONS, [null, 'Other schemas']]) {
    const inSection = [...schemas.keys()].filter((rel) => sectionOf(rel) === dir);
    if (!inSection.length) continue;
    inSection.sort((a, b) => {
      const ta = schemas.get(a).title ?? a;
      const tb = schemas.get(b).title ?? b;
      return byCodepoint(ta, tb) || byCodepoint(a, b);
    });
    out.push('', `## ${heading}`, '', '| Schema | Summary |', '| --- | --- |');
    for (const rel of inSection) {
      const s = schemas.get(rel);
      const href = posix.relative(OUT, pageFor(rel));
      out.push(row([`[${s.title ?? posix.basename(rel, '.json')}](${href})`, firstSentence(s.description)]));
    }
  }
  return out.join('\n') + '\n';
}

export function generateAll(root) {
  const schemas = new Map();
  for (const rel of discover(root)) {
    const parsed = JSON.parse(readFileSync(join(root, rel), 'utf-8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) schemas.set(rel, parsed);
  }
  const pages = new Map();
  if (!schemas.size) return pages;
  for (const [rel, schema] of schemas) pages.set(pageFor(rel), renderSchema(rel, schema, schemas));
  pages.set(`${OUT}/README.md`, renderIndex(schemas));
  return pages;
}

// ── CLI ────────────────────────────────────────────────────────────

function existingPages(root) {
  const found = [];
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const child = posix.join(rel, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith('.md')) found.push(child);
    }
  };
  walk(OUT);
  return found.sort();
}

function main(argv) {
  const check = argv.includes('--check');
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx >= 0 ? argv[rootIdx + 1] : join(dirname(fileURLToPath(import.meta.url)), '..');

  if (!existsSync(join(root, 'v3'))) {
    console.error(`CANNOT ANSWER — no v3/ directory under ${rootIdx >= 0 ? root : 'the repository root'}`);
    return 2;
  }
  const pages = generateAll(root);
  if (!pages.size) {
    console.error('CANNOT ANSWER — no schemas found under v3/');
    return 2;
  }
  const orphans = existingPages(root).filter((p) => !pages.has(p));

  if (!check) {
    for (const [rel, body] of pages) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    }
    for (const rel of orphans) rmSync(join(root, rel));
    console.log(`Wrote ${pages.size} reference pages to ${OUT}/` +
      (orphans.length ? `, removed ${orphans.length} orphan(s)` : ''));
    return 0;
  }

  const problems = [];
  for (const [rel, body] of [...pages].sort(([a], [b]) => byCodepoint(a, b))) {
    const abs = join(root, rel);
    if (!existsSync(abs)) problems.push(`MISSING  ${rel}`);
    else if (readFileSync(abs, 'utf-8') !== body) problems.push(`STALE    ${rel}`);
  }
  for (const rel of orphans) problems.push(`ORPHAN   ${rel}`);

  if (problems.length) {
    for (const p of problems) console.log(p);
    console.log(`\n${problems.length} reference page(s) out of date. Run: pnpm run docs:reference`);
    return 1;
  }
  console.log(`Reference docs current — ${pages.size} pages match their schemas.`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
