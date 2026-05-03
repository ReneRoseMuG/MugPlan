/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Week-Header zeigt weiterhin KW und Datumsbereich.
 * - Der neue Kachel-Toggle erscheint links neben dem Touren-Toggle.
 * - Der Abwesenheiten-Schalter ist entfernt, weil die Spur immer sichtbar ist.
 * - Der Touren-Toggle bleibt weiterhin rechts in derselben Titelzeile.
 *
 * Fehlerfaelle:
 * - Die Titelzeile verliert KW oder Datumsinformation.
 * - Der Kachel-Toggle erscheint an falscher Stelle oder fehlt.
 * - Der entfernte Abwesenheiten-Toggle taucht wieder auf.
 * - Der Touren-Toggle bleibt im Footer oder fehlt im Header.
 *
 * Ziel:
 * Die Header-Zeile der Wochenansicht mit inline Kachel- und Touren-Toggles absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useSettingMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey?: unknown }) => useQueryMock(options),
  useMutation: (options: unknown) => {
    useMutationMock(options);
    return {
      mutateAsync: vi.fn(),
      isPending: false,
    };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ setSetting: setSettingMock }),
  useSetting: (key: string) => useSettingMock(key),
}));

vi.mock("@/lib/monitoring", () => ({
  refreshMonitoringWithNotification: vi.fn(),
}));

vi.mock("@/lib/preview-width", () => ({
  storeWeeklyPreviewWidth: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/lib/calendar-appointments", async () => {
  const actual = await vi.importActual<typeof import("../../../client/src/lib/calendar-appointments")>(
    "../../../client/src/lib/calendar-appointments",
  );
  return {
    ...actual,
    useCalendarAppointments: (options: unknown) => useCalendarAppointmentsMock(options),
  };
});

vi.mock("@/components/calendar/CalendarWeekAppointmentPanel", () => ({
  DEFAULT_CONTINUATION_HEIGHT_PX: 44,
  MIN_WEEK_CARD_HEIGHT_PX: 180,
  WEEK_CARD_FOOTER_SAFE_SPACE_PX: 40,
  CalendarWeekAppointmentPanel: () => <div data-testid="week-panel-marker" />,
}));

vi.mock("@/components/calendar/CalendarWeekSpanningTile", () => ({
  WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX: 40,
  CalendarWeekSpanningTile: () => <div data-testid="week-spanning-tile-marker" />,
}));

vi.mock("@/components/calendar/CalendarWeekTourLaneHeaderBar", () => ({
  CalendarWeekTourLaneHeaderBar: () => <div data-testid="week-lane-header-marker" />,
}));

vi.mock("@/components/calendar/CalendarWeekNotesButton", () => ({
  CalendarWeekNotesButton: ({ children }: { children: (slots: { iconSlot: React.ReactNode; countSlot: React.ReactNode; dialog: React.ReactNode }) => React.ReactNode }) => (
    <>{children({ iconSlot: null, countSlot: null, dialog: null })}</>
  ),
}));

import { CalendarWeekView } from "../../../client/src/components/calendar/CalendarWeekView";

describe("CalendarWeekView - header controls", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useCalendarAppointmentsMock.mockReset();
    useSettingMock.mockReset();
    setSettingMock.mockReset();

    useCalendarAppointmentsMock.mockReturnValue({ data: [] });
    useQueryMock.mockReturnValue({ data: [], isLoading: false });
    useSettingMock.mockImplementation((key: string) => {
      switch (key) {
        case "calendarWeekendColumnPercent":
          return 33;
        case "calendarWeekScrollRange":
          return 0;
        case "calendar.weekTileBodyMode":
          return "semiexpanded";
        case "calendar.weekLanes.isCollapsed":
          return false;
        case "calendar.weekLanes.expandedLaneId":
          return "";
        default:
          return null;
      }
    });

    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
  });

  it("keeps the title row and renders the tile mode toggle left of the lane toggle", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-03-30T00:00:00Z")} />,
    );

    expect(html).toContain("KW 14");
    expect(html).toContain("30. M");
    expect(html).toContain("Kacheln");
    expect(html).toContain("Kompakt");
    expect(html).toContain("Standard");
    expect(html).toContain("Detail");
    expect(html).toContain("toggle-week-tile-body-mode-collapsed");
    expect(html).toContain("toggle-week-tile-body-mode-semiexpanded");
    expect(html).toContain("toggle-week-tile-body-mode-expanded");
    expect(html).not.toContain("toggle-week-absence-row-hidden");
    expect(html).not.toContain("toggle-week-absence-row-visible");
    expect(html).not.toContain("switch-week-absence-row");
    expect(html).toContain("Touren");
    expect(html).toContain("toggle-week-lanes-expanded");
    expect(html).toContain("toggle-week-lanes-collapsed");
    expect(html).not.toContain("Darstellungsmodus");
    expect(html).not.toContain("select-week-appointment-display-mode");
    expect(html.indexOf("toggle-week-tile-body-mode-collapsed")).toBeLessThan(html.indexOf("toggle-week-lanes-expanded"));
  });
});
