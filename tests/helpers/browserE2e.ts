import type { Page } from "@playwright/test";

import { resetDatabase } from "./resetDatabase";
import { resetTestDataFactoryState } from "./testDataFactory";

export async function resetBrowserSuiteState() {
  resetTestDataFactoryState();
  await resetDatabase();
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/");
  await page.getByLabel("Benutzername oder E-Mail").fill("test-admin");
  await page.getByLabel("Passwort").fill("test-admin-password");
  await page.getByRole("button", { name: "Anmelden" }).click();
}
