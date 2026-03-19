/**
 * Test Scope:
 *
 * Feature: FT03 - Kalenderansichten / Wochenübersicht Kundendaten-Preview
 * Use Case: UC Telefonnummer im Kundendaten-Hover-Preview der Wochenansicht
 *
 * Abgedeckte Regeln:
 * - Der Hover-Preview einer Terminkarte zeigt die Telefonnummer des Kunden an.
 * - Ist keine Telefonnummer hinterlegt, bleibt "nicht hinterlegt" sichtbar.
 *
 * Fehlerfälle:
 * - phone/email/company werden im Service-Mapping vergessen → Preview zeigt immer "nicht hinterlegt".
 *
 * Ziel:
 * Sicherstellen, dass der Wochenkalender-Kundendaten-Preview die tatsächliche Telefonnummer anzeigt
 * und nicht permanent den Fallback-Text.
 */
import { expect, test } from "@playwright/test";
import * as customersService from "../../server/services/customersService";
import {
  createAppointmentFixture,
  createProjectFixture,
  getRelativeBerlinDate,
  buildCustomerPayload,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("zeigt Telefonnummer im Kundendaten-Hover-Preview wenn am Kunden hinterlegt", async ({ page }) => {
  const customer = await customersService.createCustomer({
    ...buildCustomerPayload("FT03-PHONE-WITH"),
    phone: "0175-9988776",
  });
  const project = await createProjectFixture({
    prefix: "FT03-PHONE-WITH",
    customerId: customer.id,
    name: "FT03 Preview Mit Telefon",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });

  const hoverTrigger = appointmentPanel.getByTestId("week-customer-hover-trigger");
  await hoverTrigger.hover();

  const phoneField = page.getByTestId("week-customer-preview-phone");
  await expect(phoneField).toBeVisible({ timeout: 5_000 });
  await expect(phoneField).toContainText("0175-9988776");
  await expect(phoneField).not.toContainText("nicht hinterlegt");
});

test("zeigt 'nicht hinterlegt' im Kundendaten-Hover-Preview wenn keine Telefonnummer hinterlegt", async ({ page }) => {
  const customer = await customersService.createCustomer({
    ...buildCustomerPayload("FT03-PHONE-WITHOUT"),
    phone: null,
  });
  const project = await createProjectFixture({
    prefix: "FT03-PHONE-WITHOUT",
    customerId: customer.id,
    name: "FT03 Preview Ohne Telefon",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });

  const hoverTrigger = appointmentPanel.getByTestId("week-customer-hover-trigger");
  await hoverTrigger.hover();

  const phoneField = page.getByTestId("week-customer-preview-phone");
  await expect(phoneField).toBeVisible({ timeout: 5_000 });
  await expect(phoneField).toContainText("nicht hinterlegt");
});
