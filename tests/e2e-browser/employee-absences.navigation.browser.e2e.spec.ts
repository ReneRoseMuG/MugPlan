/**
 * Test Scope:
 *
 * Feature: FT30 - Hauptnavigation Abwesenheiten
 *
 * Abgedeckte Regeln:
 * - Die Hauptnavigation bietet einen eigenen Einstieg fuer Abwesenheiten.
 * - Die Navigationsansicht erlaubt Mitarbeiterauswahl und zeigt Abwesenheiten als Tabelle.
 * - Der wiederverwendete FT30-Editor erlaubt CRUD auch ausserhalb des Mitarbeiterformulars.
 *
 * Fehlerfaelle:
 * - Navigationspunkt fehlt oder oeffnet keine globale Abwesenheitenansicht.
 * - Mitarbeiterauswahl wirkt nicht auf Tabelle und Editor.
 *
 * Ziel:
 * Den globalen FT30-Abwesenheiten-Workflow browserseitig ueber Navigation, Auswahl und Tabellenansicht absichern.
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

test("employee absences navigation page supports employee selection and table based CRUD", async ({ page }) => {
  const employeeA = await createEmployeeFixture("FT30-NAV-A");
  await createEmployeeFixture("FT30-NAV-B");
  const createFrom = getRelativeBerlinDate(3);
  const createUntil = getRelativeBerlinDate(6);

  await loginAsAdmin(page);
  await page.getByTestId("nav-abwesenheiten").click();

  await expect(page.getByTestId("select-employee-absences-employee")).toBeVisible();
  await page.getByTestId("select-employee-absences-employee").click();
  await page.getByRole("option", { name: employeeA.fullName }).click();

  await page.getByTestId("input-employee-absence-from").fill(createFrom);
  await page.getByTestId("input-employee-absence-until").fill(createUntil);
  await page.getByTestId("button-save-employee-absence").click();

  const table = page.getByTestId("table-employee-absences");
  await expect(table).toBeVisible();
  await expect(table).toContainText("Urlaub");

  const firstRow = table.locator("tbody tr").first();
  await firstRow.getByRole("button", { name: "Bearbeiten" }).click();
  await page.getByTestId("select-employee-absence-type").click();
  await page.getByRole("option", { name: "Krankheit" }).click();
  await page.getByTestId("button-save-employee-absence").click();
  await expect(table).toContainText("Krankheit");

  await firstRow.getByRole("button", { name: "Loeschen" }).click();
  await expect(page.getByTestId("empty-employee-absences")).toBeVisible();
});
