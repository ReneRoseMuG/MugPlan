/**
 * Test Scope:
 *
 * Feature: FT19 - Attachment Loesch-Workflow im Browser
 * Use Case: Vollstaendiger Loesch-Workflow (Soft, Hard, Abbruch, historischer Termin)
 *
 * Abgedeckte Regeln:
 * - Soft-Delete entfernt Anhang aus der Liste und dekrementiert den Counter ohne Seitenreload.
 * - Hard-Delete entfernt Anhang aus der Liste und dekrementiert den Counter.
 * - Abbrechen im Dialog laesst Anhang und Counter unveraendert.
 * - Historischer Termin: Anhaenge bleiben sichtbar, Mutationsaktionen bleiben unsichtbar.
 * - Die Hover-Preview auf der Wochenkarte enthaelt das geloeschte Attachment nicht mehr.
 *
 * Fehlerfaelle:
 * - Counter oder Hover-Preview zeigen nach Loeschung veraltete Daten.
 * - Dialog erscheint nicht oder zeigt falschen Parent-Typ.
 * - Attachment bleibt nach Bestaetigung weiterhin in der Liste sichtbar.
 *
 * Ziel:
 * Browser-seitige Ende-zu-Ende-Absicherung des Loesch-Workflows fuer Projekt
 * sowie der Readonly-Sonderregel fuer historische Termine.
 */
import { expect, test, type Page } from "@playwright/test";
import * as projectAttachmentsService from "../../server/services/projectAttachmentsService";
import * as appointmentAttachmentsService from "../../server/services/appointmentAttachmentsService";
import {
  createAppointmentFixture,
  createRawAppointmentFixture,
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

async function openProjectForm(page: Page, projectId: number, scope: "all" | "noAppointments" = "all") {
  await page.getByTestId("nav-projekte").click();
  if (scope === "noAppointments") {
    await page.getByTestId("toggle-project-scope-no-appointments").click();
  } else {
    await page.getByTestId("toggle-project-scope-all").click();
  }
  const card = page.getByTestId(`project-card-${projectId}`);
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible({ timeout: 10_000 });
}

test("Soft-Delete - Projekt: Anhang aus Liste entfernen, Counter und Hover-Preview aktualisieren", async ({ page }) => {
  const customer = await createCustomerFixture("FT19-DEL-SOFT-PROJ-CUST");
  const project = await createProjectFixture({
    prefix: "FT19-DEL-SOFT-PROJ",
    customerId: customer.id,
    name: "FT19 Soft Delete Projekt",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(3),
  });
  const attachmentPayload = buildAttachmentPayload("soft-proj", "weicher-loeschtest");
  const attachment = await projectAttachmentsService.createProjectAttachment({
    projectId: project.id,
    ...attachmentPayload,
  });

  await loginAsAdmin(page);

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment?.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  const hoverTrigger = appointmentPanel.getByTestId("week-appointment-attachments-hover-trigger");
  await expect(hoverTrigger).toContainText("1");

  await openProjectForm(page, project.id);
  const attachmentBadge = page.getByTestId(`attachment-badge-project-${attachment.id}`);
  await expect(attachmentBadge).toBeVisible({ timeout: 5_000 });
  await expect(attachmentBadge).toContainText(attachmentPayload.originalName);
  await expect(page.getByText("Dokumente (1)")).toBeVisible();

  const deleteTrigger = page.getByTestId(`attachment-delete-trigger-${attachment.id}`);
  await expect(deleteTrigger).toBeVisible();
  await deleteTrigger.click();

  const panel = page.getByTestId(`attachment-delete-panel-${attachment.id}`);
  await expect(panel).toBeVisible({ timeout: 3_000 });
  await expect(panel).toContainText("Projekt");
  await expect(panel.getByRole("button", { name: "Nur Verknüpfung entfernen" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Datei vollständig löschen" })).toBeVisible();

  await panel.getByRole("button", { name: "Nur Verknüpfung entfernen" }).click();

  await expect(attachmentBadge).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(attachmentPayload.originalName)).not.toBeVisible();
  await expect(page.getByText("Dokumente (0)")).toBeVisible();

  await page.getByTestId("button-cancel-project").click();
  await expect(page.getByTestId("button-save-project")).toHaveCount(0);
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId(`week-appointment-panel-${appointment?.id}`)).toBeVisible({ timeout: 10_000 });
  const updatedHoverTrigger = page
    .getByTestId(`week-appointment-panel-${appointment?.id}`)
    .getByTestId("week-appointment-attachments-hover-trigger");
  await expect(updatedHoverTrigger).toBeVisible();
  await expect(updatedHoverTrigger).toContainText("0");
});

test("Hard-Delete - Projekt: Anhang aus Liste und Counter entfernen", async ({ page }) => {
  const customer = await createCustomerFixture("FT19-DEL-HARD-PROJ-CUST");
  const project = await createProjectFixture({
    prefix: "FT19-DEL-HARD-PROJ",
    customerId: customer.id,
    name: "FT19 Hard Delete Projekt",
  });
  await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(4),
  });
  const attachmentPayload = buildAttachmentPayload("hard-proj", "harter-loeschtest");
  const attachment = await projectAttachmentsService.createProjectAttachment({
    projectId: project.id,
    ...attachmentPayload,
  });

  await loginAsAdmin(page);
  await openProjectForm(page, project.id);

  const attachmentBadge = page.getByTestId(`attachment-badge-project-${attachment.id}`);
  await expect(attachmentBadge).toBeVisible({ timeout: 5_000 });

  await page.getByTestId(`attachment-delete-trigger-${attachment.id}`).click();
  const panel = page.getByTestId(`attachment-delete-panel-${attachment.id}`);
  await expect(panel).toBeVisible({ timeout: 3_000 });
  await panel.getByRole("button", { name: "Datei vollständig löschen" }).click();

  await expect(attachmentBadge).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Dokumente (0)")).toBeVisible();
});

