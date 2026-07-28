import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// `.mts` on purpose: @vitejs/plugin-react is ESM-only, and this package is CJS
// (Next's postcss/tailwind configs need it that way), so the config file has to
// opt into ESM itself.
export default defineConfig({
  plugins: [react()],
  // tsconfig sets `jsx: "preserve"` for Next's own compiler, which makes Vite
  // fall back to the classic runtime and expect a React import in every file.
  // Pin the automatic runtime so components don't need one.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
