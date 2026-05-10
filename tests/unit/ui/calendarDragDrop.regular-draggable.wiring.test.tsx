/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Reguläre, nicht blockierte Kalendereinträge bleiben in Monats- und Wochenansicht drag-fähig.
 * - Historische Parkplatz-Termine bleiben in Monats- und Wochenansicht drag-fähig.
 * - Der positive Drag-Start-Pfad reicht die appointmentId in beide Kalenderansichten an dataTransfer weiter.
 * - Die Wochenansicht schneidet Termine über die Karten-Menüaktion aus, nicht mehr über Pointer-Press.
 *
 * Fehlerfälle:
 * - Reguläre Termine verlieren ihren Drag-Start bereits in der Verdrahtung.
 * - Monats- und Wochenansicht setzen keine appointmentId in dataTransfer.
 * - Historische Parkplatz-Termine verlieren ihre Drag-Freigabe.
 * - Wochenkarten aktivieren die Move-Auswahl wieder durch direktes Anklicken.
 *
 * Ziel:
 * Die positive Drag-Start-Verdrahtung und die neue explizite Wochenkarten-Ausschneiden-Aktion regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

const compactBarCalls: Array<Record<string, unknown>> = [];
const weekPanelCalls: Array<Record<string, unknown>> = [];
const weekSpanningTileCalls: Array<Record<string, unknown>> = [];
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
  CalendarWeekSpanningTile: (props: Record<string, unknown>) => {
    weekSpanningTileCalls.push(props);
    return <div data-testid={`week-spanning-${String((props.appointment as { id?: number })?.id ?? "unknown")}`} />;
  },
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
    tourId: 7,
    tourName: "Alpha",
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

  useCalendarAppointmentsMock.mockReturnValue({ data: appointments });
  useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
    const first = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
    if (first === "/api/tours") {
      return { data: [{ id: 7, name: "Alpha", color: "#225588", version: 1 }], isLoading: false };
    }
    if (first === "/api/employees") {
      return { data: [], isLoading: false };
    }
    return { data: [], isLoading: false };
  });
}

function createDragEventRecorder() {
  const setData = vi.fn();
  return {
    dataTransfer: {
      effectAllowed: "",
      setData,
    },
    setData,
  };
}

