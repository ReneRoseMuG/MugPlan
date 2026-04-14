/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Blockierte Tour-Wochen zeigen im Wochenkalender Menueintrag und Sperrflaeche an, aber keinen zusaetzlichen Badge.
 * - Das Drei-Punkte-Menue der linken Tour-Lane enthaelt weiterhin den Notiz-Einstieg und wechselt fuer blockierte Wochen auf Freigeben.
 * - Tageszaehler und Tages-Plusaktionen bleiben trotz Menue-Overlay im Lane-Header erhalten.
 * - Konflikt-Markierungen werden fuer Termine in blockierten Wochen unterdrueckt.
 * - Blockierte Wochen reichen den gedimmten Header-Status an Terminkarten weiter.
 *
 * Fehlerfaelle:
 * - Blockierte Wochen rendern ohne Aktionsmenue oder mit redundantem Badge.
 * - Das Lane-Menue verliert den Notiz-Einstieg oder zeigt weiterhin die falsche Blockieraktion.
 * - Tageszaehler oder Tages-Plusaktionen verschwinden nach Header-Layering-Aenderungen.
 * - Konflikt-Schraffuren bleiben trotz blockierter Woche auf Terminen aktiv.
 * - Terminkarten bleiben in blockierten Wochen trotz Sperrstatus vollsaettigt.
 *
 * Ziel:
 * Das sichtbare Wochenkalender-Verhalten fuer blockierte Wochen inkl. Menue, Sperrflaeche und Tagessteuerung regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../../client/src/lib/calendar-appointments";

const appointmentPanelCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useCalendarAppointmentsMock = vi.fn();
const useCalendarWeekLaneEmployeePreviewsMock = vi.fn();
const useCalendarBlockedTourWeeksMock = vi.fn();
const useSettingMock = vi.fn();
const setSettingMock = vi.fn();

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
    weekNotesIcon,
    weekNotesCount,
    statusSlot,
    menuSlot,
  }: {
    label: string;
    weekNotesIcon?: React.ReactNode;
    weekNotesCount?: React.ReactNode;
    statusSlot?: React.ReactNode;
    menuSlot?: React.ReactNode;
  }) => (
    <div data-testid={`lane-header-${label}`}>
      <span>{label}</span>
      {weekNotesIcon}
      {weekNotesCount}
      {statusSlot}
      {menuSlot}
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
    startDate: "2026-04-20",
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
        isoYear: 2026,
        isoWeek: 17,
        weekStartDate: "2026-04-20",
        weekEndDate: "2026-04-26",
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
        case "calendar.weekAppointmentDisplayMode":
          return "standard";
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
        currentDate={new Date("2026-04-20T00:00:00Z")}
        conflictHighlightActive
        conflictAppointmentMap={new Map([
          [91, { triggerCode: "TR-02", triggerName: "Geparkt", color: "#D4537E" }],
        ])}
      />,
    );

    expect(markup).toContain("Notizen verwalten");
    expect(markup).toContain("Wochenplanung freigeben");
    expect(markup).toContain("repeating-linear-gradient(135deg");
    expect(markup).not.toContain('week-tour-lane-blocked-badge-');
    expect(markup).toContain('data-testid="week-tour-lane-day-divider-tour-7-2026-04-21"');
    expect(markup).toContain('data-testid="week-tour-lane-day-counter-');
    expect(markup).toContain("1 Termin");
    expect(markup).toContain('data-testid="button-new-appointment-week-2026-04-20-lane-');

    const appointmentPanel = appointmentPanelCalls.find((entry) => (entry.appointment as { id: number }).id === 91);
    expect(appointmentPanel?.isConflict).toBe(false);
    expect(appointmentPanel?.isBlocked).toBe(true);
    expect(appointmentPanel?.conflictColor).toBe("#D4537E");
  });
});
