import { defineConfig, devices } from "@playwright/test";

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
    command: `cross-env NODE_ENV=test MUGPLAN_MODE=test LOG_LEVEL=OFF PORT=${port} tsx server/index.ts`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
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
