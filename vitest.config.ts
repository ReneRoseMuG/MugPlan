import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",

    // Setup-Datei für Integration (führt resetDatabase vor jedem Test aus)
    setupFiles: ["tests/setup.integration.ts"],

    // Nur Tests im tests-Ordner ausführen
    include: ["tests/**/*.test.ts"],

    // Build-Artefakte und Abhängigkeiten ausschließen
    exclude: ["node_modules", "dist"],

    // WICHTIG: Keine parallelen Tests bei DB-Reset pro Test
    sequence: {
      concurrent: false
    },

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./tests/coverage"
    }
  }
});
