/**
 * Test Scope:
 *
 * Bereich:
 * - Monatskalender Tour-Slot-Rendering
 *
 * Abgedeckte Regeln:
 * - Mehrtagestermine werden pro Wochensegment nur einmal im Monatskalender gerendert.
 * - Fortgesetzte Segmente markieren sichtbare Wochenstarts nicht fälschlich als echten ersten Termin-Tag.
 * - Sichtbare Segmentenden behalten die korrekte Last-Day-Kennzeichnung.
 *
 * Fehlerfälle:
 * - Mehrtagestermine erscheinen an jedem Tag ihres Segments mehrfach.
 * - Am Wochenrand geklippte Segmente verlieren die isFirstDay/isLastDay-Information.
 *
 * Ziel:
 * Das neue Monats-Rendering für tourbasierte Slots über beobachtbare Compact-Bar-Props regressionssicher absichern.
 */
import React from "react";
import { addDays, format, startOfMonth, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
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
    return <div data-testid={`compact-bar-${String((props.appointment as { id?: number })?.id ?? "unknown")}`} />;
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
      case "calendarMonthScrollRange":
        return 0;
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

function getFirstVisibleWeekStart(currentDate: Date) {
  return startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1, locale: de });
}

describe("calendar month view tour slot rendering", () => {
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
    });
  });

  it("renders each month-view multi-day appointment only once per visible week segment", async () => {
    const currentDate = new Date(2026, 2, 15);
    const weekStart = getFirstVisibleWeekStart(currentDate);

    configureDefaults(
      [
        createAppointment({
          id: 31,
          startDate: format(weekStart, "yyyy-MM-dd"),
          endDate: format(addDays(weekStart, 2), "yyyy-MM-dd"),
        }),
        createAppointment({
          id: 32,
          startDate: format(addDays(weekStart, 1), "yyyy-MM-dd"),
          endDate: null,
          startTime: "09:00:00",
        }),
      ],
      [{ id: 7, name: "Alpha", color: "#225588", version: 1 }],
    );

    const { CalendarMonthView } = await import("../../../client/src/components/calendar/CalendarMonthView");
    renderToStaticMarkup(<CalendarMonthView currentDate={currentDate} />);

    expect(compactBarCalls.filter((entry) => (entry.appointment as { id: number }).id === 31)).toHaveLength(1);
    expect(compactBarCalls.filter((entry) => (entry.appointment as { id: number }).id === 32)).toHaveLength(1);
  });

  it("passes clipped first-day and last-day flags for continuation segments", async () => {
    const currentDate = new Date(2026, 2, 15);
    const weekStart = getFirstVisibleWeekStart(currentDate);

    configureDefaults(
      [
        createAppointment({
          id: 41,
          startDate: format(addDays(weekStart, -1), "yyyy-MM-dd"),
          endDate: format(addDays(weekStart, 1), "yyyy-MM-dd"),
        }),
      ],
      [{ id: 7, name: "Alpha", color: "#225588", version: 1 }],
    );

    const { CalendarMonthView } = await import("../../../client/src/components/calendar/CalendarMonthView");
    renderToStaticMarkup(<CalendarMonthView currentDate={currentDate} />);

    const continuation = compactBarCalls.find((entry) => (entry.appointment as { id: number }).id === 41);

    expect(continuation?.isFirstDay).toBe(false);
    expect(continuation?.isLastDay).toBe(true);
  });
});
