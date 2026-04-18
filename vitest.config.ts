import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.env.ts"],
    env: {
      NODE_ENV: "test",
      MUGPLAN_MODE: "test",
    },
    exclude: ["node_modules", "dist", "tests/e2e-browser/**"],
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./tests/coverage",
      include: [
        "client/src/**/*.{ts,tsx}",
        "server/**/*.ts",
        "shared/**/*.ts",
      ],
      exclude: [
        "client/src/main.tsx",
        "client/src/App.tsx",
        "client/src/**/__tests__/**",
        "client/src/**/*.d.ts",
        "server/index.ts",
        "server/vite.ts",
        "server/static.ts",
        "server/db.ts",
        "shared/**/*.d.ts",
        "tests/**",
        "dist/**",
        "migrations/**",
        "script/**",
        "scripts/**",
      ],
    },
  },
});
