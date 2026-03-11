/**
 * Test Scope:
 *
 * Feature: FT01 - Historische Termine verhindern
 *
 * Abgedeckte Regeln:
 * - Wochenansicht reicht konkrete VALIDATION_ERROR-Meldungen des Servers beim Drag & Drop durch.
 * - Monatsansicht reicht konkrete VALIDATION_ERROR-Meldungen des Servers beim Drag & Drop durch.
 * - Der generische Fallback bleibt fuer fehlende Server-Messages erhalten.
 *
 * Fehlerfaelle:
 * - Drag-&-Drop-Fehler werden pauschal mit "Bitte neu laden" verdeckt.
 * - Konkrete Validierungsgruende wie historische Startzeit gehen in Woche oder Monat verloren.
 *
 * Ziel:
 * Die UI-Verdrahtung fuer aussagekraeftige Drag-&-Drop-Validierungsfehler regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 UI: calendar drag drop validation message wiring", () => {
  const weekSource = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");
  const monthSource = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarMonthView.tsx"), "utf8");
  const expectedWiring = 'throw new Error(error?.message ?? "Termin kann nicht verschoben werden. Bitte neu laden.");';

  it("keeps the concrete server validation message in CalendarWeekView", () => {
    expect(weekSource).toContain('if (error?.code === "VALIDATION_ERROR") {');
    expect(weekSource).toContain(expectedWiring);
  });

  it("keeps the concrete server validation message in CalendarMonthView", () => {
    expect(monthSource).toContain('if (error?.code === "VALIDATION_ERROR") {');
    expect(monthSource).toContain(expectedWiring);
  });
});
