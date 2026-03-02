/**
 * Test Scope:
 *
 * Feature: FT28 - Terminlisten in Tour-/Mitarbeiter-Formular
 * Use Case: UC Sortierung/Spaltenstruktur/Scrollverhalten der Formular-Tabellen
 *
 * Abgedeckte Regeln:
 * - Datum ist die einzige sortierbare Spalte und startet abwaerts.
 * - Umschaltung "Alle Termine" behaelt die gewaehlte Datumssortierung.
 * - Spalte "Ganztag" ist entfernt.
 * - Im Mitarbeiter-Formular sind Tour-Spalte und Tour-Filter entfernt.
 * - Projektspalte zeigt den isolierten Projektnamen ohne Kundennummer-Praefix.
 * - Mitarbeiter-Terminliste scrollt vertikal innerhalb des Tabellenbereichs mit sticky Header.
 *
 * Fehlerfaelle:
 * - Sortierung springt nach "Alle Termine" auf Default zurueck.
 * - Verbotene Spalten/Filter sind weiterhin sichtbar.
 * - Projektspalte zeigt weiterhin den gespeicherten Prefix "K: <Nr> - <Name>".
 * - Tabelle laeuft im Mitarbeiter-Formular nach unten aus.
 *
 * Ziel:
 * Browser-E2E-Nachweis fuer FT28 in beiden Formular-Kontexten.
 */
import { expect, test } from "@playwright/test";
import { resetDatabase } from "../helpers/resetDatabase";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
  resetTestDataFactoryState,
} from "../helpers/testDataFactory";

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

test("tour form appointments table: date sorting persists after show-all and no all-day column", async ({ page }) => {
  const tour = await createTourFixture("#1f8a70");
  const projectNear = await createProjectFixture({ prefix: "FT28-TOUR-NEAR", name: "Tour Near" });
  const projectFar = await createProjectFixture({ prefix: "FT28-TOUR-FAR", name: "Tour Far" });

  await createAppointmentFixture({
    projectId: projectNear.id,
    startDate: getRelativeBerlinDate(1),
    tourId: tour.id,
  });
  await createAppointmentFixture({
    projectId: projectFar.id,
    startDate: getRelativeBerlinDate(5),
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();

  const table = page.getByTestId("table-appointments-list");
  const headerTexts = await table.locator("thead th").allTextContents();
  expect(headerTexts.join(" ")).toContain("Datum");
  expect(headerTexts.join(" ")).toContain("Projekt");
  expect(headerTexts.join(" ")).toContain("Kunde");
  expect(headerTexts.join(" ")).not.toContain("Ganztag");

  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator("td").nth(1)).toHaveText("Tour Far");
  await expect(rows.nth(1).locator("td").nth(1)).toHaveText("Tour Near");

  await page.getByRole("button", { name: "Datum" }).click();
  await expect(rows.nth(0).locator("td").nth(1)).toHaveText("Tour Near");
  await expect(rows.nth(1).locator("td").nth(1)).toHaveText("Tour Far");

  await page.getByRole("switch", { name: "Alle Termine" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator("td").nth(1)).toHaveText("Tour Near");
  await expect(rows.nth(1).locator("td").nth(1)).toHaveText("Tour Far");
});

test("employee form appointments table: structure, sorting persistence and vertical inner scroll", async ({ page }) => {
  const employee = await createEmployeeFixture("FT28-EMP");
  const projectNear = await createProjectFixture({ prefix: "FT28-EMP-NEAR", name: "Emp Near" });
  const projectFar = await createProjectFixture({ prefix: "FT28-EMP-FAR", name: "Emp Far" });
  const fillerProject = await createProjectFixture({ prefix: "FT28-EMP-FILL", name: "Emp Filler" });

  await createAppointmentFixture({
    projectId: projectNear.id,
    startDate: getRelativeBerlinDate(1),
    employeeIds: [employee.id],
  });
  await createAppointmentFixture({
    projectId: projectFar.id,
    startDate: getRelativeBerlinDate(5),
    employeeIds: [employee.id],
  });

  for (let offset = 10; offset < 20; offset += 1) {
    await createAppointmentFixture({
      projectId: fillerProject.id,
      startDate: getRelativeBerlinDate(offset),
      employeeIds: [employee.id],
    });
  }

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();

  const table = page.getByTestId("table-appointments-list");
  const headerTexts = await table.locator("thead th").allTextContents();
  expect(headerTexts.join(" ")).toContain("Datum");
  expect(headerTexts.join(" ")).toContain("Projekt");
  expect(headerTexts.join(" ")).toContain("Kunde");
  expect(headerTexts.join(" ")).not.toContain("Ganztag");
  expect(headerTexts.join(" ")).not.toContain("Tour");
  await expect(page.getByText("Alle Touren")).toHaveCount(0);

  const rows = table.locator("tbody tr");
  await expect(rows.first().locator("td").nth(1)).toHaveText("Emp Filler");

  await page.getByRole("button", { name: "Datum" }).click();
  await expect(rows.first().locator("td").nth(1)).toHaveText("Emp Near");
  await page.getByRole("switch", { name: "Alle Termine" }).click();
  await expect(rows.first().locator("td").nth(1)).toHaveText("Emp Near");

  const isScrollable = await table.evaluate((element) => element.scrollHeight > element.clientHeight);
  expect(isScrollable).toBe(true);

  const firstHeader = table.locator("thead th").first();
  await expect(firstHeader).toHaveClass(/sticky/);
  await table.evaluate((element) => {
    element.scrollTop = 220;
  });
});
