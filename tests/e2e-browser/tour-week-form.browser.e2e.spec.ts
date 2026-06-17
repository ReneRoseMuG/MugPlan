/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das gemeinsame Wochenformular oeffnet aus Tour- und Mitarbeiter-Wochenkarten per Doppelklick.
 * - Die eingebettete Termintabelle zeigt je Scope nur echte Daten der gewaehlten Kalenderwoche.
 * - Das Wochennotiz-Panel arbeitet mit echten Daten strikt auf der aktiven KW und spiegelt Create, Update, Pin und Delete sofort im UI.
 * - Der KW-Mitarbeiterpicker bleibt im Tour-Scope funktional und aktualisiert Karten- sowie Formularinhalt ohne Reload.
 *
 * Fehlerfaelle:
 * - Das Wochenformular oeffnet aus einem der beiden Scopes nicht.
 * - Termine aus Nachbarwochen oder fremden Mitarbeiterkontexten erscheinen in der KW-Tabelle.
 * - Wochennotizen leaken ueber andere Kalenderwochen oder bleiben nach Mutationen stale.
 * - Der Mitarbeiterpicker im Wochenformular uebernimmt keine Auswahl in der Board-Ansicht.
 *
 * Ziel:
 * Browser-E2E-Nachweis fuer das gemeinsame tour_week-Formular mit echten KW-Daten, Notizeditor und sofortiger UI-Reflexion.
 */
import { expect, test, type Page } from "./fixtures";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek, subWeeks } from "date-fns";
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

test.describe.configure({ mode: "serial" });

function getCompactEmployeeLabel(employee: { firstName?: string | null; lastName?: string | null }) {
  const firstName = employee.firstName?.trim() ?? "";
  const lastNameInitial = employee.lastName?.trim()?.[0]?.toUpperCase() ?? "";
  return firstName && lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName || lastNameInitial;
}

function getDetailEmployeeLabel(employee: { firstName?: string | null; lastName?: string | null }) {
  return [employee.firstName?.trim(), employee.lastName?.trim()].filter(Boolean).join(" ");
}

function resolveTargetWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const weekStart = startOfISOWeek(addWeeks(today, 3));
  const previousWeekStart = startOfISOWeek(subWeeks(weekStart, 1));
  const nextWeekStart = startOfISOWeek(addWeeks(weekStart, 1));
  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekEndDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
    previousWeekStartDate: format(previousWeekStart, "yyyy-MM-dd"),
    nextWeekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
  };
}

function resolveNextEditableWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const weekStart = startOfISOWeek(addWeeks(today, 1));
  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekEndDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
    monthKey: format(weekStart, "yyyy-MM"),
  };
}

function resolveCurrentWeek() {
  const weekStart = startOfISOWeek(parseISO(getRelativeBerlinDate(0)));
  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekEndDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
  };
}

async function getTourIdByName(name: string): Promise<number> {
  const [tour] = await db.select().from(tours).where(eq(tours.name, name));
  if (!tour) throw new Error(`Expected tour ${name} to exist.`);
  return tour.id;
}

async function createBlockWeekScenario(prefix: string) {
  const targetWeek = resolveNextEditableWeek();
  const tour = await createTourFixture("#7c3aed");
  const employee = await createEmployeeFixture(`${prefix}-EMP`);
  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: employee.id,
  });
  const project = await createProjectFixture({ prefix, name: `${prefix} Projekt` });
  const appointmentId = await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekStartDate,
    title: `${prefix} Termin`,
    tourId: tour.id,
    employeeIds: [employee.id],
  });
  const parkplatzTourId = await getTourIdByName("Parkplatz");

  return {
    targetWeek,
    tour,
    employee,
    project,
    appointmentId,
    parkplatzTourId,
  };
}

