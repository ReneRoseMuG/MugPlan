/**
 * Test Scope:
 *
 * Bereich:
 * - Tour-Lanes und Sortierkonsistenz in Woche und Monat
 *
 * Abgedeckte Regeln:
 * - Tour-A- und Tour-B-Termine bleiben in der Wochenansicht in ihren sichtbaren Lane-Bereichen.
 * - Gleichtaegige Wochenkarten bleiben nach Startzeit vertikal sortiert.
 * - Monatsbalken verschiedener Touren liegen in getrennten Slot-Hoehen.
 * - Ueberlappende Mehrtagestermine derselben Tour bleiben in getrennten Monats-Subrows sichtbar.
 *
 * Fehlerfaelle:
 * - Termine driften in die falsche Tour-Lane.
 * - Spaetere Termine erscheinen oberhalb frueherer Termine.
 * - Monatsbalken verschiedener Touren oder ueberlappende Mehrtagestermine kollidieren in derselben Hoehe.
 *
 * Ziel:
 * Die tourbezogene Lane- und Sortierdarstellung des Kalenders browserseitig regressionssicher absichern.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { format, parseISO } from "date-fns";

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

async function getBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

test("keeps week appointments inside their tour lanes and sorted by start time", async ({ page }) => {
  await loginAsAdmin(page);

  const sameDayDate = toDateKey(fixture.sameDayEarlyA.startDate);
  await navigateToWeekContaining(page, sameDayDate);

  const visibleWeek = page.locator("section").filter({ has: page.getByTestId(`week-day-header-${sameDayDate}`) }).first();
  const laneAHeader = visibleWeek.getByTestId(`week-tour-lane-header-tour-${fixture.tourA.id}`);
  const laneBHeader = visibleWeek.getByTestId(`week-tour-lane-header-tour-${fixture.tourB.id}`);
  const laneAHeaderBox = await getBox(laneAHeader);
  const laneBBox = await getBox(laneBHeader);

  const earlyPanelBox = await getBox(page.getByTestId(`week-appointment-panel-${fixture.sameDayEarlyA.id}`).first());
  const latePanelBox = await getBox(page.getByTestId(`week-appointment-panel-${fixture.sameDayLateA.id}`).first());
  const noonPanelBox = await getBox(page.getByTestId(`week-appointment-panel-${fixture.sameDayNoonB.id}`).first());

  expect(earlyPanelBox.y).toBeGreaterThan(laneAHeaderBox.y);
  expect(earlyPanelBox.y).toBeLessThan(laneBBox.y);
  expect(latePanelBox.y).toBeGreaterThan(laneAHeaderBox.y);
  expect(latePanelBox.y).toBeLessThan(laneBBox.y);
  expect(noonPanelBox.y).toBeGreaterThan(laneBBox.y);
  expect(latePanelBox.y).toBeGreaterThan(earlyPanelBox.y);
});

test("keeps month bars on separate slot heights for different tours and separate subrows for overlaps", async ({ page }) => {
  await loginAsAdmin(page);

  await navigateToMonthContaining(page, toDateKey(fixture.sameDayEarlyA.startDate));

  const earlyBarBox = await getBox(page.locator(`[data-testid="month-compact-bar-${fixture.sameDayEarlyA.id}"]`).first());
  const noonBarBox = await getBox(page.locator(`[data-testid="month-compact-bar-${fixture.sameDayNoonB.id}"]`).first());
  expect(Math.abs(earlyBarBox.y - noonBarBox.y)).toBeGreaterThan(6);

  const overlapOneBox = await getBox(page.locator(`[data-testid="month-compact-bar-${fixture.overlappingMultiDay1.id}"]`).first());
  const overlapTwoBox = await getBox(page.locator(`[data-testid="month-compact-bar-${fixture.overlappingMultiDay2.id}"]`).first());

  expect(Math.abs(overlapOneBox.y - overlapTwoBox.y)).toBeGreaterThan(6);
  expect(overlapOneBox.x).toBeLessThan(overlapTwoBox.x + overlapTwoBox.width);
  expect(overlapTwoBox.x).toBeLessThan(overlapOneBox.x + overlapOneBox.width);
});
