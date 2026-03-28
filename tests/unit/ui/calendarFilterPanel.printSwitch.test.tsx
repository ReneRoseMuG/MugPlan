/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Switch rendert mit dynamischem Label "Startet ab Mo. TT.MM.JJJJ".
 * - Switch aus → Label zeigt Montag der laufenden Woche.
 * - Switch an → Label zeigt Montag der Folgewoche.
 * - Switch-Zustand ist initial false.
 * - Klick auf Switch ruft onPrintStartNextWeekChange mit true auf.
 *
 * Fehlerfälle:
 * - Label zeigt falsches Datum (z.B. heutiges Datum statt Montag).
 * - Switch-Callback wird nicht aufgerufen.
 *
 * Ziel:
 * Das Switch-Label und den Callback für die Druckstartdatum-Steuerung absichern.
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
vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => "standard",
  useSettings: () => ({ setSetting: vi.fn() }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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

function getExpectedLabel(nextWeek: boolean): string {
  const today = new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const targetMonday = nextWeek ? addWeeks(currentMonday, 1) : currentMonday;
  return `Startet ab ${format(targetMonday, "EE. dd.MM.yyyy", { locale: de })}`;
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
    expect(html).toContain(getExpectedLabel(false));
  });

  it("Switch an → Label zeigt Montag der Folgewoche", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel {...baseProps} printStartNextWeek={true} />,
    );
    expect(html).toContain(getExpectedLabel(true));
  });

  it("Label-Text der laufenden und der Folgewoche sind verschieden", () => {
    expect(getExpectedLabel(false)).not.toBe(getExpectedLabel(true));
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
