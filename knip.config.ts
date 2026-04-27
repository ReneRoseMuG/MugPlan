import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "client/src/main.tsx",
    "server/index.ts",
    "shared/routes.ts",
    "vite.config.ts",
    "vitest.config.ts",
    "vitest.workspace.ts",
    "playwright.config.ts",
    "eslint.config.mjs",
    "script/**/*.ts",
    "scripts/**/*.mjs",
    "tests/helpers/**/*.ts",
  ],
  project: [
    "client/src/**/*.{ts,tsx}",
    "server/**/*.ts",
    "shared/**/*.ts",
    "tests/**/*.{ts,tsx}",
    "script/**/*.ts",
    "scripts/**/*.mjs",
  ],
  ignore: [
    "dist/**",
    "tests/coverage/**",
    "attached_assets/**",
    "uploads/**",
    "app-logs/**",
    "shared/uploads/**",
  ],
  ignoreDependencies: [
    "@types/leaflet",
    "@types/ws",
    "bufferutil",
  ],
  ignoreBinaries: [
    "powershell",
  ],
};

export default config;
