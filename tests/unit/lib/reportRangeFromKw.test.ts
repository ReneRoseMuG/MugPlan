/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - normalizeKwStart klemmt auf 1–53 und verwirft Nicht-Ganzzahlen sowie undefined.
 * - normalizeWeekCount klemmt auf 1–52 und verwirft Nicht-Ganzzahlen sowie undefined.
 * - resolveReportRangeFromKw gibt null zurück, wenn kwStart ungültig ist.
 * - resolveReportRangeFromKw gibt null zurück, wenn der KW-Sprung im Referenzjahr nicht
 *   existiert (z. B. KW 53 in einem Kurzjahr).
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
 * Die client-seitige KW-zu-Datum-Berechnung isoliert und deterministisch absichern.
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

  it("klemmt auf Minimum 1", () => {
    expect(normalizeKwStart(0)).toBe(1);
    expect(normalizeKwStart(-1)).toBe(1);
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

  it("klemmt auf Maximum 52", () => {
    expect(normalizeWeekCount(53)).toBe(52);
    expect(normalizeWeekCount(100)).toBe(52);
  });

  it("gibt gültige Werte unverändert zurück", () => {
    expect(normalizeWeekCount(1)).toBe(1);
    expect(normalizeWeekCount(4)).toBe(4);
    expect(normalizeWeekCount(52)).toBe(52);
  });
});

describe("resolveReportRangeFromKw", () => {
  const ref2026 = new Date("2026-01-14T00:00:00Z");

  it("gibt null zurück wenn kwStart undefined ist", () => {
    expect(resolveReportRangeFromKw({ kwStart: undefined, weekCount: 1, referenceDate: ref2026 })).toBeNull();
  });

  it("gibt null zurück wenn kwStart 0 ist", () => {
    expect(resolveReportRangeFromKw({ kwStart: 0, weekCount: 1, referenceDate: ref2026 })).toBeNull();
  });

  it("gibt null zurück wenn KW 53 im Kurzjahr nicht existiert", () => {
    // 2024 hat nur 52 ISO-Wochen
    const ref2024 = new Date("2024-06-12T00:00:00Z");
    expect(resolveReportRangeFromKw({ kwStart: 53, weekCount: 1, referenceDate: ref2024 })).toBeNull();
  });

  it("berechnet KW 14 2026 mit 1 Woche korrekt", () => {
    // KW 14 2026: ISO-Montag 2026-03-30, ISO-Sonntag 2026-04-05
    const result = resolveReportRangeFromKw({ kwStart: 14, weekCount: 1, referenceDate: ref2026 });
    expect(result).toEqual({ fromDate: "2026-03-30", toDate: "2026-04-05" });
  });

  it("berechnet KW 14 2026 mit 2 Wochen korrekt", () => {
    // KW 14 + KW 15: fromDate 2026-03-30, toDate 2026-04-12
    const result = resolveReportRangeFromKw({ kwStart: 14, weekCount: 2, referenceDate: ref2026 });
    expect(result).toEqual({ fromDate: "2026-03-30", toDate: "2026-04-12" });
  });

  it("normalisiert weekCount undefined auf 1 und liefert Einwochenfenster", () => {
    const result = resolveReportRangeFromKw({ kwStart: 14, weekCount: undefined, referenceDate: ref2026 });
    expect(result).toEqual({ fromDate: "2026-03-30", toDate: "2026-04-05" });
  });

  it("erlaubt KW 53 in einem Langjahr (2026 hat 53 ISO-Wochen)", () => {
    const result = resolveReportRangeFromKw({ kwStart: 53, weekCount: 1, referenceDate: ref2026 });
    // KW 53 2026: Montag 2026-12-28, Sonntag 2027-01-03
    expect(result).toEqual({ fromDate: "2026-12-28", toDate: "2027-01-03" });
  });
});
