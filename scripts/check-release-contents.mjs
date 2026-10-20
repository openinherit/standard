#!/usr/bin/env node
// Release contents check.
//
// check-release-wiring.mjs proves this repository CAN publish. This proves what
// it WOULD publish. It packs @openinherit/schema and @openinherit/conformance
// exactly as `pnpm publish` would, opens the tarballs, and checks the files in
// them -- not the tree, because a tag can sit on any commit and packages/schema
// is a copy of the root schemas, not the root schemas themselves.
//
// Run in publish.yml before the first publish step. A publish to the public
// npm registry cannot be taken back, so this is the last point a stale copy can
// be caught.
//
//   R1  every packed package is at the root version (and the tag's, if given)
//   R2  packed schema v3/** and extensions-registry.json are byte-identical to root
//   R3  every reference-data file the schema package ships is byte-identical to root
//   R4  the packed schema carries the catalogue room-gap fix (proposal 0003, PR #29)
//   R5  the packed conformance kit carries it too: fixture, expected result, bundles
//   R6  the packed conformance kit matches its own manifest: the manifest is at
//       the package's version, and every file it names is packed, byte for byte
//       at the sha256 it records
//
// USAGE: node scripts/check-release-contents.mjs [--root <dir>] [--tag vX.Y.Z]
// EXIT CODES: 0 clean - 1 one or more assertions failed - 2 cannot answer.
// Exit 2 is never "no failures".

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const cannot = (message) => {
  console.error(`CANNOT ANSWER: ${message}`);
  process.exit(2);
};

// ---- arguments ---------------------------------------------------------------
let root = process.cwd();
let tag = null;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--root" && argv[i + 1]) root = resolve(argv[++i]);
  else if (argv[i] === "--tag" && argv[i + 1]) tag = argv[++i];
  else cannot(`unknown argument ${JSON.stringify(argv[i])}`);
}
if (tag !== null && !/^v\d+\.\d+\.\d+$/.test(tag)) cannot(`--tag ${JSON.stringify(tag)} is not a vX.Y.Z tag`);
if (!existsSync(root)) cannot(`--root ${root} does not exist`);

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    cannot(`${path} is unreadable or not JSON -- ${err.message}`);
  }
};

/** Every file under dir, as sorted paths relative to dir. */
const walk = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  const visit = (d) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) visit(p);
      else out.push(relative(dir, p));
    }
  };
  visit(dir);
  return out.sort();
};
const sameBytes = (a, b) => readFileSync(a).equals(readFileSync(b));

const failures = [];
const fail = (id, message) => failures.push({ id, message });

// ---- pack ----------------------------------------------------------------------
const rootVersion = readJson(join(root, "package.json")).version;
if (!rootVersion) cannot(`${join(root, "package.json")} has no version`);

const scratch = mkdtempSync(join(tmpdir(), "release-contents-"));
process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));

/** Pack a workspace package the way publish would, and return its extracted root. */
function pack(dir) {
  const pkgDir = join(root, "packages", dir);
  if (!existsSync(join(pkgDir, "package.json"))) cannot(`${pkgDir}/package.json does not exist`);
  const dest = join(scratch, dir);
  const packed = spawnSync(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", scratch],
    { cwd: pkgDir, encoding: "utf8" },
  );
  if (packed.status !== 0) cannot(`npm pack failed in ${pkgDir}\n${packed.stderr}`);
  let filename;
  try {
    filename = JSON.parse(packed.stdout)[0].filename;
  } catch (err) {
    cannot(`npm pack in ${pkgDir} printed no usable JSON -- ${err.message}`);
  }
  spawnSync("mkdir", ["-p", dest]);
  const untar = spawnSync("tar", ["-xzf", join(scratch, filename), "-C", dest], { encoding: "utf8" });
  if (untar.status !== 0) cannot(`could not extract ${filename}\n${untar.stderr}`);
  return join(dest, "package");
}

const schema = pack("schema");
const conformance = pack("conformance");

// ---- R1: version -----------------------------------------------------------------
for (const [label, packed] of [["@openinherit/schema", schema], ["@openinherit/conformance", conformance]]) {
  const version = readJson(join(packed, "package.json")).version;
  if (version !== rootVersion) {
    fail("R1", `${label} packs as ${version}; root package.json is ${rootVersion}.`);
  }
  if (tag !== null && `v${version}` !== tag) {
    fail("R1", `${label} packs as ${version}, but the release tag is ${tag}.`);
  }
}

// ---- R2: the schema mirror ---------------------------------------------------------
const rootV3 = walk(join(root, "v3"));
const packedV3 = walk(join(schema, "v3"));
if (rootV3.length === 0) cannot(`${join(root, "v3")} holds no schemas`);
const packedSet = new Set(packedV3);
const rootSet = new Set(rootV3);
for (const f of rootV3) {
  if (!packedSet.has(f)) fail("R2", `v3/${f} is in the standard but not in the packed @openinherit/schema.`);
  else if (!sameBytes(join(root, "v3", f), join(schema, "v3", f))) {
    fail("R2", `v3/${f} in the packed @openinherit/schema differs from the root copy -- run: rsync -a --delete v3/ packages/schema/v3/`);
  }
}
for (const f of packedV3) {
  if (!rootSet.has(f)) fail("R2", `the packed @openinherit/schema ships v3/${f}, which the standard does not have.`);
}
const registry = "extensions-registry.json";
if (!existsSync(join(schema, registry))) fail("R2", `the packed @openinherit/schema has no ${registry}.`);
else if (!sameBytes(join(root, registry), join(schema, registry))) {
  fail("R2", `${registry} in the packed @openinherit/schema differs from the root copy.`);
}

