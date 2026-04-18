/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Projektliste startet browserseitig mit der vollstaendigen Projektmenge.
 * - Der Scope "Geplante Projekte" zeigt nur Projekte mit aktuellem oder zukuenftigem Termin.
 * - Der Scope "Projekte ohne Termin" zeigt nur Projekte ohne Termin.
 * - Gueltige Text- und Auftragsnummernfilter verengen die Ergebnismenge innerhalb des aktiven Scopes korrekt.
 * - Ungueltige Filterwerte fuehren sichtbar in den Nichttreffer-Empty-State.
 *
 * Fehlerfaelle:
 * - Der Default-Scope blendet Projekte ohne Termin oder Projekte mit rein historischer Planung aus.
 * - Scope-Wechsel mischen Grundmengen wieder zusammen.
 * - Gueltige Filter liefern falsche Treffermengen oder Nichttreffer zeigen keinen Empty-State.
 *
 * Ziel:
 * Browserseitig mit echten Past-, Future- und No-Appointment-Daten absichern, dass die neue Projekt-Filtersemantik konsistent in der Ergebnisliste ankommt.
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
  await resetBrowserSuiteState("tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts");
});

test("project scopes keep the new all/default semantics and apply valid or invalid filters to real result sets", async ({ page }) => {
  const customer = await createCustomerFixture("FT02-SCOPE-BROWSER-CUST");
  const futureProject = await createProjectFixtureWithOverrides({
    prefix: "FT02-SCOPE-FUTURE",
    customerId: customer.id,
    name: "FT02 Scope Browser Future",
    orderNumber: "42001",
  });
  const pastProject = await createProjectFixtureWithOverrides({
    prefix: "FT02-SCOPE-PAST",
    customerId: customer.id,
    name: "FT02 Scope Browser Past",
    orderNumber: "42002",
  });
  const noAppointmentProject = await createProjectFixtureWithOverrides({
    prefix: "FT02-SCOPE-NONE",
    customerId: customer.id,
    name: "FT02 Scope Browser None",
    orderNumber: "42003",
  });

  await createAppointmentFixture({
    projectId: futureProject.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(4),
  });
  await createRawAppointmentFixture({
    projectId: pastProject.id,
    startDate: getRelativeBerlinDate(-4),
    title: "FT02 Scope Browser Past Appointment",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("toggle-projects-table").click();

  const table = page.getByTestId("table-projects");
  const rows = table.locator("tbody tr");
  const titleFilter = page.locator("#project-filter-title");
  const orderNumberFilter = page.locator("#project-filter-order-number");

  await expect(table).toBeVisible();

  await titleFilter.fill("FT02 Scope Browser");
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: noAppointmentProject.name })).toHaveCount(1);

  await page.getByTestId("toggle-project-scope-upcoming").click();
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: noAppointmentProject.name })).toHaveCount(0);

  await page.getByTestId("toggle-project-scope-no-appointments").click();
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: noAppointmentProject.name })).toHaveCount(1);
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);

  await page.getByTestId("toggle-project-scope-all").click();
  await orderNumberFilter.fill(noAppointmentProject.orderNumber ?? "");
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: noAppointmentProject.name })).toHaveCount(1);

  await orderNumberFilter.fill("");
  await titleFilter.fill("KEIN-TREFFER-FT02");
  await expect(page.getByText("Keine Treffer gefunden.")).toBeVisible();
  await expect(rows.filter({ hasText: futureProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: pastProject.name })).toHaveCount(0);
  await expect(rows.filter({ hasText: noAppointmentProject.name })).toHaveCount(0);
});
