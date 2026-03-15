import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { resetDatabase } from "./resetDatabase";
import { resetTestDataFactoryState } from "./testDataFactory";

export async function resetBrowserSuiteState() {
  resetTestDataFactoryState();
  await resetDatabase();
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
  await expect(page.getByLabel("Benutzername oder E-Mail")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Benutzername oder E-Mail").fill("test-admin");
  await page.getByLabel("Passwort").fill("test-admin-password");
  await Promise.all([
    page.waitForResponse((response) => (
      response.url().includes("/api/auth/login")
      && response.request().method() === "POST"
    ), { timeout: 15_000 }),
    page.getByRole("button", { name: "Anmelden" }).click(),
  ]);
  await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("nav-termine")).toBeVisible({ timeout: 15_000 });
}
