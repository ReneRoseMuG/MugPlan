/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echte App, echte API, echte Test-DB, echte ADMIN-Session und echte synthetische Tour-/Termin-/Mitarbeiterdaten.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; der Test fängt nur echte Netzwerkantworten beobachtend ab.
 *
 * Isolation:
 * - Test-DB-Reset über resetBrowserSuiteState, keine Dateisystem-Artefakte.
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender-Picker lädt verfügbare Tour-KW-Mitarbeiter beim Öffnen frisch über /available.
 * - Ein Wechsel zu einer anderen KW und zurück darf keinen frischen /available-Request durch React-Query-Cache unterdrücken.
 *
 * Fehlerfälle:
 * - Das zweite Öffnen des Pickers zeigt stale Daten aus einem frischen React-Query-Cache.
 * - Der freie Mitarbeiter fehlt in der API-Antwort oder in der sichtbaren Picker-Liste.
 *
 * Ziel:
 * Den Wochenkalender-Picker gegen stale /available-Daten nach KW-Wechsel absichern.
 */
import { expect, test, type Page, type Response } from "./fixtures";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import {
  createEmployeeFixture,
  createProjectFixture,
  createRawAppointmentFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

const suitePath = "tests/e2e-browser/tour-week-employee-picker-cache.browser.e2e.spec.ts";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await resetBrowserSuiteState(suitePath);
});

function resolveTargetWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const weekStart = startOfISOWeek(addWeeks(today, 3));
  const nextWeekStart = addWeeks(weekStart, 1);

  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekMidDate: format(addDays(weekStart, 2), "yyyy-MM-dd"),
    nextIsoYear: getISOWeekYear(nextWeekStart),
    nextIsoWeek: getISOWeek(nextWeekStart),
    nextWeekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
  };
}

function getWeekSection(page: Page, weekStartDate: string) {
  return page.locator("section").filter({ has: page.getByTestId(`week-day-header-${weekStartDate}`) }).first();
}

async function openStandaloneWeek(page: Page, targetWeek: { isoYear: number; isoWeek: number }) {
  await page.goto(`/standalone/calendar/week?kw=${targetWeek.isoWeek}&year=${targetWeek.isoYear}`);
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
}

async function expectStandaloneWeekUrl(page: Page, isoYear: number, isoWeek: number) {
  await expect.poll(() => new URL(page.url()).searchParams.get("kw")).toBe(String(isoWeek));
  await expect.poll(() => new URL(page.url()).searchParams.get("year")).toBe(String(isoYear));
}

function waitForAvailableResponse(page: Page, tourId: number) {
  return page.waitForResponse((response) => (
    response.request().method() === "GET"
    && new URL(response.url()).pathname === `/api/tours/${tourId}/week-employees/available`
  ));
}

async function expectAvailableEmployeeIds(response: Response, employeeId: number) {
  expect(response.status()).toBe(200);
  const payload = await response.json() as Array<{ id: number }>;
  const employeeIds = payload.map((employee) => employee.id);
  expect(employeeIds).toContain(employeeId);
}

async function ensureWeekPersonnelColumnExpanded(
  page: Page,
  weekStartDate: string,
  tourId: number,
) {
  await page.getByTestId("switch-week-personnel-column").click();
  const targetSection = getWeekSection(page, weekStartDate);
  await expect(targetSection.getByTestId(`week-personnel-column-tour-${tourId}`).first()).toBeVisible();

  const addButton = targetSection.getByTestId(`button-add-week-personnel-tour-${tourId}`).first();
  if (!(await addButton.isVisible().catch(() => false))) {
    await targetSection.getByTestId(`button-week-personnel-column-toggle-tour-${tourId}`).first().click();
  }

  await expect(addButton).toBeVisible();
  return addButton;
}

test("öffnet den Wochenkalender-Picker nach KW-Wechsel mit frischem available-Request", async ({ page }) => {
  const targetWeek = resolveTargetWeek();
  const tour = await createTourFixture("#117799");
  const noiseTour = await createTourFixture("#991177");
  const project = await createProjectFixture({ prefix: "TWE-PICKER-CACHE" });
  const noiseProject = await createProjectFixture({ prefix: "TWE-PICKER-CACHE-NOISE" });
  const availableEmployee = await createEmployeeFixture("TWE-PICKER-CACHE-FREE");

  await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekStartDate,
    title: "TWE Picker Cache Termin A",
    tourId: tour.id,
    employeeIds: [],
  });
  await createRawAppointmentFixture({
    projectId: project.id,
    startDate: targetWeek.weekMidDate,
    title: "TWE Picker Cache Termin B",
    tourId: tour.id,
    employeeIds: [],
  });
  await createRawAppointmentFixture({
    projectId: noiseProject.id,
    startDate: targetWeek.weekMidDate,
    title: "TWE Picker Cache Rauschen",
    tourId: noiseTour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await openStandaloneWeek(page, targetWeek);
  await expect(getWeekSection(page, targetWeek.weekStartDate)).toBeVisible();

  const firstAddButton = await ensureWeekPersonnelColumnExpanded(page, targetWeek.weekStartDate, tour.id);
  const firstAvailableResponsePromise = waitForAvailableResponse(page, tour.id);
  await firstAddButton.click();
  const firstAvailableResponse = await firstAvailableResponsePromise;
  await expectAvailableEmployeeIds(firstAvailableResponse, availableEmployee.id);
  await expect(page.getByTestId(`employee-picker-card-${availableEmployee.id}`)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByTestId(`employee-picker-card-${availableEmployee.id}`)).toHaveCount(0);

  await page.getByTestId("button-next").click();
  await expectStandaloneWeekUrl(page, targetWeek.nextIsoYear, targetWeek.nextIsoWeek);
  await expect(getWeekSection(page, targetWeek.nextWeekStartDate)).toBeVisible();

  await page.getByTestId("button-prev").click();
  await expectStandaloneWeekUrl(page, targetWeek.isoYear, targetWeek.isoWeek);
  await expect(getWeekSection(page, targetWeek.weekStartDate)).toBeVisible();

  const secondAddButton = await ensureWeekPersonnelColumnExpanded(page, targetWeek.weekStartDate, tour.id);
  const secondAvailableResponsePromise = waitForAvailableResponse(page, tour.id);
  await secondAddButton.click();
  const secondAvailableResponse = await secondAvailableResponsePromise;
  await expectAvailableEmployeeIds(secondAvailableResponse, availableEmployee.id);
  await expect(page.getByTestId(`employee-picker-card-${availableEmployee.id}`)).toBeVisible();
});
