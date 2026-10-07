#!/usr/bin/env node
/**
 * Gate: the UK and Irish geographic extensions can say what real property is
 * held under — its local tenure and, where the jurisdiction runs two registers,
 * which register it is on and with what class of title.
 *
 * The core property.json is territory-neutral (`tenureType: ownership | lease`)
 * and its `landRegistry` block describes HM Land Registry. Northern Ireland and
 * the Republic of Ireland each run a land registry of folios alongside a Registry
 * of Deeds, and both still have fee farm grants. Those facts live in the
 * extensions, and this gate stops them silently disappearing.
 *
 * For each extension pinned in EXTENSIONS below:
 *   R1 `localTenureTypes[].localType` is declared with a non-empty enum
 *   R2 where registration is pinned, `landRegistration[].register` and
 *      `landRegistration[].titleClass` are declared with non-empty enums
 *   R3 every pinned floor value is still in its enum — a value can be added,
 *      never silently removed
 *   R4 every enum value is exercised by at least one `valid: true` case in the
 *      extension's tests/v3/<name>/<name>.test.json
 *   R5 extension.json `applicableJurisdictions` is exactly the pinned list — one
 *      legal jurisdiction per extension (England & Wales is one jurisdiction
 *      with two ISO 3166-2 codes)
 *
 * Exit 0 clear · 1 refused (each finding printed) · 2 cannot answer (a file is
 * missing or unparsable). Never read 2 as clear.
 *
 * Usage: node scripts/check-real-property-vocabulary.mjs [--root <repo-root>]
 */
import { readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const EXTENSIONS = {
  'uk-england-wales': {
    jurisdictions: ['GB-ENG', 'GB-WLS'],
    localType: ['freehold', 'leasehold', 'commonhold', 'share_of_freehold'],
  },
  'northern-ireland': {
    jurisdictions: ['GB-NIR'],
    localType: ['freehold', 'leasehold', 'fee_farm_grant'],
    register: ['land_registry', 'registry_of_deeds'],
    titleClass: ['absolute', 'qualified', 'possessory', 'good_leasehold', 'good_fee_farm_grant'],
  },
  ireland: {
    jurisdictions: ['IE'],
    localType: ['freehold', 'leasehold', 'fee_farm_grant'],
    register: ['land_registry', 'registry_of_deeds'],
    titleClass: ['absolute', 'qualified', 'possessory', 'good_leasehold'],
  },
};

const SLOTS = {
  localType: ['localTenureTypes', 'localType'],
  register: ['landRegistration', 'register'],
  titleClass: ['landRegistration', 'titleClass'],
};

let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cannotAnswer = (msg) => {
  console.error(`CANNOT ANSWER — ${msg}`);
  process.exit(2);
};
if (args.length) {
  if (args[0] !== '--root' || args.length !== 2) cannotAnswer(`usage: --root <repo-root>, got ${args.join(' ')}`);
  root = resolve(args[1]);
}

const load = (rel) => {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (e) {
    cannotAnswer(`${rel}: ${e.message}`);
  }
};

// The enum of <array>.items.properties.<field>, or undefined if it is not declared.
const enumOf = (schema, [array, field]) => {
  const p = schema?.properties?.[array]?.items?.properties?.[field];
  return Array.isArray(p?.enum) ? p.enum : undefined;
};

// Every value held under `key` anywhere inside `data`.
const valuesAt = (data, key, out = new Set()) => {
  if (Array.isArray(data)) data.forEach((d) => valuesAt(d, key, out));
  else if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      if (k === key && typeof v === 'string') out.add(v);
      valuesAt(v, key, out);
    }
  }
  return out;
};

const findings = [];
const summary = [];
for (const [name, pin] of Object.entries(EXTENSIONS)) {
  const schema = load(`v3/extensions/${name}/${name}.json`);
  const manifest = load(`v3/extensions/${name}/extension.json`);
  const tests = load(`tests/v3/${name}/${name}.test.json`);
  const refuse = (rule, msg) => findings.push(`${rule} ${name}: ${msg}`);

  const exercised = (tests.tests ?? []).filter((t) => t.valid === true).map((t) => t.data);
  const counts = [];
  for (const slot of Object.keys(SLOTS)) {
    if (!pin[slot]) continue;
    const declared = enumOf(schema, SLOTS[slot]);
    const path = SLOTS[slot].join('[].');
    if (!declared || !declared.length) {
      refuse(slot === 'localType' ? 'R1' : 'R2', `${path} is not declared with a non-empty enum`);
      continue;
    }
    for (const v of pin[slot]) if (!declared.includes(v)) refuse('R3', `${path} has lost pinned value "${v}"`);
    const seen = valuesAt(exercised, SLOTS[slot][1]);
    for (const v of declared) if (!seen.has(v)) refuse('R4', `${path} value "${v}" has no valid test case`);
    counts.push(`${SLOTS[slot][1]} ${declared.length}`);
  }

  const got = manifest.applicableJurisdictions;
  if (!Array.isArray(got) || got.length !== pin.jurisdictions.length || got.some((j, i) => j !== pin.jurisdictions[i])) {
    refuse('R5', `applicableJurisdictions is ${JSON.stringify(got)}, pinned ${JSON.stringify(pin.jurisdictions)}`);
  }
  summary.push(`${name} (${pin.jurisdictions.join('+')}): ${counts.join(', ')}`);
}

if (findings.length) {
  console.error(`REFUSED — ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`OK — real-property vocabulary declared and exercised\n  ${summary.join('\n  ')}`);
