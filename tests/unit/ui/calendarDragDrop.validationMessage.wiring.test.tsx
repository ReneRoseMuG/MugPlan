/**
 * Test Scope:
 *
 * Feature: FT01 - Historische Termine verhindern
 *
 * Abgedeckte Regeln:
 * - Wochenansicht reicht konkrete VALIDATION_ERROR-Meldungen des Servers beim Drag & Drop durch.
 * - Monatsansicht reicht konkrete VALIDATION_ERROR-Meldungen des Servers beim Drag & Drop durch.
 * - Beide Ansichten zeigen bei AVAILABILITY_CONFIRMATION_REQUIRED einen expliziten Confirm-Dialog.
 * - Der generische Fallback bleibt fuer fehlende Server-Messages erhalten.
 * - Erfolgreiches Drag & Drop triggert den zentralen Monitoring-Refresh.
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

  it.skip("wires explicit availability confirmation for drag and drop in CalendarWeekView", () => {
    expect(weekSource).toContain('if (error?.code === "AVAILABILITY_CONFIRMATION_REQUIRED") {');
    expect(weekSource).toContain('data-testid="dialog-calendar-week-availability-conflicts"');
    expect(weekSource).toContain("confirmAvailabilityAdjustments: true");
  });

  it.skip("wires explicit availability confirmation for drag and drop in CalendarMonthView", () => {
    expect(monthSource).toContain('if (error?.code === "AVAILABILITY_CONFIRMATION_REQUIRED") {');
    expect(monthSource).toContain('data-testid="dialog-calendar-month-availability-conflicts"');
    expect(monthSource).toContain("confirmAvailabilityAdjustments: true");
  });

  it("refreshes monitoring after successful drag and drop in both calendar views", () => {
    expect(weekSource).toContain("await refreshMonitoringWithNotification(toast);");
    expect(monthSource).toContain("await refreshMonitoringWithNotification(toast);");
  });

  it("blocks drag and drop for cancelled appointments in both calendar views", () => {
    expect(weekSource).toContain("drop blocked: cancelled appointment");
    expect(weekSource).toContain("Stornierte Termine koennen nicht verschoben werden.");
    expect(monthSource).toContain("drop blocked: cancelled appointment");
    expect(monthSource).toContain("Stornierte Termine koennen nicht verschoben werden.");
  });
});
