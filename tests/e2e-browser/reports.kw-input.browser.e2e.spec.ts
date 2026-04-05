/**
 * Test Scope:
 *
 * Bereich:
 * - Reports-KW-Eingaben im Browser
 *
 * Abgedeckte Regeln:
 * - KW-Startfelder der Reports übernehmen KW 0 nicht still als gültigen Wert.
 * - Ungültige Freitexte lassen den letzten gültigen KW-Start unverändert.
 * - Spinner-Klicks bleiben für gültige KW-Starts weiterhin bedienbar.
 *
 * Fehlerfälle:
 * - Reports speichern oder zeigen KW 0 fälschlich als KW 1 an.
 * - Die strikte Freitextbehandlung blockiert die gewohnten Spinner-Klicks.
 *
 * Ziel:
 * Die vereinheitlichte KW-Guard-Logik für beide Reports im echten Browser regressionssicher absichern.
 */
import { expect, test } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("keeps the last valid report kw when invalid free text is entered", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();

  await page.getByTestId("toggle-reports-vorlaufliste-calendarWeek").click();
  const vorlauflisteInput = page.getByTestId("input-reports-vorlaufliste-kw-start");
  const initialVorlauflisteValue = await vorlauflisteInput.inputValue();

  await vorlauflisteInput.fill("0");
  await vorlauflisteInput.blur();
  await expect(vorlauflisteInput).toHaveValue(initialVorlauflisteValue);

  await page.getByTestId("button-reports-vorlaufliste-kw-start-up").click();
  await expect(vorlauflisteInput).toHaveValue(String(Math.min(53, Number.parseInt(initialVorlauflisteValue, 10) + 1)));

  await page.getByTestId("toggle-reports-produktionsplanung-calendarWeek").click();
  const produktionsplanungInput = page.getByTestId("input-reports-produktionsplanung-kw-start");
  const initialProduktionsplanungValue = await produktionsplanungInput.inputValue();

  await produktionsplanungInput.fill("000");
  await produktionsplanungInput.blur();
  await expect(produktionsplanungInput).toHaveValue(initialProduktionsplanungValue);

  await page.getByTestId("button-reports-produktionsplanung-kw-start-down").click();
  await expect(produktionsplanungInput).toHaveValue(String(Math.max(1, Number.parseInt(initialProduktionsplanungValue, 10) - 1)));
});
