/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Gueltige Enum-Werte fuer calendar.weekTileBodyMode werden unveraendert uebernommen.
 * - Fehlende Werte fallen auf semiexpanded zurueck.
 * - Ungueltige Werte fallen auf semiexpanded zurueck.
 *
 * Fehlerfaelle:
 * - Nicht-string Werte duerfen keinen ungueltigen Body-Modus erzeugen.
 *
 * Ziel:
 * Sichere Fallback-Logik fuer calendar.weekTileBodyMode im Frontend garantieren.
 */
import { describe, expect, it } from "vitest";
import { resolveWeekTileBodyMode } from "../../../client/src/hooks/useSettings";

describe("FT03 useSettings weekTileBodyMode", () => {
  it("returns valid enum values unchanged", () => {
    expect(resolveWeekTileBodyMode("collapsed")).toBe("collapsed");
    expect(resolveWeekTileBodyMode("semiexpanded")).toBe("semiexpanded");
    expect(resolveWeekTileBodyMode("expanded")).toBe("expanded");
  });

  it("falls back to semiexpanded for missing values", () => {
    expect(resolveWeekTileBodyMode(undefined)).toBe("semiexpanded");
    expect(resolveWeekTileBodyMode(null)).toBe("semiexpanded");
  });

  it("falls back to semiexpanded for invalid values", () => {
    expect(resolveWeekTileBodyMode("detail")).toBe("semiexpanded");
    expect(resolveWeekTileBodyMode(42)).toBe("semiexpanded");
  });
});
