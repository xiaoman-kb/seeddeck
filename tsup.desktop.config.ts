import { defineConfig } from "tsup";

const common = {
  target: "node22",
  platform: "node" as const,
  external: ["electron"],
  sourcemap: false,
  dts: false,
  splitting: false,
  shims: false,
  minify: false,
};

export default defineConfig([
  {
    ...common,
    format: ["esm"],
    entry: { index: "src/desktop/main/index.ts" },
    outDir: "dist-desktop/main",
    clean: true,
  },
  {
    ...common,
    format: ["cjs"],
    entry: { index: "src/desktop/preload/index.ts" },
    outDir: "dist-desktop/preload",
    clean: true,
    outExtension: () => ({ js: ".cjs" }),
  },
]);
