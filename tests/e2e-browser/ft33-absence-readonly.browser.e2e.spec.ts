/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein normaler Zukunftstermin mit Projekt, Kunde und Tour 1 bleibt über die allgemeinen UI-Kontexte editierbar.
 * - Wochenkalender, Monatskalender, Terminliste und Monitoring öffnen für reguläre Termine weiterhin das generische Terminformular.
 * - Abwesenheitstermine öffnen außerhalb des Mitarbeiterformulars kein generisches Terminformular mehr.
 * - Abwesenheitstermine zeigen außerhalb des Mitarbeiterformulars keine generischen Aktions-Menüs.
 * - Der verbleibende FT-33-Pfad im Mitarbeiterformular erlaubt weiterhin echtes Edit und Delete mit persistiertem Nachweis.
 *
 * Fehlerfälle:
 * - Reguläre Termine verlieren generische Öffnungs- oder Speichermöglichkeiten.
 * - Abwesenheiten lassen sich weiter über Kalender oder Listen generisch bearbeiten.
 * - Menütrigger für generische Terminaktionen bleiben bei Abwesenheiten sichtbar.
 * - Der FT-33-Pfad im Mitarbeiterformular kann Abwesenheiten nicht mehr speichern oder löschen.
 *
 * Ziel:
 * Den beschlossenen FT-33-Readonly-Schnitt browserseitig gegen echte Nutzerpfade absichern.
 */
import { expect, test } from "./fixtures";

import { ABSENCE_CUSTOMER_NUMBER } from "../../shared/absenceAppointments";
import * as appointmentsService from "../../server/services/appointmentsService";
import { createEmployeeAppointmentAbsence } from "../../server/services/employeeAppointmentAbsencesService";
import { applySystemSeed } from "../../server/services/systemSeedService";
import { listTours } from "../../server/services/toursService";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixtureWithOverrides,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { confirmAppointmentSaveReviewIfVisible, loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

let regularAppointmentId = 0;
let regularProjectName = "";
let regularDate = "";
let regularEditedDate = "";
let absenceAppointmentId = 0;
let absenceEmployeeId = 0;
let absenceStartDate = "";
let absenceEndDate = "";
let absenceEditedStartDate = "";
let absenceEditedEndDate = "";

async function closeAppointmentForm(page: Parameters<typeof test>[0]["page"]) {
  await page.getByTestId("button-secondary-cancel-appointment").click();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
}

async function confirmAppointmentSaveIfNeeded(page: Parameters<typeof test>[0]["page"]) {
  await confirmAppointmentSaveReviewIfVisible(page);
}

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts");
  await applySystemSeed();

  const tourOne = (await listTours()).find((tour) => tour.name === "Tour 1");
  if (!tourOne) {
    throw new Error("Seeded Tour 1 not found.");
  }

  regularDate = getRelativeBerlinDate(1);
  regularEditedDate = getRelativeBerlinDate(2);
  absenceStartDate = getRelativeBerlinDate(3);
  absenceEndDate = getRelativeBerlinDate(4);
  absenceEditedStartDate = getRelativeBerlinDate(5);
  absenceEditedEndDate = getRelativeBerlinDate(6);

  const regularCustomer = await createCustomerFixture("FT33-BROWSER-REG-CUST");
  const regularProject = await createProjectFixtureWithOverrides({
    prefix: "FT33-BROWSER-REG-PROJ",
    customerId: regularCustomer.id,
    name: "FT33 Browser Regulärer Termin",
  });
  regularProjectName = regularProject.name;

  const regularAppointment = await createAppointmentFixture({
    projectId: regularProject.id,
    customerId: regularCustomer.id,
    tourId: tourOne.id,
    startDate: regularDate,
  });
  regularAppointmentId = regularAppointment.id;

  const absenceEmployee = await createEmployeeFixtureWithOverrides({
    prefix: "FT33-BROWSER-ABS-EMP",
    firstName: "Aline",
    lastName: "Abwesenheit",
  });
  absenceEmployeeId = absenceEmployee.id;

  const absenceAppointment = await createEmployeeAppointmentAbsence(absenceEmployee.id, {
    absenceType: "vacation",
    startDate: absenceStartDate,
    endDate: absenceEndDate,
    note: "FT33 Browser Abwesenheit",
  }, "ADMIN");
  absenceAppointmentId = absenceAppointment.id;
});

