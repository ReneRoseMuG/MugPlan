/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Blockierte Tour-Wochen zeigen den Menüeintrag in der KW-Plan-Karte und die Sperrfläche an, aber keinen zusätzlichen Badge.
 * - Das Drei-Punkte-Menü der KW-Plan-Karte enthält den Notiz-Einstieg und wechselt für blockierte Wochen auf Freigeben.
 * - Tageszähler und Tages-Plusaktionen bleiben ohne Menü-Overlay im Lane-Header erhalten.
 * - Konflikt-Markierungen werden für Termine in blockierten Wochen unterdrückt.
 * - Blockierte Wochen reichen den gedimmten Header-Status an Terminkarten weiter.
 *
 * Fehlerfaelle:
 * - Blockierte Wochen rendern ohne Aktionsmenue oder mit redundantem Badge.
 * - Das KW-Plan-Menü verliert den Notiz-Einstieg oder zeigt weiterhin die falsche Blockieraktion.
 * - Tageszähler oder Tages-Plusaktionen verschwinden nach der Menü-Verschiebung.
 * - Konflikt-Schraffuren bleiben trotz blockierter Woche auf Terminen aktiv.
 * - Terminkarten bleiben in blockierten Wochen trotz Sperrstatus vollsättigt.
 *
 * Ziel:
 * Das sichtbare Wochenkalender-Verhalten für blockierte Wochen inkl. KW-Plan-Menü, Sperrfläche und Tagessteuerung regressionssicher absichern.
 */
import React from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";
import { getBerlinTodayDateString } from "../../../client/src/lib/project-appointments";

const appointmentPanelCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useCalendarWeekLaneEmployeePreviewsMock = vi.fn();
const useCalendarBlockedTourWeeksMock = vi.fn();
const useSettingMock = vi.fn();
const setSettingMock = vi.fn();
const nextWeekStart = startOfWeek(addDays(parseISO(getBerlinTodayDateString()), 7), { weekStartsOn: 1, locale: de });
const testWeekStartDate = format(nextWeekStart, "yyyy-MM-dd");
const testWeekSecondDate = format(addDays(nextWeekStart, 1), "yyyy-MM-dd");
const testWeekEndDate = format(addDays(nextWeekStart, 6), "yyyy-MM-dd");

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
  CalendarWeekAppointmentPanel: (props: Record<string, unknown>) => {
    appointmentPanelCalls.push(props);
    return <div data-testid={`week-appointment-panel-${String((props.appointment as { id?: number })?.id ?? "unknown")}`} />;
  },
}));

vi.mock("@/components/calendar/CalendarWeekSpanningTile", () => ({
  WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX: 40,
  CalendarWeekSpanningTile: () => <div data-testid="week-spanning-tile-marker" />,
}));

vi.mock("@/components/calendar/CalendarWeekTourLaneDayHoverPreview", () => ({
  CalendarWeekTourLaneDayHoverPreview: () => <div data-testid="week-hover-preview-marker" />,
}));

vi.mock("@/components/calendar/CalendarWeekTourLaneHeaderBar", () => ({
  CalendarWeekTourLaneHeaderBar: ({
    label,
    statusSlot,
  }: {
    label: string;
    statusSlot?: React.ReactNode;
  }) => (
    <div data-testid={`lane-header-${label}`}>
      <span>{label}</span>
      {statusSlot}
    </div>
  ),
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
    <>
      {children({
        iconSlot: <span data-testid="notes-icon-marker" />,
        countSlot: <span data-testid="notes-count-marker">0</span>,
        dialog: null,
        notesCount: 0,
        openDialog: vi.fn(),
      })}
    </>
  ),
}));

vi.mock("@/components/TourWeekNotesHoverPreview", () => ({
  TourWeekNotesHoverPreview: ({ count, triggerTestId }: { count: number; triggerTestId?: string }) => (
    <div data-testid={triggerTestId}>Notizen {count}</div>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-root">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function createAppointment(overrides: Partial<CalendarAppointment>): CalendarAppointment {
  return {
    id: 91,
    version: 1,
    projectId: null,
    projectName: "Projekt",
    projectVersion: null,
    projectOrderNumber: null,
    projectArticleItems: [],
    projectDescription: null,
    project: null,
    startDate: testWeekStartDate,
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

import { CalendarWeekView } from "../../../client/src/components/calendar/CalendarWeekView";

describe("CalendarWeekView blocked week behavior", () => {
  beforeEach(() => {
    appointmentPanelCalls.length = 0;
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useCalendarAppointmentsMock.mockReset();
    useCalendarWeekLaneEmployeePreviewsMock.mockReset();
    useCalendarBlockedTourWeeksMock.mockReset();
    useSettingMock.mockReset();
    setSettingMock.mockReset();

    useCalendarAppointmentsMock.mockReturnValue({
      data: [createAppointment({})],
    });
    useCalendarWeekLaneEmployeePreviewsMock.mockReturnValue({ data: [] });
    useCalendarBlockedTourWeeksMock.mockReturnValue({
      data: [{
        tourId: 7,
        isoYear: Number(format(nextWeekStart, "RRRR")),
        isoWeek: Number(format(nextWeekStart, "II")),
        weekStartDate: testWeekStartDate,
        weekEndDate: testWeekEndDate,
        isBlocked: true,
      }],
    });
    useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
      const first = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (first === "/api/tours") {
        return {
          data: [{ id: 7, name: "Alpha", color: "#225588", version: 1 }],
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
        case "calendar.weekPersonnelColumn.visible":
          return true;
        case "calendar.weekPersonnelColumn.collapsed":
          return false;
        default:
          return null;
      }
    });

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

  it("shows the blocked overlay and freigeben menu while keeping day controls and suppressing conflict markers", () => {
    const markup = renderToStaticMarkup(
        <CalendarWeekView
        currentDate={nextWeekStart}
        conflictHighlightActive
        conflictAppointmentMap={new Map([
          [91, { triggerCode: "TR-02", triggerName: "Geparkt", color: "#D4537E" }],
        ])}
      />,
    );

    expect(markup).toContain("Notiz hinzufügen");
    expect(markup).toContain("Wochenplanung freigeben");
    expect(markup).toContain('data-testid="week-personnel-card-menu-trigger-tour-7"');
    expect(markup).not.toContain('week-tour-lane-menu-trigger-tour-7');
    expect(markup).toContain("repeating-linear-gradient(135deg");
    expect(markup).not.toContain('week-tour-lane-blocked-badge-');
    expect(markup).toContain(`data-testid="week-tour-lane-day-hover-trigger-tour-7-${testWeekSecondDate}"`);
    expect(markup).toContain('data-testid="week-tour-lane-day-counter-');
    expect(markup).toContain("1 Termin");
    expect(markup).toContain(`data-testid="button-new-appointment-week-${testWeekStartDate}-lane-`);

    const appointmentPanel = appointmentPanelCalls.find((entry) => (entry.appointment as { id: number }).id === 91);
    expect(appointmentPanel?.isConflict).toBe(false);
    expect(appointmentPanel?.isBlocked).toBe(true);
    expect(appointmentPanel?.conflictColor).toBe("#D4537E");
  });
});
