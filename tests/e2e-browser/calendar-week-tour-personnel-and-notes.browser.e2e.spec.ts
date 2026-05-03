/**
 * Test Scope:
 *
 * Bereich:
 * - Wochenkalender Personalspalte und angeheftete Termin-/Projektnotizen
 *
 * Isolation:
 * - Klasse: B
 * - Baseline: seeded
 * - Storage: none
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender öffnet die Tour-KW-Personalplanung über den Toggle KW Plan.
 * - Die linke Personalspalte startet kollabiert, zeigt vorhandene KW-Mitarbeiter als Avatar-Badges und lässt sich je Tour-Lane erweitern.
 * - Im erweiterten Zustand können Admin/Disposition Mitarbeiter zur Tour-KW hinzufügen und über den vorhandenen Kaskadendialog auf echte Termine übernehmen.
 * - Der entfernte Mitarbeiter wird über das Badge wieder aus Tour-KW und Termin entfernt.
 * - Aktivierte Notizen hängen Termin- und Projektnotizen sichtbar direkt an der Terminkarte an.
 *
 * Fehlerfälle:
 * - Die Tour-Headerbar dehnt sich nach links über die Personalspalte aus.
 * - Vorhandene KW-Mitarbeiter sind im kollabierten Zustand nicht sichtbar.
 * - Verfügbarkeitsfilter oder Kaskadendialog umgehen echte Termine.
 * - Notizvorschauen liefern nur Terminnotizen oder bleiben trotz aktivem Schalter unsichtbar.
 *
 * Ziel:
 * Den neuen Wochenkalender-Zugang zur Tour-KW-Personalplanung und die Notiz-Anheftung im echten Browser gegen Regressionen absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { eq } from "drizzle-orm";

import { db } from "../../server/db";
import { tourWeekEmployees, tours } from "../../shared/schema";
import {
  createEmployeeFixture,
  createProjectFixture,
  createRawAppointmentFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, loginAsRole, resetBrowserSuiteState } from "../helpers/browserE2e";

const suitePath = "tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await resetBrowserSuiteState(suitePath);
});

function resolveTargetWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const weekStart = startOfISOWeek(addWeeks(today, 3));
  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekMidDate: format(addDays(weekStart, 2), "yyyy-MM-dd"),
  };
}

async function openStandaloneWeek(page: Page, targetWeek: { isoYear: number; isoWeek: number }) {
  await page.goto(`/standalone/calendar/week?kw=${targetWeek.isoWeek}&year=${targetWeek.isoYear}`);
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
}

function getWeekSection(page: Page, weekStartDate: string) {
  return page.locator("section").filter({ has: page.getByTestId(`week-day-header-${weekStartDate}`) }).first();
}

function getCompactEmployeeLabel(employee: { firstName?: string | null; lastName?: string | null }) {
  const firstName = employee.firstName?.trim() ?? "";
  const lastNameInitial = employee.lastName?.trim()?.[0]?.toUpperCase() ?? "";
  return firstName && lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName || lastNameInitial;
}

async function fetchAppointmentEmployeeIds(page: Page, appointmentId: number) {
  const response = await page.request.get(`/api/appointments/${appointmentId}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { employees: Array<{ id: number }> };
  return body.employees.map((employee) => employee.id).sort((left, right) => left - right);
}

test("Tour-KW-Planungen sind zwischen Tour-Formular und Wochenkalender bidirektional sichtbar", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const firstTour = await createTourFixture("#0f766e");
  const secondTour = await createTourFixture("#b45309");
  const firstProject = await createProjectFixture({ prefix: "BWE-BRIDGE-A", name: "BWE Quer Tour A" });
  const secondProject = await createProjectFixture({ prefix: "BWE-BRIDGE-B", name: "BWE Quer Tour B" });
  const firstEmployee = await createEmployeeFixture("BWE-BRIDGE-A-EMP");
  const secondEmployee = await createEmployeeFixture("BWE-BRIDGE-B-EMP");
  const calendarEmployee = await createEmployeeFixture("BWE-BRIDGE-CALENDAR-EMP");
  const firstAppointmentId = await createRawAppointmentFixture({
    projectId: firstProject.id,
    startDate: targetWeek.weekStartDate,
    title: "BWE Quer Termin A",
    tourId: firstTour.id,
    employeeIds: [firstEmployee.id],
  });
  await createRawAppointmentFixture({
    projectId: secondProject.id,
    startDate: targetWeek.weekMidDate,
    title: "BWE Quer Termin B",
    tourId: secondTour.id,
    employeeIds: [secondEmployee.id],
  });

  await db.insert(tourWeekEmployees).values([
    {
      tourId: firstTour.id,
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
      employeeId: firstEmployee.id,
    },
    {
      tourId: secondTour.id,
      isoYear: targetWeek.isoYear,
      isoWeek: targetWeek.isoWeek,
      employeeId: secondEmployee.id,
    },
  ]);

  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${firstTour.id}`).dblclick();
  await page.getByTestId("tab-tour-wochenplanung").click();
  const firstTourWeekCard = page.getByTestId(`card-tour-week-${targetWeek.isoYear}-${targetWeek.isoWeek}`);
  await expect(firstTourWeekCard).toBeVisible();
  await expect(firstTourWeekCard).toContainText(getCompactEmployeeLabel(firstEmployee));

  await openStandaloneWeek(page, targetWeek);
  const targetSection = getWeekSection(page, targetWeek.weekStartDate);
  await page.getByTestId("switch-week-personnel-column").click();

  await expect(targetSection.getByTestId(`week-personnel-employee-tour-${firstTour.id}-${firstEmployee.id}`)).toBeVisible();
  await expect(targetSection.getByTestId(`week-personnel-employee-tour-${secondTour.id}-${secondEmployee.id}`)).toBeVisible();

  await targetSection.getByTestId(`button-week-personnel-column-toggle-tour-${firstTour.id}`).click();
  await targetSection.getByTestId(`button-add-week-personnel-tour-${firstTour.id}`).click();
  await expect(page.getByTestId(`employee-picker-card-${calendarEmployee.id}`)).toBeVisible();
  await page.getByTestId(`employee-picker-card-${calendarEmployee.id}`).dblclick();

  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-row-${firstAppointmentId}`)).toBeVisible();
  const addResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/tours/${firstTour.id}/week-employees/add`
  ));
  await page.getByTestId("button-tour-employee-cascade-confirm").click();
  const addResponse = await addResponsePromise;
  expect(addResponse.ok(), await addResponse.text()).toBeTruthy();

  await expect(targetSection.getByTestId(`week-personnel-employee-tour-${firstTour.id}-${calendarEmployee.id}`)).toBeVisible();
  expect(await fetchAppointmentEmployeeIds(page, firstAppointmentId)).toEqual(
    [firstEmployee.id, calendarEmployee.id].sort((left, right) => left - right),
  );

  await page.goto("/");
  await expect(page.getByTestId("nav-touren")).toBeVisible();
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${firstTour.id}`).dblclick();
  await page.getByTestId("tab-tour-wochenplanung").click();

  const refreshedWeekCard = page.getByTestId(`card-tour-week-${targetWeek.isoYear}-${targetWeek.isoWeek}`);
  await expect(refreshedWeekCard).toBeVisible();
  await expect(refreshedWeekCard).toContainText(getCompactEmployeeLabel(firstEmployee));
  await expect(refreshedWeekCard).toContainText(getCompactEmployeeLabel(calendarEmployee));
  await refreshedWeekCard.dblclick();

  await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(firstEmployee));
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(calendarEmployee));
});

test("Dispatcher fügt KW-Mitarbeiter im Wochenkalender hinzu und sieht sie im Tour-Formular", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const tour = await createTourFixture("#2563eb");
  const project = await createProjectFixture({ prefix: "BWE-DISP", name: "BWE Dispatcher Projekt" });
  const existingEmployee = await createEmployeeFixture("BWE-DISP-EXISTING");
  const dispatcherEmployee = await createEmployeeFixture("BWE-DISP-ADDED");
  const appointmentId = await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekStartDate,
    title: "BWE Dispatcher Termin",
    tourId: tour.id,
    employeeIds: [existingEmployee.id],
  });

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: existingEmployee.id,
  });

  await loginAsRole(page, "DISPATCHER");
  await openStandaloneWeek(page, targetWeek);
  const targetSection = getWeekSection(page, targetWeek.weekStartDate);
  await page.getByTestId("switch-week-personnel-column").click();
  await expect(targetSection.getByTestId(`week-personnel-employee-tour-${tour.id}-${existingEmployee.id}`)).toBeVisible();

  await targetSection.getByTestId(`button-week-personnel-column-toggle-tour-${tour.id}`).click();
  await expect(targetSection.getByTestId(`button-add-week-personnel-tour-${tour.id}`)).toBeVisible();
  await targetSection.getByTestId(`button-add-week-personnel-tour-${tour.id}`).click();
  await expect(page.getByTestId(`employee-picker-card-${dispatcherEmployee.id}`)).toBeVisible();
  await page.getByTestId(`employee-picker-card-${dispatcherEmployee.id}`).dblclick();

  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-row-${appointmentId}`)).toBeVisible();
  const addResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/tours/${tour.id}/week-employees/add`
  ));
  await page.getByTestId("button-tour-employee-cascade-confirm").click();
  const addResponse = await addResponsePromise;
  expect(addResponse.ok(), await addResponse.text()).toBeTruthy();

  await expect(targetSection.getByTestId(`week-personnel-employee-tour-${tour.id}-${dispatcherEmployee.id}`)).toBeVisible();
  expect(await fetchAppointmentEmployeeIds(page, appointmentId)).toEqual(
    [existingEmployee.id, dispatcherEmployee.id].sort((left, right) => left - right),
  );

  await page.goto("/");
  await expect(page.getByTestId("nav-touren")).toBeVisible();
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();
  await page.getByTestId("tab-tour-wochenplanung").click();

  const weekCard = page.getByTestId(`card-tour-week-${targetWeek.isoYear}-${targetWeek.isoWeek}`);
  await expect(weekCard).toBeVisible();
  await expect(weekCard).toContainText(getCompactEmployeeLabel(existingEmployee));
  await expect(weekCard).toContainText(getCompactEmployeeLabel(dispatcherEmployee));
  await weekCard.dblclick();

  await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
  await expect(page.getByTestId("tour-week-form-functions-panel")).toBeVisible();
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(existingEmployee));
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(dispatcherEmployee));
});

test("KW-Plan-Toggle öffnet die Tour-KW-Spalte und add/remove nutzt echte Termin-Kaskaden", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const tour = await createTourFixture("#117799");
  const otherTour = await createTourFixture("#991177");
  const absenceTour = await createTourFixture("#64748B");
  const parkplatzTour = await createTourFixture("#7c3aed");
  await db.update(tours).set({ name: "Abwesenheiten" }).where(eq(tours.id, absenceTour.id));
  await db.update(tours).set({ name: "Parkplatz" }).where(eq(tours.id, parkplatzTour.id));
  const project = await createProjectFixture({ prefix: "BWE-PERSONAL" });
  const existingEmployee = await createEmployeeFixture("BWE-PERSONAL-EXISTING");
  const availableEmployee = await createEmployeeFixture("BWE-PERSONAL-AVAILABLE");
  const conflictingEmployee = await createEmployeeFixture("BWE-PERSONAL-CONFLICT");
  const appointmentId = await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekStartDate,
    title: "BWE Personal Termin",
    tourId: tour.id,
    employeeIds: [existingEmployee.id],
  });

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: existingEmployee.id,
  });
  await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekStartDate,
    title: "BWE Personal Konflikt",
    tourId: otherTour.id,
    employeeIds: [conflictingEmployee.id],
  });

  await loginAsAdmin(page);
  await openStandaloneWeek(page, targetWeek);
  const targetSection = getWeekSection(page, targetWeek.weekStartDate);

  await expect(targetSection.getByTestId(`week-personnel-column-tour-${tour.id}`)).toHaveCount(0);
  await page.getByTestId("switch-week-personnel-column").click();

  const personnelColumn = targetSection.getByTestId(`week-personnel-column-tour-${tour.id}`);
  const existingBadge = targetSection.getByTestId(`week-personnel-employee-tour-${tour.id}-${existingEmployee.id}`);
  await expect(personnelColumn).toBeVisible();
  await expect(existingBadge).toBeVisible();
  await expect(existingBadge.getByTestId(`week-personnel-employee-tour-${tour.id}-${existingEmployee.id}-avatar`)).toBeVisible();
  await expect(targetSection.getByTestId("week-personnel-column-tour-unassigned")).toBeVisible();
  await expect(targetSection.getByTestId(`week-personnel-column-tour-${absenceTour.id}`)).toBeVisible();
  await expect(targetSection.getByTestId(`week-personnel-column-tour-${parkplatzTour.id}`)).toBeVisible();

  const laneHeader = targetSection.getByTestId(`week-tour-lane-header-tour-${tour.id}`);
  const personnelBox = await personnelColumn.boundingBox();
  const laneHeaderBox = await laneHeader.boundingBox();
  expect(personnelBox).not.toBeNull();
  expect(laneHeaderBox).not.toBeNull();
  expect((laneHeaderBox?.x ?? 0) - ((personnelBox?.x ?? 0) + (personnelBox?.width ?? 0))).toBeGreaterThanOrEqual(-2);

  await targetSection.getByTestId(`button-week-personnel-column-toggle-tour-${tour.id}`).click();
  await expect(targetSection.getByTestId(`button-add-week-personnel-tour-${tour.id}`)).toBeVisible();
  await expect(targetSection.getByTestId("button-add-week-personnel-tour-unassigned")).toHaveCount(0);
  await expect(targetSection.getByTestId(`button-add-week-personnel-tour-${absenceTour.id}`)).toHaveCount(0);
  await expect(targetSection.getByTestId(`button-add-week-personnel-tour-${parkplatzTour.id}`)).toHaveCount(0);
  await expect(existingBadge).toContainText(existingEmployee.firstName ?? "");
  await expect.poll(async () => {
    const columnBox = await personnelColumn.boundingBox();
    const badgeBox = await existingBadge.boundingBox();
    if (!columnBox || !badgeBox) return false;
    const widthDifference = columnBox.width - badgeBox.width;
    return widthDifference >= 0 && widthDifference <= 18;
  }).toBe(true);

  await targetSection.getByTestId(`button-add-week-personnel-tour-${tour.id}`).click();
  await expect(page.getByTestId(`employee-picker-card-${availableEmployee.id}`)).toBeVisible();
  await expect(page.getByTestId(`employee-picker-card-${conflictingEmployee.id}`)).toHaveCount(0);
  await page.getByTestId(`employee-picker-card-${availableEmployee.id}`).dblclick();

  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-row-${appointmentId}`)).toBeVisible();
  const addResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/tours/${tour.id}/week-employees/add`
  ));
  await page.getByTestId("button-tour-employee-cascade-confirm").click();
  const addResponse = await addResponsePromise;
  expect(addResponse.ok(), await addResponse.text()).toBeTruthy();

  const addedBadge = targetSection.getByTestId(`week-personnel-employee-tour-${tour.id}-${availableEmployee.id}`);
  await expect(addedBadge).toBeVisible();
  expect(await fetchAppointmentEmployeeIds(page, appointmentId)).toEqual([existingEmployee.id, availableEmployee.id].sort((left, right) => left - right));

  await addedBadge.getByTestId(`week-personnel-employee-tour-${tour.id}-${availableEmployee.id}-remove`).click();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-row-${appointmentId}`)).toBeVisible();
  const removeResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "DELETE"
    && new URL(response.url()).pathname.startsWith(`/api/tours/${tour.id}/week-employees/`)
  ));
  await page.getByTestId("button-tour-employee-cascade-confirm").click();
  const removeResponse = await removeResponsePromise;
  expect(removeResponse.ok(), await removeResponse.text()).toBeTruthy();

  await expect(addedBadge).toHaveCount(0);
  expect(await fetchAppointmentEmployeeIds(page, appointmentId)).toEqual([existingEmployee.id]);
});

test("Notizen-Toggle hängt Termin- und Projektnotizen direkt an die Terminkarte", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const tour = await createTourFixture("#225588");
  const project = await createProjectFixture({ prefix: "BWE-NOTES" });
  const appointmentId = await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekMidDate,
    title: "BWE Notiz Termin",
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  const projectNoteResponse = await page.request.post(`/api/projects/${project.id}/notes`, {
    data: {
      title: "Projekt Browser Inline",
      body: "<p>Projekt Browser Inline Text</p>",
      cardColor: "#fef3c7",
    },
  });
  expect(projectNoteResponse.ok()).toBeTruthy();
  const appointmentNoteResponse = await page.request.post(`/api/appointments/${appointmentId}/notes`, {
    data: {
      title: "Termin Browser Inline",
      body: "<p>Termin Browser Inline Text</p>",
      cardColor: "#dbeafe",
    },
  });
  expect(appointmentNoteResponse.ok()).toBeTruthy();

  await openStandaloneWeek(page, targetWeek);
  await expect(page.getByTestId(`week-appointment-inline-notes-${appointmentId}`)).toHaveCount(0);

  await page.getByTestId("switch-week-inline-notes").click();

  const inlineNotes = page.getByTestId(`week-appointment-inline-notes-${appointmentId}`);
  await expect(inlineNotes).toBeVisible();
  await expect(inlineNotes).toContainText("Termin");
  await expect(inlineNotes).toContainText("Termin Browser Inline");
  await expect(inlineNotes).toContainText("Projekt");
  await expect(inlineNotes).toContainText("Projekt Browser Inline");
});
