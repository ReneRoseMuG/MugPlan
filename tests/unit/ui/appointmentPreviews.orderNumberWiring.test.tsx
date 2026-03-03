/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer in Termin-Previews
 *
 * Abgedeckte Regeln:
 * - Weekly-Panel uebergibt die Projekt-Auftragsnummer in den Headerbereich.
 * - Header im Weekly-Panel rendert die Auftragsnummer als mittleren Wert.
 * - Projektbeschreibung im Weekly-Panel wird als HTML gerendert.
 * - Termin-Info-Badge nutzt ausschliesslich die Weekly-Panel-Preview.
 *
 * Fehlerfaelle:
 * - Auftragsnummer wird im Preview-Datenfluss verloren.
 *
 * Ziel:
 * Sicherstellen, dass Auftragsnummern in relevanten Termin-Previews sichtbar bleiben.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT02 appointment preview order number wiring", () => {
  it("passes projectOrderNumber into weekly header panel", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("orderNumber={appointment.projectOrderNumber}");
  });

  it("renders order number as center value in weekly header panel", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("orderNumber: string | null;");
    expect(source).toContain("const resolvedOrderNumber = orderNumber?.trim() || \"-\"");
    expect(source).toContain("{resolvedOrderNumber}");
  });

  it("renders weekly project description as HTML", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("dangerouslySetInnerHTML={{ __html: projectDescription }}");
    expect(source).toContain("[&_ul]:list-disc");
  });

  it("uses weekly-only preview in termin badge with sidebar/table size profile", () => {
    const badgeFile = path.resolve(process.cwd(), "client/src/components/ui/termin-info-badge.tsx");
    const badgeSource = readFileSync(badgeFile, "utf8");

    expect(badgeSource).toContain('createAppointmentWeeklyPanelPreview(previewAppointment, { sizeProfile: "sidebarTable" })');
    expect(badgeSource).not.toContain("createAppointmentInfoBadgePreview");
  });

  it("enables tour name row only in weekly panel previews", () => {
    const previewFile = path.resolve(process.cwd(), "client/src/components/ui/badge-previews/appointment-weekly-panel-preview.tsx");
    const previewSource = readFileSync(previewFile, "utf8");
    const weekViewFile = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx");
    const weekViewSource = readFileSync(weekViewFile, "utf8");

    expect(previewSource).toContain("showPreviewTourNameLine");
    expect(weekViewSource).not.toContain("showPreviewTourNameLine");
  });
});
