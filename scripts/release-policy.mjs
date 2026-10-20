#!/usr/bin/env node
// Release policy check: the support window and the dist-tag, as machinery.
//
// docs/policies/versioning.md promises two things about releases:
//
//   - one supported release line. A release must be newer than every version
//     already on the registry, so there are no backport releases to an older
//     minor or major, and `latest` can never move backwards. npm sets `latest`
//     to whatever is published without --tag, including a LOWER version, so
//     without this check a patch cut from an old line would silently become
//     what `npm install @openinherit/schema` resolves to.
//   - one dist-tag, `latest`. There is no prerelease channel: a version must be
//     MAJOR.MINOR.PATCH.
//
// "Released" means published to the registry, read for every publishable
// package under packages/. Git tags are deliberately not consulted: the tag
// being published is itself a v* tag, and a tag whose publish failed is not a
// release.
//
// USAGE: node scripts/release-policy.mjs --version X.Y.Z [--root <dir>] [--released-file <json>]
//   --released-file  a JSON array of released versions, instead of asking npm (tests)
//   NPM_BIN          the npm executable to ask (default: npm)
//
// On success prints the dist-tag, and nothing else, to stdout.
// EXIT CODES: 0 may release - 1 refused - 2 cannot answer. 2 is never "allowed".

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const DIST_TAG = "latest";

const CORE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
// A released version may carry a prerelease or build suffix from the package's
// history; only its MAJOR.MINOR.PATCH core and whether it had a prerelease matter.
const ANY = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

/** [major, minor, patch, isPrerelease] or null. */
function parse(version, re) {
  const m = re.exec(version);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), Boolean(m[4])] : null;
}

/** <0, 0, >0 -- a prerelease sorts below its own release. */
function compare(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return Number(b[3]) - Number(a[3]);
}

/**
 * Decide whether `version` may be released, given the released versions of
 * each publishable package ({ name: [versions] }; an array means one package).
 * Returns { ok: true, distTag, resuming } or { ok: false, exit, reason }.
 *
 * A version that is the newest on the registry but missing from some packages
 * is a release whose publish stopped part-way. It may be finished: refusing it
 * would leave the packages of one release at different versions.
 */
export function evaluate(version, releasedByPackage) {
  const byPackage = Array.isArray(releasedByPackage) ? { released: releasedByPackage } : releasedByPackage;
  const candidate = parse(version, CORE);
  if (!candidate) {
    return {
      ok: false,
      exit: 1,
      reason:
        `${JSON.stringify(version)} is not a MAJOR.MINOR.PATCH version. The standard publishes ` +
        `full releases only, under the dist-tag "${DIST_TAG}"; there is no prerelease channel.`,
    };
  }
  let newest = null;
  for (const versions of Object.values(byPackage)) {
    for (const v of versions) {
      const p = parse(v, ANY);
      if (!p) return { ok: false, exit: 2, reason: `released version ${JSON.stringify(v)} is not semver` };
      if (!newest || compare(p, newest.p) > 0) newest = { v, p };
    }
  }
  const names = Object.keys(byPackage);
  const have = names.filter((n) => byPackage[n].includes(version));
  if (names.length > 0 && have.length === names.length) {
    return { ok: false, exit: 1, reason: `${version} is already released; a published version is immutable.` };
  }
  const order = newest ? compare(candidate, newest.p) : 1;
  if (order < 0 || (order === 0 && have.length === 0)) {
    return {
      ok: false,
      exit: 1,
      reason:
        `${version} is not newer than ${newest.v}, the newest released version. Only the newest ` +
        `release line is supported: a fix ships as a new release after ${newest.v}, never as a ` +
        `backport, and "${DIST_TAG}" never moves backwards.`,
    };
  }
  return { ok: true, distTag: DIST_TAG, resuming: have.length > 0 ? names.filter((n) => !have.includes(n)) : [] };
}

function cannot(message) {
  console.error(`CANNOT ANSWER: ${message}`);
  process.exit(2);
}

/** Publishable package names under <root>/packages, as check-release-wiring.mjs finds them. */
function publishablePackages(root) {
  const dir = join(root, "packages");
  if (!existsSync(dir)) cannot(`${dir} does not exist`);
  const names = [];
  for (const entry of readdirSync(dir).sort()) {
    const manifest = join(dir, entry, "package.json");
    if (!existsSync(manifest)) continue;
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(manifest, "utf8"));
    } catch (err) {
      cannot(`${manifest} is not valid JSON -- ${err.message}`);
    }
    if (pkg.private === true || !pkg.name) continue;
    names.push(pkg.name);
  }
  if (names.length === 0) cannot(`no publishable package under ${dir}`);
  return names;
}

/** Every version of `name` on the registry; [] only when npm says E404 (never published). */
function registryVersions(name) {
  const npm = process.env.NPM_BIN || "npm";
  const r = spawnSync(npm, ["view", name, "versions", "--json"], { encoding: "utf8" });
  if (r.error) cannot(`could not run ${npm}: ${r.error.message}`);
  if (r.status !== 0) {
    if (/\bE404\b/.test(r.stderr || "") || /\bE404\b/.test(r.stdout || "")) return [];
    cannot(`${npm} view ${name} versions failed (exit ${r.status}): ${(r.stderr || "").trim()}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    cannot(`${npm} view ${name} versions did not return JSON`);
  }
  // npm prints a bare string when there is exactly one version.
  return Array.isArray(parsed) ? parsed : [parsed];
}

function main(argv) {
  let version = null;
  let root = process.cwd();
  let releasedFile = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--version" && argv[i + 1] !== undefined) version = argv[++i];
    else if (argv[i] === "--root" && argv[i + 1] !== undefined) root = argv[++i];
    else if (argv[i] === "--released-file" && argv[i + 1] !== undefined) releasedFile = argv[++i];
    else cannot(`unknown argument ${JSON.stringify(argv[i])}`);
  }
  if (version === null) cannot("--version X.Y.Z is required");

  let released;
  if (releasedFile !== null) {
    try {
      released = JSON.parse(readFileSync(releasedFile, "utf8"));
    } catch (err) {
      cannot(`${releasedFile} is not a readable JSON array -- ${err.message}`);
    }
    if (!Array.isArray(released)) cannot(`${releasedFile} is not a JSON array`);
  } else {
    released = Object.fromEntries(publishablePackages(root).map((name) => [name, registryVersions(name)]));
  }

  const verdict = evaluate(version, released);
  if (!verdict.ok) {
    if (verdict.exit === 2) cannot(verdict.reason);
    console.error(`::error::release refused: ${verdict.reason}`);
    process.exit(1);
  }
  if (verdict.resuming.length > 0) {
    console.error(`release policy: ${version} is on the registry for some packages only; finishing it for ${verdict.resuming.join(", ")}.`);
  }
  console.error(`release policy: ${version} may be released under "${verdict.distTag}".`);
  console.log(verdict.distTag);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
