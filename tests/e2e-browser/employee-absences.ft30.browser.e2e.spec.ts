/**
 * Test Scope:
 *
 * Feature: FT30 - Mitarbeiterabwesenheiten Browser-Workflow
 *
 * Abgedeckte Regeln:
 * - FT30 ist im bestehenden Mitarbeiterformular erreichbar.
 * - Abwesenheiten lassen sich im Browser anlegen, bearbeiten und loeschen.
 * - Die FT30-UI bleibt im Mitarbeiterkontext und ohne Appointment-Bezug.
 *
 * Fehlerfaelle:
 * - FT30-Tab fehlt im Mitarbeiterformular.
 * - CRUD-Aktionen aktualisieren die sichtbare Liste nicht.
 *
 * Ziel:
 * Den isolierten FT30-CRUD-Flow im Browser end-to-end absichern.
 */
import { expect, test } from "@playwright/test";
import { resetDatabase } from "../helpers/resetDatabase";
import { createEmployeeFixture, getRelativeBerlinDate, resetTestDataFactoryState } from "../helpers/testDataFactory";

test.beforeEach(async () => {
  resetTestDataFactoryState();
  await resetDatabase();
});

async function loginAsAdmin(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/");
  await page.getByLabel("Benutzername oder E-Mail").fill("test-admin");
  await page.getByLabel("Passwort").fill("test-admin-password");
  await page.getByRole("button", { name: "Anmelden" }).click();
}

test("employee absences CRUD works inside employee form", async ({ page }) => {
  const employee = await createEmployeeFixture("FT30-BROWSER");
  const createFrom = getRelativeBerlinDate(2);
  const createUntil = getRelativeBerlinDate(4);
  const updateUntil = getRelativeBerlinDate(5);

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-abwesenheiten").click();

  await expect(page.getByTestId("employee-absences-panel")).toBeVisible();
  await page.getByTestId("input-employee-absence-from").fill(createFrom);
  await page.getByTestId("input-employee-absence-until").fill(createUntil);
  await page.getByTestId("button-save-employee-absence").click();

  const firstRow = page.locator("[data-testid^='employee-absence-row-']").first();
  await expect(firstRow).toContainText("Urlaub");
  await expect(firstRow).toContainText("bis");

  await firstRow.getByRole("button", { name: "Bearbeiten" }).click();
  await page.getByTestId("select-employee-absence-type").click();
  await page.getByRole("option", { name: "Krankheit" }).click();
  await page.getByTestId("input-employee-absence-until").fill(updateUntil);
  await page.getByTestId("button-save-employee-absence").click();

  await expect(firstRow).toContainText("Krankheit");

  await firstRow.getByRole("button", { name: "Loeschen" }).click();
  await expect(page.getByTestId("empty-employee-absences")).toBeVisible();
});
