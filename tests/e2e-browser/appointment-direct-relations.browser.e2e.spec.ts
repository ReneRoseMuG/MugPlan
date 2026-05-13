/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Vorhandene Direkttermine lassen sich im Browser oeffnen und zeigen Kunde ohne Projekt.
 * - Das Formular blockiert Speichern, wenn weder Projekt noch Kunde gesetzt ist.
 * - Vorhandene Projektzuordnungen an bestehenden Terminen lassen sich im Formular nicht entfernen.
 *
 * Fehlerfaelle:
 * - Direkttermin-Edit zeigt keine direkte Kundenrelation.
 * - Formular erlaubt Speichern ohne jede Relation.
 * - Bestehende Projektzuordnung wird trotz gesperrter Abloselogik entfernt oder verliert die Kundenableitung.
 *
 * Ziel:
 * Stabile Browser-E2E fuer die wichtigsten Direkttermin-Pfade ohne Abhaengigkeit von den aktuell bruechigen Picker-Dialogen.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

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

  await expect(page.getByText("Kunde oder Projekt ist erforderlich", { exact: true })).toBeVisible();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
});

test("keeps project on an existing project appointment and offers no remove action", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "BROWSER-REMOVE-PROJ" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  await openExistingAppointment(page, appointment.id);
  await expect(page.getByTestId("slot-project-relation-action-remove")).toHaveCount(0);
  await page.getByTestId("button-save-appointment").click();
  await page.getByTestId("checkbox-appointment-save-review-no-employees").click();
  await page.getByTestId("button-appointment-save-review-confirm").click();

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
    projectId: project.id,
    customerId: project.customerId,
  });
});
