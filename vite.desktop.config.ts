import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/desktop/renderer",
  base: "./",
  cacheDir: "../../../.vite-desktop",
  plugins: [react()],
  build: {
    outDir: "../../../dist-desktop/renderer",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
});