async function expectAppointmentParked(page: Page, appointmentId: number, parkplatzTourId: number) {
  const response = await page.request.get(`/api/appointments/${appointmentId}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.tourId).toBe(parkplatzTourId);
  expect((body.employees as Array<{ id: number }>).map((employee) => employee.id)).toEqual([]);
  const tagNames = (body.appointmentTags as Array<{ name: string }>).map((tag) => tag.name);
  expect(tagNames).toContain("Geparkt");
  expect(tagNames).not.toContain("Planung blockiert");
}

async function getAppointmentTagIdByName(page: Page, appointmentId: number, tagName: string): Promise<number> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/tags`);
  expect(response.ok()).toBeTruthy();
  const tags = await response.json() as Array<{ tag: { id: number; name: string } }>;
  const tag = tags.find((entry) => entry.tag.name === tagName);
  if (!tag) throw new Error(`Expected appointment tag ${tagName} to exist.`);
  return tag.tag.id;
}

async function createWeekNote(page: Page, params: {
  tourId: number;
  isoYear: number;
  isoWeek: number;
  title: string;
}) {
  const response = await page.request.post(`/api/calendar-weeks/${params.isoYear}/${params.isoWeek}/tours/${params.tourId}/notes`, {
    data: {
      title: params.title,
      body: `<p>${params.title}</p>`,
      cardColor: "#22c55e",
      print: false,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function openWeekNotesEditor(page: Page, title: string, body: string) {
  await page.getByTestId("button-new-note").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("input-note-title").fill(title);
  await dialog.getByTestId("richtext-editor").fill(body);
  await dialog.getByTestId("button-save-note").click();
}

async function confirmTourWeekBlockDialog(page: Page) {
  const dialog = page.getByTestId("dialog-tour-week-block-confirm");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Blockieren" }).click();
}

async function navigateToMonthContaining(page: Page, dateString: string) {
  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(page.getByTestId("month-sheet-container")).toBeVisible();

  for (let step = 0; step < 20; step += 1) {
    const targetDay = page.locator(`[data-testid="month-sheet-day-${dateString}"][data-month-scope="current"]`);
    if (await targetDay.count()) {
      await expect(targetDay).toBeVisible();
      return;
    }

    const visibleMonth = await page.locator('[data-testid^="month-sheet-title-"]').first().evaluate((element) => {
      const value = element.getAttribute("data-testid");
      if (!value) throw new Error("Expected visible month key.");
      return value.replace("month-sheet-title-", "").slice(0, 7);
    });
    const targetMonth = dateString.slice(0, 7);
    await page.getByTestId(targetMonth < visibleMonth ? "button-prev" : "button-next").click();
  }

  throw new Error(`Month containing ${dateString} was not reachable within 20 steps.`);
}

test.beforeEach(async () => {
  await resetBrowserSuiteState();
});

test("Admins bearbeiten und blockieren die aktuelle Tour-KW im Tour-Formular", async ({ page }) => {
  const currentWeek = resolveCurrentWeek();
  const tour = await createTourFixture("#2563eb");
  const employee = await createEmployeeFixture("TWF-CURRENT-ADMIN");
  const project = await createProjectFixture({ prefix: "TWF-CUR-ADMIN", name: "TWF Aktuelle Admin KW" });

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: currentWeek.isoYear,
    isoWeek: currentWeek.isoWeek,
    employeeId: employee.id,
  });
  await createRawAppointmentFixture({
    projectId: project.id,
    startDate: currentWeek.weekStartDate,
    title: "TWF-Admin-Aktuelle-KW",
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();
  await page.getByTestId("tab-tour-wochenplanung").click();

  const weekCard = page.getByTestId(`card-tour-week-${currentWeek.isoYear}-${currentWeek.isoWeek}`);
  await expect(weekCard).toBeVisible();
  await expect(weekCard.getByTestId(`button-add-tour-week-member-${currentWeek.isoYear}-${currentWeek.isoWeek}`)).toBeVisible();
  await expect(weekCard.getByTestId(`button-apply-tour-week-member-${currentWeek.isoYear}-${currentWeek.isoWeek}`)).toBeEnabled();

  await weekCard.dblclick();
  await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
  await expect(page.getByTestId("button-open-tour-week-employee-picker")).toBeEnabled();
  await page.getByTestId("button-close-tour-week").click();

  const blockResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/tours/${tour.id}/weeks/${currentWeek.isoYear}/${currentWeek.isoWeek}/block`
  ));
  await weekCard.getByTestId(`button-tour-week-menu-${currentWeek.isoYear}-${currentWeek.isoWeek}`).click();
  await page.getByRole("menuitem", { name: "Wochenplanung blockieren" }).click({ force: true });
  await confirmTourWeekBlockDialog(page);
  const blockResponse = await blockResponsePromise;
  expect(blockResponse.ok(), await blockResponse.text()).toBeTruthy();
  await expect(page.getByTestId(`text-tour-week-blocked-${currentWeek.isoYear}-${currentWeek.isoWeek}`)).toContainText("Parkplatz");
});

test("Dispatcher bearbeiten die aktuelle Tour-KW im Tour-Formular", async ({ page }) => {
  const currentWeek = resolveCurrentWeek();
  const tour = await createTourFixture("#0f766e");
  const employee = await createEmployeeFixture("TWF-CURRENT-DISPATCHER");

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: currentWeek.isoYear,
    isoWeek: currentWeek.isoWeek,
    employeeId: employee.id,
  });

  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await loginAsRole(page, "DISPATCHER");
  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.ok(), await sessionResponse.text()).toBeTruthy();
  const session = await sessionResponse.json() as { roleCode?: string };
  expect(session.roleCode).toBe("DISPATCHER");
  const weekResponse = await page.request.get(`/api/tours/${tour.id}/week-employees`);
  expect(weekResponse.ok(), await weekResponse.text()).toBeTruthy();
  const weeks = await weekResponse.json() as Array<{ isoYear: number; isoWeek: number; isLocked: boolean }>;
  expect(weeks.find((week) => week.isoYear === currentWeek.isoYear && week.isoWeek === currentWeek.isoWeek)?.isLocked).toBe(false);

  await page.reload();
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await page.getByTestId("nav-touren").click();
  const weekEmployeesResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "GET"
    && new URL(response.url()).pathname === `/api/tours/${tour.id}/week-employees`
  ));
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();
  const frontendWeekResponse = await weekEmployeesResponsePromise;
  expect(frontendWeekResponse.ok(), await frontendWeekResponse.text()).toBeTruthy();
  const frontendWeeks = await frontendWeekResponse.json() as Array<{ isoYear: number; isoWeek: number; isLocked: boolean }>;
  expect(frontendWeeks.find((week) => week.isoYear === currentWeek.isoYear && week.isoWeek === currentWeek.isoWeek)?.isLocked).toBe(false);
  await page.getByTestId("tab-tour-wochenplanung").click();

  const weekCard = page.getByTestId(`card-tour-week-${currentWeek.isoYear}-${currentWeek.isoWeek}`);
  await expect(weekCard).toBeVisible();
  await expect(weekCard.getByTestId(`button-add-tour-week-member-${currentWeek.isoYear}-${currentWeek.isoWeek}`)).toBeVisible();
  await expect(weekCard.getByTestId(`button-apply-tour-week-member-${currentWeek.isoYear}-${currentWeek.isoWeek}`)).toBeEnabled();

  await weekCard.dblclick();
  await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
  await expect(page.getByTestId("button-open-tour-week-employee-picker")).toBeEnabled();
});

test("blocking from the tour week card parks appointments and keeps the KW visibly blocked", async ({ page }) => {
  const scenario = await createBlockWeekScenario("TWF-BLOCK-CARD");

  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${scenario.tour.id}`).dblclick();
  await page.getByTestId("tab-tour-wochenplanung").click();

  const weekCard = page.getByTestId(`card-tour-week-${scenario.targetWeek.isoYear}-${scenario.targetWeek.isoWeek}`);
  await expect(weekCard).toBeVisible();
  await weekCard.getByTestId(`button-tour-week-menu-${scenario.targetWeek.isoYear}-${scenario.targetWeek.isoWeek}`).click();
  await page.getByRole("menuitem", { name: "Wochenplanung blockieren" }).click({ force: true });
  await confirmTourWeekBlockDialog(page);

  await expect(page.getByTestId(`text-tour-week-blocked-${scenario.targetWeek.isoYear}-${scenario.targetWeek.isoWeek}`)).toContainText("Parkplatz");
  await expectAppointmentParked(page, scenario.appointmentId, scenario.parkplatzTourId);
});

test("blocking from the week calendar KW-Plan card parks appointments and keeps the lane visible", async ({ page }) => {
  const scenario = await createBlockWeekScenario("TWF-BLOCK-WEEK");

  await loginAsAdmin(page);
  await page.goto(`/standalone/calendar/week?kw=${scenario.targetWeek.isoWeek}&year=${scenario.targetWeek.isoYear}`);
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  const laneHeader = page.getByTestId(`week-tour-lane-header-tour-${scenario.tour.id}`).first();
  await expect(laneHeader).toBeVisible();
  await page.getByTestId("switch-week-personnel-column").click();
  await page.getByTestId(`button-week-personnel-column-toggle-tour-${scenario.tour.id}`).first().click();
  const weekPlanCard = page.getByTestId(`week-personnel-card-tour-${scenario.tour.id}`).first();
  await expect(weekPlanCard).toBeVisible();
  await expect(page.getByTestId(`week-tour-lane-menu-trigger-tour-${scenario.tour.id}`)).toHaveCount(0);

  const blockResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/tours/${scenario.tour.id}/weeks/${scenario.targetWeek.isoYear}/${scenario.targetWeek.isoWeek}/block`
  ));
  await weekPlanCard.getByTestId(`week-personnel-card-menu-trigger-tour-${scenario.tour.id}`).click();
  await page.getByRole("menuitem", { name: "Wochenplanung blockieren" }).evaluate((element: HTMLElement) => {
    element.click();
  });
  await confirmTourWeekBlockDialog(page);
  const blockResponse = await blockResponsePromise;
  expect(blockResponse.ok(), await blockResponse.text()).toBeTruthy();

  await expect(laneHeader).toBeVisible();
  await expectAppointmentParked(page, scenario.appointmentId, scenario.parkplatzTourId);
});

test("blocking a week refreshes the parked appointment edit form after the appointment was opened before blocking", async ({ page }) => {
  const scenario = await createBlockWeekScenario("TWF-BLOCK-FORM-FRESH");
  await loginAsAdmin(page);
  await page.goto(`/standalone/calendar/week?kw=${scenario.targetWeek.isoWeek}&year=${scenario.targetWeek.isoYear}`);
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  await page.getByTestId("switch-week-personnel-column").click();
  await page.getByTestId(`button-week-personnel-column-toggle-tour-${scenario.tour.id}`).first().click();

  const originalAppointmentPanel = page.getByTestId(`week-appointment-panel-${scenario.appointmentId}`).first();
  await expect(originalAppointmentPanel).toBeVisible();
  await originalAppointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("badge-tour")).toContainText(scenario.tour.name);
  await expect(page.getByTestId("slot-appointment-employees")).toContainText(getDetailEmployeeLabel(scenario.employee));
  await expect(page.getByTestId("appointment-tag-picker-assigned-list")).not.toContainText("Geparkt");
  await page.getByTestId("button-close-appointment").click();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);

  const blockResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/tours/${scenario.tour.id}/weeks/${scenario.targetWeek.isoYear}/${scenario.targetWeek.isoWeek}/block`
  ));
  await page.getByTestId(`week-personnel-card-menu-trigger-tour-${scenario.tour.id}`).first().click();
  await page.getByRole("menuitem", { name: "Wochenplanung blockieren" }).evaluate((element: HTMLElement) => {
    element.click();
  });
  await confirmTourWeekBlockDialog(page);
  const blockResponse = await blockResponsePromise;
  expect(blockResponse.ok(), await blockResponse.text()).toBeTruthy();

  const parkedLaneWithAppointment = page.locator("section")
    .filter({ has: page.getByTestId(`week-tour-lane-header-tour-${scenario.parkplatzTourId}`) })
    .filter({ has: page.getByTestId(`week-appointment-panel-${scenario.appointmentId}`) })
    .first();
  await expect(parkedLaneWithAppointment).toBeVisible();
  const parkedAppointmentPanel = parkedLaneWithAppointment.getByTestId(`week-appointment-panel-${scenario.appointmentId}`);
  await expect(parkedAppointmentPanel).toBeVisible();
  await parkedAppointmentPanel.dblclick();

  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("badge-tour")).toContainText("Parkplatz");
  await expect(page.getByTestId("slot-appointment-employees")).toContainText("Keine Mitarbeiter zugewiesen");
  await expect(page.getByTestId("slot-appointment-employees")).not.toContainText(getDetailEmployeeLabel(scenario.employee));
  const geparktTagId = await getAppointmentTagIdByName(page, scenario.appointmentId, "Geparkt");
  await expect(page.getByTestId(`appointment-tag-picker-tag-${geparktTagId}`)).toBeVisible();
  await expect(page.getByTestId("appointment-tag-picker-assigned-list")).toContainText("Gepa");
});

