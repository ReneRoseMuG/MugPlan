/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender-Footer rendert als zweizeiliges 5-Spalten-Grid.
 * - Mitarbeiter, Füllmodus, Kalenderwoche, Touren und Druckbereich liegen in den vorgesehenen Zellen.
 * - Unter dem Konfliktbereich bleibt in Zeile 2 eine sichtbare Platzhalterzelle erhalten.
 *
 * Fehlerfaelle:
 * - Das Week-Layout faellt wieder auf die alte Toolbar-Zeile zurueck.
 * - Druck- oder Konfliktbereich verlieren ihre feste Grid-Position.
 *
 * Ziel:
 * Das sichtbare Raster und die Hauptbereiche des neuen Wochenkalender-Footers absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/components/calendar/CalendarEmployeeFilter", () => ({
  CalendarEmployeeFilter: () => <div data-testid="calendar-employee-filter">employee-filter</div>,
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

describe("CalendarFilterPanel - week footer redesign", () => {
  it("renders the week footer as a fixed two-row grid with print panel and conflict placeholder", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        weekAppointmentDisplayMode="detail"
        onWeekAppointmentDisplayModeChange={() => undefined}
        weekLanesCollapsed={false}
        onWeekLanesCollapsedChange={() => undefined}
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={2}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
        printStartNextWeek={false}
        onPrintStartNextWeekChange={() => undefined}
        showKwJump
        kwJumpValue="14"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
        conflictAppointmentCount={3}
        conflictHighlightActive={false}
        onConflictHighlightChange={() => undefined}
      />,
    );

    expect(html).toContain("calendar-week-footer-grid");
    expect(html).toContain("grid-template-columns:auto auto auto 32px auto");
    expect(html).toContain("Mitarbeiter");
    expect(html).toContain("Füllmodus");
    expect(html).toContain("Kalenderwoche");
    expect(html).toContain("Touren");
    expect(html).toContain("Wochenplanung drucken");
    expect(html).toContain("calendar-panel-print");
    expect(html).toContain("calendar-week-footer-conflict-placeholder");
  });

  it("renders the redesigned controls instead of the old toolbar structure", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        weekAppointmentDisplayMode="standard"
        onWeekAppointmentDisplayModeChange={() => undefined}
        weekLanesCollapsed
        onWeekLanesCollapsedChange={() => undefined}
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
        printStartNextWeek
        onPrintStartNextWeekChange={() => undefined}
        showKwJump
        kwJumpValue="14"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
      />,
    );

    expect(html).toContain("select-week-display-mode");
    expect(html).toContain("toggle-week-lanes-expanded");
    expect(html).toContain("toggle-week-lanes-collapsed");
    expect(html).toContain("toggle-print-start-current-week");
    expect(html).toContain("toggle-print-start-next-week");
    expect(html).toContain("input-calendar-kw-jump");
    expect(html).not.toContain("calendar-week-toolbar-row");
    expect(html).not.toContain("calendar-week-action-row");
  });
});
