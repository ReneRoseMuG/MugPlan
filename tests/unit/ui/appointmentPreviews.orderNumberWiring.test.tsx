/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer in Termin-Previews
 *
 * Abgedeckte Regeln:
 * - Weekly-Panel uebergibt die Projekt-Auftragsnummer in den Projektbereich.
 * - Projektbereich im Weekly-Panel zeigt die Auftragsnummer.
 * - Fallback-Preview zeigt die Auftragsnummer.
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
  it("passes projectOrderNumber into weekly project panel", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("projectOrderNumber={appointment.projectOrderNumber}");
  });

  it("renders order number line in weekly project panel", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("Auftragsnr.: {projectOrderNumber}");
  });

  it("wires order number into fallback appointment info preview", () => {
    const previewFile = path.resolve(process.cwd(), "client/src/components/ui/badge-previews/appointment-info-badge-preview.tsx");
    const previewSource = readFileSync(previewFile, "utf8");
    expect(previewSource).toContain("projectOrderNumber?: string | null");
    expect(previewSource).toContain("{projectOrderNumber && <div>Auftragsnr.: {projectOrderNumber}</div>}");

    const badgeFile = path.resolve(process.cwd(), "client/src/components/ui/termin-info-badge.tsx");
    const badgeSource = readFileSync(badgeFile, "utf8");
    expect(badgeSource).toContain("projectOrderNumber: projectOrderNumber ?? null");
  });
});