test("keeps regular Tour-1 appointments mutable across list, week, month and monitoring", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByTestId("nav-termine").click();
  const appointmentsTable = page.getByTestId("table-appointments-list");
  await expect(appointmentsTable).toBeVisible();
  await page.locator("#appointments-filter-project-title").fill(regularProjectName);
  const regularListRow = appointmentsTable.locator("tbody tr").filter({ hasText: regularProjectName }).first();
  await expect(regularListRow).toBeVisible();
  await regularListRow.dblclick();

  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("button-cancel-appointment")).toBeVisible();
  await expect(page.getByTestId("button-park-appointment")).toBeVisible();
  await expect(page.getByTestId("button-delete-appointment")).toBeVisible();
  await expect(page.getByTestId("button-add-employee")).toBeVisible();
  await expect(page.getByTestId("appointment-tag-picker-button-add")).toBeVisible();
  await expect(page.getByTestId("button-new-note")).toBeVisible();
  await expect(page.getByTestId("button-add-document-header")).toBeVisible();
  await closeAppointmentForm(page);

  await page.getByTestId("nav-wochenuebersicht").click();
  const regularWeekPanel = page.getByTestId(`week-appointment-panel-${regularAppointmentId}`).first();
  await expect(regularWeekPanel).toBeVisible();
  await expect(page.getByTestId(`week-appointment-menu-trigger-${regularAppointmentId}`)).toBeVisible();
  await regularWeekPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("input-start-date")).toHaveValue(regularDate);

  await page.getByTestId("input-start-date").fill(regularEditedDate);
  await page.getByTestId("input-start-date").press("Tab");
  await page.getByTestId("button-save-appointment").click();
  await confirmAppointmentSaveIfNeeded(page);
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
  await expect.poll(async () => {
    const detail = await appointmentsService.getAppointmentDetails(regularAppointmentId);
    return detail?.startDate ?? null;
  }).toBe(regularEditedDate);

  await page.getByTestId("nav-monatsuebersicht").click();
  const regularMonthBar = page.locator(`[data-testid="month-compact-bar-${regularAppointmentId}"]`).first();
  await expect(regularMonthBar).toBeVisible();
  await expect(page.getByTestId(`month-compact-bar-menu-trigger-${regularAppointmentId}`)).toBeVisible();
  await regularMonthBar.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("input-start-date")).toHaveValue(regularEditedDate);
  await closeAppointmentForm(page);

  await page.getByTestId("nav-monitoring").click();
  const monitoringTable = page.getByTestId("table-monitoring");
  await expect(monitoringTable).toBeVisible();
  await page.locator("#monitoring-filter-project-title").fill(regularProjectName);
  const monitoringRow = monitoringTable.locator("tbody tr").filter({ hasText: regularProjectName }).first();
  await expect(monitoringRow).toBeVisible();
  await monitoringRow.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("badge-project-name")).toContainText(regularProjectName);
  await closeAppointmentForm(page);
});

