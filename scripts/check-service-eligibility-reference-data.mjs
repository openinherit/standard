#!/usr/bin/env node
/**
 * Gate: the Cedar service-eligibility packs and the reference data they rest on
 * agree.
 *
 * A pack (cedar/service-eligibility/<jur>.cedar, with its oracle and mutant in
 * tests/cedar/service-eligibility/) keys on serviceType strings. Those strings are
 * defined, with their per-jurisdiction statutory status, in
 * reference-data/regulated-service-types.json. Each jurisdiction with a pack also
 * has a will-requirements profile in reference-data/will-requirements-profiles.json.
 * This gate stops either side drifting from the other.
 *
 *   R1 every serviceType a pack tests is a key of regulated-service-types.json, and
 *      every `resource.serviceType` expression is one the gate can read
 *      (`== "x"` or `[...].contains(resource.serviceType)`) — it fails closed
 *   R2 every serviceType a policy tests has a status for that policy's
 *      @jurisdiction, and a policy that tests service types declares one
 *   R3 the jurisdictions the packs cover and the profile keys are the same set,
 *      and every jurisdiction key in either file is a key of jurisdiction-profiles.json
 *   R4 entries are well formed: closed status/category/intakeStage sets, unique
 *      requirement ids, non-empty text, boolean `blocking`
 *   R5 pinned floors cannot be silently removed: the reserved lines per
 *      jurisdiction stay `reserved`, and the pinned requirement ids stay present
 *      (Scotland pins prior_rights and legal_rights)
 *
 * The harness's own seed fixtures (tests/cedar/service-eligibility/fixtures/) are
 * synthetic and not packs, so they are not read.
 *
 * Exit 0 clear · 1 refused (each finding printed) · 2 cannot answer (a file is
 * missing or unparsable, or no pack file was found). Never read 2 as clear.
 *
 * Usage: node scripts/check-service-eligibility-reference-data.mjs [--root <repo-root>]
 */
import { readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const VOCAB = 'reference-data/regulated-service-types.json';
const PROFILES = 'reference-data/will-requirements-profiles.json';
const JURISDICTIONS = 'reference-data/jurisdiction-profiles.json';
const PACK_DIR = 'cedar/service-eligibility';
const CEDAR_DIRS = [PACK_DIR, 'tests/cedar/service-eligibility'];

const STATUSES = ['reserved', 'unreserved', 'unregulated'];
const CATEGORIES = ['capacity', 'formal_validity', 'intention', 'revocation_trigger', 'fixed_share', 'practical_guidance'];
const STAGES = ['light', 'standard', 'will_grade'];

// The floors. A value can be added; one listed here can only go by editing this pin.
const RESERVED_FLOOR = {
  'GB-ENG': ['rights_of_audience', 'conduct_of_litigation', 'reserved_instrument_activities',
    'reserved_probate_activities', 'notarial_activities', 'administration_of_oaths'],
  'GB-SCT': ['reserved_confirmation_activities', 'reserved_instrument_activities'],
  'GB-NIR': ['reserved_probate_activities', 'reserved_instrument_activities'],
};
const REQUIREMENT_FLOOR = {
  'GB-ENG': ['testator_minimum_age', 'testamentary_capacity', 'will_in_writing', 'testator_signature', 'two_witnesses_present'],
  'GB-SCT': ['testator_minimum_age', 'testamentary_capacity', 'will_in_writing', 'testator_subscription', 'legal_rights', 'prior_rights'],
  'GB-NIR': ['testator_minimum_age', 'testamentary_capacity', 'will_in_writing', 'testator_signature', 'two_witnesses_present'],
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

const read = (rel) => {
  try {
    return readFileSync(join(root, rel), 'utf8');
  } catch (e) {
    cannotAnswer(`${rel}: ${e.message}`);
  }
};
const load = (rel) => {
  try {
    return JSON.parse(read(rel));
  } catch (e) {
    cannotAnswer(`${rel}: ${e.message}`);
  }
};
const cedarFiles = (dir) => {
  try {
    return readdirSync(join(root, dir)).filter((f) => f.endsWith('.cedar')).sort().map((f) => `${dir}/${f}`);
  } catch {
    return [];
  }
};

const vocab = load(VOCAB);
const profilesDoc = load(PROFILES);
const knownJurisdictions = new Set(Object.keys(load(JURISDICTIONS).jurisdictions ?? {}));
const types = vocab.serviceTypes;
const profiles = profilesDoc.profiles;
if (!types || typeof types !== 'object') cannotAnswer(`${VOCAB} has no serviceTypes object`);
if (!profiles || typeof profiles !== 'object') cannotAnswer(`${PROFILES} has no profiles object`);

const findings = [];
const refuse = (rule, msg) => findings.push(`${rule} ${msg}`);
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

// --- R1 + R2: read the packs ------------------------------------------------
const files = CEDAR_DIRS.flatMap(cedarFiles);
if (!files.length) cannotAnswer(`no .cedar files under ${CEDAR_DIRS.join(' or ')}`);
const packJurisdictions = new Set();
let literals = 0;
for (const file of files) {
  const text = read(file).replace(/\/\/[^\n]*/g, ''); // comments are not policy
  for (const policy of text.split(';')) {
    const jur = policy.match(/@jurisdiction\("([^"]*)"\)/)?.[1];
    if (jur && file.startsWith(`${PACK_DIR}/`)) packJurisdictions.add(jur);

    const named = [];
    let readable = 0;
    for (const m of policy.matchAll(/resource\.serviceType\s*==\s*"([^"]*)"/g)) {
      named.push(m[1]);
      readable++;
    }
    for (const m of policy.matchAll(/\[([^\]]*)\]\s*\.contains\(\s*resource\.serviceType\s*\)/g)) {
      named.push(...[...m[1].matchAll(/"([^"]*)"/g)].map((s) => s[1]));
      readable++;
    }
    const total = (policy.match(/resource\.serviceType/g) ?? []).length;
    if (total !== readable) {
      refuse('R1', `${file}: a resource.serviceType expression the gate cannot read (${total - readable} of ${total})`);
    }
    if (!named.length) continue;
    if (!jur) {
      refuse('R2', `${file}: a policy naming service types has no @jurisdiction`);
      continue;
    }
    for (const t of named) {
      literals++;
      if (!Object.hasOwn(types, t)) refuse('R1', `${file}: serviceType "${t}" is not in ${VOCAB}`);
      else if (!types[t].jurisdictions?.[jur]) refuse('R2', `${file}: "${t}" has no ${jur} status in ${VOCAB}`);
    }
  }
}

// --- R3: one jurisdiction set ------------------------------------------------
for (const jur of packJurisdictions) {
  if (!Object.hasOwn(profiles, jur)) refuse('R3', `the packs cover ${jur} but will-requirements-profiles.json has no profile for it`);
}
for (const jur of Object.keys(profiles)) {
  if (!packJurisdictions.has(jur)) refuse('R3', `will-requirements-profiles.json has a profile for ${jur} but no pack covers it`);
  if (!knownJurisdictions.has(jur)) refuse('R3', `will-requirements-profiles.json: "${jur}" is not a key of jurisdiction-profiles.json`);
}
for (const jur of packJurisdictions) {
  if (!knownJurisdictions.has(jur)) refuse('R3', `the packs' @jurisdiction "${jur}" is not a key of jurisdiction-profiles.json`);
}

// --- R4: well formed ---------------------------------------------------------
for (const [code, entry] of Object.entries(types)) {
  if (!nonEmpty(entry.label) || !nonEmpty(entry.description)) refuse('R4', `${code}: label and description must be non-empty`);
  const jurs = entry.jurisdictions;
  if (!jurs || typeof jurs !== 'object' || !Object.keys(jurs).length) {
    refuse('R4', `${code}: no jurisdictions`);
    continue;
  }
  for (const [jur, s] of Object.entries(jurs)) {
    if (!knownJurisdictions.has(jur)) refuse('R3', `regulated-service-types.json ${code}: "${jur}" is not a key of jurisdiction-profiles.json`);
    if (!STATUSES.includes(s?.status)) refuse('R4', `${code} ${jur}: status "${s?.status}" is not one of ${STATUSES.join(', ')}`);
    if (!nonEmpty(s?.basis)) refuse('R4', `${code} ${jur}: basis is empty`);
  }
}
let requirementCount = 0;
for (const [jur, p] of Object.entries(profiles)) {
  if (!Array.isArray(p?.requirements) || !p.requirements.length) {
    refuse('R4', `${jur}: requirements must be a non-empty array`);
    continue;
  }
  const seen = new Set();
  for (const r of p.requirements) {
    requirementCount++;
    const id = r?.id;
    if (!nonEmpty(id)) {
      refuse('R4', `${jur}: a requirement has no id`);
      continue;
    }
    if (seen.has(id)) refuse('R4', `${jur}: requirement id "${id}" appears twice`);
    seen.add(id);
    for (const field of ['name', 'statement', 'legislativeReference']) {
      if (!nonEmpty(r[field])) refuse('R4', `${jur} ${id}: ${field} is empty`);
    }
    if (!CATEGORIES.includes(r.category)) refuse('R4', `${jur} ${id}: category "${r.category}" is not one of ${CATEGORIES.join(', ')}`);
    if (!STAGES.includes(r.intakeStage)) refuse('R4', `${jur} ${id}: intakeStage "${r.intakeStage}" is not one of ${STAGES.join(', ')}`);
    if (typeof r.blocking !== 'boolean') refuse('R4', `${jur} ${id}: blocking must be true or false`);
  }
}

// --- R5: floors ---------------------------------------------------------------
for (const [jur, codes] of Object.entries(RESERVED_FLOOR)) {
  for (const code of codes) {
    const status = types[code]?.jurisdictions?.[jur]?.status;
    if (status !== 'reserved') refuse('R5', `${code} is pinned reserved in ${jur}, found "${status}"`);
  }
}
for (const [jur, ids] of Object.entries(REQUIREMENT_FLOOR)) {
  const have = new Set((profiles[jur]?.requirements ?? []).map((r) => r?.id));
  for (const id of ids) if (!have.has(id)) refuse('R5', `${jur} has lost pinned requirement "${id}"`);
}

if (findings.length) {
  console.error(`REFUSED — ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `OK — service-eligibility packs and reference data agree\n` +
    `  ${files.length} Cedar files, ${literals} serviceType references, ${Object.keys(types).length} service types\n` +
    `  ${[...packJurisdictions].sort().join(', ')}: ${requirementCount} will requirements across ${Object.keys(profiles).length} profiles`,
);
