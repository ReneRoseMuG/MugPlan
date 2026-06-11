/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - resolveIsoWeekStart liefert den ISO-Montag aus explizitem ISO-Jahr + ISO-Woche.
 * - Die Auflösung ist an Jahreswechseln eindeutig und unabhängig von einem Referenzdatum.
 * - KW 53 existiert nur in Langjahren; in Kurzjahren liefert die Funktion null.
 * - countTouchedIsoWeeks zählt die Anzahl der berührten ISO-Kalenderwochen, nicht Tage/7.
 *
 * Fehlerfälle:
 * - Ungültige Jahres- oder KW-Werte (z. B. KW 0, KW 54, nicht ganzzahlig) liefern null.
 *
 * Ziel:
 * Den kanonischen Client-Resolver für ISO-Wochen (Spiegel von resolveIsoWeekWindow)
 * isoliert und deterministisch absichern.
 */
import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { countTouchedIsoWeeks, resolveIsoWeekStart } from "../../../client/src/lib/isoWeekRange";

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

describe("resolveIsoWeekStart", () => {
  it("liefert den ISO-Montag über Jahresgrenzen", () => {
    expect(format(resolveIsoWeekStart(2026, 1)!, "yyyy-MM-dd")).toBe("2025-12-29");
    expect(format(resolveIsoWeekStart(2025, 1)!, "yyyy-MM-dd")).toBe("2024-12-30");
    expect(format(resolveIsoWeekStart(2026, 22)!, "yyyy-MM-dd")).toBe("2026-05-25");
  });

  it("erlaubt KW 53 nur in Langjahren", () => {
    expect(format(resolveIsoWeekStart(2026, 53)!, "yyyy-MM-dd")).toBe("2026-12-28");
    expect(resolveIsoWeekStart(2024, 53)).toBeNull();
  });

  it("verwirft ungültige KW- oder Jahreswerte", () => {
    expect(resolveIsoWeekStart(2026, 0)).toBeNull();
    expect(resolveIsoWeekStart(2026, 54)).toBeNull();
    expect(resolveIsoWeekStart(2026, 1.5)).toBeNull();
    expect(resolveIsoWeekStart(Number.NaN, 1)).toBeNull();
  });
});

describe("countTouchedIsoWeeks", () => {
  it("zählt eine volle Woche (Mon–Son) als 1", () => {
    expect(countTouchedIsoWeeks(parseDate("2026-03-30"), parseDate("2026-04-05"))).toBe(1);
  });

  it("zählt Mittwoch bis folgenden Dienstag als 2 berührte Wochen", () => {
    expect(countTouchedIsoWeeks(parseDate("2026-04-01"), parseDate("2026-04-07"))).toBe(2);
  });

  it("zählt zwei volle Wochen als 2", () => {
    expect(countTouchedIsoWeeks(parseDate("2026-03-30"), parseDate("2026-04-12"))).toBe(2);
  });

  it("zählt über die Jahresgrenze korrekt", () => {
    expect(countTouchedIsoWeeks(parseDate("2025-12-31"), parseDate("2026-01-06"))).toBe(2);
  });

  it("gibt mindestens 1 zurück", () => {
    expect(countTouchedIsoWeeks(parseDate("2026-04-05"), parseDate("2026-04-05"))).toBe(1);
  });
});
