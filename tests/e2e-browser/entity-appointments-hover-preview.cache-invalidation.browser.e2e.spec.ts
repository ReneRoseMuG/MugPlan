/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Alle Termine (vergangen + zukünftig) erscheinen im Badge-Zähler und Hover-Preview aller drei Parent-Typen.
 * - Der Hover zeigt maximal vier Termine, absteigend nach Datum sortiert (neueste zuerst).
 * - Bei mehr als vier Terminen erscheint für alle drei Parent-Typen der Hinweis "... weitere im Formular".
 * - Nach einer Terminlöschung über die UI zeigt der nächste Hover frische Daten ohne Seitenreload.
 *
 * Fehlerfälle:
 * - Vergangene Termine tauchen nicht im Badge oder Preview auf (altes Verhalten vor Fix).
 * - Preview sortiert aufsteigend statt absteigend.
 * - "... weitere im Formular" erscheint nur bei Mitarbeitern, nicht bei Kunden oder Projekten.
 * - Nach Terminlöschung zeigt der Hover weiterhin den gelöschten Termin aus dem veralteten Cache.
 *
 * Ziel:
 * Die neue "alle Termine"-Semantik für Badge, Preview und Cache-Invalidierung über alle drei
 * Parent-Typen im Browser absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createProjectFixtureWithOverrides,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import * as appointmentsRepository from "../../server/repositories/appointmentsRepository";
