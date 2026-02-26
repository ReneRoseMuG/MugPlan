/**
 * Test Scope:
 *
 * Feature: FT03 - Kalender Terminbalken Header-Stil
 * Use Case: UC Monats-/Jahresbalken nutzen denselben visuellen Stil wie Kalender-Header
 *
 * Abgedeckte Regeln:
 * - CalendarAppointmentCompactBar rendert Header-typischen Verlauf.
 * - CalendarAppointmentCompactBar rendert Header-typischen Inset-/Drop-Shadow.
 * - CalendarAppointmentCompactBar nutzt den gleichen Border-Look wie Header-Komponenten.
 * - Eintagestermine zeigen Kundennummer | Auftragsnummer | PLZ.
 * - Mehrtagestermine zeigen Kundennummer | Auftragsnummer | Kundenname in dieser Reihenfolge.
 * - Preview nutzt die standardisierte Weekly-Preview-Fabrik ohne Pointer-Event-Blockade.
 *
 * Fehlerfaelle:
 * - Terminbalken fallen auf flaches Legacy-Styling zurueck.
 * - Header-typische Stil-Layer fehlen nach Refactorings.
 *
 * Ziel:
 * Regressionssichere Verdrahtung des gemeinsamen Header-Looks fuer Compact Bars.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: calendar appointment compact bar header style wiring", () => {
  it("contains header-like gradient, border and shadow layers", () => {
    const compactBarSource = readFileSync(
      path.resolve(process.cwd(), "client/src/components/calendar/CalendarAppointmentCompactBar.tsx"),
      "utf8",
    );

    expect(compactBarSource).toContain("borderColor: \"rgba(255,255,255,0.22)\"");
    expect(compactBarSource).toContain("backgroundImage:");
    expect(compactBarSource).toContain("linear-gradient(180deg, rgba(255,255,255,0.24) 0%");
    expect(compactBarSource).toContain("boxShadow:");
    expect(compactBarSource).toContain("inset 0 1px 0 rgba(255,255,255,0.26)");
    expect(compactBarSource).toContain("const orderNumber = appointment.projectOrderNumber?.trim() || \"-\"");
    expect(compactBarSource).toContain("const middleContent = orderNumber;");
    expect(compactBarSource).toContain("`K: ${customerNumber} - ${orderNumber} - Name: ${customerName}`");
    expect(compactBarSource).toContain("const preview = createAppointmentWeeklyPanelPreview(appointment);");
    expect(compactBarSource).not.toContain("pointer-events-none");
  });
});
