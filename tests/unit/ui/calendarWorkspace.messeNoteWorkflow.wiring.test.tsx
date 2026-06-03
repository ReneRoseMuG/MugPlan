/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - CalendarWorkspace wird echt serverseitig gerendert; Grid-Kindkomponenten und Netzwerk werden gezielt gedoppelt.
 *
 * Mock-Entscheidung:
 * - Unit-Mocks für UI-Kindkomponenten und Fetch, damit der zentrale Move-Orchestrator isoliert beweisbar bleibt.
 *
 * Isolation:
 * - Kein DB-/FS-Zugriff; alle API-Antworten sind synthetische Testdaten.
 *
 * Abgedeckte Regeln:
 * - Drag-and-drop-Moves auf Tour Messe führen nach serverseitigem Tag-Event den Notizworkflow aus.
 * - Ausschneiden/Einfügen-Moves auf Tour Messe führen nach serverseitigem Tag-Event den Notizworkflow aus.
 * - Die Workflow-Entscheidung öffnet bei Messe-Tag ohne vorhandene Notiz genau den Messe-Vorschlag.
 *
 * Fehlerfälle:
 * - CalendarWorkspace ignoriert mutationEvents aus dem Move-PATCH.
 * - Der Einfügen-Pfad läuft nicht durch denselben Notizworkflow wie Drag-and-drop.
 * - Bestehende Messe-Notizen erzeugen einen doppelten Vorschlag.
 *
 * Ziel:
 * Den Messe-Notizworkflow für alle Kalender-Move-Pfade am gemeinsamen Workspace-Einstieg absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarMoveRequest, CalendarMoveSelection } from "../../../client/src/lib/calendar-move";

const weekGridCalls: Array<{ onRequestMoveAppointment?: (request: CalendarMoveRequest) => void | Promise<void> }> = [];
const toastMock = vi.fn();
const invalidateQueriesMock = vi.fn();

vi.mock("@/components/WeekGrid", () => ({
  WeekGrid: (props: { onRequestMoveAppointment?: (request: CalendarMoveRequest) => void | Promise<void> }) => {
    weekGridCalls.push(props);
    return <div data-testid="week-grid-marker">week</div>;
  },
}));

vi.mock("@/components/MonthSheetGrid", () => ({
  MonthSheetGrid: () => <div data-testid="month-sheet-grid-marker">month</div>,
}));

vi.mock("@/components/ui/filter-panels/calendar-filter-panel", () => ({
  CalendarFilterPanel: () => <div data-testid="calendar-filter-panel-marker">filter</div>,
}));

vi.mock("@/components/AppointmentMoveDialog", () => ({
  AppointmentMoveDialog: () => <div data-testid="appointment-move-dialog-marker">move-dialog</div>,
}));

vi.mock("@/components/notes/WorkflowNoteDialogs", () => ({
  WorkflowNoteSuggestionDialog: () => null,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
  };
});

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ setSetting: vi.fn() }),
  useSetting: (key: string) => {
    if (key === "calendar.weekTileBodyMode") return "collapsed";
    if (key === "calendar.weekLanes.isCollapsed") return false;
    return null;
  },
}));

vi.mock("@/lib/monitoring", () => ({
  refreshMonitoringWithNotification: vi.fn(),
}));

import {
  CalendarWorkspace,
  collectCalendarMoveWorkflowNoteSuggestions,
  resolveCalendarMoveWorkflowMutationEvents,
} from "../../../client/src/components/CalendarWorkspace";

function buildMoveAppointment(): CalendarMoveSelection {
  return {
    id: 77,
    version: 3,
    projectId: 12,
    projectName: "Messe Testprojekt",
    customerId: 45,
    customerName: "Messe Testkunde",
    customerNumber: "K-45",
    startDate: "2099-01-07",
    endDate: null,
    startTime: null,
    tourId: 5,
    tourName: "Tour Alt",
    employeeIds: [],
    isCancelled: false,
    isLocked: false,
  };
}

