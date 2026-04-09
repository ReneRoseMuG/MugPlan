/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Terminliste startet browserseitig mit der vollstaendigen Terminmenge.
 * - Der Scope "Geplante Termine" blendet historische Termine aus.
 * - Gueltige Projekt- und Auftragsnummernfilter verengen die Ergebnismenge innerhalb des aktiven Scopes korrekt.
 * - Ungueltige Filterwerte fuehren sichtbar in den Nichttreffer-Empty-State.
 *
 * Fehlerfaelle:
 * - Der Default-Scope blendet historische Termine weiterhin aus.
 * - Scope-Wechsel verlieren oder vermischen Past-/Future-Termine.
 * - Gueltige Filter liefern falsche Treffermengen oder Nichttreffer zeigen keinen Empty-State.
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
  await resetBrowserSuiteState();
});

test("appointment scopes keep the new all/default semantics and apply valid or invalid filters to real result sets", async ({ page }) => {
  const customer = await createCustomerFixture("FT04-SCOPE-BROWSER-CUST");
  const futureProject = await createProjectFixtureWithOverrides({
    prefix: "FT04-SCOPE-FUTURE",
    customerId: customer.id,
    name: "FT04 Scope Browser Future",
    orderNumber: "43001",
  });
  const pastProject = await createProjectFixtureWithOverrides({
    prefix: "FT04-SCOPE-PAST",
    customerId: customer.id,
    name: "FT04 Scope Browser Past",
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
  const projectTitleFilter = page.locator("#appointments-filter-project-title");
  const orderNumberFilter = page.locator("#appointments-filter-order-number");

  await expect(table).toBeVisible();

  await projectTitleFilter.fill("FT04 Scope Browser");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(1);

  await page.getByTestId("toggle-appointments-scope-planned").click();
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);

  await orderNumberFilter.fill(futureProject.orderNumber ?? "");
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);

  await orderNumberFilter.fill("");
  await projectTitleFilter.fill("KEIN-TREFFER-FT04");
  await expect(page.getByText("Keine Treffer gefunden.")).toBeVisible();
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);

  await projectTitleFilter.fill("FT04 Scope Browser");
  await page.getByTestId("toggle-appointments-scope-all").click();
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(1);
});
