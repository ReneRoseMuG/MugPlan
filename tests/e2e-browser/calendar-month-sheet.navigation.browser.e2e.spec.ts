/**
 * Test Scope:
 *
 * Bereich:
 * - Neue globale Monatsblatt-Navigation
 *
 * Abgedeckte Regeln:
 * - Die Sidebar bietet Monatsuebersicht und Monatsblatt parallel an.
 * - Das Monatsblatt rendert ein fixes 3-Monats-Fenster und verschiebt es per Vor/Zurueck deterministisch um genau einen Monat.
 * - Horizontales Scrollen aendert das fachliche Fenstermodell nicht unkontrolliert.
 *
 * Fehlerfaelle:
 * - Die neue Ansicht ist nicht separat erreichbar oder ersetzt versehentlich die alte Monatsuebersicht.
 * - Mehrfaches Navigieren fuehrt zu driftenden Monatsfenstern.
 *
 * Ziel:
 * Die neue Monatsblatt-Ansicht im Browser auf Erreichbarkeit und driftfreie Fenster-Navigation absichern.
 */
import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function getRenderedMonthKeys(page: Page) {
  return page.locator('section[data-testid^="month-sheet-"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-testid") ?? ""),
  );
}

test("opens the isolated month sheet and keeps the three-month window deterministic across navigation", async ({ page }) => {
  await loginAsAdmin(page);

  await expect(page.getByTestId("nav-monatsuebersicht")).toBeVisible();
  await expect(page.getByTestId("nav-monatsblatt")).toBeVisible();

  await page.getByTestId("nav-monatsblatt").click();
  await expect(page.getByTestId("month-sheet-scroll-container")).toBeVisible();
  await expect(page.locator('[data-testid^="month-sheet-week-number-"]').first()).toBeVisible();

  const initialMonths = await getRenderedMonthKeys(page);
  expect(initialMonths).toHaveLength(3);

  await page.getByTestId("button-next").click();
  const afterNext = await getRenderedMonthKeys(page);
  expect(afterNext).toHaveLength(3);
  expect(afterNext[0]).toBe(initialMonths[1]);
  expect(afterNext[1]).toBe(initialMonths[2]);

  await page.getByTestId("button-prev").click();
  const afterReturn = await getRenderedMonthKeys(page);
  expect(afterReturn).toEqual(initialMonths);

  await page.getByTestId("month-sheet-scroll-container").evaluate((node) => {
    node.scrollLeft = node.clientWidth * 2;
  });
  await page.waitForTimeout(100);

  const afterScroll = await getRenderedMonthKeys(page);
  expect(afterScroll).toEqual(initialMonths);

  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(page.getByTestId("nav-monatsuebersicht")).toBeVisible();
  await expect(page.getByTestId("month-sheet-scroll-container")).toHaveCount(0);
});
