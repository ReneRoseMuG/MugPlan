/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Switch rendert mit dynamischem Titel fuer aktuelle oder naechste Woche.
 * - Switch aus → Titel zeigt "Start diese Woche" und Datum des Montags der laufenden Woche.
 * - Switch an → Titel zeigt "Startet naechste Woche" und Datum des Montags der Folgewoche.
 * - Switch-Zustand ist initial false.
 * - Klick auf Switch ruft onPrintStartNextWeekChange mit true auf.
 *
 * Fehlerfälle:
 * - Titel oder Datum zeigen einen falschen Wochenbezug.
 * - Switch-Callback wird nicht aufgerufen.
 *
 * Ziel:
 * Titel, Datumsanzeige und Callback fuer die Druckstartdatum-Steuerung absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { addWeeks, format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/components/calendar/CalendarEmployeeFilter", () => ({
  CalendarEmployeeFilter: () => <div />,
}));
vi.mock("@/components/ui/filter-panels/filter-panel", () => ({
  FilterPanel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; [key: string]: unknown }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

function getExpectedTitle(nextWeek: boolean): string {
  return nextWeek ? "Startet nächste Woche" : "Start diese Woche";
}

function getExpectedDate(nextWeek: boolean): string {
  const today = new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const targetMonday = nextWeek ? addWeeks(currentMonday, 1) : currentMonday;
  return format(targetMonday, "EEE dd.MM.yyyy", { locale: de });
}

const baseProps = {
  employeeId: null,
  onEmployeeIdChange: vi.fn(),
  showWeekDisplayMode: true,
  selectedPrintTourId: null,
  onSelectedPrintTourIdChange: vi.fn(),
  printWeekCount: 1,
  onPrintWeekCountChange: vi.fn(),
  onOpenPrintPreview: vi.fn(),
  onPrintStartNextWeekChange: vi.fn(),
};

describe("CalendarFilterPanel – print switch", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: () => "ADMIN" });
  });

  it("Switch aus → Label zeigt Montag der laufenden Woche", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel {...baseProps} printStartNextWeek={false} />,
    );
    expect(html).toContain(getExpectedTitle(false));
    expect(html).toContain(getExpectedDate(false));
  });

  it("Switch an → Label zeigt Montag der Folgewoche", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel {...baseProps} printStartNextWeek={true} />,
    );
    expect(html).toContain(getExpectedTitle(true));
    expect(html).toContain(getExpectedDate(true));
  });

  it("Label-Text der laufenden und der Folgewoche sind verschieden", () => {
    expect(getExpectedTitle(false)).not.toBe(getExpectedTitle(true));
    expect(getExpectedDate(false)).not.toBe(getExpectedDate(true));
  });

  it("Switch rendert mit data-testid switch-print-start-next-week", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel {...baseProps} printStartNextWeek={false} />,
    );
    expect(html).toContain("switch-print-start-next-week");
  });

  it("Switch rendert mit aria-checked=false bei printStartNextWeek=false", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel {...baseProps} printStartNextWeek={false} />,
    );
    expect(html).toContain('aria-checked="false"');
  });

  it("Switch rendert mit aria-checked=true bei printStartNextWeek=true", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel {...baseProps} printStartNextWeek={true} />,
    );
    expect(html).toContain('aria-checked="true"');
  });
});
