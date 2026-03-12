import { defineConfig, defineProject, mergeConfig } from "vitest/config";
import path from "path";
import baseConfig from "./vitest.config";

const alias = {
  "@": path.resolve(import.meta.dirname, "client", "src"),
  "@shared": path.resolve(import.meta.dirname, "shared"),
  "@assets": path.resolve(import.meta.dirname, "attached_assets"),
};

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      projects: [
        defineProject({
          resolve: { alias },
          test: {
            name: "unit",
            include: [
              "tests/unit/**/*.test.ts",
              "tests/unit/**/*.test.tsx",
            ],
            exclude: ["tests/integration/**", "tests/e2e/**", "tests/e2e-browser/**"],
            setupFiles: ["./tests/setup.unit.ts"],
          },
        }),
        defineProject({
          resolve: { alias },
          test: {
            name: "integration",
            include: [
              "tests/integration/**/*.test.ts",
              "tests/integration/**/*.test.tsx",
            ],
            exclude: ["tests/unit/**", "tests/e2e/**", "tests/e2e-browser/**"],
            setupFiles: ["./tests/setup.integration.ts"],
          },
        }),
        defineProject({
          resolve: { alias },
          test: {
            name: "e2e",
            include: [
              "tests/e2e/**/*.test.ts",
            ],
            exclude: ["tests/unit/**", "tests/integration/**", "tests/e2e-browser/**"],
            setupFiles: ["./tests/setup.integration.ts"],
          },
        }),
      ],
    },
  }),
);