test("Abbruch - Dialog schliessen ohne Loeschung", async ({ page }) => {
  const customer = await createCustomerFixture("FT19-DEL-CANCEL-CUST");
  const project = await createProjectFixture({
    prefix: "FT19-DEL-CANCEL-PROJ",
    customerId: customer.id,
    name: "FT19 Abbruch Projekt",
  });
  const attachmentPayload = buildAttachmentPayload("cancel-proj", "abbruch-test");
  const attachment = await projectAttachmentsService.createProjectAttachment({
    projectId: project.id,
    ...attachmentPayload,
  });

  await loginAsAdmin(page);
  await openProjectForm(page, project.id, "noAppointments");

  const attachmentBadge = page.getByTestId(`attachment-badge-project-${attachment.id}`);
  await expect(attachmentBadge).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Dokumente (1)")).toBeVisible();

  await page.getByTestId(`attachment-delete-trigger-${attachment.id}`).click();
  const panel = page.getByTestId(`attachment-delete-panel-${attachment.id}`);
  await expect(panel).toBeVisible({ timeout: 3_000 });
  await panel.getByRole("button", { name: "Abbrechen" }).click();

  await expect(panel).not.toBeVisible();
  await expect(attachmentBadge).toBeVisible();
  await expect(page.getByText(attachmentPayload.originalName)).toBeVisible();
  await expect(page.getByText("Dokumente (1)")).toBeVisible();
});

test("Historischer Termin: nur Readonly-Ansicht und kein Action-Button fuer Anhaenge sichtbar", async ({ page }) => {
  const customer = await createCustomerFixture("FT19-DEL-HIST-CUST");
  const project = await createProjectFixture({
    prefix: "FT19-DEL-HIST-PROJ",
    customerId: customer.id,
    name: "FT19 Historischer Termin",
  });
  const appointmentId = await createRawAppointmentFixture({
    projectId: project.id,
    startDate: "2020-03-15",
    title: "FT19 Historischer Termin",
  });
  const attachmentPayload = buildAttachmentPayload("hist-appt", "historisch-test");
  await appointmentAttachmentsService.createAppointmentAttachment({
    appointmentId,
    ...attachmentPayload,
  });

  await loginAsAdmin(page);

  await page.getByTestId("nav-termine").click();
  await expect(page.getByTestId("toggle-appointments-scope-all")).toHaveAttribute("data-state", "on");
  const appointmentRow = page.getByRole("row").filter({ hasText: "FT19 Historischer Termin" }).first();
  await expect(appointmentRow).toBeVisible({ timeout: 10_000 });
  await appointmentRow.dblclick();

  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Schließen" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Historische Termine können nicht verändert werden.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(attachmentPayload.originalName)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId(/^attachment-delete-trigger-/)).toHaveCount(0);
  await expect(page.getByTestId("button-add-appointment-attachment")).toHaveCount(0);
});
