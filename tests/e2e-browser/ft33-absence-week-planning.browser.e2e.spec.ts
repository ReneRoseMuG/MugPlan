/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Dispatcher können eine laufende Abwesenheit von gestern bis übermorgen speichern, wenn sie die Entfernung aus Terminen und aktueller Tour-KW-Planung bestätigen.
 * - Nach der Bestätigung ist der Mitarbeiter auf der regulären Terminkarte, in der Kalender-KW-Personalplanung und in der Tour-KW-Planung nicht mehr eingetragen.
 * - Beim direkten Wechsel in den Mitarbeiter-Tab Wochenplanung wird keine gepufferte alte KW-Zuordnung mehr angezeigt.
 * - Die Abwesenheit selbst bleibt im Kalender sichtbar.
 * - Administratoren sehen denselben Bestätigungsdialog; Abbrechen lässt Termin- und KW-Zuordnung unverändert und speichert keine Abwesenheit.
 *
 * Ziel:
 * Den FT-33-Abwesenheitsflow browserseitig gegen echte Termin- und Tour-KW-Planungsdaten absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { addDays, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import { db } from "../../server/db";
import { applySystemSeed } from "../../server/services/systemSeedService";
import { tourWeekEmployees } from "../../shared/schema";
import {
  createEmployeeFixtureWithOverrides,
  createProjectFixture,
  createRawAppointmentFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsRole, resetBrowserSuiteState } from "../helpers/browserE2e";

const suitePath = "tests/e2e-browser/ft33-absence-week-planning.browser.e2e.spec.ts";

test.describe.configure({ mode: "serial" });

function getCompactEmployeeLabel(employee: { firstName?: string | null; lastName?: string | null }) {
  const firstName = employee.firstName?.trim() ?? "";
  const lastNameInitial = employee.lastName?.trim()?.[0]?.toUpperCase() ?? "";
  return firstName && lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName || lastNameInitial;
}

function resolveWeekForDate(date: string) {
  const parsedDate = parseISO(date);
  const weekStart = startOfISOWeek(parsedDate);
  return {
    isoYear: getISOWeekYear(parsedDate),
    isoWeek: getISOWeek(parsedDate),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekEndDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
  };
}

async function getTourOne(page: Page) {
  const response = await page.request.get("/api/tours");
  expect(response.ok(), await response.text()).toBeTruthy();
  const tours = await response.json() as Array<{ id: number; name: string }>;
  const tour = tours.find((entry) => entry.name === "Tour 1");
  if (!tour) throw new Error("Tour 1 wurde nicht gefunden.");
  return tour;
}

async function createScenario(page: Page, prefix: string, targetDate: string) {
  const tour = await getTourOne(page);
  const targetWeek = resolveWeekForDate(targetDate);
  const employee = await createEmployeeFixtureWithOverrides({
    prefix: `${prefix}-EMP`,
    firstName: prefix.replace(/[^A-Z0-9]/gi, "").slice(0, 10),
    lastName: "Abzug",
  });
  const project = await createProjectFixture({ prefix, name: `${prefix} Terminprojekt` });
  const appointmentId = await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetDate,
    title: `${prefix} Termin`,
    tourId: tour.id,
    employeeIds: [employee.id],
  });
  const insertResult = await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: employee.id,
  });
  const assignmentId = Number((insertResult as any)?.[0]?.insertId ?? (insertResult as any)?.insertId);

  return { tour, targetWeek, employee, project, appointmentId, assignmentId };
}