test("blocks generic absence mutation entrypoints and keeps the employee-form FT-33 path working", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(page.getByTestId("button-calendar-absence-mode")).toBeVisible();
  await page.getByTestId("button-calendar-absence-mode").click();
  const absenceMonthBar = page.locator(`[data-testid="month-compact-bar-${absenceAppointmentId}"]`).first();
  await expect(absenceMonthBar).toBeVisible();
  await expect(absenceMonthBar).toContainText("Abwesenheit, Aline");
  await expect(page.getByTestId(`month-compact-bar-menu-trigger-${absenceAppointmentId}`)).toHaveCount(0);
  await page.getByTestId("button-calendar-planning-mode").click();
  await expect(page.locator(`[data-testid="month-compact-bar-${absenceAppointmentId}"]`)).toHaveCount(0);
  await page.getByTestId("button-calendar-absence-mode").click();
  await expect(absenceMonthBar).toBeVisible();
  await absenceMonthBar.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
  await expect(page.getByTestId("entity-form-shell")).toHaveCount(0);

  await page.getByTestId("nav-termine").click();
  const appointmentsTable = page.getByTestId("table-appointments-list");
  await expect(appointmentsTable).toBeVisible();
  await page.locator("#appointments-filter-customer-number").fill(ABSENCE_CUSTOMER_NUMBER);
  await page.getByTestId("button-appointment-period-picker").click();
  await page.getByTestId("input-appointment-period-from").fill(absenceStartDate);
  await page.getByTestId("input-appointment-period-to").fill(absenceStartDate);
  const absenceListRow = appointmentsTable.locator("tbody tr").filter({ hasText: ABSENCE_CUSTOMER_NUMBER }).first();
  await expect(absenceListRow).toBeVisible();
  await absenceListRow.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
  await expect(page.getByTestId("entity-form-shell")).toHaveCount(0);

  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${absenceEmployeeId}`).dblclick();
  await page.getByTestId("tab-employee-abwesenheiten").click();
  const absenceRow = page.getByTestId(`row-employee-absence-${absenceAppointmentId}`);
  await expect(absenceRow).toBeVisible();
  await expect(absenceRow).toContainText("Urlaub");
  await expect(page.getByTestId(`button-edit-employee-absence-${absenceAppointmentId}`)).toBeVisible();
  await expect(page.getByTestId(`button-delete-employee-absence-${absenceAppointmentId}`)).toBeVisible();

  await page.getByTestId(`button-edit-employee-absence-${absenceAppointmentId}`).click();
  await page.getByTestId(`select-employee-absence-edit-type-${absenceAppointmentId}`).selectOption("sick");
  await page.getByTestId(`input-employee-absence-edit-start-${absenceAppointmentId}`).fill(absenceEditedStartDate);
  await page.getByTestId(`input-employee-absence-edit-end-${absenceAppointmentId}`).fill(absenceEditedEndDate);
  await page.getByTestId(`textarea-employee-absence-edit-note-${absenceAppointmentId}`).fill("FT33 Browser Abwesenheit aktualisiert");
  const absenceUpdateResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PUT"
    && response.url().includes(`/api/employees/${absenceEmployeeId}/absence-appointments/${absenceAppointmentId}`)
  ));
  await page.getByTestId(`button-save-employee-absence-${absenceAppointmentId}`).click();
  const absenceUpdateResponse = await absenceUpdateResponsePromise;
  expect(absenceUpdateResponse.ok()).toBeTruthy();
  await expect.poll(async () => {
    const response = await page.request.get(`/api/employees/${absenceEmployeeId}/absence-appointments`);
    const items = await response.json() as Array<{
      id: number;
      startDate: string;
      endDate: string | null;
      description: string | null;
      appointmentTags: Array<{ name: string }>;
    }>;
    const item = items.find((entry) => entry.id === absenceAppointmentId) ?? null;
    return item ? {
      startDate: item.startDate,
      endDate: item.endDate,
      description: item.description,
      hasSickTag: item.appointmentTags.some((tag) => tag.name === "Krankheit"),
    } : null;
  }).toEqual({
    startDate: absenceEditedStartDate,
    endDate: absenceEditedEndDate,
    description: "FT33 Browser Abwesenheit aktualisiert",
    hasSickTag: true,
  });
  await expect(absenceRow).toContainText("Krankheit");

  await page.getByTestId(`button-delete-employee-absence-${absenceAppointmentId}`).click();
  const deleteDialog = page.getByTestId("dialog-delete-employee-absence");
  await expect(deleteDialog).toBeVisible();

  const absenceDeleteResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "DELETE"
    && response.url().includes(`/api/employees/${absenceEmployeeId}/absence-appointments/${absenceAppointmentId}`)
  ));
  await deleteDialog.getByRole("button", { name: "Abwesenheit löschen" }).click();
  const absenceDeleteResponse = await absenceDeleteResponsePromise;
  expect(absenceDeleteResponse.ok()).toBeTruthy();
  await expect.poll(async () => {
    const response = await page.request.get(`/api/employees/${absenceEmployeeId}/absence-appointments`);
    const items = await response.json() as Array<{ id: number }>;
    return items.some((item) => item.id === absenceAppointmentId);
  }).toBe(false);
  await expect(page.getByTestId(`row-employee-absence-${absenceAppointmentId}`)).toHaveCount(0);
});
