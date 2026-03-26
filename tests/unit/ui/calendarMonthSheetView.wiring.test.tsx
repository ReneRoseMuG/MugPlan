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
 *
 * Fehlerfaelle:
 * - Das Monatsblatt rendert versehentlich wieder mehrere Monate parallel.
 * - Wiederverwendete Termindarstellung verliert isFirstDay/isLastDay an sichtbaren Segmentgrenzen.
 *
 * Ziel:
 * Die neue Monatsblatt-View ueber beobachtbare Struktur und wiederverwendete Appointment-Bar-Props regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import type { Tour } from "../../../shared/schema";

const compactBarCalls: Array<Record<string, unknown>> = [];
const useSettingMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey?: unknown }) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
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

function configureDefaults(appointments: CalendarAppointment[], tours: Tour[]) {
  useSettingMock.mockImplementation((key: string) => {
    switch (key) {
      case "calendarWeekendColumnPercent":
        return 30;
      default:
        return null;
    }
  });

  useCalendarAppointmentsMock.mockReturnValue({ data: appointments });
  useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
    const first = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
    if (first === "/api/tours") {
      return { data: tours, isLoading: false };
    }
    return { data: [], isLoading: false };
  });
}

describe("calendar month sheet view wiring", () => {
  beforeEach(() => {
    compactBarCalls.length = 0;
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
});
