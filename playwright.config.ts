import { defineConfig, devices } from "@playwright/test";
import { configureTestStorageIsolationSync } from "./tests/helpers/testStorageIsolation";

process.env.NODE_ENV ??= "test";
process.env.MUGPLAN_MODE ??= "test";
configureTestStorageIsolationSync();

const port = Number(process.env.PLAYWRIGHT_PORT ?? "4174");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e-browser",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: `cross-env NODE_ENV=test MUGPLAN_MODE=test LOG_LEVEL=OFF PORT=${port} ATTACHMENT_STORAGE_PATH="${process.env.ATTACHMENT_STORAGE_PATH}" BACKUP_BASE_PATH="${process.env.BACKUP_BASE_PATH}" tsx server/index.ts`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
