#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

// Checks all JSON schema files for duplicate keys.
// JSON parsers silently accept duplicates (last wins), but they cause
// errors in strict YAML parsers like Redocly and are always a bug.

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const dirs = ["v1", "v2"];
let failures = 0;

function findJsonFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findJsonFiles(full));
    } else if (entry.endsWith(".json")) {
      results.push(full);
    }
  }
  return results;
}

function checkDuplicateKeys(filePath) {
  const content = readFileSync(filePath, "utf8");
  const seen = new Map();
  const duplicates = [];

  // Parse with a reviver that tracks key paths
  JSON.parse(content, function (key, value) {
    if (key === "") return value;

    // Build a path-like key using the parent context
    const parentKeys = seen.get(this) || new Set();
    if (parentKeys.has(key)) {
      duplicates.push(key);
    }
    parentKeys.add(key);
    seen.set(this, parentKeys);

    if (typeof value === "object" && value !== null) {
      seen.set(value, new Set());
    }
    return value;
  });

  return duplicates;
}

for (const dir of dirs) {
  try {
    statSync(dir);
  } catch {
    continue;
  }

  for (const file of findJsonFiles(dir)) {
    try {
      const dupes = checkDuplicateKeys(file);
      if (dupes.length > 0) {
        console.error(`FAIL: ${file} — duplicate keys: ${dupes.join(", ")}`);
        failures++;
      }
    } catch (e) {
      console.error(`FAIL: ${file} — parse error: ${e.message}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} file(s) with duplicate keys`);
  process.exit(1);
} else {
  console.log("No duplicate keys found");
}
