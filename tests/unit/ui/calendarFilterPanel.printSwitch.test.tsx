/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Druckstart rendert als segmentierte Auswahl fuer aktuelle oder naechste Woche.
 * - Beide Optionen zeigen den Montag der jeweiligen Woche.
 * - Die neue Darstellung behaelt die bestehenden Toggle-Test-IDs.
 *
 * Fehlerfaelle:
 * - Der Druckstart faellt auf den alten Switch mit Titeltext zurueck.
 * - Die Datumsangaben verlieren den Wochenbezug.
 *
 * Ziel:
 * Die sichtbare Segmentdarstellung fuer den Druckstart im neuen Footer absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { addWeeks, format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/components/calendar/CalendarEmployeeFilter", () => ({
  CalendarEmployeeFilter: () => <div />,
}));

vi.mock("@/components/ui/filter-panels/filter-panel", () => ({
  FilterPanel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

function mondayLabel(nextWeek: boolean): string {
  const today = new Date();
  const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
  const targetMonday = nextWeek ? addWeeks(currentMonday, 1) : currentMonday;
  return `Mo. ${format(targetMonday, "dd.MM.", { locale: de })}`;
}

const baseProps = {
  employeeId: null,
  onEmployeeIdChange: vi.fn(),
  showWeekDisplayMode: true,
  weekAppointmentDisplayMode: "standard" as const,
  onWeekAppointmentDisplayModeChange: vi.fn(),
  weekLanesCollapsed: false,
  onWeekLanesCollapsedChange: vi.fn(),
  selectedPrintTourId: null,
  onSelectedPrintTourIdChange: vi.fn(),
  printWeekCount: 1,
  onPrintWeekCountChange: vi.fn(),
  onOpenPrintPreview: vi.fn(),
  onPrintStartNextWeekChange: vi.fn(),
};

describe("CalendarFilterPanel - print start selector", () => {
  it("renders both start-week options with monday labels", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel {...baseProps} printStartNextWeek={false} />,
    );

    expect(html).toContain("Diese Woche");
    expect(html).toContain("Nächste Woche");
    expect(html).toContain(mondayLabel(false));
    expect(html).toContain(mondayLabel(true));
  });

  it("keeps the current and next-week toggle test ids in the redesigned panel", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel {...baseProps} printStartNextWeek={true} />,
    );

    expect(html).toContain("toggle-print-start-current-week");
    expect(html).toContain("toggle-print-start-next-week");
    expect(html).not.toContain("switch-print-start-next-week");
  });
});
