import { defineConfig } from "vitest/config";

// Unit tests for the web app's own code (not Next.js pages, which need a browser).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
