import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    globals: false,
  },
  // Disable Tailwind v4 PostCSS pipeline — Vitest only runs pure-function
  // tests; we don't need CSS processing. Empty postcss config short-circuits
  // PostCSS auto-discovery from postcss.config.mjs (which uses Tailwind v4's
  // plugin shape that vite/postcss can't load).
  css: {
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