function buildMoveRequest(mode: "drag" | "insert"): CalendarMoveRequest {
  return {
    appointment: buildMoveAppointment(),
    targetStartDate: "2099-01-14",
    targetTourId: 11,
    targetTourName: "Tour Messe",
    mode,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetchMock(options: { omitPatchMutationEvents?: boolean } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === "/api/appointments/77/tour-change-preview" && method === "POST") {
      return jsonResponse({
        isoYear: 2099,
        isoWeek: 3,
        hasWeekPlan: false,
        currentEmployeeIds: [],
        items: [],
      });
    }

    if (url === "/api/appointments/77" && method === "PATCH") {
      return jsonResponse(options.omitPatchMutationEvents ? {} : {
        mutationEvents: [{
          kind: "tag_mutated",
          appointmentId: 77,
          tagName: "Messe Aufbau/Abbau",
          action: "added",
        }],
      });
    }

    if (url === "/api/appointments/77/notes" && method === "GET") {
      return jsonResponse([]);
    }

    throw new Error(`Unexpected fetch ${method} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderWorkspace() {
  renderToStaticMarkup(
    <CalendarWorkspace
      mode="global"
      activeView="week"
      currentDate={new Date("2099-01-07")}
      employeeFilterId={null}
      onEmployeeFilterChange={() => undefined}
      onViewChange={() => undefined}
      onDateChange={() => undefined}
      onOpenAppointmentForm={() => undefined}
    />,
  );
}

async function executeCapturedMove(mode: "drag" | "insert") {
  renderWorkspace();
  const onRequestMoveAppointment = weekGridCalls.at(-1)?.onRequestMoveAppointment;
  expect(onRequestMoveAppointment).toEqual(expect.any(Function));
  await onRequestMoveAppointment?.(buildMoveRequest(mode));
}

describe("CalendarWorkspace Messe-Notizworkflow nach Kalender-Move", () => {
  beforeEach(() => {
    weekGridCalls.length = 0;
    toastMock.mockReset();
    invalidateQueriesMock.mockReset();
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
        setItem: () => undefined,
      },
      location: {
        search: "",
        href: "http://localhost/calendar",
      },
      history: {
        replaceState: () => undefined,
        state: null,
      },
    });
  });

  it("ermittelt den Messe-Notizvorschlag aus Tag-Mutation ohne vorhandene Terminnotiz", () => {
    expect(collectCalendarMoveWorkflowNoteSuggestions({
      appointmentId: 77,
      mutationEvents: [{
        kind: "tag_mutated",
        appointmentId: 77,
        tagName: "Messe Aufbau/Abbau",
        action: "added",
      }],
      existingNotes: [],
    })).toEqual(["Messe Aufbau/Abbau"]);

    expect(collectCalendarMoveWorkflowNoteSuggestions({
      appointmentId: 77,
      mutationEvents: [{
        kind: "tag_mutated",
        appointmentId: 77,
        tagName: "Messe Aufbau/Abbau",
        action: "added",
      }],
      existingNotes: [{ title: "Messe Aufbau/Abbau" }],
    })).toEqual([]);
  });

  it("ergänzt den Messe-Workflow-Event wenn ein erfolgreicher Move auf Tour Messe keine MutationEvents liefert", () => {
    expect(resolveCalendarMoveWorkflowMutationEvents(buildMoveRequest("insert"), undefined)).toEqual([{
      kind: "tag_mutated",
      appointmentId: 77,
      tagName: "Messe Aufbau/Abbau",
      action: "added",
    }]);
  });

  it("führt nach Drag-and-drop auf Tour Messe den Notizworkflow über die Terminnotizen aus", async () => {
    const fetchMock = installFetchMock();

    await executeCapturedMove("drag");

    expect(fetchMock).toHaveBeenCalledWith("/api/appointments/77/notes", { credentials: "include" });
  });

  it("führt nach Ausschneiden/Einfügen auf Tour Messe denselben Notizworkflow aus", async () => {
    const fetchMock = installFetchMock({ omitPatchMutationEvents: true });

    await executeCapturedMove("insert");

    expect(fetchMock).toHaveBeenCalledWith("/api/appointments/77/notes", { credentials: "include" });
  });
});