// ---- R3: reference data the package ships -------------------------------------------
// Only what it ships: whether it SHOULD ship every root file is a scope decision,
// not drift, and is not this gate's to make.
for (const f of walk(join(schema, "reference-data"))) {
  const rootCopy = join(root, "reference-data", f);
  if (!existsSync(rootCopy)) {
    fail("R3", `the packed @openinherit/schema ships reference-data/${f}, which the standard does not have.`);
  } else if (!sameBytes(rootCopy, join(schema, "reference-data", f))) {
    fail("R3", `reference-data/${f} in the packed @openinherit/schema differs from the root copy -- the release would ship stale data under a new version.`);
  }
}

// ---- R4/R5: the catalogue room-gap fix -----------------------------------------------
const CATALOGUE_ID = "https://openinherit.org/v3/catalogue.json";
const SPACE_ID = "https://openinherit.org/v3/space.json";

/** catalogue.properties[] -- an array of property records. */
function catalogueHasProperties(cat) {
  const p = cat && cat.properties && cat.properties.properties;
  if (!p || p.type !== "array" || !p.items || typeof p.items.$ref !== "string") return false;
  return /(^|\/)property\.json$/.test(p.items.$ref);
}
/** space.json -- propertyId required when spaceType is present and not off-site. */
function spaceHasConditionalPropertyId(space) {
  const members = (space && Array.isArray(space.allOf)) ? space.allOf : [];
  return members.some((m) =>
    m && m.then && Array.isArray(m.then.required) && m.then.required.includes("propertyId")
    && m.if && Array.isArray(m.if.required) && m.if.required.includes("spaceType"));
}

const packedCatalogue = join(schema, "v3/catalogue.json");
const packedSpace = join(schema, "v3/space.json");
if (!existsSync(packedCatalogue) || !catalogueHasProperties(readJson(packedCatalogue))) {
  fail("R4", "the packed v3/catalogue.json has no properties[] array of property.json -- the room-gap fix is not in this release.");
}
if (!existsSync(packedSpace) || !spaceHasConditionalPropertyId(readJson(packedSpace))) {
  fail("R4", "the packed v3/space.json does not require propertyId conditionally on a present, on-site spaceType -- the room-gap fix is not in this release.");
}

for (const f of ["catalogue/valid/catalogue-only.json", "expected/catalogue-only.expected.json"]) {
  if (!existsSync(join(conformance, f))) fail("R5", `the packed @openinherit/conformance has no ${f}.`);
}
for (const bundle of ["inherit-v3-bundled.json", "catalogue-v3-bundled.json"]) {
  const path = join(conformance, "schemas", bundle);
  if (!existsSync(path)) {
    fail("R5", `the packed @openinherit/conformance has no schemas/${bundle}.`);
    continue;
  }
  const b = readJson(path);
  const defs = b.$defs || {};
  const cat = b.$id === CATALOGUE_ID ? b : defs[CATALOGUE_ID];
  const space = b.$id === SPACE_ID ? b : defs[SPACE_ID];
  if (!catalogueHasProperties(cat)) fail("R5", `schemas/${bundle} carries no catalogue properties[] -- it predates the room-gap fix.`);
  if (!spaceHasConditionalPropertyId(space)) fail("R5", `schemas/${bundle} carries no conditional space.propertyId -- it predates the room-gap fix.`);
}

// ---- R6: the conformance kit matches its manifest ----------------------------------
const packedManifest = join(conformance, "manifest.json");
if (!existsSync(packedManifest)) {
  fail("R6", "the packed @openinherit/conformance has no manifest.json.");
} else {
  const manifest = readJson(packedManifest);
  const kitVersion = readJson(join(conformance, "package.json")).version;
  if (manifest.version !== kitVersion) {
    fail("R6", `the packed conformance manifest is at ${manifest.version}; the package is ${kitVersion} -- run: python3 scripts/build-conformance-kit.py`);
  }
  const named = [
    ...(manifest.schemas ?? []).map((s) => [s.file, s.sha256]),
    ...(manifest.tests ?? []).flatMap((t) => [[t.file, t.sha256], [t.expected, t.expectedSha256]]),
  ];
  if (!named.length) fail("R6", "the packed conformance manifest names no files.");
  for (const [file, sha256] of named) {
    const path = join(conformance, file);
    if (!existsSync(path)) {
      fail("R6", `the packed conformance manifest names ${file}, which is not in the package.`);
    } else if (createHash("sha256").update(readFileSync(path)).digest("hex") !== sha256) {
      fail("R6", `the packed ${file} does not match its sha256 in the conformance manifest.`);
    }
  }
}

// ---- report ------------------------------------------------------------------------
if (failures.length > 0) {
  for (const { id, message } of failures) console.error(`::error::[${id}] ${message}`);
  console.error(`\nrelease contents: ${failures.length} failure(s) -- do not publish.`);
  process.exit(1);
}
console.log(
  `release contents: OK -- @openinherit/schema and @openinherit/conformance ${rootVersion}` +
    `${tag ? ` (${tag})` : ""} mirror the standard (${rootV3.length} schemas) and carry the room-gap fix.`,
);
