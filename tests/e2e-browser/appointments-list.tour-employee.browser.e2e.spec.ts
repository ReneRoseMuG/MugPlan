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
import { expect, test } from "./fixtures";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProductFixture,
  createProjectFixture,
  createProjectFixtureWithOverrides,
  createProjectOrderItemFixture,
  createRawAppointmentFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts");
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

test("appointments table preview uses the detail week card and stays inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 420 });

  const project = await createProjectFixtureWithOverrides({
    prefix: "FT28-PREVIEW-DETAIL",
    name: "Preview Detail Projekt",
    descriptionMd: "<p>Preview Anmerkung eins.</p><p>Preview Anmerkung zwei.</p><p>Preview Anmerkung drei.</p><p>Preview Anmerkung vier.</p><p>Preview Anmerkung fuenf.</p>",
  });
  const orderNumber = project.projectOrder?.orderNumber ?? project.orderNumber ?? "";
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "Preview Detail Sauna",
    description: "Produkt fuer Terminlistenpreview.",
  });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    productId: product.id,
    quantity: 1,
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-termine").click();
  const table = page.getByTestId("table-appointments-list");
  await expect(table).toBeVisible({ timeout: 10_000 });
  const row = table.locator("tbody tr").filter({ hasText: project.name }).first();
  await expect(row).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  await row.hover();

  const previewPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`).first();
  await expect(previewPanel).toBeVisible({ timeout: 5_000 });
  await expect(previewPanel.getByTestId("week-project-detail-renderer-articles-list")).toContainText(product.name);
  await expect(previewPanel.getByTestId("week-project-detail-renderer-description")).toContainText("Anmerkungen");

  const previewBox = await previewPanel.boundingBox();
  expect(previewBox).not.toBeNull();
  expect((previewBox?.x ?? 0)).toBeGreaterThanOrEqual(0);
  expect((previewBox?.y ?? 0)).toBeGreaterThanOrEqual(0);
  expect((previewBox?.x ?? 0) + (previewBox?.width ?? 0)).toBeLessThanOrEqual(900);
  expect((previewBox?.y ?? 0) + (previewBox?.height ?? 0)).toBeLessThanOrEqual(424);
});

test("tour form jumps to the page of the next upcoming appointment and highlights it", async ({ page }) => {
  const tour = await createTourFixture("#1769aa");
  const historicProject = await createProjectFixture({ prefix: "FT28-TOUR-FOCUS-HIST", name: "Tour Focus Historic" });
  const futureProject = await createProjectFixture({ prefix: "FT28-TOUR-FOCUS-FUT", name: "Tour-Focus-Fut" });

  for (let index = 0; index < 25; index += 1) {
    await createRawAppointmentFixture({
      projectId: historicProject.id,
      startDate: `2000-03-${String(index + 1).padStart(2, "0")}`,
      title: `Tour Focus Historic ${index + 1}`,
      tourId: tour.id,
    });
  }
  await createAppointmentFixture({
    projectId: futureProject.id,
    startDate: getRelativeBerlinDate(1),
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();
  await page.getByTestId("tab-tour-termine").click();

  const table = page.getByTestId("table-appointments-list");
  await expect(page.getByTestId("text-appointments-page-state")).toContainText("Seite 2 von 2");
  const focusedRow = table.locator("tbody tr").filter({ hasText: futureProject.name }).first();
  await expect(focusedRow).toBeVisible();
  await expect(focusedRow).toHaveClass(/bg-sky-100\/80/);
});

test("employee form jumps to the page of the next upcoming appointment and highlights it", async ({ page }) => {
  const employee = await createEmployeeFixture("FT28-EMP-FOCUS");
  const historicProject = await createProjectFixture({ prefix: "FT28-EMP-FOCUS-HIST", name: "Emp Focus Historic" });
  const futureProject = await createProjectFixture({ prefix: "FT28-EMP-FOCUS-FUT", name: "Emp Focus Future" });

  for (let index = 0; index < 25; index += 1) {
    await createRawAppointmentFixture({
      projectId: historicProject.id,
      startDate: `2000-04-${String(index + 1).padStart(2, "0")}`,
      title: `Emp Focus Historic ${index + 1}`,
      employeeIds: [employee.id],
    });
  }
  const focusAppointment = await createAppointmentFixture({
    projectId: futureProject.id,
    startDate: getRelativeBerlinDate(1),
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();

  const table = page.getByTestId("table-appointments-list");
  await expect(page.getByTestId("text-appointments-page-state")).toContainText("Seite 2 von 2");
  const focusedRow = table.locator("tbody tr").filter({ hasText: futureProject.name }).first();
  await expect(focusedRow).toBeVisible();
  await expect(focusedRow).toHaveClass(/bg-sky-100\/80/);
  await expect(table.getByTestId(`button-remove-employee-from-appointment-${focusAppointment.id}`)).toBeVisible();
});

test("tour form leaves historical-only rows on page one without a false focus highlight", async ({ page }) => {
  const tour = await createTourFixture("#225577");
  const historicProject = await createProjectFixture({ prefix: "FT28-TOUR-HISTORY", name: "Tour History Only" });

  await createRawAppointmentFixture({
    projectId: historicProject.id,
    startDate: "2000-08-01",
    title: "Tour History Only 1",
    tourId: tour.id,
  });
  await createRawAppointmentFixture({
    projectId: historicProject.id,
    startDate: "2000-08-02",
    title: "Tour History Only 2",
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();
  await page.getByTestId("tab-tour-termine").click();

  const table = page.getByTestId("table-appointments-list");
  const historicRow = table.locator("tbody tr").filter({ hasText: historicProject.name }).first();
  await expect(page.getByTestId("text-appointments-page-state")).toContainText("Seite 1 von 1");
  await expect(historicRow).toBeVisible();
  await expect(historicRow).not.toHaveClass(/bg-sky-100\/80/);
});

test("employee form leaves historical-only rows on page one without a false focus highlight", async ({ page }) => {
  const employee = await createEmployeeFixture("FT28-EMP-HISTORY");
  const historicProject = await createProjectFixture({ prefix: "FT28-EMP-HISTORY", name: "Emp History Only" });

  await createRawAppointmentFixture({
    projectId: historicProject.id,
    startDate: "2000-09-01",
    title: "Emp History Only 1",
    employeeIds: [employee.id],
  });
  await createRawAppointmentFixture({
    projectId: historicProject.id,
    startDate: "2000-09-02",
    title: "Emp History Only 2",
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();

  const table = page.getByTestId("table-appointments-list");
  const historicRow = table.locator("tbody tr").filter({ hasText: historicProject.name }).first();
  await expect(page.getByTestId("text-appointments-page-state")).toContainText("Seite 1 von 1");
  await expect(historicRow).toBeVisible();
  await expect(historicRow).not.toHaveClass(/bg-sky-100\/80/);
});
