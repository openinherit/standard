// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCHEMA_DIR = 'v2';
const COMMON_DIR = 'v3/common';
const OUTPUT = 'dist/schema-graph.json';
const BASE_URI = 'https://openinherit.org/v3/';

// Find the jsonschema binary path
const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Collect all schema files
const coreSchemas = readdirSync(SCHEMA_DIR)
  .filter(f => f.endsWith('.json') && f !== 'dialect.json')
  .map(f => join(SCHEMA_DIR, f));

const commonSchemas = readdirSync(COMMON_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => join(COMMON_DIR, f));

const allSchemas = [...coreSchemas, ...commonSchemas];

// Build graph
const nodes = [];
const edges = [];

for (const schemaPath of allSchemas) {
  // Read schema for metadata
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const id = schema.$id;
  if (!id) continue;

  const slug = id.replace(BASE_URI, '').replace('.json', '').replace('common/', '');
  const category = schemaPath.startsWith(COMMON_DIR) ? 'common' : 'core';

  nodes.push({
    id,
    slug,
    title: schema.title || slug,
    description: schema.description || '',
    category,
    path: schemaPath,
    propertyCount: schema.properties ? Object.keys(schema.properties).length : 0,
  });

  // Run inspect to get references
  try {
    const output = execFileSync(
      npxPath,
      [
        'jsonschema', 'inspect', schemaPath,
        '--resolve', 'v3/dialect.json',
        '--resolve', 'v3/',
        '--resolve', 'v3/common/',
        '--json',
      ],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const inspectData = JSON.parse(output);

    for (const ref of inspectData.references || []) {
      // Skip $schema references to dialect
      if (ref.origin === '/$schema') continue;
      // Skip self-references (internal $defs)
      if (ref.base === id) continue;

      // Only include references to other INHERIT schemas
      if (ref.base && ref.base.startsWith(BASE_URI)) {
        // Deduplicate: only add unique source->target pairs
        const existing = edges.find(e => e.source === id && e.target === ref.base);
        if (!existing) {
          edges.push({
            source: id,
            target: ref.base,
            property: ref.origin.split('/').pop().replace('$ref', ''),
          });
        }
      }
    }
  } catch (err) {
    console.error(`Warning: inspect failed for ${schemaPath}: ${err.message}`);
  }
}

const graph = {
  generated: new Date().toISOString(),
  nodeCount: nodes.length,
  edgeCount: edges.length,
  nodes,
  edges,
};

writeFileSync(OUTPUT, JSON.stringify(graph, null, 2));
console.log(`Graph data written to ${OUTPUT}: ${nodes.length} nodes, ${edges.length} edges`);
