import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { resetDatabase } from "./resetDatabase";
import { resetTestDataFactoryState } from "./testDataFactory";

export async function resetBrowserSuiteState() {
  resetTestDataFactoryState();
  await resetDatabase();
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
