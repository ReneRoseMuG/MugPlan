/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein bereits geladener Termin-Dokumentenkontext wird nach weiterem Projektattachment ohne Reload aktualisiert.
 * - Wochenkarten-Counter, Hover-Galerie und Terminformular zeigen nach dem Upload denselben Attachment-Stand.
 *
 * Fehlerfaelle:
 * - Der Wochenkarten-Counter steigt, Hover-Galerie oder Terminformular bleiben aber auf dem alten Kontext stehen.
 * - Ein zuvor gecachter Appointment-Context wird nach Projektattachment-Upload nicht invalidiert.
 *
 * Ziel:
 * Browserseitige Regression fuer stale Appointment-Context-Caches nach Projektattachment-Upload absichern.
 */
import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";
import * as appointmentAttachmentsService from "../../server/services/appointmentAttachmentsService";
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

function buildAttachmentPayload(prefix: string, extension = "pdf") {
  const token = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    filename: `${token}.${extension}`,
    originalName: `${token}.${extension}`,
    mimeType: extension === "pdf" ? "application/pdf" : "text/plain",
    fileSize: 128,
    storagePath: `browser-fixtures/${token}.${extension}`,
    version: 1,
  };
}

async function openProjectForm(page: Page, projectId: number) {
  await page.getByTestId("nav-projekte").click();
  await page.getByLabel("Alle Projekte").click();
  const card = page.getByTestId(`project-card-${projectId}`);
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible({ timeout: 10_000 });
}

async function openAppointmentFromCalendar(page: Page, appointmentId: number) {
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible({ timeout: 10_000 });
}

test("aktualisiert Hover und Terminformular nach weiterem Projektattachment ohne Reload", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-ATT-CTX-CUST");
  const project = await createProjectFixture({
    prefix: "FT24-ATT-CTX-PROJ",
    customerId: customer.id,
    name: "FT24 Attachment Kontext Projekt",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  const initialProjectAttachment = buildAttachmentPayload("initial-project");
  const appointmentAttachment = buildAttachmentPayload("initial-appointment");
  const uploadedAttachmentName = "project-context-refresh.txt";

  await projectAttachmentsService.createProjectAttachment({
    projectId: project.id,
    ...initialProjectAttachment,
  });
  await appointmentAttachmentsService.createAppointmentAttachment({
    appointmentId: appointment.id,
    ...appointmentAttachment,
  });

  await loginAsAdmin(page);

  await openAppointmentFromCalendar(page, appointment.id);
  await expect(page.getByText("Dokumente (2)")).toBeVisible();
  await expect(page.getByText(initialProjectAttachment.originalName)).toBeVisible();
  await expect(page.getByText(appointmentAttachment.originalName)).toBeVisible();
  await page.getByTestId("button-secondary-cancel-appointment").click();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);

  await openProjectForm(page, project.id);
  const fileInput = page.getByTestId("project-form-sidebar").locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: uploadedAttachmentName,
    mimeType: "text/plain",
    buffer: Buffer.from("context refresh attachment", "utf8"),
  });
  await expect(page.getByTestId("project-form-sidebar").getByText(uploadedAttachmentName)).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("button-cancel-project").click();
  await expect(page.getByTestId("button-save-project")).toHaveCount(0);

  await page.getByRole("button", { name: "Wochenuebersicht" }).click();

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  const hoverTrigger = appointmentPanel.getByTestId("week-appointment-attachments-hover-trigger");
  await expect(hoverTrigger).toContainText("3");
  await hoverTrigger.hover();

  await expect(page.getByText("Anhaenge (3)")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(uploadedAttachmentName)).toBeVisible();

  await openAppointmentFromCalendar(page, appointment.id);
  await expect(page.getByText("Dokumente (3)")).toBeVisible();
  await expect(page.getByText(uploadedAttachmentName)).toBeVisible();
});
