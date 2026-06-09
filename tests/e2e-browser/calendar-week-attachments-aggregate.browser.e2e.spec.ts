/**
 * Test Scope:
 *
 * Feature: FT03/FT24 - Wochenkalender akkumulierte Dokumente
 * Use Case: UC Wochenkarte zeigt Kunden-, Projekt- und Terminanhaenge in einem gemeinsamen Badge
 *
 * Abgedeckte Regeln:
 * - Der Attachment-Badge der Wochenkarte erscheint bereits bei rein akkumulierten Kunden- oder Projektdokumenten.
 * - Der Badge zeigt den Gesamtzaehler ueber Kunde, Projekt und Termin.
 * - Das Hover listet die Dokumente mit Herkunftskennzeichnung Kunde, Projekt und Termin.
 * - Der Badge bleibt auch ohne Dokumente sichtbar und zeigt dann den Zaehler 0 mit leerem Hover-Zustand.
 *
 * Fehlerfaelle:
 * - Nur direkte Terminanhaenge machen den Badge sichtbar.
 * - Gesamtzaehler und Hover-Inhalt laufen auseinander.
 * - Der Leerzustand verschwindet komplett statt als sichtbarer 0-Badge dargestellt zu werden.
 *
 * Ziel:
 * Sicherstellen, dass die Wochenkarte dieselbe fachliche Dokumentensicht wie das Termin-Dokumentenpanel widerspiegelt.
 */
import { expect, test } from "./fixtures";
import * as appointmentAttachmentsService from "../../server/services/appointmentAttachmentsService";
import * as customerAttachmentsService from "../../server/services/customerAttachmentsService";
import * as projectAttachmentsService from "../../server/services/projectAttachmentsService";
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

function buildAttachmentPayload(prefix: string, label: string) {
  const token = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    filename: `${token}.pdf`,
    originalName: `${label}-${token}.pdf`,
    mimeType: "application/pdf",
    fileSize: 128,
    storagePath: `browser-fixtures/${token}.pdf`,
    version: 1,
  };
}

test("zeigt aggregierten Attachment-Badge und Herkunftslabels fuer Kunde, Projekt und Termin", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-BROWSER-ATT-CUST");
  const project = await createProjectFixture({
    prefix: "FT24-BROWSER-ATT-PROJ",
    customerId: customer.id,
    name: "FT24 Browser Attachment Projekt",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  const customerAttachment = buildAttachmentPayload("cust", "kunde");
  const projectAttachment = buildAttachmentPayload("proj", "projekt");
  const appointmentAttachment = buildAttachmentPayload("appt", "termin");

  await customerAttachmentsService.createCustomerAttachment({
    customerId: customer.id,
    ...customerAttachment,
  });
  await projectAttachmentsService.createProjectAttachment({
    projectId: project.id,
    ...projectAttachment,
  });
  await appointmentAttachmentsService.createAppointmentAttachment({
    appointmentId: appointment.id,
    ...appointmentAttachment,
  });

  await loginAsAdmin(page);

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });

  const hoverTrigger = appointmentPanel.getByTestId("week-appointment-attachments-hover-trigger");
  await expect(hoverTrigger).toContainText("3");
  await hoverTrigger.hover();

  await expect(page.getByText("Anhaenge (3)")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Kunde", { exact: true })).toBeVisible();
  await expect(page.getByText("Projekt", { exact: true })).toBeVisible();
  await expect(page.getByText("Termin", { exact: true })).toBeVisible();
  await expect(page.getByText(customerAttachment.originalName)).toBeVisible();
  await expect(page.getByText(projectAttachment.originalName)).toBeVisible();
  await expect(page.getByText(appointmentAttachment.originalName)).toBeVisible();
});

test("zeigt bei fehlenden akkumulierten Dokumenten einen sichtbaren 0-Badge mit leerem Hover-Zustand", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-BROWSER-ATT-EMPTY-CUST");
  const project = await createProjectFixture({
    prefix: "FT24-BROWSER-ATT-EMPTY-PROJ",
    customerId: customer.id,
    name: "FT24 Browser Attachment Leer",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
  });

  await loginAsAdmin(page);

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  const hoverTrigger = appointmentPanel.getByTestId("week-appointment-attachments-hover-trigger");
  await expect(hoverTrigger).toBeVisible();
  await expect(hoverTrigger).toContainText("0");
  await hoverTrigger.hover();
  await expect(page.getByText("Keine Anhänge vorhanden.")).toBeVisible({ timeout: 5_000 });
});
