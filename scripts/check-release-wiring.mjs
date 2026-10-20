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
import { DIST_TAG } from "./release-policy.mjs";

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
  ["CONTRIBUTING.md", /git\s+tag\s+triggers/i],
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

// ---- A6: the publish workflow checks the tarball before it publishes it ----
// check-release-contents.mjs packs the packages and verifies their contents.
// It only protects a release if it runs, and runs BEFORE the first publish:
// after it, a refusal arrives too late to stop anything.
if (publishWorkflow) {
  const lines = publishWorkflow.text.split("\n");
  const firstPublish = lines.findIndex((l) => publishLineRe().test(l));
  const contentsCheck = lines.findIndex((l) =>
    /^[^#]*\bnode\s+scripts\/check-release-contents\.mjs\b[^#]*--tag\b/.test(l));
  if (contentsCheck === -1) {
    fail(
      "A6",
      `${publishWorkflow.name} never runs \`node scripts/check-release-contents.mjs --tag ...\` -- ` +
        `nothing checks what is inside the tarballs before they reach the public registry.`,
    );
  } else if (firstPublish !== -1 && contentsCheck > firstPublish) {
    fail(
      "A6",
      `${publishWorkflow.name} runs check-release-contents.mjs after its first publish step; ` +
        `a refusal there cannot un-publish anything. Move it before the first publish.`,
    );
  }
}

// ---- A7: the release zip of the conformance kit carries the whole kit -------
// release.sh attaches openinherit-conformance-<version>.zip to the GitHub
// release as the kit to "validate your implementation against". It once zipped
// only schemas/, so the download had no test documents, no expected results
// and no manifest. The npm tarball is defined by the package's `files` list;
// the zip must carry every one of those paths too.
const RELEASE_SCRIPT = "scripts/release.sh";
const KIT_MANIFEST = join(PACKAGES_DIR, "conformance", "package.json");
if (existsSync(KIT_MANIFEST)) {
  const kitFiles = JSON.parse(readFileSync(KIT_MANIFEST, "utf8")).files || [];
  if (!existsSync(RELEASE_SCRIPT)) {
    fail("A7", `${RELEASE_SCRIPT} does not exist, so nothing builds the conformance kit's release zip.`);
  } else {
    const zipLine = readFileSync(RELEASE_SCRIPT, "utf8")
      .split("\n")
      .find((l) => /^[^#]*\bzip\b[^#]*openinherit-conformance-/.test(l));
    if (!zipLine) {
      fail("A7", `${RELEASE_SCRIPT} has no \`zip ... openinherit-conformance-...\` line.`);
    } else {
      const args = new Set(zipLine.split(/\s+/));
      for (const entry of ["package.json", ...kitFiles]) {
        if (!args.has(entry)) {
          fail(
            "A7",
            `${RELEASE_SCRIPT} zips the conformance kit without \`${entry}\`, which ` +
              `${KIT_MANIFEST} packs -- the release download would not be the kit npm ships.`,
          );
        }
      }
    }
  }
}

// ---- A8: every publish names the dist-tag ----------------------------------
// Without --tag, npm moves `latest` to whatever was just published -- a LOWER
// version included. The policy has one dist-tag; every publish must say it.
if (publishWorkflow) {
  for (const line of publishWorkflow.text.split("\n")) {
    if (!publishLineRe().test(line)) continue;
    const tag = /\s--tag[=\s]+["']?([^\s"']+)/.exec(line);
    if (!tag || tag[1] !== DIST_TAG) {
      fail(
        "A8",
        `${publishWorkflow.name} publishes without \`--tag ${DIST_TAG}\`: ${line.trim()} -- ` +
          `docs/policies/versioning.md promises one dist-tag, "${DIST_TAG}".`,
      );
    }
  }
}

// ---- A9: the support window is checked before anything is published -------
// release-policy.mjs refuses a version that is not newer than every released
// one. It protects a release only if the tag workflow runs it before the first
// publish, and release.sh runs it before it bumps and tags.
const POLICY_RUN = /^[^#\n]*\bnode\s+[^\n#]*scripts\/release-policy\.mjs\b[^#\n]*--version\b/;
if (publishWorkflow) {
  const lines = publishWorkflow.text.split("\n");
  const firstPublish = lines.findIndex((l) => publishLineRe().test(l));
  const policy = lines.findIndex((l) => POLICY_RUN.test(l));
  if (policy === -1) {
    fail(
      "A9",
      `${publishWorkflow.name} never runs \`node scripts/release-policy.mjs --version ...\` -- ` +
        `nothing stops a backport or an already-released version reaching the registry.`,
    );
  } else {
    if (firstPublish !== -1 && policy > firstPublish) {
      fail("A9", `${publishWorkflow.name} runs release-policy.mjs after its first publish step. Move it before.`);
    }
    // A step that cannot fail does not refuse anything: no `|| ...` on the
    // command, and no continue-on-error or if: on the step that holds it.
    if (/\|\|/.test(lines[policy])) {
      fail("A9", `${publishWorkflow.name} runs release-policy.mjs with \`||\`, so its refusal is swallowed.`);
    }
    let start = policy;
    while (start > 0 && !/^\s*-\s+(name|uses|run):/.test(lines[start])) start--;
    let end = policy + 1;
    while (end < lines.length && !/^\s*-\s+(name|uses|run):/.test(lines[end])) end++;
    const step = lines.slice(start, end).join("\n");
    if (/^\s*(-\s+)?continue-on-error:/m.test(step) || /^\s*(-\s+)?if:/m.test(step)) {
      fail(
        "A9",
        `${publishWorkflow.name}'s release-policy step carries continue-on-error or if:, so it may ` +
          `not run or not stop the publish.`,
      );
    }
  }
}
if (existsSync(RELEASE_SCRIPT)) {
  const lines = readFileSync(RELEASE_SCRIPT, "utf8").split("\n");
  const policy = lines.findIndex((l) => POLICY_RUN.test(l));
  const firstBump = lines.findIndex((l) => /^[^#]*\bpkg\.version\s*=/.test(l));
  if (policy === -1) {
    fail(
      "A9",
      `${RELEASE_SCRIPT} never runs \`node scripts/release-policy.mjs --version ...\`, so it would ` +
        `bump and tag a version the publish workflow then refuses.`,
    );
  } else if (firstBump !== -1 && policy > firstBump) {
    fail("A9", `${RELEASE_SCRIPT} runs release-policy.mjs after it bumps the version. Move it before.`);
  }
}

// ---- A10: the policy says what the machinery does ---------------------------
const POLICY_DOC = "docs/policies/versioning.md";
if (!existsSync(POLICY_DOC)) {
  fail("A10", `${POLICY_DOC} does not exist; the release rules A8 and A9 enforce are written nowhere.`);
} else {
  const doc = readFileSync(POLICY_DOC, "utf8");
  for (const heading of ["Support window", "Distribution tags"]) {
    if (!new RegExp(`^##\\s+${heading}\\s*$`, "m").test(doc)) {
      fail("A10", `${POLICY_DOC} has no "## ${heading}" section; A8/A9 enforce a rule it does not state.`);
    }
  }
  if (!doc.includes(`\`${DIST_TAG}\``)) {
    fail("A10", `${POLICY_DOC} never names \`${DIST_TAG}\`, the dist-tag every publish uses.`);
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
