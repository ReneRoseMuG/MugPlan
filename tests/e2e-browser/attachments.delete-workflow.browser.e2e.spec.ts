/**
 * Test Scope:
 *
 * Feature: FT19 – Attachment Lösch-Workflow im Browser
 * Use Case: Vollständiger Lösch-Workflow (Soft, Hard, Abbruch, historischer Termin)
 *
 * Abgedeckte Regeln:
 * - Soft-Delete entfernt Anhang aus der Liste und dekrementiert den Counter ohne Seitenreload.
 * - Hard-Delete entfernt Anhang aus der Liste und dekrementiert den Counter.
 * - Abbrechen im Dialog lässt Anhang und Counter unverändert.
 * - Historischer Termin: kein Action-Button sichtbar bei Attachments.
 * - Die Hover-Preview auf der Wochenkarten enthält das gelöschte Attachment nicht mehr.
 *
 * Fehlerfaelle:
 * - Counter oder Hover-Preview zeigen nach Löschung veraltete Daten (Stale State).
 * - Dialog erscheint nicht oder zeigt falschen Parent-Typ.
 * - Attachment bleibt nach Bestätigung weiterhin in der Liste sichtbar.
 *
 * Ziel:
 * Browser-seitige Ende-zu-Ende-Absicherung des Lösch-Workflows für Projekt (repräsentativ)
 * sowie Sonderregel für historische Termine.
 */
import { expect, test, type Page } from "@playwright/test";
import * as projectAttachmentsService from "../../server/services/projectAttachmentsService";
import * as appointmentAttachmentsService from "../../server/services/appointmentAttachmentsService";
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

async function openProjectForm(page: Page, projectId: number) {
  await page.getByTestId("nav-projekte").click();
  await page.getByLabel("Alle Projekte").click();
  const card = page.getByTestId(`project-card-${projectId}`);
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible({ timeout: 10_000 });
}

test("Soft-Delete – Projekt: Anhang aus Liste entfernen, Counter und Hover-Preview aktualisieren", async ({ page }) => {
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

  // Schritt 1: Anhang-Counter auf der Wochenkarte ablesen (Ausgangszustand)
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment?.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  const hoverTrigger = appointmentPanel.getByTestId("week-appointment-attachments-hover-trigger");
  await expect(hoverTrigger).toContainText("1");

  // Schritt 2: Projektformular öffnen, Anhang im Dokumentenpanel finden
  await openProjectForm(page, project.id);
  const attachmentBadge = page.getByTestId(`attachment-badge-project-${attachment.id}`);
  await expect(attachmentBadge).toBeVisible({ timeout: 5_000 });
  await expect(attachmentBadge).toContainText(attachmentPayload.originalName);

  // Counter im Panel: "Dokumente (1)"
  await expect(page.getByText("Dokumente (1)")).toBeVisible();

  // Schritt 3: Action-Button klicken → Dialog erscheint mit Parent-Typ "Projekt"
  const deleteBtn = page.getByTestId(`attachment-delete-btn-${attachment.id}`);
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 3_000 });
  await expect(dialog).toContainText("Projekt");
  await expect(dialog.getByRole("button", { name: "Nur Verknüpfung entfernen" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Datei vollständig löschen" })).toBeVisible();

  // Schritt 4: "Nur Verknüpfung entfernen" wählen
  await dialog.getByRole("button", { name: "Nur Verknüpfung entfernen" }).click();

  // Schritt 5: Attachmentliste aktualisiert sich ohne Seitenreload
  await expect(attachmentBadge).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(attachmentPayload.originalName)).not.toBeVisible();

  // Counter zeigt aktualisierten Wert: "Dokumente (0)"
  await expect(page.getByText("Dokumente (0)")).toBeVisible();

  // Schritt 6: Wochenkarte zeigt aktualisierten Counter (kein Hover-Trigger mehr)
  await page.getByTestId("nav-kalender").click();
  await expect(page.getByTestId(`week-appointment-panel-${appointment?.id}`)).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByTestId(`week-appointment-panel-${appointment?.id}`)
      .getByTestId("week-appointment-attachments-hover-trigger"),
  ).toHaveCount(0);
});

test("Hard-Delete – Projekt: Anhang aus Liste und Counter entfernen", async ({ page }) => {
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

  // Action-Button → Dialog → "Datei vollständig löschen"
  await page.getByTestId(`attachment-delete-btn-${attachment.id}`).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 3_000 });
  await dialog.getByRole("button", { name: "Datei vollständig löschen" }).click();

  // Anhang verschwindet aus der Liste
  await expect(attachmentBadge).not.toBeVisible({ timeout: 5_000 });

  // Counter aktualisiert sich
  await expect(page.getByText("Dokumente (0)")).toBeVisible();
});

test("Abbruch – Dialog schließen ohne Löschung", async ({ page }) => {
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
  await openProjectForm(page, project.id);

  const attachmentBadge = page.getByTestId(`attachment-badge-project-${attachment.id}`);
  await expect(attachmentBadge).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Dokumente (1)")).toBeVisible();

  // Action-Button → Dialog öffnet sich
  await page.getByTestId(`attachment-delete-btn-${attachment.id}`).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 3_000 });

  // Abbrechen wählen
  await dialog.getByRole("button", { name: "Abbrechen" }).click();

  // Dialog geschlossen
  await expect(dialog).not.toBeVisible();

  // Anhang ist noch vorhanden, Counter unverändert
  await expect(attachmentBadge).toBeVisible();
  await expect(page.getByText(attachmentPayload.originalName)).toBeVisible();
  await expect(page.getByText("Dokumente (1)")).toBeVisible();
});

test("Historischer Termin: kein Action-Button für Anhänge sichtbar", async ({ page }) => {
  const customer = await createCustomerFixture("FT19-DEL-HIST-CUST");
  const project = await createProjectFixture({
    prefix: "FT19-DEL-HIST-PROJ",
    customerId: customer.id,
    name: "FT19 Historischer Termin",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: "2020-03-15", // Vergangenes Datum → historischer Termin
  });
  const attachmentPayload = buildAttachmentPayload("hist-appt", "historisch-test");
  await appointmentAttachmentsService.createAppointmentAttachment({
    appointmentId: Number(appointment?.id),
    ...attachmentPayload,
  });

  await loginAsAdmin(page);

  // Termin via Appointments-Liste öffnen
  await page.getByTestId("nav-termine").click();
  const appointmentRow = page.locator(`[data-testid="appointment-row-${appointment?.id}"]`);
  await expect(appointmentRow).toBeVisible({ timeout: 10_000 });
  await appointmentRow.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible({ timeout: 10_000 });

  // Anhang ist in der Liste sichtbar (Anzeige erlaubt)
  await expect(page.getByText(attachmentPayload.originalName)).toBeVisible({ timeout: 5_000 });

  // Kein Action-Button sichtbar (historischer Termin → nur Lesen)
  await expect(page.getByTestId(/^attachment-delete-btn-/)).toHaveCount(0);
});
