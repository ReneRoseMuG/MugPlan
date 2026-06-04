/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die KW-Eingabe im CalendarWorkspace ist in der Wochenansicht mit der sichtbaren ISO-KW vorbelegt.
 * - Aenderungen des sichtbaren Datums aktualisieren die KW-Eingabe.
 *
 * Fehlerfaelle:
 * - Die KW-Anzeige bleibt auf einem alten Wert stehen.
 *
 * Ziel:
 * Die sichtbare KW-Synchronisation zwischen CalendarWorkspace und Filter-Panel fuer die Wochenansicht absichern.
 * KW-Jump ist im Monatskalender nicht vorhanden (bewusst entfernt).
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const filterPanelCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/WeekGrid", () => ({
  WeekGrid: () => <div data-testid="week-grid-marker">week-grid</div>,
}));

vi.mock("@/components/MonthSheetGrid", () => ({
  MonthSheetGrid: () => <div data-testid="month-grid-marker">month-grid</div>,
}));

vi.mock("@/components/ui/filter-panels/calendar-filter-panel", () => ({
  CalendarFilterPanel: (props: Record<string, unknown>) => {
    filterPanelCalls.push(props);
    return <div data-testid="calendar-filter-panel-marker">filter</div>;
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ setSetting: vi.fn() }),
  useSetting: (key: string) => {
    switch (key) {
      case "calendar.weekTileBodyMode":
        return "semiexpanded";
      case "calendar.weekLanes.isCollapsed":
        return false;
      default:
        return null;
    }
  },
}));

import { CalendarWorkspace } from "../../../client/src/components/CalendarWorkspace";

type CalendarWorkspaceProps = React.ComponentProps<typeof CalendarWorkspace>;

function renderCalendarWorkspace(props: CalendarWorkspaceProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <CalendarWorkspace {...props} />
    </QueryClientProvider>,
  );
}

describe("CalendarWorkspace - kw sync wiring", () => {
  beforeEach(() => {
    filterPanelCalls.length = 0;
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
  });

  it("preloads the current iso week into the kw input in week mode", () => {
    renderCalendarWorkspace({
      mode: "global",
      activeView: "week",
      currentDate: new Date("2026-03-30T00:00:00Z"),
      employeeFilterId: null,
      onEmployeeFilterChange: () => undefined,
      onViewChange: () => undefined,
      onDateChange: () => undefined,
      onOpenAppointmentForm: () => undefined,
    });

    expect(filterPanelCalls.at(-1)?.kwJumpValue).toBe("14");
    expect(filterPanelCalls.at(-1)?.showKwJump).toBe(true);
    expect(filterPanelCalls.at(-1)?.weekLanesCollapsed).toBe(false);
  });

  it("updates the kw input when the visible week changes", () => {
    renderCalendarWorkspace({
      mode: "global",
      activeView: "week",
      currentDate: new Date("2026-03-30T00:00:00Z"),
      employeeFilterId: null,
      onEmployeeFilterChange: () => undefined,
      onViewChange: () => undefined,
      onDateChange: () => undefined,
      onOpenAppointmentForm: () => undefined,
    });

    renderCalendarWorkspace({
      mode: "global",
      activeView: "week",
      currentDate: new Date("2026-04-06T00:00:00Z"),
      employeeFilterId: null,
      onEmployeeFilterChange: () => undefined,
      onViewChange: () => undefined,
      onDateChange: () => undefined,
      onOpenAppointmentForm: () => undefined,
    });

    expect(filterPanelCalls.at(-1)?.kwJumpValue).toBe("15");
  });

});
