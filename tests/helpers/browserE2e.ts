import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { applyTestSystemSeed, resetDatabase } from "./resetDatabase";
import {
  assertIsolationFingerprintForConfiguredRun,
  injectConfiguredCanariesForRun,
  readIsolationExecutionConfigForSuite,
  shouldInjectConfiguredCanaries,
} from "./testIsolationExecution";
import { resetTestDataFactoryState } from "./testDataFactory";
import { resetIsolatedTestStorage } from "./testStorageIsolation";

export async function resetBrowserSuiteState(testPath?: string) {
  const resolvedSuitePath = resolveBrowserSuitePath(testPath);
  const config = readIsolationExecutionConfigForSuite(resolvedSuitePath);

  await resetIsolatedTestStorage();
  resetTestDataFactoryState();
  await resetDatabase();
  if (config.baseline === "seeded") {
    await applyTestSystemSeed();
  }
  await assertIsolationFingerprintForConfiguredRun(resolvedSuitePath);

  if (shouldInjectConfiguredCanaries()) {
    await injectConfiguredCanariesForRun();
  }
}

function resolveBrowserSuitePath(testPath?: string) {
  if (testPath) {
    return testPath;
  }

  const stack = new Error().stack ?? "";
  const stackLines = stack.split("\n");

  for (const line of stackLines) {
    const match = line.match(/tests[\\/](e2e-browser[\\/][^:\)\s]+\.spec\.ts)/);
    if (match?.[1]) {
      return `tests/${match[1].replaceAll("\\", "/")}`;
    }
  }

  return "browser-suite";
}

async function isVisible(locator: ReturnType<Page["getByTestId"]> | ReturnType<Page["getByLabel"]>) {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

export async function loginAsAdmin(page: Page) {
  try {
    await page.goto("/");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ERR_CONNECTION_FAILED")) {
      throw error;
    }
    await page.waitForTimeout(1000);
    await page.goto("/");
  }

  const loginField = page.getByLabel("Benutzername oder E-Mail");
  const passwordField = page.getByLabel("Passwort");
  const sidebar = page.getByTestId("sidebar");
  const appointmentsNav = page.getByTestId("nav-termine");

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isVisible(sidebar) || await isVisible(appointmentsNav)) {
      await expect(sidebar).toBeVisible({ timeout: 15_000 });
      await expect(appointmentsNav).toBeVisible({ timeout: 15_000 });
      return;
    }

    if (await isVisible(loginField)) {
      await passwordField.fill("test-admin-password");
      await loginField.fill("test-admin");
      await Promise.all([
        page.waitForResponse((response) => (
          response.url().includes("/api/auth/login")
          && response.request().method() === "POST"
        ), { timeout: 15_000 }),
        page.getByRole("button", { name: "Anmelden" }).click(),
      ]);
      await expect(sidebar).toBeVisible({ timeout: 15_000 });
      await expect(appointmentsNav).toBeVisible({ timeout: 15_000 });
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error("Neither login screen nor authenticated app shell became visible in loginAsAdmin().");
}
