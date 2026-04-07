/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Week-Header zeigt weiterhin KW und Datumsbereich.
 * - Der Touren-Toggle erscheint rechts in derselben Titelzeile wie KW und Datumsbereich.
 *
 * Fehlerfälle:
 * - Die Titelzeile verliert KW oder Datumsinformation.
 * - Der Touren-Toggle bleibt im Footer oder fehlt im Header.
 *
 * Ziel:
 * Die Header-Zeile der Wochenansicht mit inline Touren-Toggle absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useSettingMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey?: unknown }) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ setSetting: vi.fn() }),
  useSetting: (key: string) => useSettingMock(key),
}));

vi.mock("@/lib/monitoring", () => ({
  refreshMonitoringWithNotification: vi.fn(),
}));

vi.mock("@/lib/preview-width", () => ({
  storeWeeklyPreviewWidth: vi.fn(),
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
    useCalendarAppointmentsMock.mockReset();
    useSettingMock.mockReset();

    useCalendarAppointmentsMock.mockReturnValue({ data: [] });
    useQueryMock.mockReturnValue({ data: [], isLoading: false });
    useSettingMock.mockImplementation((key: string) => {
      switch (key) {
        case "calendarWeekendColumnPercent":
          return 33;
        case "calendarWeekScrollRange":
          return 0;
        case "calendar.weekAppointmentDisplayMode":
          return "standard";
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

  it("keeps the title/date row and adds the lane toggle inline on the right", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-03-30T00:00:00Z")} />,
    );

    expect(html).toContain("KW 14");
    expect(html).toContain("30. März");
    expect(html).toContain("Touren");
    expect(html).toContain("toggle-week-lanes-expanded");
    expect(html).toContain("toggle-week-lanes-collapsed");
    expect(html).not.toContain("Darstellungsmodus");
    expect(html).not.toContain("select-week-appointment-display-mode");
  });
});