import { formatDisplayDate } from "../../client/src/lib/date-display-format";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("A1 Mitarbeiter: zukünftiger Termin erscheint im Badge und Hover", async ({ page }) => {
  const employee = await createEmployeeFixtureWithOverrides({ prefix: "A1-EMP" });
  const project = await createProjectFixtureWithOverrides({ prefix: "A1-EMP-PROJ" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  const employeeCard = page.getByTestId(`employee-card-${employee.id}`);
  await expect(employeeCard).toBeVisible({ timeout: 10_000 });
  await expect(employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`)).toContainText("1");

  await employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`).hover();
  await expect(page.getByTestId(`employee-appointment-preview-${appointment.id}`)).toBeVisible({ timeout: 5_000 });
});

test("A2 Kunde: zukünftiger Termin erscheint im Badge und Hover", async ({ page }) => {
  const customer = await createCustomerFixtureWithOverrides({ prefix: "A2-CUST" });
  const project = await createProjectFixtureWithOverrides({ prefix: "A2-PROJ", customerId: customer.id });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-kunden").click();
  const customerCard = page.getByTestId(`customer-card-${customer.id}`);
  await expect(customerCard).toBeVisible({ timeout: 10_000 });
  await expect(customerCard.getByTestId(`text-customer-planned-appointments-${customer.id}`)).toContainText("1");

  await customerCard.getByTestId(`text-customer-planned-appointments-${customer.id}`).hover();
  await expect(page.getByTestId(`customer-appointment-preview-${appointment.id}`)).toBeVisible({ timeout: 5_000 });
});

test("A3 Projekt: zukünftiger Termin erscheint in der Terminzeile", async ({ page }) => {
  const project = await createProjectFixtureWithOverrides({ prefix: "A3-PROJ" });
  const tour = await createTourFixture("#336699");
  const startDate = getRelativeBerlinDate(2);
  await createAppointmentFixture({
    projectId: project.id,
    startDate,
    startTime: "09:00:00",
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  const projectCard = page.getByTestId(`project-card-${project.id}`);
  await expect(projectCard).toBeVisible({ timeout: 10_000 });
  const appointmentInfo = projectCard.getByTestId(`text-project-next-appointment-${project.id}`);
  await expect(appointmentInfo).toContainText(`09:00 - ${formatDisplayDate(startDate)}`);
  await expect(appointmentInfo).toContainText(tour.name);
  await expect(projectCard.getByTestId(`text-project-planned-appointments-${project.id}`)).toHaveCount(0);
});

test("A4 Mitarbeiter: vergangener Termin erscheint im Badge und Hover (neue Regel)", async ({ page }) => {
  const employee = await createEmployeeFixtureWithOverrides({ prefix: "A4-EMP" });
  const project = await createProjectFixtureWithOverrides({ prefix: "A4-EMP-PROJ" });
  const appointment = await appointmentsRepository.createAppointment(
    {
      projectId: project.id,
      customerId: project.customerId,
      tourId: null,
      title: "past appointment",
      description: null,
      startDate: new Date(`${getRelativeBerlinDate(-3)}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    [employee.id],
  );

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  const employeeCard = page.getByTestId(`employee-card-${employee.id}`);
  await expect(employeeCard).toBeVisible({ timeout: 10_000 });
  await expect(employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`)).toContainText("1");

  await employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`).hover();
  await expect(page.getByTestId(`employee-appointment-preview-${appointment.id}`)).toBeVisible({ timeout: 5_000 });
});

test("A5 Mitarbeiter: gemischte Termine werden absteigend nach Datum sortiert", async ({ page }) => {
  const employee = await createEmployeeFixtureWithOverrides({ prefix: "A5-EMP" });
  const project = await createProjectFixtureWithOverrides({ prefix: "A5-EMP-PROJ" });
  const past = await appointmentsRepository.createAppointment(
    {
      projectId: project.id,
      customerId: project.customerId,
      tourId: null,
      title: "past appointment",
      description: null,
      startDate: new Date(`${getRelativeBerlinDate(-3)}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    [employee.id],
  );
  const future = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  const employeeCard = page.getByTestId(`employee-card-${employee.id}`);
  await expect(employeeCard).toBeVisible({ timeout: 10_000 });
  await expect(employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`)).toContainText("2");

  await employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`).hover();
  await expect(page.getByTestId(`employee-appointment-preview-${past.id}`)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId(`employee-appointment-preview-${future.id}`)).toBeVisible();

  // Descending sort: future (newer date) must appear before past (older date)
  const futureBox = (await page.getByTestId(`employee-appointment-preview-${future.id}`).boundingBox())!;
  const pastBox = (await page.getByTestId(`employee-appointment-preview-${past.id}`).boundingBox())!;
  expect(futureBox.y).toBeLessThan(pastBox.y);
});

test("A6 Mitarbeiter/Kunden zeigen weitere Termine, Projekt zeigt den nächsten Termin", async ({ page }) => {
  // Appointments are created at +1 to +5 days.
  // Descending sort → +5,+4,+3,+2 are shown (index 4..1); +1 (index 0) is excluded.

  const employee = await createEmployeeFixtureWithOverrides({ prefix: "A6-EMP" });
  const empProject = await createProjectFixtureWithOverrides({ prefix: "A6-EMP-PROJ" });
  const empAppointments: Awaited<ReturnType<typeof createAppointmentFixture>>[] = [];
  for (let i = 1; i <= 5; i++) {
    empAppointments.push(
      await createAppointmentFixture({
        projectId: empProject.id,
        startDate: getRelativeBerlinDate(i),
        employeeIds: [employee.id],
      }),
    );
  }

  const customer = await createCustomerFixtureWithOverrides({ prefix: "A6-CUST" });
  const custProject = await createProjectFixtureWithOverrides({ prefix: "A6-CUST-PROJ", customerId: customer.id });
  const custAppointments: Awaited<ReturnType<typeof createAppointmentFixture>>[] = [];
  for (let i = 1; i <= 5; i++) {
    custAppointments.push(
      await createAppointmentFixture({
        projectId: custProject.id,
        startDate: getRelativeBerlinDate(i),
      }),
    );
  }

  const project = await createProjectFixtureWithOverrides({ prefix: "A6-PROJ" });
  const projectNextDate = getRelativeBerlinDate(1);
  for (let i = 1; i <= 5; i++) {
    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(i),
    });
  }

  await loginAsAdmin(page);

  // Employee: 4 items visible, item with earliest date (+1, index 0) excluded, hint visible
  await page.getByTestId("nav-mitarbeiter").click();
  const employeeCard = page.getByTestId(`employee-card-${employee.id}`);
  await expect(employeeCard).toBeVisible({ timeout: 10_000 });
  await employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`).hover();
  await expect(page.getByTestId(`employee-appointment-preview-${empAppointments[4].id}`)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId(`employee-appointment-preview-${empAppointments[0].id}`)).toHaveCount(0);
  await expect(page.getByText("... weitere im Formular")).toBeVisible();

  // Customer: same structure
  await page.getByTestId("nav-kunden").click();
  const customerCard = page.getByTestId(`customer-card-${customer.id}`);
  await expect(customerCard).toBeVisible({ timeout: 10_000 });
  await customerCard.getByTestId(`text-customer-planned-appointments-${customer.id}`).hover();
  await expect(page.getByTestId(`customer-appointment-preview-${custAppointments[4].id}`)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId(`customer-appointment-preview-${custAppointments[0].id}`)).toHaveCount(0);
  await expect(page.getByText("... weitere im Formular")).toBeVisible();

  // Project: single next-appointment row, no appointment hover badge
  await page.getByTestId("nav-projekte").click();
  const projectCard = page.getByTestId(`project-card-${project.id}`);
  await expect(projectCard).toBeVisible({ timeout: 10_000 });
  await expect(projectCard.getByTestId(`text-project-next-appointment-${project.id}`)).toContainText(formatDisplayDate(projectNextDate));
  await expect(projectCard.getByTestId(`text-project-planned-appointments-${project.id}`)).toHaveCount(0);
});

test("B1 Cache-Invalidierung: nach UI-Löschung zeigt der Hover keine veralteten Daten (kein Seitenreload)", async ({ page }) => {
  const employee = await createEmployeeFixtureWithOverrides({ prefix: "B1-EMP" });
  const project = await createProjectFixtureWithOverrides({ prefix: "B1-PROJ" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);

  // Step 1: load and verify the hover preview (caches the query)
  await page.getByTestId("nav-mitarbeiter").click();
  const employeeCard = page.getByTestId(`employee-card-${employee.id}`);
  await expect(employeeCard).toBeVisible({ timeout: 10_000 });
  await expect(employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`)).toContainText("1");
  await employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`).hover();
  await expect(page.getByTestId(`employee-appointment-preview-${appointment.id}`)).toBeVisible({ timeout: 5_000 });

  // Step 2: navigate to appointment list and delete via UI
  await page.getByTestId("nav-termine").click();
  await expect(page.getByTestId("table-appointments-list")).toBeVisible({ timeout: 10_000 });
  const appointmentRow = page
    .getByTestId("table-appointments-list")
    .locator("tbody tr")
    .filter({ hasText: project.name ?? "" })
    .first();
  await expect(appointmentRow).toBeVisible({ timeout: 5_000 });
  await appointmentRow.dblclick();

  await expect(page.getByTestId("button-delete-appointment")).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("button-delete-appointment").click();

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE"
      && response.url().includes(`/api/appointments/${appointment.id}`),
  );
  await page.getByRole("button", { name: "Termin löschen" }).click();
  await deleteResponsePromise;

  // Step 3: navigate back WITHOUT page.reload() — cache must be invalidated
  await page.getByTestId("nav-mitarbeiter").click();
  await expect(employeeCard).toBeVisible({ timeout: 10_000 });
  await expect(
    employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`),
  ).toContainText("0");

  // The deleted appointment must not appear in the hover preview
  await employeeCard.getByTestId(`text-employee-current-appointments-${employee.id}`).hover();
  await expect(page.getByTestId(`employee-appointment-preview-${appointment.id}`)).toHaveCount(0);
});
