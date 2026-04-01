/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - KW-Spruenge akzeptieren nur gueltige ganzzahlige ISO-Kalenderwochen des Referenzjahres.
 * - Kurzjahre blockieren KW 53, Langjahre erlauben sie.
 * - Das Zieldatum ist immer der Montag der Ziel-KW.
 *
 * Fehlerfaelle:
 * - Ungueltige Basiswerte fuehren zu einem Sprung.
 * - Jahresgrenzen liefern einen falschen ISO-Montag.
 *
 * Ziel:
 * Die reine KW-Sprungberechnung isoliert und deterministisch absichern.
 */
import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { resolveKwJumpTarget } from "../../../client/src/lib/kwJump";

describe("resolveKwJumpTarget", () => {
  it("returns null for invalid base values", () => {
    expect(resolveKwJumpTarget(0, new Date("2026-01-14T00:00:00Z"))).toBeNull();
    expect(resolveKwJumpTarget(54, new Date("2026-01-14T00:00:00Z"))).toBeNull();
    expect(resolveKwJumpTarget(Number.NaN, new Date("2026-01-14T00:00:00Z"))).toBeNull();
    expect(resolveKwJumpTarget(1.5, new Date("2026-01-14T00:00:00Z"))).toBeNull();
  });

  it("rejects kw 53 in a short iso year and allows kw 52", () => {
    expect(resolveKwJumpTarget(53, new Date("2024-06-12T00:00:00Z"))).toBeNull();
    expect(format(resolveKwJumpTarget(52, new Date("2024-06-12T00:00:00Z"))!, "yyyy-MM-dd")).toBe("2024-12-23");
  });

  it("allows kw 53 in a long iso year", () => {
    const result = resolveKwJumpTarget(53, new Date("2026-07-15T00:00:00Z"));

    expect(format(result!, "yyyy-MM-dd")).toBe("2026-12-28");
    expect(result?.getDay()).toBe(1);
  });

  it("returns the correct monday across iso year boundaries", () => {
    expect(format(resolveKwJumpTarget(1, new Date("2026-01-14T00:00:00Z"))!, "yyyy-MM-dd")).toBe("2025-12-29");
    expect(format(resolveKwJumpTarget(22, new Date("2026-05-27T00:00:00Z"))!, "yyyy-MM-dd")).toBe("2026-05-25");
    expect(format(resolveKwJumpTarget(22, new Date("2026-05-28T00:00:00Z"))!, "yyyy-MM-dd")).toBe("2026-05-25");
  });
});
