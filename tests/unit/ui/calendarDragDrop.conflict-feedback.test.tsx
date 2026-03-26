/**
 * Test Scope:
 *
 * Bereich:
 * - Kalender-Drag-and-drop fuer stornierte Termine
 *
 * Abgedeckte Regeln:
 * - Monatsansicht markiert stornierte Termine als gesperrt und bietet keinen Drag-Start mehr an.
 * - Wochenansicht markiert stornierte Termine als gesperrt und bietet keinen Drag-Start mehr an.
 * - Nicht stornierte Vergleichstermine bleiben weiterhin drag-faehig.
 *
 * Fehlerfaelle:
 * - Stornierte Termine bleiben im Kalender verschiebbar.
 * - Die Sperre blockiert versehentlich auch regulaere Termine.
 *
 * Ziel:
 * Das beobachtbare Laufzeitverhalten fuer die Drag-Sperre stornierter Termine in Woche und Monat ohne Quelltext-Assertions absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

const compactBarCalls: Array<Record<string, unknown>> = [];
const weekPanelCalls: Array<Record<string, unknown>> = [];
const useSettingMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey?: unknown }) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  QueryClient: class QueryClient {
    invalidateQueries = vi.fn();
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: (key: string) => useSettingMock(key),
  useSettings: () => ({ setSetting: vi.fn() }),
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

vi.mock("@/components/calendar/CalendarAppointmentCompactBar", () => ({
  CalendarAppointmentCompactBar: (props: Record<string, unknown>) => {
    compactBarCalls.push(props);
    return <div data-testid={`compact-bar-${String((props.appointment as { id?: number })?.id ?? "unknown")}`} />;
  },
}));

vi.mock("@/components/calendar/CalendarWeekAppointmentPanel", () => ({
  DEFAULT_CONTINUATION_HEIGHT_PX: 44,
  MIN_WEEK_CARD_HEIGHT_PX: 180,
  WEEK_CARD_FOOTER_SAFE_SPACE_PX: 40,
  CalendarWeekAppointmentPanel: (props: Record<string, unknown>) => {
    weekPanelCalls.push(props);
    return <div data-testid={`week-panel-${String((props.appointment as { id?: number })?.id ?? "unknown")}`} />;
  },
}));

vi.mock("@/components/calendar/CalendarWeekSpanningTile", () => ({
  WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX: 40,
  CalendarWeekSpanningTile: () => <div data-testid="week-spanning-tile" />,
}));

vi.mock("@/components/calendar/CalendarWeekTourLaneHeaderBar", () => ({
  CalendarWeekTourLaneHeaderBar: () => <div data-testid="week-lane-header" />,
}));

function createAppointment(overrides: Partial<CalendarAppointment>): CalendarAppointment {
  return {
    id: 1,
    version: 1,
    projectId: null,
    projectName: "Projekt",
    projectVersion: null,
    projectOrderNumber: null,
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: "2099-07-01",
    endDate: null,
    startTime: null,
    tourId: null,
    tourName: null,
    tourColor: "#225588",
    customer: {
      id: 1,
      customerNumber: "C-1",
      fullName: "Kunde",
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

function configureDefaults(appointments: CalendarAppointment[]) {
  useSettingMock.mockImplementation((key: string) => {
    switch (key) {
      case "calendarWeekendColumnPercent":
        return 30;
      case "calendarMonthScrollRange":
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

  useCalendarAppointmentsMock.mockReturnValue({ data: appointments });
  useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
    const first = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
    if (first === "/api/tours") {
      return { data: [], isLoading: false };
    }
    if (first === "/api/employees") {
      return { data: [], isLoading: false };
    }
    return { data: [], isLoading: false };
  });
}

describe("calendar drag and drop conflict feedback", () => {
  beforeEach(() => {
    compactBarCalls.length = 0;
    weekPanelCalls.length = 0;
    useSettingMock.mockReset();
    useCalendarAppointmentsMock.mockReset();
    useQueryMock.mockReset();
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "DISPATCHER",
      },
    });
  });

  it("blocks cancelled appointments from being dragged in the month view while regular appointments stay draggable", async () => {
    configureDefaults([
      createAppointment({ id: 11, startDate: "2099-07-01", isCancelled: true }),
      createAppointment({ id: 12, startDate: "2099-07-02", isCancelled: false }),
    ]);

    const { CalendarMonthView } = await import("../../../client/src/components/calendar/CalendarMonthView");
    renderToStaticMarkup(<CalendarMonthView currentDate={new Date("2099-07-01T00:00:00Z")} />);

    const cancelled = compactBarCalls.find((entry) => (entry.appointment as { id: number }).id === 11);
    const regular = compactBarCalls.find((entry) => (entry.appointment as { id: number }).id === 12);

    expect(cancelled?.isLocked).toBe(true);
    expect(cancelled?.onDragStart).toBeUndefined();
    expect(typeof regular?.onDragStart).toBe("function");
  });

  it("blocks cancelled appointments from being dragged in the week view while regular appointments stay draggable", async () => {
    configureDefaults([
      createAppointment({ id: 21, startDate: "2099-07-01", isCancelled: true }),
      createAppointment({ id: 22, startDate: "2099-07-02", isCancelled: false }),
    ]);

    const { CalendarWeekView } = await import("../../../client/src/components/calendar/CalendarWeekView");
    renderToStaticMarkup(<CalendarWeekView currentDate={new Date("2099-07-01T00:00:00Z")} />);

    const cancelled = weekPanelCalls.find((entry) => (entry.appointment as { id: number }).id === 21);
    const regular = weekPanelCalls.find((entry) => (entry.appointment as { id: number }).id === 22);

    expect(cancelled?.isLocked).toBe(true);
    expect(cancelled?.onDragStart).toBeUndefined();
    expect(typeof regular?.onDragStart).toBe("function");
  });
});
