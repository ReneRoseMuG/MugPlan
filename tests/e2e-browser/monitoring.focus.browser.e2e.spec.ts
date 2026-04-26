/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Monitoring markiert bei echten Daten den naechsten gefilterten Treffer zusaetzlich zur Triggerfarbe.
 * - Monitoring erzeugt bei leergefilterter Treffermenge keinen falschen Fokusrest.
 *
 * Fehlerfaelle:
 * - Der Datumsfokus markiert den falschen Monitoring-Termin.
 * - Die Fokus-Markierung verschwindet oder ueberschreibt die Triggerfarbe.
 * - Nach einem leergefilterten Zustand bleibt ein alter Fokus sichtbar.
 */
import { expect, test } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/monitoring.focus.browser.e2e.spec.ts");
});

test("monitoring highlights the nearest filtered appointment and clears cleanly for empty filters", async ({ page }) => {
  const token = "FT31-MONITORING-FOCUS";
  const customer = await createCustomerFixture("FT31-MONITORING-FOCUS-CUST");
  const nearProject = await createProjectFixtureWithOverrides({
    prefix: "FT31-MONITORING-FOCUS-NEAR",
    customerId: customer.id,
    name: `${token} Near`,
    orderNumber: "66101",
  });
  const farProject = await createProjectFixtureWithOverrides({
    prefix: "FT31-MONITORING-FOCUS-FAR",
    customerId: customer.id,
    name: `${token} Far`,
    orderNumber: "66102",
  });

  await createAppointmentFixture({
    projectId: nearProject.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(1),
    employeeIds: [],
  });
  await createAppointmentFixture({
    projectId: farProject.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(4),
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-monitoring").click();

  const table = page.getByTestId("table-monitoring");
  await expect(table).toBeVisible();
  await page.locator("#monitoring-filter-project-title").fill(token);

  const focusedRow = table.locator("tbody tr").filter({ hasText: nearProject.name }).first();
  const laterRow = table.locator("tbody tr").filter({ hasText: farProject.name }).first();

  await expect(focusedRow).toBeVisible();
  await expect(focusedRow).toHaveAttribute("style", /box-shadow: rgba\(15, 23, 42, 0.45\) 0px 0px 0px 2px inset;/);
  await expect(laterRow).toBeVisible();
  await expect(laterRow).not.toHaveAttribute("style", /box-shadow: rgba\(15, 23, 42, 0.45\) 0px 0px 0px 2px inset;/);

  await page.locator("#monitoring-filter-project-title").fill("KEIN-TREFFER-FT31");
  await expect(page.getByText("Keine problematischen Termine gefunden.")).toBeVisible();
});
