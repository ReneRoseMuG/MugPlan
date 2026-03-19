/**
 * Test Scope:
 *
 * Feature: FT24 - Termin-Dokumentenkontext
 * Use Case: UC Terminformular gruppiert Kunden-, Projekt- und Terminanhaenge im bestehenden Sidebar-Panel
 *
 * Abgedeckte Regeln:
 * - AppointmentAttachmentsPanel erweitert den Attachment-Kontext um appointmentAttachments.
 * - Das bestehende SplitAttachmentsPanel behaelt die gruppierte Struktur und bekommt eine dritte Gruppe Terminanhaenge.
 * - Terminanhaenge nutzen die dedizierten Download-Routen fuer Terminattachments.
 * - Im Create-Fall kann das Panel pending Terminanhaenge ohne appointmentId anzeigen und hochladen.
 *
 * Fehlerfaelle:
 * - Terminformular zeigt keine eigene Terminanhang-Gruppe.
 * - Terminanhaenge verwenden dieselben Routen wie Kunden- oder Projektanhaenge.
 *
 * Ziel:
 * Die additive Erweiterung des bestehenden gruppierten Termin-Dokumentenpanels regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT24 UI: appointment attachments panel grouping wiring", () => {
  const panelPath = path.resolve(process.cwd(), "client/src/components/AppointmentAttachmentsPanel.tsx");
  const panelSource = readFileSync(panelPath, "utf8");

  it("extends the attachment context with appointment attachments", () => {
    expect(panelSource).toContain("appointmentAttachments: AttachmentItem[];");
  });

  it("adds a third grouped section for appointment attachments", () => {
    expect(panelSource).toContain('title: "Kundendokumente"');
    expect(panelSource).toContain('title: "Projektdokumente"');
    expect(panelSource).toContain('title: "Terminanhaenge"');
    expect(panelSource).toContain('id: "appointment"');
    expect(panelSource).toContain("const resolvedAppointmentAttachments = appointmentId");
    expect(panelSource).toContain("items: resolvedAppointmentAttachments");
  });

  it("uses dedicated appointment attachment download routes", () => {
    expect(panelSource).toContain("buildOpenUrl: (id) => appointmentId ? `/api/appointment-attachments/${id}/download` : buildPendingAttachmentUrl(id)");
    expect(panelSource).toContain("buildDownloadUrl: (id) => appointmentId ? `/api/appointment-attachments/${id}/download?download=1` : buildPendingAttachmentUrl(id)");
  });

  it("supports create mode with pending appointment attachments and direct customer/project queries", () => {
    expect(panelSource).toContain("export type PendingAppointmentAttachmentItem = AttachmentItem & {");
    expect(panelSource).toContain("pendingAppointmentAttachments?: PendingAppointmentAttachmentItem[];");
    expect(panelSource).toContain("onUploadPendingAppointmentAttachment?: (file: File) => void;");
    expect(panelSource).toContain("queryKey: [\"/api/customers\", customerId, \"attachments\"]");
    expect(panelSource).toContain("queryKey: [\"/api/projects\", projectId, \"attachments\"]");
    expect(panelSource).toContain("const resolvedAppointmentAttachments = appointmentId");
    expect(panelSource).toContain(": pendingAppointmentAttachments;");
    expect(panelSource).toContain("buildPendingAttachmentUrl(id)");
  });
});