test("blocked tour weeks remain visible in the month sheet after appointments are parked", async ({ page }) => {
  const scenario = await createBlockWeekScenario("TWF-BLOCK-MONTH");

  await loginAsAdmin(page);
  const blockResponse = await page.request.post(
    `/api/tours/${scenario.tour.id}/weeks/${scenario.targetWeek.isoYear}/${scenario.targetWeek.isoWeek}/block`,
    { data: {} },
  );
  expect(blockResponse.ok()).toBeTruthy();

  await navigateToMonthContaining(page, scenario.targetWeek.weekStartDate);
  const blockedSlot = page.getByTestId(`month-sheet-slot-${scenario.targetWeek.weekStartDate}-${scenario.tour.id}`);
  await expect(blockedSlot).toHaveAttribute("data-blocked", "true");
  await expect(page.getByTestId(`month-sheet-slot-overlay-${scenario.targetWeek.weekStartDate}-${scenario.tour.id}`)).toBeVisible();
  await expectAppointmentParked(page, scenario.appointmentId, scenario.parkplatzTourId);
});

test("month sheet reloads blocked weeks after the month was already cached before blocking", async ({ page }) => {
  const scenario = await createBlockWeekScenario("TWF-BLOCK-CACHE");

  await loginAsAdmin(page);
  await navigateToMonthContaining(page, scenario.targetWeek.weekStartDate);

  const blockedSlot = page.getByTestId(`month-sheet-slot-${scenario.targetWeek.weekStartDate}-${scenario.tour.id}`);
  await expect(blockedSlot).toHaveAttribute("data-blocked", "false");

  await page.getByTestId("nav-touren").click();
  const blockResponse = await page.request.post(
    `/api/tours/${scenario.tour.id}/weeks/${scenario.targetWeek.isoYear}/${scenario.targetWeek.isoWeek}/block`,
    { data: {} },
  );
  expect(blockResponse.ok()).toBeTruthy();

  await navigateToMonthContaining(page, scenario.targetWeek.weekStartDate);
  await expect(blockedSlot).toHaveAttribute("data-blocked", "true");
  await expect(page.getByTestId(`month-sheet-slot-overlay-${scenario.targetWeek.weekStartDate}-${scenario.tour.id}`)).toBeVisible();
  await expectAppointmentParked(page, scenario.appointmentId, scenario.parkplatzTourId);
});

