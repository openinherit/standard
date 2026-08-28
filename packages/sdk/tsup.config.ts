import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "estate/index": "src/estate/index.ts",
    "estate-v2/index": "src/estate-v2/index.ts",
    "reference/index": "src/reference/index.ts",
  },
  format: ["esm"],
  dts: false,
  sourcemap: false,
  clean: true,
  splitting: false,
  outDir: "dist",
});
