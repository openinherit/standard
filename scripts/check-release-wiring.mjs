#!/usr/bin/env node
// Release wiring check.
//
// This repository publishes three Apache-2.0 packages to the public npm
// registry. For a month it carried the PROMISE of that -- release.sh and
// CONTRIBUTING.md both say a tag triggers a CI publish -- with no workflow to
// keep it, because the machinery stayed behind in the repository the packages
// were originally cut from. Prose cannot notice that. This can.
//
// EXIT CODES: 0 clean - 1 one or more assertions failed - 2 cannot answer
// (unreadable tree). Exit 2 is never "no failures".

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_SLUG = "github.com/openinherit/standard";
// Anchored on a boundary: openinherit/standard-archived contains the slug as a
// substring and is NOT this repository.
const REPO_URL_RE = /github\.com\/openinherit\/standard(?:\.git)?(?:[\/#?]|$)/;
const WORKFLOW_DIR = ".github/workflows";
const PACKAGES_DIR = "packages";

const failures = [];
const fail = (id, message) => failures.push({ id, message });

/** Workflow files, as { name, text }. */
function readWorkflows() {
  if (!existsSync(WORKFLOW_DIR)) {
    console.error(`CANNOT ANSWER: ${WORKFLOW_DIR} does not exist`);
    process.exit(2);
  }
  return readdirSync(WORKFLOW_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => ({ name: f, text: readFileSync(join(WORKFLOW_DIR, f), "utf8") }));
}

/** Publishable workspace packages, derived from the tree -- never hard-coded,
 *  so a fourth package added without a publish step is a failure rather than
 *  an omission nobody notices. */
function readPublishablePackages() {
  if (!existsSync(PACKAGES_DIR)) {
    console.error(`CANNOT ANSWER: ${PACKAGES_DIR} does not exist`);
    process.exit(2);
  }
  const out = [];
  for (const dir of readdirSync(PACKAGES_DIR).sort()) {
    const manifest = join(PACKAGES_DIR, dir, "package.json");
    if (!existsSync(manifest)) continue; // not an npm package (the polyglot SDK directories)
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(manifest, "utf8"));
    } catch (err) {
      console.error(`CANNOT ANSWER: ${manifest} is not valid JSON -- ${err.message}`);
      process.exit(2);
    }
    if (pkg.private === true) continue;
    if (!pkg.name) continue;
    out.push({ name: pkg.name, manifest, repository: pkg.repository });
  }
  return out;
}

/** A line that actually publishes a workspace package. Matching the command
 *  shape, not the package name alone, so a name in a comment cannot satisfy it. */
const publishLineRe = () => /^[^#\n]*\bpnpm\b[^#\n]*--filter\s+(\S+)\s+publish\b/gm;

/** Fires on a v* tag push. Both lines must be present. */
function firesOnVersionTag(text) {
  return /^\s*tags:\s*$/m.test(text) && /^\s*-\s*["']?v\*["']?\s*$/m.test(text);
}

const workflows = readWorkflows();
const packages = readPublishablePackages();

// ---- A1: a tag-triggered publish workflow exists ---------------------------
const publishWorkflows = workflows.filter(
  (w) => firesOnVersionTag(w.text) && publishLineRe().test(w.text),
);
if (publishWorkflows.length === 0) {
  fail(
    "A1",
    `No workflow in ${WORKFLOW_DIR} both fires on a v* tag push and runs an npm publish. ` +
      `This repository's public packages cannot be released from it.`,
  );
}
const publishWorkflow = publishWorkflows[0];

// ---- A2: every publishable package is wired --------------------------------
if (publishWorkflow) {
  const wired = new Set();
  for (const match of publishWorkflow.text.matchAll(publishLineRe())) wired.add(match[1]);
  for (const pkg of packages) {
    if (!wired.has(pkg.name)) {
      fail(
        "A2",
        `${pkg.manifest} is publishable (no "private": true) but ${publishWorkflow.name} has no ` +
          `\`pnpm --filter ${pkg.name} publish\` step -- it would be left behind at release.`,
      );
    }
  }
}

// ---- A3: provenance preconditions on every package -------------------------
for (const pkg of packages) {
  const url = pkg.repository && pkg.repository.url;
  if (!url || !REPO_URL_RE.test(url)) {
    fail(
      "A3",
      `${pkg.manifest} repository.url is ${JSON.stringify(url)} -- npm provenance requires it to ` +
        `name ${REPO_SLUG}, the repository doing the building, or the publish is rejected.`,
    );
  }
}

// ---- A4: the workflow can actually mint provenance -------------------------
if (publishWorkflow) {
  if (!/^\s*id-token:\s*write\s*(#.*)?$/m.test(publishWorkflow.text)) {
    fail(
      "A4",
      `${publishWorkflow.name} does not declare \`id-token: write\`; --provenance cannot mint an ` +
        `attestation without it, and the publish fails after the tag already exists.`,
    );
  }
  if (!/secrets\.NPM_TOKEN/.test(publishWorkflow.text)) {
    fail("A4", `${publishWorkflow.name} never references secrets.NPM_TOKEN.`);
  }
}

// ---- A5: the prose promise must be backed by machinery ---------------------
const PROMISES = [
  ["scripts/release.sh", /triggers\s+npm\s+publish\s+via\s+CI|publish\.yml\s+workflow/i],
  ["CONTRIBUTING.md", /tag\s+triggers\s+CI\s+to\s+publish/i],
];
for (const [path, pattern] of PROMISES) {
  if (!existsSync(path)) continue;
  if (pattern.test(readFileSync(path, "utf8")) && publishWorkflows.length === 0) {
    fail(
      "A5",
      `${path} tells a contributor that tagging triggers a CI publish, and no workflow does. ` +
        `Either restore the workflow or correct the sentence -- do not ship the promise alone.`,
    );
  }
}

// ---- report ----------------------------------------------------------------
if (failures.length > 0) {
  for (const { id, message } of failures) console.error(`::error::[${id}] ${message}`);
  console.error(`\nrelease wiring: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(
  `release wiring: OK -- ${publishWorkflow.name} releases ` +
    `${packages.map((p) => p.name).join(", ")} on a v* tag.`,
);
