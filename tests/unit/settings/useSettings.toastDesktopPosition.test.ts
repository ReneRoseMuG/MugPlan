/**
 * Test Scope:
 *
 * Feature: FT03 - Vorschau- und Kalenderverhalten
 * Use Case: UC03 - Toast-Desktop-Position aufloesen
 *
 * Abgedeckte Regeln:
 * - Gueltige Enum-Werte werden unveraendert uebernommen.
 * - Fehlende Werte fallen auf bottom-right zurueck.
 * - Ungueltige Werte fallen auf bottom-right zurueck.
 *
 * Fehlerfaelle:
 * - Nicht-string Werte duerfen keine ungueltige Position erzeugen.
 *
 * Ziel:
 * Sichere Fallback-Logik fuer toastDesktopPosition im Frontend garantieren.
 */
import { describe, expect, it } from "vitest";
import { resolveToastDesktopPosition } from "../../../client/src/hooks/useSettings";

describe("FT03 useSettings toastDesktopPosition", () => {
  it("returns valid enum values unchanged", () => {
    expect(resolveToastDesktopPosition("top-left")).toBe("top-left");
    expect(resolveToastDesktopPosition("top-right")).toBe("top-right");
    expect(resolveToastDesktopPosition("bottom-left")).toBe("bottom-left");
    expect(resolveToastDesktopPosition("bottom-right")).toBe("bottom-right");
  });

  it("falls back to bottom-right for missing values", () => {
    expect(resolveToastDesktopPosition(undefined)).toBe("bottom-right");
    expect(resolveToastDesktopPosition(null)).toBe("bottom-right");
  });

  it("falls back to bottom-right for invalid values", () => {
    expect(resolveToastDesktopPosition("center")).toBe("bottom-right");
    expect(resolveToastDesktopPosition(42)).toBe("bottom-right");
  });
});