test("tour scope week form filters appointments by KW, keeps week notes isolated and reflects mutations immediately", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const tour = await createTourFixture("#225588");
  const primaryEmployee = await createEmployeeFixture("TWF-PRIMARY");
  const colleague = await createEmployeeFixture("TWF-COLLEAGUE");
  const pickerEmployee = await createEmployeeFixture("TWF-PICKER");

  const primaryInsertResult = await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: primaryEmployee.id,
  });
  const primaryAssignmentId = Number((primaryInsertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
    ?? (primaryInsertResult as { insertId?: number }).insertId);

  const colleagueInsertResult = await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: colleague.id,
  });
  const colleagueAssignmentId = Number((colleagueInsertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
    ?? (colleagueInsertResult as { insertId?: number }).insertId);

  const weekProjectA = await createProjectFixture({ prefix: "TWF-WEEK-A", name: "TWF Aktuelle KW A" });
  const weekProjectB = await createProjectFixture({ prefix: "TWF-WEEK-B", name: "TWF Aktuelle KW B" });
  const previousWeekProject = await createProjectFixture({ prefix: "TWF-PREV", name: "TWF Vorwoche" });
  const nextWeekProject = await createProjectFixture({ prefix: "TWF-NEXT", name: "TWF Folgewoche" });

  const currentAppointmentA = await createRawAppointmentFixture({
    projectId: weekProjectA.id,
    startDate: targetWeek.weekStartDate,
    title: "TWF-Aktuell-A",
    tourId: tour.id,
    employeeIds: [primaryEmployee.id],
  });
  const currentAppointmentB = await createRawAppointmentFixture({
    projectId: weekProjectB.id,
    startDate: format(addDays(parseISO(targetWeek.weekStartDate), 2), "yyyy-MM-dd"),
    title: "TWF-Aktuell-B",
    tourId: tour.id,
    employeeIds: [primaryEmployee.id, colleague.id],
  });
  await createRawAppointmentFixture({
    projectId: previousWeekProject.id,
    startDate: targetWeek.previousWeekStartDate,
    title: "TWF-Vorwoche",
    tourId: tour.id,
    employeeIds: [primaryEmployee.id],
  });
  await createRawAppointmentFixture({
    projectId: nextWeekProject.id,
    startDate: targetWeek.nextWeekStartDate,
    title: "TWF-Folgewoche",
    tourId: tour.id,
    employeeIds: [primaryEmployee.id],
  });

  await loginAsAdmin(page);
  await createWeekNote(page, {
    tourId: tour.id,
    isoYear: getISOWeekYear(parseISO(targetWeek.previousWeekStartDate)),
    isoWeek: getISOWeek(parseISO(targetWeek.previousWeekStartDate)),
    title: "TWF Fremde KW Notiz",
  });

  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();
  await page.getByTestId("tab-tour-wochenplanung").click();

  const weekCard = page.getByTestId(`card-tour-week-${targetWeek.isoYear}-${targetWeek.isoWeek}`);
  await expect(weekCard).toBeVisible();
  await expect(weekCard.locator('[data-testid$="-appointments"]')).toContainText("2");
  await expect(weekCard.locator('[data-testid$="-notes"]')).toContainText("0");

  await weekCard.dblclick();
  await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(primaryEmployee));
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(colleague));
  await expect(page.getByTestId("button-open-tour-week-employee-picker")).toBeVisible();
  await expect(page.getByTestId("list-notes")).not.toContainText("TWF Fremde KW Notiz");

  await page.getByTestId("tab-tour-week-termine").click();
  await expect(page.getByTestId("button-appointment-period-picker")).toHaveCount(0);
  const rows = page.getByTestId("table-appointments-list").locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(page.getByTestId("table-appointments-list")).toContainText(weekProjectA.name);
  await expect(page.getByTestId("table-appointments-list")).toContainText(weekProjectB.name);
  await expect(page.getByTestId("table-appointments-list")).not.toContainText(previousWeekProject.name);
  await expect(page.getByTestId("table-appointments-list")).not.toContainText(nextWeekProject.name);

  await page.getByTestId("tab-tour-week-stammdaten").click();
  await openWeekNotesEditor(page, "TWF Zielnotiz", "KW Zielinhalt");

  const noteCard = page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: "TWF Zielnotiz" }).first();
  await expect(noteCard).toBeVisible();
  await expect(weekCard.locator('[data-testid$="-notes"]')).toContainText("1");

  await noteCard.dblclick();
  const noteDialog = page.getByRole("dialog");
  await expect(noteDialog.getByTestId("input-note-title")).toHaveValue("TWF Zielnotiz");
  await noteDialog.getByTestId("input-note-title").fill("TWF Zielnotiz aktualisiert");
  await noteDialog.getByTestId("button-save-note").click();
  const updatedNoteCard = page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: "TWF Zielnotiz aktualisiert" }).first();
  await expect(updatedNoteCard).toBeVisible();
  await updatedNoteCard.getByTestId(/button-pin-note-/).click();
  await expect(updatedNoteCard).toBeVisible();

  await page.getByTestId("button-close-tour-week").click();
  await expect(page.getByTestId("tour-week-form-overlay")).toHaveCount(0);
  await weekCard.locator('[data-testid$="-notes"]').hover();
  await expect(page.getByText("TWF Zielnotiz aktualisiert")).toBeVisible();

  await weekCard.dblclick();
  await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
  await page.getByTestId("button-open-tour-week-employee-picker").click();
  await expect(page.getByTestId(`employee-picker-card-${pickerEmployee.id}`)).toBeVisible();
  await page.getByTestId(`employee-picker-card-${pickerEmployee.id}`).dblclick();
  const cascadeDialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(cascadeDialog).toBeVisible();
  await expect(cascadeDialog.getByTestId(`tour-employee-cascade-row-${currentAppointmentA}`)).toBeVisible();
  await expect(cascadeDialog.getByTestId(`tour-employee-cascade-row-${currentAppointmentB}`)).toBeVisible();
  // Kein "Alle abwählen"-Button: beide Termine sind vorausgewählt, daher Termin B abwählen, damit nur A übernommen wird
  await cascadeDialog.getByTestId(`tour-employee-cascade-checkbox-${currentAppointmentB}`).click();
  await cascadeDialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(cascadeDialog).toHaveCount(0);

  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(pickerEmployee));
  await expect(weekCard).toContainText(getCompactEmployeeLabel(pickerEmployee));

  const noteToDelete = page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: "TWF Zielnotiz aktualisiert" }).first();
  await noteToDelete.getByTestId(/button-delete-note-/).click();
  await page.getByTestId("dialog-delete-note").getByRole("button", { name: "Notiz löschen" }).click();
  await expect(noteToDelete).toHaveCount(0);
  await expect(weekCard.locator('[data-testid$="-notes"]')).toContainText("0");
});

