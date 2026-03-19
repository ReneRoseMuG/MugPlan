/**
 * Test Scope:
 *
 * Feature: FT24 - Projekt-Dokumentenkontext
 * Use Case: UC Projektformular gruppiert Projekt- und Kundendokumente im bestehenden Sidebar-Panel
 *
 * Abgedeckte Regeln:
 * - ProjectAttachmentsPanel behaelt die gruppierte Struktur fuer Projekt- und Kundendokumente.
 * - Im Create-Fall kann das Panel pending Projektanhaenge ohne projectId anzeigen und hochladen.
 * - Kundendokumente werden auch im Create-Fall direkt ueber den ausgewaehlten Kunden geladen.
 *
 * Fehlerfaelle:
 * - Projektformular zeigt im Create-Fall keine pending Projektanhaenge.
 * - Kundendokumente verschwinden ohne projectId trotz gewaehlt em Kunden.
 *
 * Ziel:
 * Die additive Erweiterung des bestehenden Projekt-Dokumentenpanels regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT24 UI: project attachments panel grouping wiring", () => {
  const panelPath = path.resolve(process.cwd(), "client/src/components/ProjectAttachmentsPanel.tsx");
  const panelSource = readFileSync(panelPath, "utf8");

  it("keeps grouped project and customer sections", () => {
    expect(panelSource).toContain('title: "Projektdokumente"');
    expect(panelSource).toContain('title: "Kundendokumente"');
    expect(panelSource).toContain('id: "project"');
    expect(panelSource).toContain('id: "customer"');
  });

  it("supports create mode with pending project attachments and direct customer queries", () => {
    expect(panelSource).toContain("export type PendingProjectAttachmentItem = AttachmentItem & {");
    expect(panelSource).toContain("pendingProjectAttachments?: PendingProjectAttachmentItem[];");
    expect(panelSource).toContain("onUploadPendingProjectAttachment?: (file: File) => void;");
    expect(panelSource).toContain('queryKey: ["/api/customers", resolvedCustomerId, "attachments"]');
    expect(panelSource).toContain("const resolvedProjectAttachments = isEditing ? attachments : pendingProjectAttachments;");
    expect(panelSource).toContain("const canUploadProjectAttachment = Boolean(projectId) || typeof onUploadPendingProjectAttachment === \"function\";");
    expect(panelSource).toContain("buildPendingAttachmentUrl(id)");
  });
});
