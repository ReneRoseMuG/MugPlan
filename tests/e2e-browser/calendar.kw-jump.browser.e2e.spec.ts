/**
 * Test Scope:
 *
 * Bereich:
 * - Wochenkalender-KW-Sprung im Browser
 *
 * Abgedeckte Regeln:
 * - Ungültige KW-Eingaben führen nicht zu einem Datumswechsel.
 * - Ungültige KW-Eingaben markieren das Feld sichtbar als Fehler.
 * - Eine danach gültige KW-Eingabe springt wieder korrekt zur erwarteten Woche.
 *
 * Fehlerfälle:
 * - KW 0 wird im Wochenkalender still verworfen, ohne Fehlerzustand zu zeigen.
 * - Ein gültiger KW-Sprung funktioniert nach einer invaliden Eingabe nicht mehr.
 *
 * Ziel:
 * Das korrigierte KW-Jump-Verhalten des Wochenkalenders im echten Browser regressionssicher absichern.
 */
import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function getFirstVisibleWeekHeaderId(page: Page) {
  return page.locator('[data-testid^="week-day-header-"]').first().getAttribute("data-testid");
}

test("shows an error for invalid kw zero and still allows the next valid week jump", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();

  const kwInput = page.getByTestId("input-calendar-kw-jump");
  const initialHeaderId = await getFirstVisibleWeekHeaderId(page);

  await page.getByTestId("button-next").click();
  const expectedNextHeaderId = await getFirstVisibleWeekHeaderId(page);
  const expectedNextKw = await kwInput.inputValue();

  await page.getByTestId("button-prev").click();
  await expect.poll(async () => getFirstVisibleWeekHeaderId(page)).toBe(initialHeaderId);

  await kwInput.fill("0");
  await kwInput.blur();

  await expect(kwInput).toHaveValue("0");
  await expect(kwInput).toHaveAttribute("aria-invalid", "true");
  await expect.poll(async () => getFirstVisibleWeekHeaderId(page)).toBe(initialHeaderId);

  await kwInput.fill(expectedNextKw);
  await kwInput.blur();

  await expect(kwInput).toHaveValue(expectedNextKw);
  await expect(kwInput).not.toHaveAttribute("aria-invalid", "true");
  await expect.poll(async () => getFirstVisibleWeekHeaderId(page)).toBe(expectedNextHeaderId);
});
