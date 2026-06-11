/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - KW-Spruenge akzeptieren nur gueltige ganzzahlige ISO-Kalenderwochen.
 * - Das Zieljahr ist ein expliziter Eingabewert und wird nicht aus einem Referenzdatum abgeleitet.
 * - Kurzjahre blockieren KW 53, Langjahre erlauben sie.
 * - Das Zieldatum ist immer der Montag der Ziel-KW.
 *
 * Fehlerfaelle:
 * - Ungueltige KW- oder Jahreswerte liefern null statt eines Sprungs.
 * - KW 53 in einem 52-Wochen-Jahr liefert null.
 *
 * Ziel:
 * Die reine KW-Sprungberechnung ueber explizites ISO-Jahr + ISO-Woche isoliert und
 * deterministisch absichern.
 */
import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { resolveKwJumpTarget } from "../../../client/src/lib/kwJump";

describe("resolveKwJumpTarget", () => {
  it("returns null for invalid kw or year values", () => {
    expect(resolveKwJumpTarget(2026, 0)).toBeNull();
    expect(resolveKwJumpTarget(2026, 54)).toBeNull();
    expect(resolveKwJumpTarget(2026, Number.NaN)).toBeNull();
    expect(resolveKwJumpTarget(2026, 1.5)).toBeNull();
    expect(resolveKwJumpTarget(Number.NaN, 1)).toBeNull();
    expect(resolveKwJumpTarget(2026.5, 1)).toBeNull();
  });

  it("rejects kw 53 in a short iso year and allows kw 52", () => {
    expect(resolveKwJumpTarget(2024, 53)).toBeNull();
    expect(format(resolveKwJumpTarget(2024, 52)!, "yyyy-MM-dd")).toBe("2024-12-23");
  });

  it("allows kw 53 in a long iso year", () => {
    const result = resolveKwJumpTarget(2026, 53);

    expect(format(result!, "yyyy-MM-dd")).toBe("2026-12-28");
    expect(result?.getDay()).toBe(1);
  });

  it("returns the correct monday using the explicit iso year across boundaries", () => {
    expect(format(resolveKwJumpTarget(2026, 1)!, "yyyy-MM-dd")).toBe("2025-12-29");
    expect(format(resolveKwJumpTarget(2026, 22)!, "yyyy-MM-dd")).toBe("2026-05-25");
    expect(format(resolveKwJumpTarget(2025, 1)!, "yyyy-MM-dd")).toBe("2024-12-30");
  });
});
