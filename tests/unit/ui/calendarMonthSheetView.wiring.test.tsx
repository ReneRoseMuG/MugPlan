/**
 * Test Scope:
 *
 * Bereich:
 * - Neue isolierte Monatsblatt-Ansicht
 *
 * Abgedeckte Regeln:
 * - Die Ansicht rendert genau ein sichtbares Monatsblatt fuer den aktiven Monat.
 * - Das Monatsblatt behaelt die feste Struktur aus KW-Spalte und 7 Tages-Spalten.
 * - Monatsfremde Tage bleiben sichtbar, werden aber im Renderzustand als reduzierte Nachbar-Monatstage markiert.
 * - Sechs-Wochen-Monate behalten ihre letzte Woche in einem eigenen vertikalen Wochen-Scroller erreichbar.
 * - Die bestehende Compact-Bar-Darstellung bleibt fuer geklippte Mehrtagessegmente wiederverwendet.
 * - Blockierte Wochen legen im Monatsblatt eine Sperrflaeche ueber den Tour-Slot.
 * - Konflikt-Schraffuren werden fuer Termine in blockierten Wochen unterdrueckt.
 * - Blockierte Wochen reichen den gedimmten Bar-Status an Compact-Bars weiter.
 *
 * Fehlerfaelle:
 * - Das Monatsblatt rendert versehentlich wieder mehrere Monate parallel.
 * - Wiederverwendete Termindarstellung verliert isFirstDay/isLastDay an sichtbaren Segmentgrenzen.
 * - Blockierte Tour-Slots zeigen weiterhin doppelte Konflikt- und Sperrflaechen.
 * - Monatsbalken bleiben in blockierten Slots trotz Sperrstatus vollsaettigt.
 *
 * Ziel:
 * Die neue Monatsblatt-View ueber beobachtbare Struktur und wiederverwendete Appointment-Bar-Props regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import type { CalendarMarker } from "../../../client/src/lib/calendar-markers";
import type { Tour } from "../../../shared/schema";

const compactBarCalls: Array<Record<string, unknown>> = [];
const useSettingMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useCalendarBlockedTourWeeksMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey?: unknown }) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: (key: string) => useSettingMock(key),
}));

vi.mock("@/lib/monitoring", () => ({
  refreshMonitoringWithNotification: vi.fn(),
}));

vi.mock("@/lib/calendar-appointments", async () => {
  const actual = await vi.importActual<typeof import("../../../client/src/lib/calendar-appointments")>(
    "../../../client/src/lib/calendar-appointments",
  );
  return {
    ...actual,
    useCalendarAppointments: (options: unknown) => useCalendarAppointmentsMock(options),
    useCalendarBlockedTourWeeks: (options: unknown) => useCalendarBlockedTourWeeksMock(options),
  };
});

vi.mock("@/components/calendar/CalendarAppointmentCompactBar", () => ({
  CalendarAppointmentCompactBar: (props: Record<string, unknown>) => {
    compactBarCalls.push(props);
    return <div data-testid={`appointment-bar-${String((props.appointment as { id?: number })?.id ?? "unknown")}`} />;
  },
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
    startDate: "2026-03-02",
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

function configureDefaults(
  appointments: CalendarAppointment[],
  tours: Tour[],
  blockedTourWeeks: Array<{
    tourId: number;
    isoYear: number;
    isoWeek: number;
    weekStartDate: string;
    weekEndDate: string;
    isBlocked: boolean;
  }> = [],
  calendarMarkers: CalendarMarker[] = [],
) {
  useSettingMock.mockImplementation((key: string) => {
    switch (key) {
      case "calendarWeekendColumnPercent":
        return 30;
      default:
        return null;
    }
  });

  useCalendarAppointmentsMock.mockReturnValue({ data: appointments });
  useCalendarBlockedTourWeeksMock.mockReturnValue({ data: blockedTourWeeks });
  useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
    const first = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
    if (first === "/api/tours") {
      return { data: tours, isLoading: false };
    }
    if (first === "calendarMarkers") {
      return { data: calendarMarkers, isLoading: false };
    }
    return { data: [], isLoading: false };
  });
}

describe("calendar month sheet view wiring", () => {
  beforeEach(() => {
    compactBarCalls.length = 0;
    useSettingMock.mockReset();
    useCalendarAppointmentsMock.mockReset();
    useCalendarBlockedTourWeeksMock.mockReset();
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
    });
  });

  it("renders exactly one visible month sheet for the active month", async () => {
    configureDefaults([], [{ id: 7, name: "Alpha", color: "#225588", version: 1 }]);

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    const markup = renderToStaticMarkup(
      <CalendarMonthSheetView currentDate={new Date("2026-03-15T00:00:00Z")} />,
    );

    expect(markup).toContain('data-testid="month-sheet-2026-03-01"');
    expect(markup).not.toContain('data-testid="month-sheet-2026-04-01"');
    expect(markup).not.toContain('data-testid="month-sheet-2026-05-01"');
    expect(markup).toContain('data-testid="month-sheet-container"');
    expect(markup).toContain('class="flex h-full flex-col overflow-hidden bg-white"');
    expect(markup).not.toContain("flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm");
    expect(markup).toContain("month-sheet-week-number-2026-03-01-2026-02-23");
  });

  it("renders the last visible week of a six-week month inside the dedicated week scroller", async () => {
    configureDefaults([], [{ id: 7, name: "Alpha", color: "#225588", version: 1 }]);

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    const markup = renderToStaticMarkup(
      <CalendarMonthSheetView currentDate={new Date("2026-03-15T00:00:00Z")} />,
    );

    expect(markup).toContain('data-testid="month-sheet-weeks-scroll-2026-03-01"');
    expect(markup).toContain("month-sheet-week-number-2026-03-01-2026-03-30");
  });

  it("marks adjacent-month days separately from current-month days in the rendered month sheet", async () => {
    configureDefaults([], [{ id: 7, name: "Alpha", color: "#225588", version: 1 }]);

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    const markup = renderToStaticMarkup(
      <CalendarMonthSheetView currentDate={new Date("2026-03-15T00:00:00Z")} />,
    );

    expect(markup).toContain('data-testid="month-sheet-day-2026-02-23" data-month-scope="adjacent"');
    expect(markup).toContain('data-testid="month-sheet-day-2026-03-02" data-month-scope="current"');
  });

  it("keeps the reused compact-bar segment flags intact for clipped continuation segments", async () => {
    configureDefaults(
      [
        createAppointment({
          id: 41,
          startDate: "2026-02-22",
          endDate: "2026-02-24",
        }),
      ],
      [{ id: 7, name: "Alpha", color: "#225588", version: 1 }],
    );

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    renderToStaticMarkup(<CalendarMonthSheetView currentDate={new Date("2026-03-15T00:00:00Z")} />);

    const continuationSegment = compactBarCalls.find((entry) =>
      (entry.appointment as { id: number }).id === 41 && entry.isFirstDay === false && entry.isLastDay === true,
    );

    expect(continuationSegment).toBeTruthy();
  });

  it("passes the conflict marker into compact bars for monitored appointments", async () => {
    configureDefaults(
      [
        createAppointment({
          id: 77,
          startDate: "2026-03-02",
        }),
      ],
      [{ id: 7, name: "Alpha", color: "#225588", version: 1 }],
    );

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    renderToStaticMarkup(
      <CalendarMonthSheetView
        currentDate={new Date("2026-03-15T00:00:00Z")}
        conflictHighlightActive
        conflictAppointmentMap={new Map([
          [77, { triggerCode: "TR-02", triggerName: "Geparkt", color: "#D4537E" }],
        ])}
      />,
    );

    const conflictBar = compactBarCalls.find((entry) => (entry.appointment as { id: number }).id === 77);
    expect(conflictBar?.isConflict).toBe(true);
    expect(conflictBar?.conflictColor).toBe("#D4537E");
  });

  it("renders holiday markers inside the day header without creating a separate badge row", async () => {
    configureDefaults(
      [],
      [{ id: 7, name: "Alpha", color: "#225588", version: 1 }],
      [],
      [{
        id: "marker-2026-05-01",
        date: "2026-05-01",
        endDate: null,
        name: "Maifeiertag",
        type: "public_holiday",
        source: "automatic",
        scope: "national",
        states: [],
        active: true,
        note: null,
        version: 1,
      }],
    );

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    const markup = renderToStaticMarkup(
      <CalendarMonthSheetView currentDate={new Date("2026-05-15T00:00:00Z")} />,
    );

    expect(markup).toContain('data-testid="calendar-marker-header-2026-05-01"');
    expect(markup).toContain('data-marker-header-variant="ft"');
    expect(markup).not.toContain("calendar-marker-badge-2026-05-01");
  });

  it("renders a blocked-week overlay and suppresses conflict markers inside blocked weeks", async () => {
    const appointment = createAppointment({
      id: 88,
      startDate: "2026-03-02",
    });
    configureDefaults(
      [appointment],
      [{ id: 7, name: "Alpha", color: "#225588", version: 1 }],
      [{
        tourId: 7,
        isoYear: 2026,
        isoWeek: 10,
        weekStartDate: "2026-03-02",
        weekEndDate: "2026-03-08",
        isBlocked: true,
      }],
    );

    const { CalendarMonthSheetView } = await import("../../../client/src/components/calendar/CalendarMonthSheetView");
    const markup = renderToStaticMarkup(
      <CalendarMonthSheetView
        currentDate={new Date("2026-03-15T00:00:00Z")}
        conflictHighlightActive
        conflictAppointmentMap={new Map([
          [88, { triggerCode: "TR-02", triggerName: "Geparkt", color: "#D4537E" }],
        ])}
      />,
    );

    const blockedBar = compactBarCalls.find((entry) => (entry.appointment as { id: number }).id === 88);
    expect(blockedBar?.isConflict).toBe(false);
    expect(blockedBar?.isBlocked).toBe(true);
    expect(markup).toContain("repeating-linear-gradient(135deg");
  });
});
