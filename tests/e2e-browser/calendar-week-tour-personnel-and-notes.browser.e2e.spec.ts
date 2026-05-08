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
 * - Tour-KW-Notizen und Wochenaktionen sitzen in der KW-Plan-Karte, nicht mehr in der Tour-Headerbar.
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

async function readAppointmentNotes(page: Page, appointmentId: number): Promise<Array<{ id: number; title: string; body: string }>> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/notes`);
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<Array<{ id: number; title: string; body: string }>>;
}

async function readProjectNotes(page: Page, projectId: number): Promise<Array<{ id: number; title: string; body: string }>> {
  const response = await page.request.get(`/api/projects/${projectId}/notes`);
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<Array<{ id: number; title: string; body: string }>>;
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
  const weekNoteResponse = await page.request.post(`/api/calendar-weeks/${targetWeek.isoYear}/${targetWeek.isoWeek}/tours/${firstTour.id}/notes`, {
    data: {
      title: "BWE KW Plan Notiz",
      body: "BWE KW Plan Notizinhalt",
      print: false,
    },
  });
  expect(weekNoteResponse.ok(), await weekNoteResponse.text()).toBeTruthy();

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
  const firstTourWeekPlanCard = targetSection.getByTestId(`week-personnel-card-tour-${firstTour.id}`);
  await expect(firstTourWeekPlanCard.getByTestId(`week-personnel-card-menu-trigger-tour-${firstTour.id}`)).toBeVisible();
  await expect(firstTourWeekPlanCard.getByTestId(`week-personnel-card-notes-tour-${firstTour.id}`)).toContainText("1");
  await expect(targetSection.getByTestId(`week-tour-lane-menu-trigger-tour-${firstTour.id}`)).toHaveCount(0);
  await firstTourWeekPlanCard.getByTestId(`week-personnel-card-notes-tour-${firstTour.id}`).hover();
  await expect(page.getByText("BWE KW Plan Notiz", { exact: true })).toBeVisible();
  await firstTourWeekPlanCard.getByTestId(`week-personnel-card-menu-trigger-tour-${firstTour.id}`).click();
  await expect(page.getByRole("menuitem", { name: "Notiz hinzufügen" })).toBeVisible();
  await page.keyboard.press("Escape");

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

test("Admin rollt vorhandene Tour-KW-Mitarbeiter aus der Wochenkalender-Spalte auf Termine aus", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const tour = await createTourFixture("#16a34a");
  const project = await createProjectFixture({ prefix: "BWE-APPLY", name: "BWE Apply Projekt" });
  const plannedEmployee = await createEmployeeFixture("BWE-APPLY-PLAN");
  const appointmentId = await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekStartDate,
    title: "BWE Apply Termin",
    tourId: tour.id,
    employeeIds: [],
  });

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: plannedEmployee.id,
  });

  await loginAsAdmin(page);
  await openStandaloneWeek(page, targetWeek);
  const targetSection = getWeekSection(page, targetWeek.weekStartDate);
  await page.getByTestId("switch-week-personnel-column").click();
  await targetSection.getByTestId(`button-week-personnel-column-toggle-tour-${tour.id}`).click();

  await expect(targetSection.getByTestId(`button-apply-week-personnel-tour-${tour.id}`)).toBeVisible();
  await targetSection.getByTestId(`button-apply-week-personnel-tour-${tour.id}`).click();

  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-row-${appointmentId}`)).toBeVisible();
  const applyResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/tours/${tour.id}/week-employees/add`
  ));
  await page.getByTestId("button-tour-employee-cascade-confirm").click();
  const applyResponse = await applyResponsePromise;
  expect(applyResponse.ok(), await applyResponse.text()).toBeTruthy();

  await expect.poll(async () => fetchAppointmentEmployeeIds(page, appointmentId)).toEqual([plannedEmployee.id]);
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
  const personnelColumnBody = targetSection.getByTestId(`week-personnel-column-body-tour-${tour.id}`);
  const personnelBackground = targetSection.getByTestId(`week-personnel-column-background-tour-${tour.id}`);
  const personnelCardWrapper = targetSection.getByTestId(`week-personnel-card-wrapper-tour-${tour.id}`);
  const personnelCard = targetSection.getByTestId(`week-personnel-card-tour-${tour.id}`);
  const existingBadge = targetSection.getByTestId(`week-personnel-employee-tour-${tour.id}-${existingEmployee.id}`);
  await expect(personnelColumn).toBeVisible();
  await expect(personnelColumnBody).toBeVisible();
  await expect(personnelBackground).toBeVisible();
  await expect(personnelCardWrapper).toBeVisible();
  await expect(personnelCard).toBeVisible();
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
  await expect(targetSection.getByTestId(`button-apply-week-personnel-tour-${tour.id}`)).toBeVisible();
  await expect(targetSection.getByTestId("button-add-week-personnel-tour-unassigned")).toHaveCount(0);
  await expect(targetSection.getByTestId("button-apply-week-personnel-tour-unassigned")).toHaveCount(0);
  await expect(targetSection.getByTestId(`button-add-week-personnel-tour-${absenceTour.id}`)).toHaveCount(0);
  await expect(targetSection.getByTestId(`button-apply-week-personnel-tour-${absenceTour.id}`)).toHaveCount(0);
  await expect(targetSection.getByTestId(`button-add-week-personnel-tour-${parkplatzTour.id}`)).toHaveCount(0);
  await expect(targetSection.getByTestId(`button-apply-week-personnel-tour-${parkplatzTour.id}`)).toHaveCount(0);
  await expect.poll(async () => {
    const bodyBox = await personnelColumnBody.boundingBox();
    const backgroundBox = await personnelBackground.boundingBox();
    const wrapperBox = await personnelCardWrapper.boundingBox();
    if (!bodyBox || !backgroundBox || !wrapperBox) return false;
    return Math.abs(backgroundBox.y - bodyBox.y) <= 2
      && Math.abs((backgroundBox.y + backgroundBox.height) - (bodyBox.y + bodyBox.height)) <= 2
      && Math.abs(wrapperBox.y - bodyBox.y) <= 2
      && Math.abs((wrapperBox.y + wrapperBox.height) - (bodyBox.y + bodyBox.height)) <= 2;
  }).toBe(true);
  await page.getByTestId("toggle-week-lanes-collapsed").click();
  await targetSection.getByTestId(`week-tour-lane-day-hover-trigger-tour-${tour.id}-${targetWeek.weekStartDate}`).click();
  const collapsedPersonnelColumnBody = targetSection.getByTestId(`week-personnel-column-body-tour-${absenceTour.id}`);
  await expect.poll(async () => {
    const activeBodyBox = await personnelColumnBody.boundingBox();
    const collapsedBodyBox = await collapsedPersonnelColumnBody.boundingBox();
    if (!activeBodyBox || !collapsedBodyBox) return false;
    return activeBodyBox.height > 40 && collapsedBodyBox.height <= 3;
  }).toBe(true);
  await page.getByTestId("toggle-week-lanes-expanded").click();
  await expect.poll(async () => {
    const restoredBodyBox = await collapsedPersonnelColumnBody.boundingBox();
    return Boolean(restoredBodyBox && restoredBodyBox.height > 40);
  }).toBe(true);
  await expect(existingBadge).toContainText(existingEmployee.firstName ?? "");
  await expect.poll(async () => {
    const cardBox = await personnelCard.boundingBox();
    const badgeBox = await existingBadge.boundingBox();
    if (!cardBox || !badgeBox) return false;
    return badgeBox.x >= cardBox.x - 2
      && badgeBox.y >= cardBox.y - 2
      && badgeBox.x + badgeBox.width <= cardBox.x + cardBox.width + 2
      && badgeBox.y + badgeBox.height <= cardBox.y + cardBox.height + 2;
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
  await expect(inlineNotes.getByText("Termin", { exact: true })).toHaveCount(0);
  await expect(inlineNotes).toContainText("Termin Browser Inline");
  await expect(inlineNotes.getByText("Projekt", { exact: true })).toHaveCount(0);
  await expect(inlineNotes).toContainText("Projekt Browser Inline");
});

test("Inline-Notizen an der Terminkarte lassen sich bearbeiten und löschen", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const tour = await createTourFixture("#225588");
  const project = await createProjectFixture({ prefix: "BWE-INLINE-ACTION" });
  const appointmentId = await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekMidDate,
    title: "BWE Inline Aktion Termin",
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  const appointmentNoteResponse = await page.request.post(`/api/appointments/${appointmentId}/notes`, {
    data: {
      title: "Termin Browser Bearbeiten",
      body: "<p>Termin Browser Bearbeiten Text</p>",
      cardColor: "#2563eb",
    },
  });
  expect(appointmentNoteResponse.ok(), await appointmentNoteResponse.text()).toBeTruthy();
  const appointmentNote = await appointmentNoteResponse.json() as { id: number };

  const projectNoteResponse = await page.request.post(`/api/projects/${project.id}/notes`, {
    data: {
      title: "Projekt Browser Löschen",
      body: "<p>Projekt Browser Löschen Text</p>",
      cardColor: "#16a34a",
    },
  });
  expect(projectNoteResponse.ok(), await projectNoteResponse.text()).toBeTruthy();
  const projectNote = await projectNoteResponse.json() as { id: number };

  await openStandaloneWeek(page, targetWeek);
  await page.getByTestId("switch-week-inline-notes").click();

  const appointmentInlineNote = page.getByTestId(`week-appointment-inline-note-${appointmentId}-${appointmentNote.id}`);
  await expect(appointmentInlineNote).toBeVisible();
  await appointmentInlineNote.dblclick();
  await expect(page.getByTestId("input-note-title")).toHaveValue("Termin Browser Bearbeiten");
  await page.getByTestId("input-note-title").fill("Termin Browser Bearbeitet");
  const updateResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PUT"
    && new URL(response.url()).pathname === `/api/notes/${appointmentNote.id}`
  ));
  await page.getByTestId("button-save-note").click();
  const updateResponse = await updateResponsePromise;
  expect(updateResponse.ok(), await updateResponse.text()).toBeTruthy();
  await expect(page.getByTestId("input-note-title")).toHaveCount(0);
  await expect(page.getByTestId(`week-appointment-inline-notes-${appointmentId}`)).toContainText("Termin Browser Bearbeitet");
  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointmentId);
    return notes.find((note) => note.id === appointmentNote.id)?.title;
  }).toBe("Termin Browser Bearbeitet");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Projekt Browser Löschen");
    await dialog.accept();
  });
  const deleteResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "DELETE"
    && new URL(response.url()).pathname === `/api/projects/${project.id}/notes/${projectNote.id}`
  ));
  await page.getByTestId(`week-appointment-inline-note-delete-${appointmentId}-project-${projectNote.id}`).click();
  const deleteResponse = await deleteResponsePromise;
  expect(deleteResponse.ok()).toBeTruthy();
  await expect(page.getByTestId(`week-appointment-inline-note-${appointmentId}-${projectNote.id}`)).toHaveCount(0);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, project.id);
    return notes.some((note) => note.id === projectNote.id);
  }).toBe(false);
});
