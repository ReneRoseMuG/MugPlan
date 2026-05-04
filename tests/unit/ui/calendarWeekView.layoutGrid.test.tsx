import React from "react";
import { addDays } from "date-fns";
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
let toursForTest = [{ id: 7, name: "Tour 7", color: "#225588", version: 1 }];

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
      notesCount: number;
      openDialog: () => void;
    }) => React.ReactNode;
  }) => (
    <>{children({ iconSlot: null, countSlot: null, dialog: null, notesCount: 2, openDialog: vi.fn() })}</>
  ),
}));

vi.mock("@/components/TourWeekNotesHoverPreview", () => ({
  TourWeekNotesHoverPreview: ({ count, triggerTestId }: { count: number; triggerTestId?: string }) => (
    <div data-testid={triggerTestId}>notes-{count}</div>
  ),
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({
    testId,
    fullName,
    renderMode,
    showPreview,
    showAvatar,
    fullWidth,
    action,
  }: {
    testId?: string;
    fullName?: string;
    renderMode?: string;
    showPreview?: boolean;
    showAvatar?: boolean;
    fullWidth?: boolean;
    action?: string;
  }) => (
    <span
      data-testid={testId}
      data-render-mode={renderMode}
      data-show-preview={showPreview ? "true" : "false"}
      data-show-avatar={showAvatar === false ? "false" : "true"}
      data-full-width={fullWidth ? "true" : "false"}
      data-action={action ?? "none"}
    >
      {fullName}
    </span>
  ),
}));

import { CalendarWeekAbsenceRow, CalendarWeekView } from "../../../client/src/components/calendar/CalendarWeekView";

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

