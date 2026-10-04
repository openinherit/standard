// @hey-api/openapi-ts configuration for the generated Zod validators.
// Run by scripts/generate-runtime-validators.sh — not by hand.
export default {
  // The ./ prefix is load-bearing: without it openapi-ts reads the path as a
  // Hey API registry shorthand ("organization/project") and fails.
  input: './openapi/openapi-bundled.yaml',
  output: 'packages/sdk/src/zod',
  // An INHERIT document carries readOnly and writeOnly fields side by side
  // (Identifier.value is writeOnly). Splitting each schema into a request
  // and a response variant would give a document validator that refuses the
  // repo's own valid examples, so the split is turned off.
  parser: { transforms: { readWrite: false } },
  plugins: [
    {
      name: 'zod',
      // JSON Schema's date-time is RFC 3339, which allows a numeric offset
      // (+01:00), not only Z. Zod's default accepts Z alone.
      dates: { offset: true },
      '~resolvers': {
        // additionalProperties: false means unknown keys are an ERROR in JSON
        // Schema. The plugin emits z.object(), which silently strips them, so
        // an invalid document parses clean. z.strictObject() rejects them.
        // Left to the default when patternProperties is present, because
        // those keys are allowed and z.strictObject() would refuse them.
        object(ctx) {
          const { $, nodes, schema, symbols } = ctx;
          if (schema.additionalProperties?.type !== 'never' || schema.patternProperties) return undefined;
          return $(symbols.z).attr('strictObject').call(nodes.shape(ctx));
        },
      },
    },
  ],
};