describe("calendar drag and drop regular draggable wiring", () => {
  beforeEach(() => {
    compactBarCalls.length = 0;
    weekPanelCalls.length = 0;
    weekSpanningTileCalls.length = 0;
    useSettingMock.mockReset();
    useCalendarAppointmentsMock.mockReset();
    useQueryMock.mockReset();
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "DISPATCHER",
      },
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      },
      cancelAnimationFrame: () => undefined,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps month-sheet appointments draggable and writes the appointment id into dataTransfer", async () => {
    configureDefaults([
      createAppointment({ id: 31, startDate: "2099-07-01" }),
    ]);

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    renderToStaticMarkup(<CalendarMonthSheetView currentDate={new Date("2099-07-01T00:00:00Z")} />);

    const monthBar = compactBarCalls.find((entry) => (entry.appointment as { id: number }).id === 31);
    expect(typeof monthBar?.onDragStart).toBe("function");

    const dragEvent = createDragEventRecorder();
    (monthBar?.onDragStart as (event: { dataTransfer: { effectAllowed: string; setData: (type: string, value: string) => void } }) => void)(dragEvent);

    expect(dragEvent.dataTransfer.effectAllowed).toBe("move");
    expect(dragEvent.setData).toHaveBeenCalledWith("text/plain", "31");
  });

  it("keeps week-view appointments draggable and writes the appointment id into dataTransfer", async () => {
    configureDefaults([
      createAppointment({ id: 41, startDate: "2099-07-01", endDate: null }),
    ]);

    const { CalendarWeekView } = await import("../../../client/src/components/calendar/CalendarWeekView");
    renderToStaticMarkup(<CalendarWeekView currentDate={new Date("2099-07-01T00:00:00Z")} />);

    const weekPanel = weekPanelCalls.find((entry) => (entry.appointment as { id: number }).id === 41);
    expect(typeof weekPanel?.onDragStart).toBe("function");

    const dragEvent = createDragEventRecorder();
    (weekPanel?.onDragStart as (event: { dataTransfer: { effectAllowed: string; setData: (type: string, value: string) => void } }) => void)(dragEvent);

    expect(dragEvent.dataTransfer.effectAllowed).toBe("move");
    expect(dragEvent.setData).toHaveBeenCalledWith("text/plain", "41");
  });

  it("keeps historical Parkplatz appointments draggable in month sheet and week view", async () => {
    configureDefaults([
      createAppointment({ id: 51, startDate: "2000-01-01", tourId: 7, tourName: "Parkplatz" }),
      createAppointment({ id: 52, startDate: "2000-01-01", endDate: null, tourId: 7, tourName: "Parkplatz" }),
    ]);

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    renderToStaticMarkup(<CalendarMonthSheetView currentDate={new Date("2000-01-01T00:00:00Z")} />);

    const monthBar = compactBarCalls.find((entry) => (entry.appointment as { id: number }).id === 51);
    expect(typeof monthBar?.onDragStart).toBe("function");

    const { CalendarWeekView } = await import("../../../client/src/components/calendar/CalendarWeekView");
    renderToStaticMarkup(<CalendarWeekView currentDate={new Date("2000-01-01T00:00:00Z")} />);

    const weekPanel = weekPanelCalls.find((entry) => (entry.appointment as { id: number }).id === 52);
    expect(typeof weekPanel?.onDragStart).toBe("function");
  });

  it("marks month-sheet appointments for move after a long left pointer press", async () => {
    vi.useFakeTimers();
    Object.assign(window, { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
    const onSelectMoveAppointment = vi.fn();
    configureDefaults([
      createAppointment({ id: 61, startDate: "2099-07-01" }),
    ]);

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    renderToStaticMarkup(
      <CalendarMonthSheetView
        currentDate={new Date("2099-07-01T00:00:00Z")}
        onSelectMoveAppointment={onSelectMoveAppointment}
      />,
    );

    const monthBar = compactBarCalls.find((entry) => (entry.appointment as { id: number }).id === 61);
    expect(typeof monthBar?.onPointerDown).toBe("function");

    (monthBar?.onPointerDown as (event: { button: number; pointerId: number; clientX: number; clientY: number }) => void)({
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    vi.advanceTimersByTime(650);

    expect(onSelectMoveAppointment).toHaveBeenCalledWith(expect.objectContaining({ id: 61, tourId: 7 }));
  });

  it("wires week-view cut actions through card menus instead of pointer presses", async () => {
    const onSelectMoveAppointment = vi.fn();
    configureDefaults([
      createAppointment({ id: 62, startDate: "2099-07-01", endDate: null }),
      createAppointment({ id: 63, startDate: "2099-07-01", endDate: "2099-07-02" }),
    ]);

    const { CalendarWeekView } = await import("../../../client/src/components/calendar/CalendarWeekView");
    renderToStaticMarkup(
      <CalendarWeekView
        currentDate={new Date("2099-07-01T00:00:00Z")}
        onSelectMoveAppointment={onSelectMoveAppointment}
      />,
    );

    const weekPanel = weekPanelCalls.find((entry) => (entry.appointment as { id: number }).id === 62);
    expect(weekPanel?.onPointerDown).toBeUndefined();
    expect(typeof weekPanel?.onCutAppointment).toBe("function");

    (weekPanel?.onCutAppointment as () => void)();

    expect(onSelectMoveAppointment).toHaveBeenCalledWith(expect.objectContaining({ id: 62, tourId: 7 }));

    const spanningTile = weekSpanningTileCalls.find((entry) => (entry.appointment as { id: number }).id === 63);
    expect(spanningTile?.onPointerDown).toBeUndefined();
    expect(typeof spanningTile?.onCutAppointment).toBe("function");

    (spanningTile?.onCutAppointment as () => void)();

    expect(onSelectMoveAppointment).toHaveBeenCalledWith(expect.objectContaining({ id: 63, tourId: 7 }));
  });
});
