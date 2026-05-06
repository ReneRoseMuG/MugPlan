/**
 * Test Scope:
 *
 * Bereich:
 * - Neue globale Monatsübersicht-Navigation
 *
 * Abgedeckte Regeln:
 * - Die Sidebar bietet die Monatsübersicht als einzigen monatlichen Einstieg an.
 * - Die Monatsübersicht rendert genau ein sichtbares Blatt und verschiebt es per Vor/Zurueck deterministisch um genau einen Monat.
 * - Die Monatsübersicht laesst sich verlassen, ohne auf einen separaten Alt-Monatskalender zurueckzufallen.
 *
 * Fehlerfaelle:
 * - Die neue Ansicht ist nicht separat erreichbar oder faellt versehentlich in den entfernten Alt-Monatspfad zurueck.
 * - Mehrfaches Navigieren fuehrt zu driftenden Monatswechseln.
 *
 * Ziel:
 * Die neue Monatsübersicht im Browser auf Erreichbarkeit und driftfreie Einzelblatt-Navigation absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { addDays, addMonths, format, parseISO, startOfISOWeek, startOfMonth } from "date-fns";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts");
});

async function getRenderedMonthKeys(page: Page) {
  return page.locator('section[data-testid^="month-sheet-"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-testid") ?? ""),
  );
}

async function getVisibleWindowStart(page: Page) {
  const value = await page.locator('section[data-testid^="month-sheet-"]').first().getAttribute("data-visible-start");
  if (!value) throw new Error("No visible window start found.");
  return value;
}

async function getVisibleWindowEnd(page: Page) {
  const value = await page.locator('section[data-testid^="month-sheet-"]').first().getAttribute("data-visible-end");
  if (!value) throw new Error("No visible window end found.");
  return value;
}

test("opens the isolated month overview and keeps the sliding week window deterministic", async ({ page }) => {
  await loginAsAdmin(page);

  await expect(page.getByTestId("nav-monatsuebersicht")).toBeVisible();

  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(page.getByTestId("month-sheet-container")).toBeVisible();
  await expect(page.locator('[data-testid^="month-sheet-week-number-"]').first()).toBeVisible();
  await expect(page.getByTestId("calendar-absence-mode-toggle")).toBeVisible();

  const titleBox = await page.locator('[data-testid^="month-sheet-title-"]').first().boundingBox();
  const toggleBox = await page.getByTestId("calendar-absence-mode-toggle").boundingBox();
  if (!titleBox || !toggleBox) {
    throw new Error("Month sheet title or mode toggle is not measurable.");
  }
  expect(Math.abs((titleBox.y + titleBox.height / 2) - (toggleBox.y + toggleBox.height / 2))).toBeLessThan(12);

  const weekScrollerOverflowY = await page.locator('[data-testid^="month-sheet-weeks-scroll-"]').first().evaluate((node) =>
    window.getComputedStyle(node).overflowY,
  );
  expect(weekScrollerOverflowY).toBe("hidden");

  const initialMonths = await getRenderedMonthKeys(page);
  const initialWindowStart = await getVisibleWindowStart(page);
  const initialWindowEnd = await getVisibleWindowEnd(page);
  expect(initialMonths).toHaveLength(1);
  expect(format(addDays(parseISO(initialWindowStart), 41), "yyyy-MM-dd")).toBe(initialWindowEnd);

  await page.getByTestId("button-calendar-week-window-next").click();
  const afterNext = await getRenderedMonthKeys(page);
  const afterWeekNextStart = await getVisibleWindowStart(page);
  expect(afterNext).toHaveLength(1);
  expect(afterNext[0]).not.toBe(initialMonths[0]);
  expect(afterWeekNextStart).toBe(format(addDays(parseISO(initialWindowStart), 7), "yyyy-MM-dd"));

  await page.getByTestId("button-calendar-week-window-prev").click();
  const afterReturn = await getRenderedMonthKeys(page);
  await expect.poll(async () => getVisibleWindowStart(page)).toBe(initialWindowStart);
  expect(afterReturn).toEqual(initialMonths);

  await expect(page.getByTestId("button-calendar-month-next")).toHaveCount(0);
  await expect(page.getByTestId("button-calendar-month-prev")).toHaveCount(0);

  await page.getByTestId("button-next").click();
  const afterMonthNextStart = await getVisibleWindowStart(page);
  const expectedMonthSnap = format(startOfISOWeek(startOfMonth(addMonths(parseISO(initialWindowStart), 1))), "yyyy-MM-dd");
  expect(afterMonthNextStart).toBe(expectedMonthSnap);

  await page.getByTestId("button-prev").click();
  const afterMonthPrevStart = format(startOfISOWeek(startOfMonth(parseISO(initialWindowStart))), "yyyy-MM-dd");
  await expect.poll(async () => getVisibleWindowStart(page)).toBe(afterMonthPrevStart);

  await page.reload();
  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(page.getByTestId("month-sheet-container")).toBeVisible();
  await expect.poll(async () => getVisibleWindowStart(page)).toBe(afterMonthPrevStart);
  expect(new URL(page.url()).searchParams.get("windowStart")).toBe(afterMonthPrevStart);

  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("nav-wochenuebersicht")).toBeVisible();
  await expect(page.getByTestId("month-sheet-container")).toHaveCount(0);
});
