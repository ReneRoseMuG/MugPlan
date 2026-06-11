/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - normalizeKwStart akzeptiert nur gültige ISO-KW und verwirft KW 0 sowie Nicht-Ganzzahlen.
 * - normalizeWeekCount klemmt auf 1–53 und verwirft Nicht-Ganzzahlen sowie undefined.
 * - resolveReportRangeFromKw gibt null zurück, wenn kwStart ungültig ist.
 * - resolveReportRangeFromKw gibt null zurück, wenn der KW-Sprung im angegebenen ISO-Jahr
 *   nicht existiert (z. B. KW 53 in einem Kurzjahr).
 * - resolveReportRangeFromKw berechnet fromDate als ISO-Montag der Ziel-KW und
 *   toDate als ISO-Sonntag der letzten eingeschlossenen Woche.
 * - Für weekCount=1 umfasst das Fenster genau eine Woche (Mon–Son).
 * - Für weekCount=2 umfasst das Fenster zwei aufeinanderfolgende Wochen.
 *
 * Fehlerfälle:
 * - kwStart 0 oder 54 wird als ungültig behandelt.
 * - Nicht-ganzzahlige oder undefined-Werte werden auf Defaults normalisiert.
 * - KW 53 in einem Jahr ohne 53 ISO-Wochen liefert null.
 *
 * Ziel:
 * Die clientseitige KW-zu-Datum-Berechnung über explizites ISO-Jahr isoliert und
 * deterministisch absichern.
 */
import { describe, expect, it } from "vitest";
import {
  normalizeKwStart,
  normalizeWeekCount,
  resolveReportRangeFromKw,
} from "../../../client/src/lib/reportRangeFromKw";

describe("normalizeKwStart", () => {
  it("gibt undefined für undefined zurück", () => {
    expect(normalizeKwStart(undefined)).toBeUndefined();
  });

  it("gibt undefined für Nicht-Ganzzahlen zurück", () => {
    expect(normalizeKwStart(1.5)).toBeUndefined();
    expect(normalizeKwStart(Number.NaN)).toBeUndefined();
  });

  it("verwirft Werte unterhalb von 1", () => {
    expect(normalizeKwStart(0)).toBeUndefined();
    expect(normalizeKwStart(-1)).toBeUndefined();
  });

  it("klemmt auf Maximum 53", () => {
    expect(normalizeKwStart(54)).toBe(53);
    expect(normalizeKwStart(100)).toBe(53);
  });

  it("gibt gültige Werte unverändert zurück", () => {
    expect(normalizeKwStart(1)).toBe(1);
    expect(normalizeKwStart(14)).toBe(14);
    expect(normalizeKwStart(53)).toBe(53);
  });
});

describe("normalizeWeekCount", () => {
  it("gibt 1 für undefined zurück", () => {
    expect(normalizeWeekCount(undefined)).toBe(1);
  });

  it("gibt 1 für Nicht-Ganzzahlen zurück", () => {
    expect(normalizeWeekCount(1.5)).toBe(1);
    expect(normalizeWeekCount(Number.NaN)).toBe(1);
  });

  it("klemmt auf Minimum 1", () => {
    expect(normalizeWeekCount(0)).toBe(1);
    expect(normalizeWeekCount(-5)).toBe(1);
  });

  it("klemmt auf Maximum 53", () => {
    expect(normalizeWeekCount(54)).toBe(53);
    expect(normalizeWeekCount(100)).toBe(53);
  });

  it("gibt gültige Werte unverändert zurück", () => {
    expect(normalizeWeekCount(1)).toBe(1);
    expect(normalizeWeekCount(4)).toBe(4);
    expect(normalizeWeekCount(52)).toBe(52);
    expect(normalizeWeekCount(53)).toBe(53);
  });
});

describe("resolveReportRangeFromKw", () => {
  it("gibt null zurück wenn kwStart undefined ist", () => {
    expect(resolveReportRangeFromKw({ kwStart: undefined, weekCount: 1, isoWeekYear: 2026 })).toBeNull();
  });

  it("gibt null zurück wenn kwStart 0 ist", () => {
    expect(resolveReportRangeFromKw({ kwStart: 0, weekCount: 1, isoWeekYear: 2026 })).toBeNull();
  });

  it("gibt null zurück wenn KW 53 im Kurzjahr nicht existiert", () => {
    expect(resolveReportRangeFromKw({ kwStart: 53, weekCount: 1, isoWeekYear: 2024 })).toBeNull();
  });

  it("berechnet KW 14 2026 mit 1 Woche korrekt", () => {
    const result = resolveReportRangeFromKw({ kwStart: 14, weekCount: 1, isoWeekYear: 2026 });
    expect(result).toEqual({ fromDate: "2026-03-30", toDate: "2026-04-05" });
  });

  it("berechnet KW 14 2026 mit 2 Wochen korrekt", () => {
    const result = resolveReportRangeFromKw({ kwStart: 14, weekCount: 2, isoWeekYear: 2026 });
    expect(result).toEqual({ fromDate: "2026-03-30", toDate: "2026-04-12" });
  });

  it("normalisiert weekCount undefined auf 1 und liefert Einwochenfenster", () => {
    const result = resolveReportRangeFromKw({ kwStart: 14, weekCount: undefined, isoWeekYear: 2026 });
    expect(result).toEqual({ fromDate: "2026-03-30", toDate: "2026-04-05" });
  });

  it("erlaubt KW 53 in einem Langjahr", () => {
    const result = resolveReportRangeFromKw({ kwStart: 53, weekCount: 1, isoWeekYear: 2026 });
    expect(result).toEqual({ fromDate: "2026-12-28", toDate: "2027-01-03" });
  });
});