function createCalendarMarker(overrides: Partial<CalendarMarker>): CalendarMarker {
  return {
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
    toursForTest = [{ id: 7, name: "Tour 7", color: "#225588", version: 1 }];
    useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
      const first = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (first === "/api/tours") {
        return {
          data: toursForTest,
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

  it("keeps compact lane sizing without outer lane gaps while preserving card padding", () => {
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
    expect(html).toContain('class="flex flex-col h-full bg-white overflow-hidden"');
    expect(html).not.toContain("flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden");
    expect(html).toContain("relative z-10 space-y-0");
    expect(html).toContain("max-h-[2200px] opacity-100 mt-0");
    expect(html).toContain("padding:0.5rem;z-index:10;min-width:0;width:100%;box-sizing:border-box;align-self:start");
    expect(html).not.toContain("space-y-3");
    expect(html).not.toContain("opacity-100 mt-1");
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
    expect(html).toContain('data-testid="week-absence-row-2026-04-20"');
    expect(html).toContain('data-testid="week-absence-row-header-2026-04-20"');
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

  it("keeps weekend columns narrow when weekend entries are only absences", () => {
    toursForTest = [
      { id: 7, name: "Tour 7", color: "#225588", version: 1 },
      { id: 8, name: "Abwesenheiten", color: "#64748B", version: 1 },
    ];
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({
          id: 93,
          startDate: "2026-04-20",
          endDate: "2026-04-26",
          startTime: null,
          tourId: 8,
          tourName: "Abwesenheiten",
          tourColor: "#64748B",
          employees: [{ id: 31, firstName: "Mira", lastName: "Urlaub", fullName: "Mira Urlaub" }],
        }),
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-04-20T00:00:00Z")} />,
    );

    expect(html).toContain('data-testid="week-day-tour-badge-2026-04-25-tour-8"');
    expect(html).toContain("grid-template-columns:1fr 1fr 1fr 1fr 1fr 0.33fr 0.33fr");
    expect(html).not.toContain("grid-template-columns:1fr 1fr 1fr 1fr 1fr 1fr 1fr");
  });

  it("keeps public and company holiday columns narrow when the day has no regular appointment", () => {
    calendarMarkersForTest = [
      createCalendarMarker({
        id: "marker-public-2026-04-21",
        date: "2026-04-21",
        name: "Feiertag Test",
        type: "public_holiday",
      }),
      createCalendarMarker({
        id: "marker-company-2026-04-23",
        date: "2026-04-23",
        name: "Betriebsfeiertag Test",
        type: "company_holiday",
        source: "admin",
        scope: "company",
      }),
    ];
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({ id: 91, startDate: "2026-04-20", endDate: null, startTime: "09:00" }),
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-04-20T00:00:00Z")} />,
    );

    const holidayTemplateMatches = html.match(/grid-template-columns:1fr 0\.33fr 1fr 0\.33fr 1fr 0\.33fr 0\.33fr/g) ?? [];
    expect(holidayTemplateMatches.length).toBeGreaterThanOrEqual(4);
  });

  it("widens holiday columns to weekday width when a regular appointment exists on the holiday", () => {
    calendarMarkersForTest = [
      createCalendarMarker({
        id: "marker-public-2026-04-21",
        date: "2026-04-21",
        name: "Feiertag Test",
        type: "public_holiday",
      }),
    ];
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({ id: 91, startDate: "2026-04-21", endDate: null, startTime: "09:00" }),
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2026-04-20T00:00:00Z")} />,
    );

    const weekdayTemplateMatches = html.match(/grid-template-columns:1fr 1fr 1fr 1fr 1fr 0\.33fr 0\.33fr/g) ?? [];
    expect(weekdayTemplateMatches.length).toBeGreaterThanOrEqual(4);
    expect(html).not.toContain("grid-template-columns:1fr 0.33fr 1fr 1fr 1fr 0.33fr 0.33fr");
  });

  it("renders the absence strip with a compact colored header and standard left-aligned employee badges", () => {
    const weekStart = new Date("2026-04-20T00:00:00Z");
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const absenceEmployeesByDate = new Map<string, CalendarAppointment["employees"]>([
      ["2026-04-20", [{ id: 31, firstName: "Mira", lastName: "Urlaub", fullName: "Mira Urlaub" }]],
    ]);

    const html = renderToStaticMarkup(
      <CalendarWeekAbsenceRow
        weekKey="2026-04-20"
        days={days}
        absenceEmployeesByDate={absenceEmployeesByDate}
        absenceTourColor="#64748B"
        weekDayGridTemplate="1fr 1fr 1fr 1fr 1fr 0.33fr 0.33fr"
      />,
    );

    expect(html).toContain('data-testid="week-absence-row-header-2026-04-20"');
    expect(html).toContain("Abwesenheiten");
    expect(html).toContain("background-color:#64748B");
    expect(html).toContain("h-5");
    expect(html).toContain("justify-start");
    expect(html).toContain('data-testid="week-absence-employee-2026-04-20-31"');
    expect(html).toContain('data-render-mode="standard"');
    expect(html).toContain('data-show-preview="true"');
    expect(html).toContain('data-show-avatar="false"');
  });

  it("renders one shared week body marker column instead of lane-specific holiday dividers", () => {
    calendarMarkersForTest = [createCalendarMarker({})];
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

  it("renders the expanded tour week personnel column as a separate functional panel with week employees and add action", () => {
    toursForTest = [
      { id: 7, name: "Tour 7", color: "#225588", version: 1 },
      { id: 8, name: "Abwesenheiten", color: "#64748B", version: 1 },
      { id: 9, name: "Parkplatz", color: "#7c3aed", version: 1 },
    ];
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
        case "calendar.weekPersonnelColumn.visible":
          return true;
        case "calendar.weekPersonnelColumn.collapsed":
          return false;
        default:
          return null;
      }
    });
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({ id: 91, startDate: "2098-07-06", endDate: null, startTime: "09:00" }),
      ],
    });
    useCalendarWeekLaneEmployeePreviewsMock.mockReturnValue({
      data: [
        {
          date: "2098-06-30",
          weekStartDate: "2098-06-30",
          tourId: 7,
          weekEmployees: [
            {
              id: 31,
              assignmentId: 301,
              firstName: "Mira",
              lastName: "Plan",
              fullName: "Mira Plan",
            },
          ],
          additionalDayEmployees: [],
        },
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2098-07-06T00:00:00Z")} />,
    );

    expect(html).toContain("grid-template-columns:4.75rem minmax(0, 1fr)");
    expect(html).toContain("grid-template-columns:4.75rem 1fr 1fr 1fr 1fr 1fr 0.33fr 1fr");
    expect(html).toContain('data-testid="week-personnel-badge-measurement"');
    expect(html).toContain('data-testid="week-body-personnel-marker-spacer-2098-06-30"');
    expect(html).toContain('data-testid="week-personnel-column-tour-7"');
    expect(html).toContain('data-testid="week-personnel-column-header-tour-7"');
    expect(html).toContain('data-testid="week-personnel-column-background-tour-7"');
    expect(html).toContain('class="absolute inset-0 bg-white/65" data-testid="week-personnel-column-background-tour-7"');
    expect(html).toContain('data-testid="week-personnel-card-wrapper-tour-7"');
    expect(html).toContain('class="absolute inset-0 z-10 min-w-0 p-2 " style="width:100%;height:100%;box-sizing:border-box" data-testid="week-personnel-card-wrapper-tour-7"');
    expect(html).toContain('data-testid="week-personnel-card-tour-7"');
    expect(html).toContain('data-testid="week-personnel-card-menu-trigger-tour-7"');
    expect(html).toContain('data-testid="week-personnel-card-notes-tour-7"');
    expect(html).toContain("background-color:rgba(34, 85, 136, 0.1)");
    expect(html).toContain("notes-2");
    expect(html).toContain('data-testid="button-week-personnel-column-toggle-tour-7"');
    expect(html).toContain('data-testid="week-personnel-column-tour-unassigned"');
    expect(html).toContain('data-testid="week-personnel-column-header-tour-unassigned"');
    expect(html).toContain('data-testid="week-personnel-column-tour-8"');
    expect(html).toContain('data-testid="week-personnel-column-header-tour-8"');
    expect(html).toContain('data-testid="week-personnel-column-tour-9"');
    expect(html).toContain('data-testid="week-personnel-column-header-tour-9"');
    expect(html).toContain("&lt;&lt;&lt;");
    expect(html).toContain('data-testid="week-personnel-employee-tour-7-31"');
    expect(html).toContain('data-render-mode="standard"');
    expect(html).toContain('data-show-avatar="false"');
    expect(html).toContain('data-full-width="false"');
    expect(html).toContain('data-action="remove"');
    expect(html).toContain("Mira Plan");
    expect(html).toContain('data-testid="button-add-week-personnel-tour-7"');
    expect(html).toContain('data-testid="button-apply-week-personnel-tour-7"');
    expect(html).not.toContain('data-testid="button-add-week-personnel-tour-unassigned"');
    expect(html).not.toContain('data-testid="button-apply-week-personnel-tour-unassigned"');
    expect(html).not.toContain('data-testid="button-add-week-personnel-tour-8"');
    expect(html).not.toContain('data-testid="button-apply-week-personnel-tour-8"');
    expect(html).not.toContain('data-testid="button-add-week-personnel-tour-9"');
    expect(html).not.toContain('data-testid="button-apply-week-personnel-tour-9"');
  });

  it("keeps the tour week personnel column narrow in collapsed mode and shows compact employee badges", () => {
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
        case "calendar.weekPersonnelColumn.visible":
          return true;
        case "calendar.weekPersonnelColumn.collapsed":
          return true;
        default:
          return null;
      }
    });
    useCalendarAppointmentsMock.mockReturnValue({
      data: [
        createAppointment({ id: 91, startDate: "2098-07-06", endDate: null, startTime: "09:00" }),
      ],
    });
    useCalendarWeekLaneEmployeePreviewsMock.mockReturnValue({
      data: [
        {
          date: "2098-06-30",
          weekStartDate: "2098-06-30",
          tourId: 7,
          weekEmployees: [
            {
              id: 31,
              assignmentId: 301,
              firstName: "Mira",
              lastName: "Plan",
              fullName: "Mira Plan",
            },
          ],
          additionalDayEmployees: [],
        },
      ],
    });

    const html = renderToStaticMarkup(
      <CalendarWeekView currentDate={new Date("2098-07-06T00:00:00Z")} />,
    );

    expect(html).toContain("grid-template-columns:3rem minmax(0, 1fr)");
    expect(html).toContain("grid-template-columns:3rem 1fr 1fr 1fr 1fr 1fr 0.33fr 1fr");
    expect(html).toContain('data-testid="week-body-personnel-marker-spacer-2098-06-30"');
    expect(html).toContain("&gt;&gt;&gt;");
    expect(html).toContain(">Sa 5<");
    expect(html).not.toContain(">Sa 5 Jul<");
    expect(html).toContain('data-testid="week-personnel-employee-tour-7-31"');
    expect(html).toContain('data-render-mode="compact"');
    expect(html).toContain('data-show-avatar="true"');
    expect(html).not.toContain('data-testid="button-add-week-personnel-tour-7"');
    expect(html).not.toContain('data-testid="button-apply-week-personnel-tour-7"');
  });
});
