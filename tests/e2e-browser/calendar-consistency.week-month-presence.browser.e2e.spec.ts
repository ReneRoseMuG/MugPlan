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
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

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

function overlapsMonth(appointment: { startDate: Date | string; endDate: Date | string | null }, monthDate: string) {
  const monthStart = startOfMonth(parseISO(monthDate));
  const monthEnd = endOfMonth(monthStart);
  const appointmentStart = parseISO(toDateKey(appointment.startDate));
  const appointmentEnd = parseISO(toDateKey(getAppointmentEndDate(appointment as never)));
  return appointmentStart <= monthEnd && appointmentEnd >= monthStart;
}

test("shows all expected appointments for the anchor month and excludes a next-month-only appointment", async ({ page }) => {
  await loginAsAdmin(page);

  const anchorDate = toDateKey(fixture.sameDayEarlyA.startDate);
  const anchorMonthKey = anchorDate.slice(0, 7);
  const farNextMonthKey = format(addMonths(parseISO(`${anchorMonthKey}-01`), 2), "yyyy-MM");
  const nextMonthOnly = fixture.allAppointments.find(
    (appointment) => toDateKey(appointment.startDate).slice(0, 7) >= farNextMonthKey && !overlapsMonth(appointment, anchorDate),
  );

  await navigateToMonthContaining(page, anchorDate);

  const expectedIds = fixture.allAppointments
    .filter((appointment) => overlapsMonth(appointment, anchorDate))
    .map((appointment) => appointment.id);

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
  const endMonthKey = endMonthDate.slice(0, 7);
  const farOtherMonthKey = format(addMonths(parseISO(`${endMonthKey}-01`), 2), "yyyy-MM");
  const otherMonthOnly = fixture.allAppointments.find(
    (appointment) => toDateKey(appointment.startDate).slice(0, 7) >= farOtherMonthKey && !overlapsMonth(appointment, endMonthDate),
  );

  await navigateToMonthContaining(page, startMonthDate);
  await expect(page.locator(`[data-testid="month-compact-bar-${fixture.crossWeekSpan.id}"]`).first()).toBeVisible();

  if (!otherMonthOnly) {
    throw new Error("No other-month-only appointment available for exclusion assertion.");
  }
  await expect(page.locator(`[data-testid="month-compact-bar-${otherMonthOnly.id}"]`)).toHaveCount(0);

  await navigateToMonthContaining(page, endMonthDate);
  await expect(page.locator(`[data-testid="month-compact-bar-${fixture.crossWeekSpan.id}"]`).first()).toBeVisible();
});
