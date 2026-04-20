/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Jede echte Tour-Tageszelle der Wochenansicht erhält auch ohne Termine und ohne Wochenplanung einen Hover-Preview.
 * - Der bestehende Leerzustand der Tagesvorschau wird in diesem Fall angezeigt.
 *
 * Fehlerfälle:
 * - Leere Tour-Tage liefern keinen Preview und reagieren im Header-Hover nicht.
 * - Der Kalender zeigt bei fehlenden Daten keinen verständlichen Leerzustand.
 *
 * Ziel:
 * Den Fallback-Preview für leere Tour-Tage in der Wochenansicht absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useCalendarWeekLaneEmployeePreviewsMock = vi.fn();
const useSettingMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: { queryKey?: unknown }) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

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

vi.mock("@/lib/calendar-appointments", async () => {
  const actual = await vi.importActual<typeof import("../../../client/src/lib/calendar-appointments")>(
    "../../../client/src/lib/calendar-appointments",
  );
  return {
    ...actual,
    useCalendarAppointments: (options: unknown) => useCalendarAppointmentsMock(options),
    useCalendarWeekLaneEmployeePreviews: (options: unknown) => useCalendarWeekLaneEmployeePreviewsMock(options),
  };
});

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
  }: {
    children?: React.ReactNode;
    preview?: React.ReactNode;
  }) => (
    <div>
      {children}
      {preview}
    </div>
  ),
}));

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

describe("CalendarWeekView - lane hover fallback", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useCalendarAppointmentsMock.mockReset();
    useCalendarWeekLaneEmployeePreviewsMock.mockReset();
    useSettingMock.mockReset();
    setSettingMock.mockReset();

    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    });
    useCalendarAppointmentsMock.mockReturnValue({ data: [] });
    useCalendarWeekLaneEmployeePreviewsMock.mockReturnValue({ data: [] });
    useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
      if (Array.isArray(options.queryKey) && options.queryKey[0] === "/api/tours") {
        return {
          data: [{ id: 7, name: "Tour Leer", color: "#123456" }],
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });
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

  it("renders the empty lane day preview for a tour without appointments and without week assignments", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-03-30T00:00:00Z")} />,
    );

    expect(html).toContain("week-tour-lane-day-hover-trigger-tour-7-2026-03-30");
    expect(html).toContain("Aus Wochenplanung");
    expect(html).toContain("Keine Mitarbeiter aus Wochenplanung.");
    expect(html).toContain("Zusätzliche Tageszuweisungen");
    expect(html).toContain("Keine zusätzlichen Tageszuweisungen.");
  });
});
