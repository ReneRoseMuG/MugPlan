import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",

    // Nur Tests im tests-Ordner ausführen
    include: ["tests/**/*.test.ts"],

    // node_modules & dist ausschließen
    exclude: ["node_modules", "dist"],

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./tests/coverage"
    }
  }
});
