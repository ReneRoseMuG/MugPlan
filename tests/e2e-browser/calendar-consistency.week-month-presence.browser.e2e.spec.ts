/**
 * Test Scope:
 *
 * Bereich:
 * - Monatskalender Presence-Suite fuer Fixture-Termine
 *
 * Abgedeckte Regeln:
 * - Alle fuer einen Monat erwarteten Fixture-Termine sind im Monatsblatt sichtbar.
 * - Termine aus Nachbarmonaten tauchen nicht faelschlich im aktuellen Monatsblatt auf.
 * - Ein Monats- und KW-Grenzen ueberschreitender Termin bleibt in beiden betroffenen Monaten sichtbar.
 *
 * Fehlerfaelle:
 * - Einzelne Termine fehlen trotz Monatsueberschneidung.
 * - Termine aus einem anderen Monat werden im falschen Monatsblatt angezeigt.
 * - Ein grenzueberschreitender Termin verschwindet in einem der beiden Monate.
 *
 * Ziel:
 * Die sichtbare Vollstaendigkeit und die Monatsabgrenzung der Monatsbalken browserseitig absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { format, parseISO } from "date-fns";

import { getAppointmentEndDate } from "../../client/src/lib/calendar-utils";
import { createCalendarConsistencyFixture } from "../helpers/calendarConsistencyFixtures";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

let fixture: Awaited<ReturnType<typeof createCalendarConsistencyFixture>>;

function toDateKey(value: Date | string) {
  return typeof value === "string" ? value : format(value, "yyyy-MM-dd");
}

test.beforeAll(async () => {
  await resetBrowserSuiteState();
  fixture = await createCalendarConsistencyFixture();
});

async function getVisibleMonthKey(page: Page) {
  const testId = await page.locator('section[data-testid^="month-sheet-"]').first().getAttribute("data-testid");
  if (!testId) {
    throw new Error("No visible month sheet found.");
  }
  return testId.replace("month-sheet-", "");
}

async function getVisibleWindowRange(page: Page) {
  const sheet = page.locator('section[data-testid^="month-sheet-"]').first();
  const fromDate = await sheet.getAttribute("data-visible-start");
  const toDate = await sheet.getAttribute("data-visible-end");
  if (!fromDate || !toDate) {
    throw new Error("No visible month window range found.");
  }
  return { fromDate, toDate };
}

async function navigateToMonthContaining(page: Page, dateString: string) {
  await page.getByTestId("nav-monatsuebersicht").click();

  for (let step = 0; step < 20; step += 1) {
    const locator = page.locator(`[data-testid="month-sheet-day-${dateString}"][data-month-scope="current"]`);
    if (await locator.count()) {
      await expect(locator).toBeVisible();
      return;
    }

    const visibleMonth = (await getVisibleMonthKey(page)).slice(0, 7);
    const targetMonth = dateString.slice(0, 7);
    await page.getByTestId(targetMonth < visibleMonth ? "button-prev" : "button-next").click();
  }

  throw new Error(`Month containing ${dateString} was not reachable within 20 steps.`);
}

async function readAppointmentDates(page: Page, appointmentId: number) {
  const response = await page.request.get(`/api/appointments/${appointmentId}`);
  expect(response.ok()).toBe(true);
  const body = await response.json() as { startDate?: string; endDate?: string | null };
  return {
    startDate: body.startDate,
    endDate: body.endDate ?? null,
  };
}

function overlapsDateRange(
  appointment: { startDate: Date | string; endDate: Date | string | null },
  fromDate: string,
  toDate: string,
) {
  const rangeStart = parseISO(fromDate);
  const rangeEnd = parseISO(toDate);
  const appointmentStart = parseISO(toDateKey(appointment.startDate));
  const appointmentEnd = parseISO(toDateKey(getAppointmentEndDate(appointment as never)));
  return appointmentStart <= rangeEnd && appointmentEnd >= rangeStart;
}

test("shows all expected appointments for the anchor month and excludes a next-month-only appointment", async ({ page }) => {
  await loginAsAdmin(page);

  const anchorDate = toDateKey(fixture.sameDayEarlyA.startDate);

  await navigateToMonthContaining(page, anchorDate);
  const visibleRange = await getVisibleWindowRange(page);

  const expectedIds = fixture.allAppointments
    .filter((appointment) => overlapsDateRange(appointment, visibleRange.fromDate, visibleRange.toDate))
    .map((appointment) => appointment.id);
  const nextMonthOnly = fixture.allAppointments.find(
    (appointment) => !overlapsDateRange(appointment, visibleRange.fromDate, visibleRange.toDate),
  );

  for (const id of expectedIds) {
    await expect(page.locator(`[data-testid="month-compact-bar-${id}"]`).first()).toBeVisible();
  }

  if (!nextMonthOnly) {
    throw new Error("No next-month-only appointment available for exclusion assertion.");
  }

  await expect(page.locator(`[data-testid="month-compact-bar-${nextMonthOnly.id}"]`)).toHaveCount(0);
});

test("shows the cross-month span in both affected months and excludes a previous-month-only appointment", async ({ page }) => {
  await loginAsAdmin(page);

  const startMonthDate = toDateKey(fixture.crossWeekSpan.startDate);
  const endMonthDate = toDateKey(fixture.crossWeekSpan.endDate ?? fixture.crossWeekSpan.startDate);

  await navigateToMonthContaining(page, startMonthDate);
  await expect(page.locator(`[data-testid="month-compact-bar-${fixture.crossWeekSpan.id}"]`).first()).toBeVisible();

  const startVisibleRange = await getVisibleWindowRange(page);
  const otherMonthOnly = fixture.allAppointments.find(
    (appointment) => !overlapsDateRange(appointment, startVisibleRange.fromDate, startVisibleRange.toDate),
  );

  if (!otherMonthOnly) {
    throw new Error("No other-month-only appointment available for exclusion assertion.");
  }
  await expect(page.locator(`[data-testid="month-compact-bar-${otherMonthOnly.id}"]`)).toHaveCount(0);

  await navigateToMonthContaining(page, endMonthDate);
  await expect(page.locator(`[data-testid="month-compact-bar-${fixture.crossWeekSpan.id}"]`).first()).toBeVisible();
});

test("keeps persisted appointment dates stable while the sliding month window moves and reloads", async ({ page }) => {
  await loginAsAdmin(page);

  const appointment = fixture.crossWeekSpan;
  const startDate = toDateKey(appointment.startDate);
  const endDate = toDateKey(appointment.endDate ?? appointment.startDate);
  const beforeNavigation = await readAppointmentDates(page, appointment.id);

  await navigateToMonthContaining(page, startDate);
  await expect(page.getByTestId(`month-sheet-day-${startDate}`)).toBeVisible();
  await expect(page.locator(`[data-testid="month-compact-bar-${appointment.id}"]`).first()).toBeVisible();

  await page.getByTestId("button-next").click();
  await page.getByTestId("button-prev").click();
  await page.reload();
  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(page.getByTestId("month-sheet-container")).toBeVisible();

  const afterReload = await readAppointmentDates(page, appointment.id);
  expect(afterReload).toEqual(beforeNavigation);

  await navigateToMonthContaining(page, endDate);
  await expect(page.getByTestId(`month-sheet-day-${endDate}`)).toBeVisible();
  await expect(page.locator(`[data-testid="month-compact-bar-${appointment.id}"]`).first()).toBeVisible();
});
