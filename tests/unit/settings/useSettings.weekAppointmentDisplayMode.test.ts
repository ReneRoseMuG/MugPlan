/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Darstellungsmodus
 * Use Case: UC FT03 - Frontend-Fallback fuer globalen Wochenmodus
 *
 * Abgedeckte Regeln:
 * - Gueltige Enum-Werte werden unveraendert uebernommen.
 * - Fehlende Werte fallen auf standard zurueck.
 * - Ungueltige Werte fallen auf standard zurueck.
 *
 * Fehlerfaelle:
 * - Nicht-string Werte duerfen keinen ungueltigen Wochenmodus erzeugen.
 *
 * Ziel:
 * Sichere Fallback-Logik fuer calendar.weekAppointmentDisplayMode im Frontend garantieren.
 */
import { describe, expect, it } from "vitest";
import { resolveWeekAppointmentDisplayMode } from "../../../client/src/hooks/useSettings";

describe("FT03 useSettings weekAppointmentDisplayMode", () => {
  it("returns valid enum values unchanged", () => {
    expect(resolveWeekAppointmentDisplayMode("standard")).toBe("standard");
    expect(resolveWeekAppointmentDisplayMode("compact")).toBe("compact");
    expect(resolveWeekAppointmentDisplayMode("detail")).toBe("detail");
  });

  it("falls back to standard for missing values", () => {
    expect(resolveWeekAppointmentDisplayMode(undefined)).toBe("standard");
    expect(resolveWeekAppointmentDisplayMode(null)).toBe("standard");
  });

  it("falls back to standard for invalid values", () => {
    expect(resolveWeekAppointmentDisplayMode("dense")).toBe("standard");
    expect(resolveWeekAppointmentDisplayMode(42)).toBe("standard");
  });
});
