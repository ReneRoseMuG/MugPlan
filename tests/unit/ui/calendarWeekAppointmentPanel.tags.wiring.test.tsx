/**
 * Test Scope:
 *
 * Feature: FT28 - Tagging System
 *
 * Abgedeckte Regeln:
 * - Weekly-Appointment-Panels sammeln Termin-, Kunden- und Projekttags gemeinsam.
 * - Die Sammlung wird vor dem Rendern ueber die gemeinsame Tag-Utility dedupliziert.
 * - Die deduplizierte Liste wird ueber die gemeinsame Footer-Tag-Zeile gerendert.
 *
 * Fehlerfaelle:
 * - Eine Tag-Quelle fehlt in Karten oder Hover-Previews.
 * - Doppelte Tags aus mehreren Quellen erscheinen mehrfach im Footer.
 *
 * Ziel:
 * Die Verdrahtung der neuen Tag-Zeile in Wochenkarten und Weekly-Previews absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT28 weekly appointment panel tag wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx"),
    "utf8",
  );
  const spanningTileSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekSpanningTile.tsx"),
    "utf8",
  );

  it("merges all three tag sources through the shared dedupe helper", () => {
    expect(source).toContain("mergeUniqueTags(");
    expect(source).toContain("appointment.appointmentTags");
    expect(source).toContain("appointment.customerTags");
    expect(source).toContain("appointment.projectTags");
  });

  it("renders the shared footer tag row", () => {
    expect(source).toContain("<EntityTagFooterRow");
    expect(source).toContain("tags={mergedTags}");
    expect(source).not.toContain("Storniert");
    expect(spanningTileSource).toContain("<EntityTagFooterRow");
    expect(spanningTileSource).toContain("tags={mergedTags}");
    expect(spanningTileSource).not.toContain("Storniert");
  });
});
