/**
 * Test Scope:
 *
 * Feature: FT04/FT05+ - Terminverwaltung
 * Use Case: UC Sidebar "Alle Termine" im Projekt- und Kundenformular
 *
 * Abgedeckte Regeln:
 * - Projekt-Sidebar trennt aktuelle/zukuenftige und vergangene Termine sichtbar.
 * - Projekt-Sidebar zeigt Termine abwaerts nach Datum.
 * - Kunden-Sidebar Termine trennt aktuelle/zukuenftige und vergangene Termine sichtbar.
 * - Kunden-Sidebar Termine zeigt Termine abwaerts nach Datum.
 * - Kunden-Sidebar Projekte soll je Termin-Projekt erscheinen, nach Termindatum abwaerts sortiert, Projekte ohne Termin am Ende.
 *
 * Fehlerfaelle:
 * - Trennung zwischen aktuellen und vergangenen Terminen fehlt.
 * - Reihenfolge ist nicht abwaerts sortiert.
 * - Kunden-Projektliste entspricht nicht der Termin-Timeline-Erwartung.
 *
 * Ziel:
 * Browser-E2E Nachweis fuer Trennung + Sortierung in Sidebar-Panels sowie test-first Erwartungspruefung fuer Kunden-Projektpanel.
 */
import { expect, test } from "@playwright/test";
import {
  createAppointmentFixture,
  createRawAppointmentFixture,
  createCustomerProjectsTimelineFixture,
  createProjectWithPastAndFutureAppointmentsFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

const TODO_CUSTOMER_PROJECTS_SORTING = "TODO-FT04-CUSTOMER-SIDEBAR-PROJECTS-SORTING";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("project sidebar appointments: visible separation and descending by date", async ({ page }) => {
  const fixture = await createProjectWithPastAndFutureAppointmentsFixture({
    prefix: "PW-PROJECT-SIDEBAR",
    futureOffsetDays: 3,
    pastOffsetDays: -4,
  });
  const futureOlder = await createAppointmentFixture({
    projectId: fixture.project.id,
    startDate: getRelativeBerlinDate(1),
  });
  const pastNewerId = await createRawAppointmentFixture({
    projectId: fixture.project.id,
    startDate: getRelativeBerlinDate(-1),
    title: `${fixture.project.name} past newer`,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId(`project-card-${fixture.project.id}`).dblclick();

  const expectedOrder = [
    fixture.futureAppointmentId,
    futureOlder.id,
    pastNewerId,
    fixture.pastAppointmentId,
  ];
  const appointmentBadges = page.locator('[data-testid^="project-appointment-"]');
  await expect(appointmentBadges).toHaveCount(expectedOrder.length);
  for (let index = 0; index < expectedOrder.length; index += 1) {
    await expect(appointmentBadges.nth(index)).toHaveAttribute(
      "data-testid",
      `project-appointment-${expectedOrder[index]}`,
    );
  }

  const separator = page.getByText("Vergangene Termine");
  await expect(separator).toBeVisible();

  const firstCurrent = page.getByTestId(`project-appointment-${fixture.futureAppointmentId}`);
  const firstHistorical = page.getByTestId(`project-appointment-${fixture.pastAppointmentId}`);
  await expect(firstCurrent).toBeVisible();
  await expect(firstHistorical).toBeVisible();
  const firstCurrentTop = (await firstCurrent.boundingBox())?.y ?? 0;
  const separatorTop = (await separator.boundingBox())?.y ?? 0;
  const firstHistoricalTop = (await firstHistorical.boundingBox())?.y ?? 0;
  expect(firstCurrentTop).toBeLessThan(separatorTop);
  expect(firstHistoricalTop).toBeGreaterThan(separatorTop);
});

test("customer sidebar appointments: visible separation and descending by date", async ({ page }) => {
  const fixture = await createCustomerProjectsTimelineFixture({
    prefix: "PW-CUSTOMER-APPTS",
    includeProjectWithoutAppointments: true,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-kunden").click();
  await page.getByTestId(`customer-card-${fixture.customer.id}`).dblclick();

  const expectedOrder = [
    fixture.appointments.futureNewest.id,
    fixture.appointments.futureOlder.id,
    fixture.appointments.past.id,
  ];
  const appointmentBadges = page.locator('[data-testid^="customer-appointment-"]');
  await expect(appointmentBadges).toHaveCount(expectedOrder.length);
  for (let index = 0; index < expectedOrder.length; index += 1) {
    await expect(appointmentBadges.nth(index)).toHaveAttribute(
      "data-testid",
      `customer-appointment-${expectedOrder[index]}`,
    );
  }

  const separator = page.getByText("Vergangene Termine");
  await expect(separator).toBeVisible();
});

test(`customer sidebar projects: one project per appointment-project, descending by appointment date, no-appointment last [${TODO_CUSTOMER_PROJECTS_SORTING}]`, async ({ page }) => {
  const fixture = await createCustomerProjectsTimelineFixture({
    prefix: "PW-CUSTOMER-PROJECTS",
    includeProjectWithoutAppointments: true,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-kunden").click();
  await page.getByTestId(`customer-card-${fixture.customer.id}`).dblclick();

  const cards = page.locator('[data-testid^="linked-project-card-"]');
  await expect(cards).toHaveCount(fixture.expectedProjectOrderByAppointmentDateDesc.length);
  for (let index = 0; index < fixture.expectedProjectOrderByAppointmentDateDesc.length; index += 1) {
    await expect(cards.nth(index)).toHaveAttribute(
      "data-testid",
      `linked-project-card-${fixture.expectedProjectOrderByAppointmentDateDesc[index]}`,
    );
  }
});
