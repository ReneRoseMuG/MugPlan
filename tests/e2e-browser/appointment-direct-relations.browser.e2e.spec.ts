/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Vorhandene Direkttermine lassen sich im Browser oeffnen und zeigen Kunde ohne Projekt.
 * - Das Formular blockiert Speichern, wenn weder Projekt noch Kunde gesetzt ist.
 * - Projektentfernung im Formular speichert einen Termin als Direkttermin mit bestehendem Kunden.
 *
 * Fehlerfaelle:
 * - Direkttermin-Edit zeigt keine direkte Kundenrelation.
 * - Formular erlaubt Speichern ohne jede Relation.
 * - Projektentfernung behaelt projectId ungewollt oder verliert customerId.
 *
 * Ziel:
 * Stabile Browser-E2E fuer die wichtigsten Direkttermin-Pfade ohne Abhaengigkeit von den aktuell bruechigen Picker-Dialogen.
 */
import { expect, test, type Page } from "@playwright/test";
import { resetDatabase } from "../helpers/resetDatabase";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createProjectFixture,
  getRelativeBerlinDate,
  resetTestDataFactoryState,
} from "../helpers/testDataFactory";

test.beforeEach(async () => {
  resetTestDataFactoryState();
  await resetDatabase();
});

async function loginAsAdmin(page: Page) {
  await page.goto("/");
  await expect(page.getByLabel("Benutzername oder E-Mail")).toBeVisible();
  await page.getByLabel("Benutzername oder E-Mail").fill("test-admin");
  await page.getByLabel("Passwort").fill("test-admin-password");
  await page.getByRole("button", { name: "Anmelden" }).click();
}

async function openExistingAppointment(page: Page, appointmentId: number) {
  await loginAsAdmin(page);
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function openNewAppointmentFromWeek(page: Page) {
  await loginAsAdmin(page);
  const button = page.locator('[data-testid^="button-new-appointment-week-"]').first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

test("opens an existing direct appointment with customer badge and empty project relation", async ({ page }) => {
  const customer = await createCustomerFixture("BROWSER-DIRECT-VIEW");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: getRelativeBerlinDate(1),
  });

  await openExistingAppointment(page, appointment.id);

  await expect(page.getByTestId("badge-customer")).toBeVisible();
  await expect(page.getByTestId("slot-project-relation")).toContainText("Kein Projekt ausgewählt");
});

test("blocks save when neither project nor customer is set", async ({ page }) => {
  const startDate = getRelativeBerlinDate(1);

  await openNewAppointmentFromWeek(page);
  await page.getByTestId("input-start-date").fill(startDate);
  await page.getByTestId("button-save-appointment").click();

  await expect(page.getByText("Kunde oder Projekt ist erforderlich")).toBeVisible();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
});

test("removes project from an existing project appointment and keeps customer", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "BROWSER-REMOVE-PROJ" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  await openExistingAppointment(page, appointment.id);
  await expect(page.getByTestId("slot-project-relation-action-remove")).toBeVisible();
  await page.getByTestId("slot-project-relation-action-remove").click();
  await expect(page.getByTestId("slot-project-relation")).toContainText("Kein Projekt ausgewählt");
  await page.getByTestId("button-save-appointment").click();
  await page.getByRole("button", { name: "Trotzdem speichern" }).click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    if (!response.ok()) {
      return { projectId: "missing", customerId: "missing" };
    }
    const body = await response.json();
    return {
      projectId: body.projectId,
      customerId: body.customerId,
    };
  }).toEqual({
    projectId: null,
    customerId: project.customerId,
  });
});
