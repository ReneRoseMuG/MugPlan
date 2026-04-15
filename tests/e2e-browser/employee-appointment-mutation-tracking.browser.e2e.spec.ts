/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter können über den Wochenplan-Dialog selektiv von Tour-Terminen entfernt werden.
 * - Mitarbeiter können über den Wochenplan-Dialog selektiv zu Tour-Terminen hinzugefügt werden.
 * - Der Datumsfilter und die Sammelbuttons arbeiten im Wochenplan-Dialog auf der gefilterten Ansicht.
 * - Mitarbeiter können weiterhin direkt über das Mitarbeiterformular von einzelnen Terminen entfernt werden.
 *
 * Fehlerfälle:
 * - Selektive Wochenplan-Mutationen ignorieren die Filtergrenzen.
 * - Das Entfernen löscht still weitere Terminzuweisungen außerhalb der Auswahl.
 * - Das Hinzufügen übernimmt Mitarbeiter auf die falschen Termine.
 * - Der direkte Minus-Button im Mitarbeiterformular entfernt nicht mehr stabil nur die gewählte Terminzuweisung.
 *
 * Ziel:
 * Die neuen Mutationspfade zwischen Wochenplanung und Termin-Mitarbeiterlisten Ende-zu-Ende absichern.
 */
import { expect, test } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import { db } from "../../server/db";
import { tourWeekEmployees } from "../../shared/schema";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

let targetEmployee: Awaited<ReturnType<typeof createEmployeeFixture>>;
let sideEmployee: Awaited<ReturnType<typeof createEmployeeFixture>>;
let addCandidateEmployee: Awaited<ReturnType<typeof createEmployeeFixture>>;
let tour: Awaited<ReturnType<typeof createTourFixture>>;
let removeAssignmentId: number;
let removeDialogAppointment: Awaited<ReturnType<typeof createAppointmentFixture>>;
let addDialogAppointment: Awaited<ReturnType<typeof createAppointmentFixture>>;
let minusButtonAppointment: Awaited<ReturnType<typeof createAppointmentFixture>>;
let nextWeekStartDate: string;
let nextWeekSecondDate: string;
let nextWeekThirdDate: string;
let nextWeekInputValue: string;
let nextWeekIsoYear: number;
let nextWeekIsoWeek: number;

function resolveNextEditableWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const nextWeekStart = startOfISOWeek(addWeeks(today, 1));
  const secondDay = addDays(nextWeekStart, 1);
  return {
    weekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
    weekSecondDate: format(secondDay, "yyyy-MM-dd"),
    weekThirdDate: format(addDays(nextWeekStart, 2), "yyyy-MM-dd"),
    weekInputValue: String(getISOWeek(nextWeekStart)),
    isoYear: getISOWeekYear(nextWeekStart),
    isoWeek: getISOWeek(nextWeekStart),
  };
}

async function openWeekPlanning(page: Parameters<typeof test>[0]["page"]) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();
  await page.getByTestId("tab-tour-wochenplanung").click();
  await expect(page.getByTestId("toggle-tour-week-picker")).toBeVisible();
  await expect(page.getByTestId("tour-form-functions-panel")).toContainText("KW einfügen");
}

test.beforeAll(async () => {
  await resetBrowserSuiteState();

  const nextEditableWeek = resolveNextEditableWeek();
  nextWeekStartDate = nextEditableWeek.weekStartDate;
  nextWeekSecondDate = nextEditableWeek.weekSecondDate;
  nextWeekThirdDate = nextEditableWeek.weekThirdDate;
  nextWeekInputValue = nextEditableWeek.weekInputValue;
  nextWeekIsoYear = nextEditableWeek.isoYear;
  nextWeekIsoWeek = nextEditableWeek.isoWeek;

  tour = await createTourFixture("#226688");
  targetEmployee = await createEmployeeFixture("APMT-TARGET");
  sideEmployee = await createEmployeeFixture("APMT-SIDE");
  addCandidateEmployee = await createEmployeeFixture("APMT-ADD");

  const project = await createProjectFixture({ prefix: "APMT", name: "APMT Projekt" });

  removeDialogAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeekStartDate,
    tourId: tour.id,
    employeeIds: [targetEmployee.id, sideEmployee.id],
  });

  addDialogAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeekSecondDate,
    tourId: tour.id,
    employeeIds: [targetEmployee.id, sideEmployee.id],
  });

  minusButtonAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeekThirdDate,
    tourId: tour.id,
    employeeIds: [targetEmployee.id, sideEmployee.id],
  });

  const insertResult = await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: nextEditableWeek.isoYear,
    isoWeek: nextEditableWeek.isoWeek,
    employeeId: targetEmployee.id,
  });
  removeAssignmentId = Number((insertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
    ?? (insertResult as { insertId?: number }).insertId);
});

