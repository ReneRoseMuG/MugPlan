import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import type { CalendarMarker } from "../../../client/src/lib/calendar-markers";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useCalendarWeekLaneEmployeePreviewsMock = vi.fn();
const useCalendarBlockedTourWeeksMock = vi.fn();
const useSettingMock = vi.fn();
const setSettingMock = vi.fn();
let calendarMarkersForTest: CalendarMarker[] = [];

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
    useCalendarWeekLaneEmployeePreviews: (options: unknown) => useCalendarWeekLaneEmployeePreviewsMock(options),
    useCalendarBlockedTourWeeks: (options: unknown) => useCalendarBlockedTourWeeksMock(options),
  };
});

vi.mock("@/components/calendar/CalendarWeekAppointmentPanel", () => ({
  DEFAULT_CONTINUATION_HEIGHT_PX: 44,
  MIN_WEEK_CARD_HEIGHT_PX: 180,
  WEEK_CARD_FOOTER_SAFE_SPACE_PX: 40,
  CalendarWeekAppointmentPanel: ({ appointment }: { appointment: { id: number } }) => (
    <div data-testid={`week-panel-${appointment.id}`} />
  ),
}));

vi.mock("@/components/calendar/CalendarWeekSpanningTile", () => ({
  WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX: 40,
  CalendarWeekSpanningTile: ({ appointment }: { appointment: { id: number } }) => (
    <div data-testid={`week-spanning-${appointment.id}`} />
  ),
}));

vi.mock("@/components/calendar/CalendarWeekTourLaneHeaderBar", () => ({
  CalendarWeekTourLaneHeaderBar: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@/components/calendar/CalendarWeekNotesButton", () => ({
  CalendarWeekNotesButton: ({
    children,
  }: {
    children: (slots: {
      iconSlot: React.ReactNode;
      countSlot: React.ReactNode;
      dialog: React.ReactNode;
      openDialog: () => void;
    }) => React.ReactNode;
  }) => (
    <>{children({ iconSlot: null, countSlot: null, dialog: null, openDialog: vi.fn() })}</>
  ),
}));

import { CalendarWeekView } from "../../../client/src/components/calendar/CalendarWeekView";

function createAppointment(overrides: Partial<CalendarAppointment>): CalendarAppointment {
  return {
    id: 91,
    version: 1,
    projectId: 12,
    projectName: "Projekt Raster",
    projectVersion: 1,
    projectOrderNumber: "A-91",
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2026-04-20",
    endDate: null,
    startTime: "08:00",
    tourId: 7,
    tourName: "Tour 7",
    tourColor: "#225588",
    customer: {
      id: 3,
      customerNumber: "C-3",
      fullName: "Kunde Raster",
      postalCode: "12345",
      city: "Berlin",
    },
    customerNotesCount: 0,
    projectNotesCount: 0,
    appointmentNotesCount: 0,
    customerAttachmentsCount: 0,
    projectAttachmentsCount: 0,
    appointmentAttachmentsCount: 0,
    totalAttachmentsCount: 0,
    appointmentTags: [],
    customerTags: [],
    projectTags: [],
    displayMode: "standard",
    employees: [],
    isLocked: false,
    isCancelled: false,
    ...overrides,
  };
}

describe("CalendarWeekView layout grid regression", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useCalendarAppointmentsMock.mockReset();
    useCalendarWeekLaneEmployeePreviewsMock.mockReset();
    useCalendarBlockedTourWeeksMock.mockReset();
    useSettingMock.mockReset();
    setSettingMock.mockReset();

    useCalendarWeekLaneEmployeePreviewsMock.mockReturnValue({ data: [] });
    useCalendarBlockedTourWeeksMock.mockReturnValue({ data: [] });
    calendarMarkersForTest = [];
    useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
      const first = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (first === "/api/tours") {
        return {
          data: [{ id: 7, name: "Tour 7", color: "#225588", version: 1 }],
          isLoading: false,
        };
      }
      if (first === "calendarMarkers") {
        return {
          data: calendarMarkersForTest,
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
          return "collapsed";
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
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      },
      cancelAnimationFrame: () => undefined,
    });
  });

  it("keeps a compact lane minimum height and places spanning tiles inside a width-safe wrapper", () => {
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({ id: 91, startDate: "2026-04-20", endDate: "2026-04-21", startTime: null }),
        createAppointment({ id: 92, startDate: "2026-04-22", endDate: null, startTime: "09:00" }),
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-04-20T00:00:00Z")} />,
    );

    expect(html).toContain("min-height:180px");
    expect(html).toContain("grid-template-rows:minmax(180px, auto)");
    expect(html).toContain('data-testid="week-spanning-91"');
    expect(html).toContain("padding:0.5rem;z-index:10;min-width:0;width:100%;box-sizing:border-box;align-self:start");
    expect(html).not.toContain("margin:0.5rem");
  });

  it("keeps weekend columns narrow when the weekend is empty", () => {
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({ id: 91, startDate: "2026-04-20", endDate: null, startTime: "09:00" }),
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-04-20T00:00:00Z")} />,
    );

    const narrowWeekendTemplateMatches = html.match(/grid-template-columns:1fr 1fr 1fr 1fr 1fr 0\.33fr 0\.33fr/g) ?? [];
    expect(narrowWeekendTemplateMatches.length).toBeGreaterThanOrEqual(4);
  });

  it("widens weekend columns to weekday width across header and lane grids when a weekend appointment exists", () => {
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({ id: 91, startDate: "2026-04-20", endDate: null, startTime: "09:00" }),
        createAppointment({ id: 92, startDate: "2026-04-25", endDate: "2026-04-26", startTime: null }),
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-04-20T00:00:00Z")} />,
    );

    const widenedWeekendTemplateMatches = html.match(/grid-template-columns:1fr 1fr 1fr 1fr 1fr 1fr 1fr/g) ?? [];
    expect(widenedWeekendTemplateMatches.length).toBeGreaterThanOrEqual(4);
    expect(html).not.toContain("grid-template-columns:1fr 1fr 1fr 1fr 1fr 0.33fr 0.33fr");
  });

  it("renders one shared week body marker column instead of lane-specific holiday dividers", () => {
    calendarMarkersForTest = [{
      id: "marker-2026-04-21",
      date: "2026-04-21",
      endDate: null,
      name: "Feiertag Test",
      type: "public_holiday",
      source: "automatic",
      scope: "national",
      states: [],
      active: true,
      note: null,
      version: 1,
    }];
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({ id: 91, startDate: "2026-04-20", endDate: null, startTime: "09:00" }),
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-04-20T00:00:00Z")} />,
    );

    expect(html).toContain('data-testid="week-body-marker-column-2026-04-21"');
    expect(html).toContain('data-testid="calendar-marker-header-2026-04-21"');
    expect(html).not.toContain("week-tour-lane-day-divider-");
  });
});
