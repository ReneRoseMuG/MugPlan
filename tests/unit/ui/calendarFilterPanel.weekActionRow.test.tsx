/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mitarbeiterfilter und KW-Eingabe liegen links in derselben Toolbar-Zeile.
 * - Konflikt- und Druck-Panel bleiben gemeinsam rechts in derselben Zeile.
 * - Die rechten Panel-Container strecken sich auf dieselbe Höhe.
 * - Konflikt- und Druck-Panel teilen dieselbe feste Mindesthöhe.
 *
 * Fehlerfälle:
 * - Das KW-Feld bleibt als eigenes rechtes Panel stehen.
 * - Das Druck-Panel rutscht wieder unter die linke Filtergruppe oder steht links vom Konflikt-Panel.
 * - Die rechten Panel-Container erscheinen wieder sichtbar unterschiedlich hoch.
 * - Das rote Panel bleibt trotz Stretch sichtbar niedriger als das beige Panel.
 *
 * Ziel:
 * Die sichtbare Zeilenstruktur der Wochen-Toolbar mit linker Filtergruppe und rechter Aktionsgruppe absichern.
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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (value: boolean) => void } & Record<string, unknown>) => (
    <button type="button" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} {...props} />
  ),
}));

import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

describe("CalendarFilterPanel - week action row", () => {
  it("renders employee filter and kw input together on the left while conflict and print panels stay on the right", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
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

    expect(html).toContain("calendar-week-toolbar-row");
    expect(html).toContain("calendar-panel-employee-filter");
    expect(html).toContain("calendar-panel-kw-inline");
    expect(html).toContain("calendar-week-action-row");
    expect(html).toContain("calendar-panel-print");
    expect(html).toContain("calendar-panel-conflicts");
    expect(html).not.toContain('data-testid="calendar-panel-kw"');
    expect(html.indexOf("calendar-panel-employee-filter")).toBeLessThan(html.indexOf("calendar-week-action-row"));
    expect(html.indexOf("calendar-panel-kw-inline")).toBeLessThan(html.indexOf("calendar-week-action-row"));
    expect(html.indexOf("calendar-panel-conflicts")).toBeLessThan(html.indexOf("calendar-panel-print"));
  });

  it("renders the kw control as a simple labeled input next to the employee filter", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
        printStartNextWeek={false}
        onPrintStartNextWeekChange={() => undefined}
        showKwJump
        kwJumpValue="14"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
      />,
    );

    expect(html).toContain("KW:");
    expect(html).toContain("input-calendar-kw-jump");
    expect(html).toContain("calendar-panel-kw-inline");
    expect(html).not.toContain("Kalenderwoche");
  });

  it("stretches the right-side panel containers to a visually aligned height", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
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

    expect(html).toContain("items-stretch");
    expect(html.match(/flex h-full min-h-\[116px\] flex-col rounded-xl/g)?.length).toBe(2);
    expect(html).toContain("flex h-full flex-1 flex-col justify-between");
  });

  it("renders the conflict badge beside the label and the switch beneath it", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        selectedPrintTourId={1}
        onSelectedPrintTourIdChange={() => undefined}
        printWeekCount={1}
        onPrintWeekCountChange={() => undefined}
        onOpenPrintPreview={() => undefined}
        printStartNextWeek={false}
        onPrintStartNextWeekChange={() => undefined}
        conflictAppointmentCount={3}
        conflictHighlightActive={false}
        onConflictHighlightChange={() => undefined}
      />,
    );

    expect(html).toContain("justify-between");
    expect(html).toContain("badge-conflict-appointment-count");
    expect(html).toContain('data-testid="switch-conflict-highlight"');
    expect(html).toContain("mt-3");
    expect(html.indexOf("badge-conflict-appointment-count")).toBeLessThan(html.indexOf('data-testid="switch-conflict-highlight"'));
  });
});
