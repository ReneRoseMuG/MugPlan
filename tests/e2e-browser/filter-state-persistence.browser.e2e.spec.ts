/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekte, Kunden, Termine und Mitarbeiter behalten ihren Listenstatus beim Rueckweg aus Formularen oder Overlays.
 * - Jeder Browser-Flow arbeitet mit echten Positiv- und Negativdaten statt nur mit Leerzustaenden.
 *
 * Fehlerfaelle:
 * - Filterwerte oder Toggle-Zustaende resetten nach dem Schliessen eines Formulars.
 * - Die gefilterte Treffermenge driftet nach dem Rueckweg sichtbar.
 *
 * Ziel:
 * Die Listenpersistenz ueber echte Browser-Navigation mit produktnahen Daten absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createProjectFixture,
  createRawAppointmentFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

let projectCustomer: Awaited<ReturnType<typeof createCustomerFixtureWithOverrides>>;
let projectHit: Awaited<ReturnType<typeof createProjectFixture>>;
let projectMiss: Awaited<ReturnType<typeof createProjectFixture>>;
let customerHit: Awaited<ReturnType<typeof createCustomerFixtureWithOverrides>>;
let customerMiss: Awaited<ReturnType<typeof createCustomerFixtureWithOverrides>>;
let appointmentCustomer: Awaited<ReturnType<typeof createCustomerFixtureWithOverrides>>;
let appointmentProjectHit: Awaited<ReturnType<typeof createProjectFixture>>;
let appointmentProjectMiss: Awaited<ReturnType<typeof createProjectFixture>>;
let appointmentHit: Awaited<ReturnType<typeof createAppointmentFixture>>;
let appointmentMiss: Awaited<ReturnType<typeof createAppointmentFixture>>;
let employeeHit: Awaited<ReturnType<typeof createEmployeeFixtureWithOverrides>>;
let employeeMiss: Awaited<ReturnType<typeof createEmployeeFixtureWithOverrides>>;

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts");

  projectCustomer = await createCustomerFixtureWithOverrides({
    prefix: "FSP-PROJ-CUST",
    firstName: "Paula",
    lastName: "Persist Projekt",
    fullName: "Paula Persist Projekt",
  });
  projectHit = await createProjectFixture({
    prefix: "FSP-PROJ-HIT",
    customerId: projectCustomer.id,
    name: "Persist Projekt Treffer",
    orderNumber: "771100",
  });
  projectMiss = await createProjectFixture({
    prefix: "FSP-PROJ-MISS",
    customerId: projectCustomer.id,
    name: "Persist Projekt Andere",
    orderNumber: "881100",
  });
  await createAppointmentFixture({
    projectId: projectHit.id,
    customerId: projectCustomer.id,
    startDate: getRelativeBerlinDate(3),
  });
  await createAppointmentFixture({
    projectId: projectMiss.id,
    customerId: projectCustomer.id,
    startDate: getRelativeBerlinDate(3),
  });

  customerHit = await createCustomerFixtureWithOverrides({
    prefix: "FSP-CUST-HIT",
    firstName: "Klara",
    lastName: "Persist Kunde Treffer",
    fullName: "Klara Persist Kunde Treffer",
  });
  customerMiss = await createCustomerFixtureWithOverrides({
    prefix: "FSP-CUST-MISS",
    firstName: "Mona",
    lastName: "Persist Kunde Andere",
    fullName: "Mona Persist Kunde Andere",
  });

  appointmentCustomer = await createCustomerFixtureWithOverrides({
    prefix: "FSP-APPT-CUST",
    firstName: "Theo",
    lastName: "Persist Termin Kunde",
    fullName: "Theo Persist Termin Kunde",
  });
  appointmentProjectHit = await createProjectFixture({
    prefix: "FSP-APPT-HIT",
    customerId: appointmentCustomer.id,
    name: "Persist Termin Treffer",
    orderNumber: "991100",
  });
  appointmentProjectMiss = await createProjectFixture({
    prefix: "FSP-APPT-MISS",
    customerId: appointmentCustomer.id,
    name: "Persist Termin Andere",
    orderNumber: "992200",
  });
  appointmentHit = await createAppointmentFixture({
    projectId: appointmentProjectHit.id,
    customerId: appointmentCustomer.id,
    startDate: getRelativeBerlinDate(2),
  });
  appointmentMiss = await createAppointmentFixture({
    projectId: appointmentProjectMiss.id,
    customerId: appointmentCustomer.id,
    startDate: getRelativeBerlinDate(2),
  });

  employeeHit = await createEmployeeFixtureWithOverrides({
    prefix: "FSP-EMP-HIT",
    firstName: "Anna",
    lastName: "Persist Mitarbeiter Treffer",
  });
  employeeMiss = await createEmployeeFixtureWithOverrides({
    prefix: "FSP-EMP-MISS",
    firstName: "Berta",
    lastName: "Persist Mitarbeiter Andere",
  });

  void appointmentHit;
  void appointmentMiss;
});

test("projects keep filters after closing the project form", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("toggle-projects-table").click();

  await page.locator("#project-filter-title").fill("Projekt Tref");

  const table = page.getByTestId("table-projects");
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Projekt Treffer" })).toHaveCount(1);
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Projekt Andere" })).toHaveCount(0);

  await table.locator("tbody tr").filter({ hasText: "Persist Projekt Treffer" }).first().dblclick();
  await expect(page.getByTestId("button-close-project")).toBeVisible();
  await page.getByTestId("button-close-project").click();

  await expect(page.locator("#project-filter-title")).toHaveValue("Projekt Tref");
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Projekt Treffer" })).toHaveCount(1);
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Projekt Andere" })).toHaveCount(0);
});