test("Test 1: Entfernen über Wochenplan-Dialog mit Datumsfilter", async ({ page }) => {
  await openWeekPlanning(page);

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await page.getByTestId(`badge-tour-week-member-${removeAssignmentId}-remove`).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Mitarbeiter aus Wochenplanung entfernen");

  await expect(dialog.getByTestId(`tour-employee-cascade-row-${removeDialogAppointment.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${addDialogAppointment.id}`)).toBeVisible();
  await dialog.getByTestId("button-tour-cascade-deselect-all").click();
  await dialog.getByTestId(`tour-employee-cascade-checkbox-${removeDialogAppointment.id}`).click();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${removeDialogAppointment.id}`)).toBeChecked();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${addDialogAppointment.id}`)).not.toBeChecked();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${minusButtonAppointment.id}`)).not.toBeChecked();

  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${removeDialogAppointment.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).not.toContain(targetEmployee.id);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${addDialogAppointment.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).toContain(targetEmployee.id);

  await page.getByTestId("button-close-tour").click();
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${targetEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();
  await expect(
    page.getByTestId("table-appointments-list").getByTestId(`button-remove-employee-from-appointment-${addDialogAppointment.id}`),
  ).toBeVisible();
});

test("Test 2: Hinzufügen über Wochenplan-Dialog mit Datumsfilter", async ({ page }) => {
  await openWeekPlanning(page);

  const weekCard = page.getByTestId(`card-tour-week-${nextWeekIsoYear}-${nextWeekIsoWeek}`);
  await expect(weekCard).toBeVisible();
  await weekCard.getByTestId(
    `button-add-tour-week-member-${nextWeekIsoYear}-${nextWeekIsoWeek}`,
  ).click();
  await page.getByTestId(`employee-picker-card-${addCandidateEmployee.id}`).dblclick();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Mitarbeiter in Wochenplanung aufnehmen");

  await expect(dialog.getByTestId(`tour-employee-cascade-row-${addDialogAppointment.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${removeDialogAppointment.id}`)).toBeVisible();
  await dialog.getByTestId("button-tour-cascade-deselect-all").click();
  await dialog.getByTestId(`tour-employee-cascade-checkbox-${addDialogAppointment.id}`).click();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${addDialogAppointment.id}`)).toBeChecked();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${removeDialogAppointment.id}`)).not.toBeChecked();

  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${addDialogAppointment.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).toContain(addCandidateEmployee.id);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${removeDialogAppointment.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).not.toContain(addCandidateEmployee.id);

  await page.getByTestId("button-close-tour").click();
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${addCandidateEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();
  await expect(
    page.getByTestId("table-appointments-list").getByTestId(`button-remove-employee-from-appointment-${addDialogAppointment.id}`),
  ).toBeVisible();
});

test("Test 3: Entfernen über Minus-Button im Mitarbeiterformular", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${addCandidateEmployee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();

  const table = page.getByTestId("table-appointments-list");
  await expect(table).toBeVisible();

  const removeButton = table.getByTestId(`button-remove-employee-from-appointment-${addDialogAppointment.id}`);
  await expect(removeButton).toBeVisible();
  const removeDetailResponse = await page.request.get(`/api/appointments/${addDialogAppointment.id}`);
  expect(removeDetailResponse.ok()).toBeTruthy();
  const removeDetail = await removeDetailResponse.json() as { version: number };
  const removeResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "DELETE"
    && response.url().includes(`/api/appointments/${addDialogAppointment.id}/employees/${addCandidateEmployee.id}`)
  ));
  await removeButton.click();
  const removeResponse = await removeResponsePromise;
  expect(removeResponse.status()).toBe(204);
  expect(removeResponse.request().postDataJSON()).toEqual({ version: removeDetail.version });

  await expect(page.getByText("Mitarbeiter wurde vom Termin entfernt", { exact: true })).toBeVisible();
  await expect(table.getByTestId(`button-remove-employee-from-appointment-${addDialogAppointment.id}`)).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${addDialogAppointment.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).not.toContain(addCandidateEmployee.id);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${addDialogAppointment.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id);
  }).toContain(sideEmployee.id);

  await page.getByTestId("button-close-employee").click();
  await page.getByTestId("nav-termine").click();
  await expect(page.getByTestId("table-appointments-list")).toBeVisible();
});
