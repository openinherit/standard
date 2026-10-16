#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for scripts/lib/openapi30-for-oapi-codegen.mjs — the step in
 * packages/sdk-go/models/generate.sh that finishes the 3.1 → 3.0 conversion
 * @apiture/openapi-down-convert leaves undone, before oapi-codegen reads it.
 *
 * Why each step exists is in the module's header.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripConditionals, foldCollidingAliases, forOapiCodegen, goTypeName } from './lib/openapi30-for-oapi-codegen.mjs';

const doc = (schemas) => ({ openapi: '3.0.3', components: { schemas } });

test('removes if/then/else and keeps every other keyword', () => {
  const out = stripConditionals(doc({
    a: { type: 'object', properties: { x: { type: 'string' } }, if: { required: ['x'] }, then: { required: ['y'] }, else: {} },
  }));
  assert.deepEqual(out.components.schemas.a, { type: 'object', properties: { x: { type: 'string' } } });
});

test('drops an allOf member left empty, and the allOf when nothing is left', () => {
  const out = stripConditionals(doc({
    space: {
      type: 'object',
      required: ['id'],
      allOf: [{ if: { properties: { t: { enum: ['x'] } } }, then: { required: ['propertyId'] } }],
    },
  }));
  assert.deepEqual(out.components.schemas.space, { type: 'object', required: ['id'] });
});

test('keeps an allOf member that still says something', () => {
  const out = stripConditionals(doc({
    a: { allOf: [{ $ref: '#/components/schemas/b' }, { if: {}, then: { $ref: '#/components/schemas/c' } }] },
  }));
  assert.deepEqual(out.components.schemas.a, { allOf: [{ $ref: '#/components/schemas/b' }] });
});

test('a member keeping only a description is empty', () => {
  const out = stripConditionals(doc({
    a: { type: 'object', allOf: [{ description: 'why', if: {}, then: {} }] },
  }));
  assert.deepEqual(out.components.schemas.a, { type: 'object' });
});

test('reaches conditionals nested under properties and items', () => {
  const out = stripConditionals(doc({
    a: { type: 'object', properties: { list: { type: 'array', items: { type: 'object', if: {}, then: {} } } } },
  }));
  assert.deepEqual(out.components.schemas.a.properties.list.items, { type: 'object' });
});

test('a property NAMED if, then or else is a name, not a keyword', () => {
  const props = { if: { type: 'string' }, then: { type: 'string' }, else: { type: 'string' } };
  const out = stripConditionals(doc({
    if: { type: 'object', properties: structuredClone(props), patternProperties: { '^then$': { type: 'string' } } },
  }));
  assert.deepEqual(Object.keys(out.components.schemas), ['if']);
  assert.deepEqual(out.components.schemas.if.properties, props);
  assert.deepEqual(Object.keys(out.components.schemas.if.patternProperties), ['^then$']);
});

test('an allOf member that was already bare goes too: it constrains nothing', () => {
  const out = stripConditionals(doc({ a: { type: 'object', allOf: [{}, { $comment: 'note' }, { required: ['x'] }] } }));
  assert.deepEqual(out.components.schemas.a, { type: 'object', allOf: [{ required: ['x'] }] });
});

test('does not mutate its input', () => {
  const input = doc({ a: { type: 'object', if: {}, then: {} } });
  const before = structuredClone(input);
  stripConditionals(input);
  assert.deepEqual(input, before);
});

test('a numeric exclusive bound becomes the 3.0 boolean form', () => {
  const out = forOapiCodegen(doc({
    n: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 10 },
    m: { type: 'number', minimum: 1, exclusiveMinimum: true },
  }));
  assert.deepEqual(out.components.schemas.n, { type: 'number', minimum: 0, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true });
  assert.deepEqual(out.components.schemas.m, { type: 'number', minimum: 1, exclusiveMinimum: true });
});

test('forOapiCodegen also strips conditionals', () => {
  const out = forOapiCodegen(doc({ a: { type: 'object', if: {}, then: {} } }));
  assert.deepEqual(out.components.schemas.a, { type: 'object' });
});

test('an alias component whose Go name is its target\'s is folded into the target', () => {
  const input = {
    openapi: '3.0.3',
    paths: { '/v': { post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Catalogue' } } } } } } },
    components: { schemas: {
      Catalogue: { description: 'alias', 'x-inherit-maturity': 'draft', $ref: '#/components/schemas/catalogue' },
      catalogue: { type: 'object', properties: { conformanceProfile: { enum: ['catalogue'] } } },
      'asset-interest': { type: 'object' },
      AssetInterest: { $ref: '#/components/schemas/asset-interest' },
      holder: { type: 'object', properties: { i: { $ref: '#/components/schemas/AssetInterest' } } },
    } },
  };
  const out = foldCollidingAliases(input);
  assert.deepEqual(Object.keys(out.components.schemas), ['catalogue', 'asset-interest', 'holder']);
  assert.equal(out.paths['/v'].post.requestBody.content['application/json'].schema.$ref, '#/components/schemas/catalogue');
  assert.equal(out.components.schemas.holder.properties.i.$ref, '#/components/schemas/asset-interest');
});

test('an alias with a DIFFERENT Go name, or one that adds a constraint, is left alone', () => {
  const schemas = {
    Root: { $ref: '#/components/schemas/schema' },
    schema: { type: 'object' },
    Space: { $ref: '#/components/schemas/space', maxProperties: 3 },
    space: { type: 'object' },
  };
  const out = foldCollidingAliases({ openapi: '3.0.3', components: { schemas } });
  assert.deepEqual(out.components.schemas, schemas);
});

test('forOapiCodegen folds colliding aliases too', () => {
  const out = forOapiCodegen(doc({ Pet: { $ref: '#/components/schemas/pet' }, pet: { type: 'object' } }));
  assert.deepEqual(Object.keys(out.components.schemas), ['pet']);
});

test('goTypeName matches oapi-codegen ToCamelCase', () => {
  assert.equal(goTypeName('asset-interest'), 'AssetInterest');
  assert.equal(goTypeName('AssetInterest'), 'AssetInterest');
  assert.equal(goTypeName('field_provenance.v2'), 'FieldProvenanceV2');
  assert.equal(goTypeName('a3b'), 'A3b');
  assert.equal(goTypeName('schema'), 'Schema');
});

test('example, default, enum, const and x- values are data, not schemas', () => {
  const data = { if: 1, then: 2, exclusiveMinimum: 3, allOf: [{}] };
  const s = { type: 'object', example: data, examples: [data], default: data, enum: [data], const: data, 'x-sample': data };
  const out = forOapiCodegen(doc({ a: structuredClone(s) }));
  assert.deepEqual(out.components.schemas.a, s);
});

test('an alias of an alias is repointed to the end of the chain', () => {
  const out = foldCollidingAliases({ openapi: '3.0.3', components: { schemas: {
    'Pet': { $ref: '#/components/schemas/pet_' },
    'pet_': { $ref: '#/components/schemas/pet' },
    'pet': { type: 'object' },
    holder: { properties: { p: { $ref: '#/components/schemas/Pet' } } },
  } } });
  assert.deepEqual(Object.keys(out.components.schemas), ['pet', 'holder']);
  assert.equal(out.components.schemas.holder.properties.p.$ref, '#/components/schemas/pet');
});