test("customers keep filters after closing the customer form", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByTestId("nav-kunden").click();
  await page.getByTestId("toggle-customers-table").click();

  await page.locator("#customer-filter-last-name").fill("Treffer");

  const table = page.getByTestId("table-customers");
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Kunde Treffer" })).toHaveCount(1);
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Kunde Andere" })).toHaveCount(0);

  await table.locator("tbody tr").filter({ hasText: "Persist Kunde Treffer" }).first().dblclick();
  await expect(page.getByTestId("button-close-customer")).toBeVisible();
  await page.getByTestId("button-close-customer").click();

  await expect(page.locator("#customer-filter-last-name")).toHaveValue("Treffer");
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Kunde Treffer" })).toHaveCount(1);
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Kunde Andere" })).toHaveCount(0);
});

test("appointments keep filters and the selected scope after closing the overlay", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByTestId("nav-termine").click();
  const ensurePeriodPickerOpen = async () => {
    const plannedScopeToggle = page.getByTestId("toggle-appointments-scope-planned");
    if (await plannedScopeToggle.isVisible()) return;
    await page.getByTestId("button-appointment-period-picker").click();
    await expect(plannedScopeToggle).toBeVisible();
  };

  await ensurePeriodPickerOpen();
  await page.getByTestId("toggle-appointments-scope-planned").click();
  await page.locator("#appointments-filter-project-title").fill("Termin Tre");

  const table = page.getByTestId("table-appointments-list");
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Termin Treffer" })).toHaveCount(1);
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Termin Andere" })).toHaveCount(0);

  await table.locator("tbody tr").filter({ hasText: "Persist Termin Treffer" }).first().dblclick();
  await expect(page.getByTestId("button-close-appointment")).toBeVisible();
  await page.getByTestId("button-close-appointment").click();

  await expect(page.locator("#appointments-filter-project-title")).toHaveValue("Termin Tre");
  await ensurePeriodPickerOpen();
  await expect(page.getByTestId("toggle-appointments-scope-planned")).toHaveAttribute("data-state", "on");
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Termin Treffer" })).toHaveCount(1);
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Termin Andere" })).toHaveCount(0);
});

test("employees keep filters after closing the employee form", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId("toggle-employees-table").click();

  await page.locator("#employee-filter-last-name").fill("Persist Mitarbeiter Treffer");

  const table = page.getByTestId("table-employees");
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Mitarbeiter Treffer" })).toHaveCount(1);
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Mitarbeiter Andere" })).toHaveCount(0);

  await table.locator("tbody tr").filter({ hasText: "Persist Mitarbeiter Treffer" }).first().dblclick();
  await expect(page.getByTestId("button-close-employee")).toBeVisible();
  await page.getByTestId("button-close-employee").click();

  await expect(page.locator("#employee-filter-last-name")).toHaveValue("Persist Mitarbeiter Treffer");
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Mitarbeiter Treffer" })).toHaveCount(1);
  await expect(table.locator("tbody tr").filter({ hasText: "Persist Mitarbeiter Andere" })).toHaveCount(0);
});

test("appointments keep the focused target page in all-scope after returning from the overlay", async ({ page }) => {
  const focusToken = "Persist Fokus";
  const focusCustomer = await createCustomerFixtureWithOverrides({
    prefix: "FSP-FOCUS-CUST",
    firstName: "Fiona",
    lastName: focusToken,
    fullName: `Fiona ${focusToken}`,
  });
  const historicProject = await createProjectFixture({
    prefix: "FSP-FOCUS-HIST",
    customerId: focusCustomer.id,
    name: `${focusToken} Historie`,
  });
  const futureProject = await createProjectFixture({
    prefix: "FSP-FOCUS-FUT",
    customerId: focusCustomer.id,
    name: `${focusToken} Zukunft`,
  });

  for (let index = 0; index < 25; index += 1) {
    await createRawAppointmentFixture({
      projectId: historicProject.id,
      startDate: `2000-05-${String(index + 1).padStart(2, "0")}`,
      title: `${focusToken} Historie ${index + 1}`,
    });
  }
  await createAppointmentFixture({
    projectId: futureProject.id,
    customerId: focusCustomer.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-termine").click();
  await page.locator("#appointments-filter-project-title").fill(focusToken);

  const table = page.getByTestId("table-appointments-list");
  await expect(page.getByTestId("text-appointments-page-state")).toContainText("Seite 2 von 2");
  const focusedRow = table.locator("tbody tr").filter({ hasText: `${focusToken} Zukunft` }).first();
  await expect(focusedRow).toBeVisible();

  await focusedRow.dblclick();
  await expect(page.getByTestId("button-close-appointment")).toBeVisible();
  await page.getByTestId("button-close-appointment").click();

  await expect(page.locator("#appointments-filter-project-title")).toHaveValue(focusToken);
  await expect(page.getByTestId("text-appointments-page-state")).toContainText("Seite 2 von 2");
  await expect(focusedRow).toBeVisible();
  await expect(focusedRow).toHaveClass(/bg-sky-100\/80/);
});
