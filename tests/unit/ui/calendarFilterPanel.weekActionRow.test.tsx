/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender-Footer rendert als kompaktes 3-Spalten-Grid in einer Zeile.
 * - Mitarbeiter und KW liegen gemeinsam in derselben Zeile.
 * - Der Konfliktbereich sitzt ohne zusaetzliche Footer-Zeile im selben Grid.
 *
 * Fehlerfälle:
 * - Das Week-Layout fällt wieder auf die alte Toolbar-Zeile zurück.
 * - Entfernte Legacy-Drucksteuerungen tauchen versehentlich wieder auf.
 *
 * Ziel:
 * Das sichtbare Raster und die bereinigte einzeilige Footer-Struktur absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

import { CalendarFilterPanel } from "../../../client/src/components/ui/filter-panels/calendar-filter-panel";

describe("CalendarFilterPanel - week footer redesign", () => {
  it("renders the compact week footer grid with KW next to the employee filter", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        weekLanesCollapsed={false}
        onWeekLanesCollapsedChange={() => undefined}
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
    expect(html).toContain("grid-template-columns:180px max-content max-content");
    expect(html).toContain("Mitarbeiter");
    expect(html).toContain("KW");
    expect(html).toContain("Konflikte");
    expect(html).not.toContain("calendar-week-footer-lower-left-placeholder");
    expect(html).not.toContain("calendar-week-footer-tour-placeholder");
    expect(html).not.toContain("calendar-week-footer-conflict-placeholder");
    expect(html).not.toContain("Planung drucken");
    expect(html).not.toContain("button-open-tour-print-preview");
  });

  it("keeps kw and conflict controls without a second footer row", () => {
    const html = renderToStaticMarkup(
      <CalendarFilterPanel
        employeeId={null}
        onEmployeeIdChange={() => undefined}
        showWeekDisplayMode
        weekLanesCollapsed
        onWeekLanesCollapsedChange={() => undefined}
        showKwJump
        kwJumpValue="14"
        onKwJumpChange={() => undefined}
        onKwJumpSubmit={() => undefined}
        conflictAppointmentCount={2}
        conflictHighlightActive
        onConflictHighlightChange={() => undefined}
      />,
    );

    expect(html).toContain("input-calendar-kw-jump");
    expect(html).toContain("button-conflict-highlight");
    expect(html).toContain("badge-conflict-appointment-count");
    expect(html).not.toContain("calendar-week-footer-lower-left-placeholder");
    expect(html).not.toContain("calendar-week-footer-tour-placeholder");
    expect(html).not.toContain("toggle-week-lanes-expanded");
    expect(html).not.toContain("toggle-week-lanes-collapsed");
    expect(html).not.toContain("input-tour-print-week-count");
  });
});
