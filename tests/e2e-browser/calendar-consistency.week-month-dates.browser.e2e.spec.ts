/**
 * Test Scope:
 *
 * Bereich:
 * - Kalenderkonsistenz zwischen Wochen- und Monatsansicht
 *
 * Abgedeckte Regeln:
 * - Dieselben Sonderfalltermine bleiben in Woche und Monat am erwarteten Datum sichtbar.
 * - Monats-KW und ISO-KW bleiben fuer sichtbare Wochenzeilen konsistent.
 * - Ein KW- und Monatsgrenzen ueberschreitender Termin bleibt in beiden betroffenen Monatswochen sichtbar.
 *
 * Fehlerfaelle:
 * - Woche und Monat driften fuer dieselben Termine auf unterschiedliche Tage.
 * - Monatszeilen zeigen eine falsche KW fuer sichtbare Kalenderwochen.
 * - Grenzueberschreitende Termine verschwinden an der Monatskante.
 *
 * Ziel:
 * Die sichtbare Datum- und KW-Konsistenz fuer die gemeinsame Kalenderdarstellung im Browser absichern.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { format, getISOWeek, parseISO, startOfWeek } from "date-fns";

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

async function getVisibleWeekStart(page: Page) {
  const testId = await page.locator('[data-testid^="week-day-header-"]').first().getAttribute("data-testid");
  if (!testId) {
    throw new Error("No visible week header found.");
  }
  return testId.replace("week-day-header-", "");
}

async function getVisibleMonthKey(page: Page) {
  const testId = await page.locator('section[data-testid^="month-sheet-"]').first().getAttribute("data-testid");
  if (!testId) {
    throw new Error("No visible month sheet found.");
  }
  return testId.replace("month-sheet-", "");
}

async function navigateToWeekContaining(page: Page, dateString: string) {
  await page.getByTestId("nav-wochenuebersicht").click();

  for (let step = 0; step < 20; step += 1) {
    const header = page.getByTestId(`week-day-header-${dateString}`);
    if (await header.count()) {
      await expect(header).toBeVisible();
      return;
    }

    const visibleWeekStart = await getVisibleWeekStart(page);
    await page.getByTestId(parseISO(dateString) < parseISO(visibleWeekStart) ? "button-prev" : "button-next").click();
  }

  throw new Error(`Week containing ${dateString} was not reachable within 20 steps.`);
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

async function getCenterX(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return (box?.x ?? 0) + (box?.width ?? 0) / 2;
}

async function expectHorizontalOverlap(locator: Locator, target: Locator) {
  const [sourceBox, targetBox] = await Promise.all([locator.boundingBox(), target.boundingBox()]);
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  const overlapLeft = Math.max(sourceBox?.x ?? 0, targetBox?.x ?? 0);
  const overlapRight = Math.min(
    (sourceBox?.x ?? 0) + (sourceBox?.width ?? 0),
    (targetBox?.x ?? 0) + (targetBox?.width ?? 0),
  );
  expect(overlapRight - overlapLeft).toBeGreaterThan(8);
}

test("keeps same-day appointments aligned to the same visible day in week and month", async ({ page }) => {
  await loginAsAdmin(page);

  const sameDayDate = toDateKey(fixture.sameDayEarlyA.startDate);

  await navigateToWeekContaining(page, sameDayDate);

  const earlyPanel = page.getByTestId(`week-appointment-panel-${fixture.sameDayEarlyA.id}`).first();
  const latePanel = page.getByTestId(`week-appointment-panel-${fixture.sameDayLateA.id}`).first();
  const noonPanel = page.getByTestId(`week-appointment-panel-${fixture.sameDayNoonB.id}`).first();
  const dayHeader = page.getByTestId(`week-day-header-${sameDayDate}`).first();

  await expect(earlyPanel).toBeVisible();
  await expect(latePanel).toBeVisible();
  await expect(noonPanel).toBeVisible();
  await expect(dayHeader).toBeVisible();
  await expectHorizontalOverlap(earlyPanel, dayHeader);
  await expectHorizontalOverlap(latePanel, dayHeader);
  const [earlyWeekCenter, lateWeekCenter] = await Promise.all([
    getCenterX(earlyPanel),
    getCenterX(latePanel),
  ]);
  expect(Math.abs(earlyWeekCenter - lateWeekCenter)).toBeLessThan(6);

  await navigateToMonthContaining(page, sameDayDate);

  const earlyBar = page.locator(`[data-testid="month-compact-bar-${fixture.sameDayEarlyA.id}"]`).first();
  const lateBar = page.locator(`[data-testid="month-compact-bar-${fixture.sameDayLateA.id}"]`).first();
  const noonBar = page.locator(`[data-testid="month-compact-bar-${fixture.sameDayNoonB.id}"]`).first();

  await expect(earlyBar).toBeVisible();
  await expect(lateBar).toBeVisible();
  await expect(noonBar).toBeVisible();
  const [earlyMonthCenter, lateMonthCenter, noonMonthCenter] = await Promise.all([
    getCenterX(earlyBar),
    getCenterX(lateBar),
    getCenterX(noonBar),
  ]);
  expect(Math.abs(earlyMonthCenter - lateMonthCenter)).toBeLessThan(6);
  expect(Math.abs(earlyMonthCenter - noonMonthCenter)).toBeLessThan(6);
});

test("keeps visible month week numbers aligned with ISO weeks and preserves the cross-month span", async ({ page }) => {
  await loginAsAdmin(page);

  const anchorDate = toDateKey(fixture.sameDayEarlyA.startDate);
  await navigateToMonthContaining(page, anchorDate);

  const anchorWeekStart = format(startOfWeek(parseISO(anchorDate), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const anchorWeekRow = page.locator(`[data-testid$="${anchorWeekStart}"]`).first();
  await expect(anchorWeekRow).toContainText(String(getISOWeek(parseISO(anchorDate))));

  const crossWeekStart = toDateKey(fixture.crossWeekSpan.startDate);
  await navigateToMonthContaining(page, crossWeekStart);
  const crossStartWeek = format(startOfWeek(parseISO(crossWeekStart), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const crossStartRow = page.locator(`[data-testid$="${crossStartWeek}"]`).first();
  await expect(page.locator(`[data-testid="month-compact-bar-${fixture.crossWeekSpan.id}"]`).first()).toBeVisible();
  await expect(crossStartRow).toContainText(String(getISOWeek(parseISO(crossWeekStart))));

  const crossWeekEnd = toDateKey(fixture.crossWeekSpan.endDate ?? fixture.crossWeekSpan.startDate);
  await navigateToMonthContaining(page, crossWeekEnd);
  const crossEndWeek = format(startOfWeek(parseISO(crossWeekEnd), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const crossEndRow = page.locator(`[data-testid$="${crossEndWeek}"]`).first();
  await expect(page.locator(`[data-testid="month-compact-bar-${fixture.crossWeekSpan.id}"]`).first()).toBeVisible();
  await expect(crossEndRow).toContainText(String(getISOWeek(parseISO(crossWeekEnd))));
});
