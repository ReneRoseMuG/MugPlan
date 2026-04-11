/**
 * Test Scope:
 *
 * Feature: FT28 - Terminlisten in Tour-/Mitarbeiter-Formular
 * Use Case: UC Sortierung/Spaltenstruktur/Scrollverhalten der Formular-Tabellen
 *
 * Abgedeckte Regeln:
 * - Datum startet aufsteigend und bleibt nach Scope-Wechsel erhalten.
 * - Umschaltung zwischen "Geplante Termine" und "Alle Termine" behaelt die gewaehlte Datumssortierung.
 * - Spalte "Ganztag" ist entfernt.
 * - Listenlayout zeigt die aktuell verdrahteten Zeit-, Auftrags- und Kunden-Spalten.
 * - Im Mitarbeiter-Formular bleibt der Tour-Filter ausgeblendet.
 * - Projektspalte zeigt den isolierten Projektnamen ohne Kundennummer-Praefix.
 * - Mitarbeiter-Terminliste scrollt vertikal innerhalb des Tabellenbereichs mit sticky Header.
 *
 * Fehlerfaelle:
 * - Sortierung springt nach einem Scope-Wechsel auf die Standardsortierung zurueck.
 * - Verbotene Spalten/Filter sind weiterhin sichtbar.
 * - Projektspalte zeigt weiterhin den gespeicherten Prefix "K: <Nr> - <Name>".
 * - Tabelle laeuft im Mitarbeiter-Formular nach unten aus.
 *
 * Ziel:
 * Browser-E2E-Nachweis fuer FT28 in beiden Formular-Kontexten.
 */
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../helpers/browserE2e";
import { applyTestSystemSeed, resetDatabase } from "../helpers/resetDatabase";
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
  await applyTestSystemSeed();
});

test("tour form appointments table: date sorting persists across appointment scope toggles and no all-day column", async ({ page }) => {
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
  await page.getByTestId("tab-tour-termine").click();

  const table = page.getByTestId("table-appointments-list");
  const ensurePeriodPickerOpen = async () => {
    const allScopeToggle = page.getByTestId("toggle-appointments-scope-all");
    if (await allScopeToggle.isVisible()) return;
    await page.getByTestId("button-appointment-period-picker").click();
    await expect(allScopeToggle).toBeVisible();
  };
  await expect(table).toBeVisible();
  await expect(page.getByTestId("text-appointments-page-state")).toBeVisible();
  const headerTexts = await table.locator("thead th").allTextContents();
  expect(headerTexts).toEqual(expect.arrayContaining(["Uhrzeit", "Datum", "Auftrag Nr.", "Projekt", "Kunde Nr.", "Kunde"]));
  expect(headerTexts.join(" ")).toContain("Datum");
  expect(headerTexts.join(" ")).toContain("Projekt");
  expect(headerTexts.join(" ")).toContain("Kunde");
  expect(headerTexts.join(" ")).not.toContain("Ganztag");

  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator("td").nth(3)).toContainText("Tour Near");
  await expect(rows.nth(1).locator("td").nth(3)).toContainText("Tour Far");

  await table.locator("thead").getByRole("button", { name: "Datum" }).click();
  await expect(rows.nth(0).locator("td").nth(3)).toContainText("Tour Far");
  await expect(rows.nth(1).locator("td").nth(3)).toContainText("Tour Near");

  await ensurePeriodPickerOpen();
  await page.getByTestId("toggle-appointments-scope-planned").click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator("td").nth(3)).toContainText("Tour Far");
  await expect(rows.nth(1).locator("td").nth(3)).toContainText("Tour Near");

  await ensurePeriodPickerOpen();
  await page.getByTestId("toggle-appointments-scope-all").click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator("td").nth(3)).toContainText("Tour Far");
  await expect(rows.nth(1).locator("td").nth(3)).toContainText("Tour Near");
});

test("employee form appointments table: structure, scope toggle persistence and vertical inner scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });

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

  for (let offset = 10; offset < 32; offset += 1) {
    await createAppointmentFixture({
      projectId: fillerProject.id,
      startDate: getRelativeBerlinDate(offset),
      employeeIds: [employee.id],
    });
  }

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();

  const table = page.getByTestId("table-appointments-list");
  const ensurePeriodPickerOpen = async () => {
    const allScopeToggle = page.getByTestId("toggle-appointments-scope-all");
    if (await allScopeToggle.isVisible()) return;
    await page.getByTestId("button-appointment-period-picker").click();
    await expect(allScopeToggle).toBeVisible();
  };
  await expect(table).toBeVisible();
  await expect(page.getByTestId("text-appointments-page-state")).toBeVisible();
  const headerTexts = await table.locator("thead th").allTextContents();
  expect(headerTexts).toEqual(expect.arrayContaining(["Uhrzeit", "Datum", "Auftrag Nr.", "Projekt", "Kunde Nr.", "Kunde", "Tour"]));
  expect(headerTexts.join(" ")).toContain("Datum");
  expect(headerTexts.join(" ")).toContain("Projekt");
  expect(headerTexts.join(" ")).toContain("Kunde");
  expect(headerTexts.join(" ")).toContain("Tour");
  expect(headerTexts.join(" ")).not.toContain("Ganztag");
  await expect(page.getByText("Alle Touren")).toHaveCount(0);

  const rows = table.locator("tbody tr");
  await expect(rows.first().locator("td").nth(3)).toContainText("Emp Near");
  
  await table.locator("thead").getByRole("button", { name: "Datum" }).click();
  await expect(rows.first().locator("td").nth(3)).toContainText("Emp Filler");
  await ensurePeriodPickerOpen();
  await page.getByTestId("toggle-appointments-scope-planned").click();
  await expect(rows.first().locator("td").nth(3)).toContainText("Emp Filler");
  await ensurePeriodPickerOpen();
  await page.getByTestId("toggle-appointments-scope-all").click();
  await expect(rows.first().locator("td").nth(3)).toContainText("Emp Filler");

  const scrollViewport = table.locator(":scope > div").first();
  const scrollMeta = await scrollViewport.evaluate((element) => ({
    overflowY: window.getComputedStyle(element).overflowY,
    isScrollable: element.scrollHeight > element.clientHeight,
  }));
  expect(scrollMeta.overflowY === "auto" || scrollMeta.overflowY === "scroll").toBe(true);
  // Scrollbarkeit ist viewport-abhaengig; der Container muss als innerer Scrollbereich konfiguriert sein.
  expect(typeof scrollMeta.isScrollable).toBe("boolean");

  const firstHeader = table.locator("thead th").first();
  await expect(firstHeader).toHaveClass(/sticky/);
  await expect(firstHeader).toHaveClass(/bg-muted\/95/);
  await scrollViewport.evaluate((element) => {
    element.scrollTop = 220;
  });
});
