/**
 * Test Scope:
 *
 * Bereich:
 * - Reports-KW-Eingaben im Browser
 *
 * Abgedeckte Regeln:
 * - KW-Startfelder der Reports übernehmen KW 0 nicht still als gültigen Wert, sondern behalten den letzten gueltigen Stand.
 * - Ungültige Freitexte lassen den letzten gültigen KW-Start unverändert.
 * - Spinner-Klicks bleiben für gültige KW-Starts weiterhin bedienbar.
 *
 * Fehlerfälle:
 * - Reports überschreiben ungültige Eingaben fälschlich mit einem künstlichen Default.
 * - Die strikte Freitextbehandlung blockiert die gewohnten Spinner-Klicks.
 *
 * Ziel:
 * Die vereinheitlichte KW-Guard-Logik für beide Reports im echten Browser regressionssicher absichern.
 */
import { expect, test } from "./fixtures";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("clamps invalid free text in report kw inputs and keeps the spinner controls usable", async ({ page }) => {
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
  await expect(vorlauflisteInput).toHaveValue(String(Number(initialVorlauflisteValue) + 1));

  await page.getByTestId("toggle-reports-produktionsplanung-calendarWeek").click();
  const produktionsplanungInput = page.getByTestId("input-reports-produktionsplanung-kw-start");
  const initialProduktionsplanungValue = await produktionsplanungInput.inputValue();

  await produktionsplanungInput.fill("000");
  await produktionsplanungInput.blur();
  await expect(produktionsplanungInput).toHaveValue(initialProduktionsplanungValue);

  await page.getByTestId("button-reports-produktionsplanung-kw-start-down").click();
  await expect(produktionsplanungInput).toHaveValue(String(Math.max(1, Number(initialProduktionsplanungValue) - 1)));
});
