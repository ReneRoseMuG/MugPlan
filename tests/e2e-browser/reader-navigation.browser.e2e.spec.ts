/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Leser sehen Monitoring in der Sidebar, aber weder Reports noch Journal noch Tour-PLZ-Planung noch Mitarbeiter.
 * - Leser können Monitoring im Hauptlayout und als Standalone-Ansicht öffnen.
 * - Die Standalone-Tour-PLZ-Planung bleibt für Leser gesperrt.
 *
 * Fehlerfälle:
 * - Monitoring verschwindet für Leser wieder oder lädt trotz Freigabe nicht.
 * - Reports/Journal/Tour-PLZ-Planung/Mitarbeiter bleiben für Leser sichtbar.
 * - Die Standalone-Tour-PLZ-Planung bleibt für Leser erreichbar.
 *
 * Ziel:
 * Die Reader-Navigation und die zugehörigen Frontend-Zugangsgrenzen browserseitig gegen Regressionen absichern.
 */
import { expect, test, type Page } from "@playwright/test";

import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

async function expectStandaloneViewLoaded(page: Page) {
  await expect(page.getByTestId("standalone-header")).toBeVisible();
  await expect(page.getByTestId("sidebar")).toHaveCount(0);
}

test.describe("Reader navigation", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-navigation.browser.e2e.spec.ts");
  });

  test("shows monitoring but hides reports, journal, tour postal planning and employees in the sidebar", async ({ page }) => {
    await loginAsReader(page);

    await expect(page.getByTestId("nav-monitoring")).toBeVisible();
    await expect(page.getByTestId("nav-monitoring-open-tab")).toBeVisible();
    await expect(page.getByTestId("nav-tour-plz-plan")).toHaveCount(0);
    await expect(page.getByTestId("nav-tour-plz-plan-open-tab")).toHaveCount(0);
    await expect(page.getByTestId("nav-mitarbeiter")).toHaveCount(0);
    await expect(page.getByTestId("nav-mitarbeiter-open-tab")).toHaveCount(0);
    await expect(page.getByText("Reports")).toHaveCount(0);
    await expect(page.getByText("Journal")).toHaveCount(0);
  });

  test("opens monitoring in the main shell for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-monitoring").click();
    await expect(page.getByTestId("table-monitoring")).toBeVisible();
  });

  test("loads standalone monitoring and blocks standalone tour postal plan for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.goto("/standalone/monitoring");
    await expectStandaloneViewLoaded(page);
    await expect(page.getByTestId("table-monitoring")).toBeVisible();

    await page.goto("/standalone/tour-postal-plan");
    await expectStandaloneViewLoaded(page);
    await expect(page.getByTestId("standalone-tour-postal-plan-unavailable")).toBeVisible();
  });
});