async function openEmployeeAbsences(page: Page, employeeId: number) {
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employeeId}`).dblclick();
  await page.getByTestId("tab-employee-abwesenheiten").click();
  await expect(page.getByTestId("employee-absence-appointments-panel")).toBeVisible();
}

async function fillNewAbsence(page: Page, startDate: string, endDate: string, note: string) {
  await page.getByTestId("input-employee-absence-start-date").fill(startDate);
  await page.getByTestId("input-employee-absence-end-date").fill(endDate);
  await page.getByTestId("textarea-employee-absence-note").fill(note);
}

async function fetchAppointmentEmployeeIds(page: Page, appointmentId: number) {
  const response = await page.request.get(`/api/appointments/${appointmentId}`);
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json() as { employees: Array<{ id: number }> };
  return body.employees.map((employee) => employee.id).sort((left, right) => left - right);
}

async function fetchWeekEmployeeIds(page: Page, tourId: number, isoYear: number, isoWeek: number) {
  const response = await page.request.get(`/api/tours/${tourId}/week-employees`);
  expect(response.ok(), await response.text()).toBeTruthy();
  const weeks = await response.json() as Array<{ isoYear: number; isoWeek: number; employees: Array<{ employeeId: number }> }>;
  const week = weeks.find((entry) => entry.isoYear === isoYear && entry.isoWeek === isoWeek);
  return (week?.employees ?? []).map((employee) => employee.employeeId).sort((left, right) => left - right);
}

async function openStandaloneWeek(page: Page, targetWeek: { isoYear: number; isoWeek: number }) {
  await page.goto(`/standalone/calendar/week?kw=${targetWeek.isoWeek}&year=${targetWeek.isoYear}`);
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
}

function getWeekSection(page: Page, weekStartDate: string) {
  return page.locator("section").filter({ has: page.getByTestId(`week-day-header-${weekStartDate}`) }).first();
}

test.beforeEach(async () => {
  await resetBrowserSuiteState(suitePath);
  await applySystemSeed();
});

test("Dispatcher bestätigt Abwesenheit und entfernt den Mitarbeiter aus Termin und aktueller Tour-KW", async ({ page }) => {
  await loginAsRole(page, "DISPATCHER");
  const scenario = await createScenario(page, "FT33-DISP-KW", getRelativeBerlinDate(0));
  const absenceStartDate = getRelativeBerlinDate(-1);
  const absenceEndDate = getRelativeBerlinDate(2);
  const employeeLabel = getCompactEmployeeLabel(scenario.employee);

  await openEmployeeAbsences(page, scenario.employee.id);
  await fillNewAbsence(page, absenceStartDate, absenceEndDate, "FT33 Browser KW Abzug Dispatcher");
  await page.getByTestId("button-create-employee-absence").click();

  await expect(page.getByTestId("dialog-absence-employee-removal-confirmation")).toBeVisible();
  await expect(page.getByTestId(`absence-employee-removal-conflict-${scenario.appointmentId}`)).toBeVisible();
  await expect(page.getByTestId(`absence-week-planning-removal-conflict-${scenario.assignmentId}`)).toContainText(scenario.tour.name);

  const createResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && response.url().includes(`/api/employees/${scenario.employee.id}/absence-appointments`)
    && response.ok()
  ));
  await page.getByTestId("button-confirm-absence-employee-removal").click();
  const createResponse = await createResponsePromise;
  const absence = await createResponse.json() as { id: number };

  await expect.poll(() => fetchAppointmentEmployeeIds(page, scenario.appointmentId)).toEqual([]);
  await expect.poll(() => fetchWeekEmployeeIds(page, scenario.tour.id, scenario.targetWeek.isoYear, scenario.targetWeek.isoWeek)).toEqual([]);

  await page.getByTestId("tab-employee-wochenplanung").click();
  await expect(page.getByTestId(`card-employee-week-plan-${scenario.assignmentId}`)).toHaveCount(0);
  await expect(page.getByText("Dieser Mitarbeiter ist aktuell keiner Wochenplanung zugeordnet.")).toBeVisible();

  await page.getByTestId("button-close-employee").click();
  await expect(page.getByTestId("entity-form-shell")).toHaveCount(0);

  await openStandaloneWeek(page, scenario.targetWeek);
  const targetSection = getWeekSection(page, scenario.targetWeek.weekStartDate);
  const regularPanel = page.getByTestId(`week-appointment-panel-${scenario.appointmentId}`).first();
  await expect(regularPanel).toBeVisible();
  await expect(regularPanel).not.toContainText(employeeLabel);
  await expect(page.getByTestId(`week-appointment-employee-std-${scenario.appointmentId}-${scenario.employee.id}`)).toHaveCount(0);

  const absenceTile = page.locator(`[data-testid="week-spanning-tile-${absence.id}"], [data-testid="week-appointment-panel-${absence.id}"]`).first();
  await expect(absenceTile).toBeVisible();
  await expect(absenceTile).toContainText(employeeLabel);

  await page.getByTestId("switch-week-personnel-column").click();
  await expect(targetSection.getByTestId(`week-personnel-employee-tour-${scenario.tour.id}-${scenario.employee.id}`)).toHaveCount(0);
  await targetSection.getByTestId(`button-week-personnel-column-toggle-tour-${scenario.tour.id}`).click();
  const weekPlanningCard = targetSection.getByTestId(`week-personnel-card-tour-${scenario.tour.id}`);
  await expect(weekPlanningCard).toBeVisible();
  await expect(weekPlanningCard).not.toContainText(employeeLabel);
});

test("Admin bricht den Bestätigungsdialog ab und lässt Termin sowie Tour-KW unverändert", async ({ page }) => {
  await loginAsRole(page, "ADMIN");
  const targetDate = getRelativeBerlinDate(9);
  const scenario = await createScenario(page, "FT33-ADMIN-CANCEL", targetDate);

  await openEmployeeAbsences(page, scenario.employee.id);
  await fillNewAbsence(page, targetDate, getRelativeBerlinDate(10), "FT33 Browser KW Abbruch Admin");
  await page.getByTestId("button-create-employee-absence").click();

  await expect(page.getByTestId("dialog-absence-employee-removal-confirmation")).toBeVisible();
  await expect(page.getByTestId(`absence-employee-removal-conflict-${scenario.appointmentId}`)).toBeVisible();
  await expect(page.getByTestId(`absence-week-planning-removal-conflict-${scenario.assignmentId}`)).toBeVisible();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByTestId("dialog-absence-employee-removal-confirmation")).toHaveCount(0);

  await expect.poll(() => fetchAppointmentEmployeeIds(page, scenario.appointmentId)).toEqual([scenario.employee.id]);
  await expect.poll(() => fetchWeekEmployeeIds(page, scenario.tour.id, scenario.targetWeek.isoYear, scenario.targetWeek.isoWeek)).toEqual([scenario.employee.id]);

  const response = await page.request.get(`/api/employees/${scenario.employee.id}/absence-appointments`);
  expect(response.ok(), await response.text()).toBeTruthy();
  const absences = await response.json() as Array<{ id: number }>;
  expect(absences).toEqual([]);
});
