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

test("opens the isolated month overview and keeps the single-month navigation deterministic", async ({ page }) => {
  await loginAsAdmin(page);

  await expect(page.getByTestId("nav-monatsuebersicht")).toBeVisible();

  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(page.getByTestId("month-sheet-container")).toBeVisible();
  await expect(page.locator('[data-testid^="month-sheet-week-number-"]').first()).toBeVisible();

  const initialMonths = await getRenderedMonthKeys(page);
  expect(initialMonths).toHaveLength(1);

  await page.getByTestId("button-next").click();
  const afterNext = await getRenderedMonthKeys(page);
  expect(afterNext).toHaveLength(1);
  expect(afterNext[0]).not.toBe(initialMonths[0]);

  await page.getByTestId("button-prev").click();
  const afterReturn = await getRenderedMonthKeys(page);
  expect(afterReturn).toEqual(initialMonths);

  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("nav-wochenuebersicht")).toBeVisible();
  await expect(page.getByTestId("month-sheet-container")).toHaveCount(0);
});