test("employee scope week form opens read-only employee planning and limits appointments to the selected employee and KW", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const tour = await createTourFixture("#884422");
  const employee = await createEmployeeFixture("TWF-EMPLOYEE");
  const colleague = await createEmployeeFixture("TWF-EMPLOYEE-COLLEAGUE");

  const employeeInsertResult = await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: employee.id,
  });
  const employeeAssignmentId = Number((employeeInsertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
    ?? (employeeInsertResult as { insertId?: number }).insertId);

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: colleague.id,
  });

  const employeeWeekProject = await createProjectFixture({ prefix: "TWF-EMP-WEEK", name: "TWF Mitarbeiter KW" });
  const colleagueOnlyProject = await createProjectFixture({ prefix: "TWF-EMP-COL", name: "TWF Nur Kollege" });
  const adjacentProject = await createProjectFixture({ prefix: "TWF-EMP-ADJ", name: "TWF Angrenzend" });

  await createRawAppointmentFixture({
    projectId: employeeWeekProject.id,
    startDate: targetWeek.weekStartDate,
    title: "TWF-Mitarbeiter-Termin",
    tourId: tour.id,
    employeeIds: [employee.id],
  });
  await createRawAppointmentFixture({
    projectId: colleagueOnlyProject.id,
    startDate: format(addDays(parseISO(targetWeek.weekStartDate), 1), "yyyy-MM-dd"),
    title: "TWF-Nur-Kollege",
    tourId: tour.id,
    employeeIds: [colleague.id],
  });
  await createRawAppointmentFixture({
    projectId: adjacentProject.id,
    startDate: targetWeek.nextWeekStartDate,
    title: "TWF-Nachbarwoche",
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await createWeekNote(page, {
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    title: "TWF Gemeinsame Wochennotiz",
  });

  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-wochenplanung").click();

  const weekCard = page.getByTestId(`card-employee-week-plan-${employeeAssignmentId}`);
  await expect(weekCard).toBeVisible();
  await expect(weekCard.locator('[data-testid$="-appointments"]')).toContainText("1");
  await expect(weekCard.locator('[data-testid$="-notes"]')).toContainText("1");

  await weekCard.dblclick();
  await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
  await expect(page.getByTestId("button-open-tour-week-employee-picker")).toHaveCount(0);
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(employee));
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(colleague));
  await expect(page.getByTestId("tour-week-form-sidebar").getByTestId("list-notes")).toContainText("TWF Gemeinsame Wochennotiz");

  await page.getByTestId("tab-tour-week-termine").click();
  await expect(page.getByTestId("button-appointment-period-picker")).toHaveCount(0);
  const rows = page.getByTestId("table-appointments-list").locator("tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(page.getByTestId("table-appointments-list")).toContainText(employeeWeekProject.name);
  await expect(page.getByTestId("table-appointments-list")).not.toContainText(colleagueOnlyProject.name);
  await expect(page.getByTestId("table-appointments-list")).not.toContainText(adjacentProject.name);
});
