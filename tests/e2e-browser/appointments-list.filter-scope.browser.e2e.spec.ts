/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Terminliste startet browserseitig mit der vollstaendigen Terminmenge.
 * - Der Scope "Geplante Termine" blendet historische Termine aus.
 * - Gueltige Projekt- und Auftragsnummernfilter verengen die Ergebnismenge innerhalb des aktiven Scopes korrekt.
 * - Ungueltige Filterwerte fuehren sichtbar in den Nichttreffer-Empty-State.
 * - Der Reset im Zeitraum-Picker stellt die ungefilterte Grundmenge wieder her.
 *
 * Fehlerfaelle:
 * - Der Default-Scope blendet historische Termine weiterhin aus.
 * - Scope-Wechsel verlieren oder vermischen Past-/Future-Termine.
 * - Gueltige Filter liefern falsche Treffermengen oder Nichttreffer zeigen keinen Empty-State.
 * - Der Zeitraum-Reset behaelt freie Filter oder den geplanten Scope faelschlich bei.
 *
 * Ziel:
 * Browserseitig mit echten historischen und zukuenftigen Terminen absichern, dass das neue Termin-Toggle die Ergebnismengen korrekt steuert.
 */
import { expect, test } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createProjectFixtureWithOverrides,
  createRawAppointmentFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts");
});

test("appointment scopes keep the new all/default semantics and apply valid or invalid filters to real result sets", async ({ page }) => {
  const scopeToken = "FT04-SCOPE-BROWSER";
  const customer = await createCustomerFixture("FT04-SCOPE-BROWSER-CUST");
  const futureProject = await createProjectFixtureWithOverrides({
    prefix: "FT04-SCOPE-FUTURE",
    customerId: customer.id,
    name: `${scopeToken} Future`,
    orderNumber: "43001",
  });
  const pastProject = await createProjectFixtureWithOverrides({
    prefix: "FT04-SCOPE-PAST",
    customerId: customer.id,
    name: `${scopeToken} Past`,
    orderNumber: "43002",
  });

  await createAppointmentFixture({
    projectId: futureProject.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(3),
  });
  await createRawAppointmentFixture({
    projectId: pastProject.id,
    startDate: getRelativeBerlinDate(-5),
    title: "FT04 Scope Browser Past Appointment",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-termine").click();

  const table = page.getByTestId("table-appointments-list");
  const rows = table.locator("tbody tr");
  const tokenRows = rows.filter({ hasText: scopeToken });
  const projectTitleFilter = page.locator("#appointments-filter-project-title");
  const orderNumberFilter = page.locator("#appointments-filter-order-number");
  const ensurePeriodPickerOpen = async () => {
    const allScopeToggle = page.getByTestId("toggle-appointments-scope-all");
    if (await allScopeToggle.isVisible()) return;
    await page.getByTestId("button-appointment-period-picker").click();
    await expect(allScopeToggle).toBeVisible();
  };

  await expect(table).toBeVisible();

  await projectTitleFilter.fill(scopeToken);
  await expect(rows).toHaveCount(2);
  await expect(tokenRows).toHaveCount(2);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(1);

  await ensurePeriodPickerOpen();
  await page.getByTestId("toggle-appointments-scope-planned").click();
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);
  await expect(page.getByTestId("input-appointment-period-from")).not.toHaveValue("");
  await expect(page.getByTestId("input-appointment-period-to")).not.toHaveValue("");
  await expect(page.getByTestId("appointment-period-summary")).toContainText(/\S/);

  await orderNumberFilter.fill(futureProject.orderNumber ?? "");
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);

  await orderNumberFilter.fill("");
  await projectTitleFilter.fill("KEIN-TREFFER-FT04");
  await expect(page.getByText("Keine Treffer gefunden.")).toBeVisible();
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);

  await projectTitleFilter.fill(scopeToken);
  await ensurePeriodPickerOpen();
  await page.getByTestId("toggle-appointments-scope-all").click();
  await expect(tokenRows).toHaveCount(2);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(1);

  await ensurePeriodPickerOpen();
  await page.getByTestId("button-appointment-period-reset-all").click();
  await expect(projectTitleFilter).toHaveValue("");
  await expect(orderNumberFilter).toHaveValue("");
  await expect(page.getByText("Keine Treffer gefunden.")).toHaveCount(0);
  await expect(tokenRows).toHaveCount(2);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(1);

  await ensurePeriodPickerOpen();
  await page.getByTestId("toggle-appointments-scope-planned").click();
  await expect(page.getByTestId("input-appointment-period-from")).not.toHaveValue("");
  await expect(page.getByTestId("input-appointment-period-to")).not.toHaveValue("");
  await expect(page.getByTestId("appointment-period-summary")).toContainText(/\S/);
});
