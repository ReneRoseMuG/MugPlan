/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `Home` delegiert Listen- und Monitoring-Oeffnungen in den jeweils vorgesehenen Termin-Kontext.
 * - `Home` rendert die globale Journal-Ansicht ueber den normalen View-Switch innerhalb des Hauptlayouts.
 * - Bearbeitete Formularviews blenden die Sidebar sichtbar aus.
 * - Projektformulare koennen den Kontextkalender oeffnen.
 * - Rueckkehr aus dem Terminformular setzt den Wochen-Scroll-Restore ueber `returnContext`.
 *
 * Fehlerfaelle:
 * - Termin-Kontext oder Rueckwegzustand gehen beim View-Wechsel verloren.
 * - Die neue Journal-Ansicht wird nicht im zentralen Home-View gerendert.
 * - Die Sidebar bleibt trotz aktivem Formular sichtbar.
 * - Der Kontextkalender oeffnet nicht mit Projektbindung.
 *
 * Ziel:
 * Die verbleibenden `Home`-Verdrahtungen ueber sichtbare Grenzen und Callback-Wirkungen statt ueber Quelltextmarker absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sidebarCalls: Array<Record<string, unknown>> = [];
const appointmentsListCalls: Array<Record<string, unknown>> = [];
const projectFormCalls: Array<Record<string, unknown>> = [];
const calendarWorkspaceCalls: Array<Record<string, unknown>> = [];
const calendarYearViewCalls: Array<Record<string, unknown>> = [];
const appointmentFormCalls: Array<Record<string, unknown>> = [];
const employeesPageCalls: Array<Record<string, unknown>> = [];
const journalPageCalls: Array<Record<string, unknown>> = [];
const tourPostalPlanViewCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/Sidebar", () => ({
  Sidebar: (props: Record<string, unknown>) => {
    sidebarCalls.push(props);
    return <div data-testid="sidebar">sidebar</div>;
  },
}));

vi.mock("@/components/CalendarWorkspace", () => ({
  CalendarWorkspace: (props: Record<string, unknown>) => {
    calendarWorkspaceCalls.push(props);
    return <div data-testid="calendar-workspace">calendar-workspace</div>;
  },
}));

vi.mock("@/components/calendar/CalendarYearView", () => ({
  CalendarYearView: (props: Record<string, unknown>) => {
    calendarYearViewCalls.push(props);
    return <div>calendar-year</div>;
  },
}));

vi.mock("@/components/ui/filter-panels/calendar-filter-panel", () => ({
  CalendarFilterPanel: () => <div>calendar-filter</div>,
}));

vi.mock("@/components/CustomerData", () => ({
  CustomerData: () => <div>customer-data</div>,
}));

vi.mock("@/components/CustomersPage", () => ({
  CustomersPage: () => <div>customers-page</div>,
}));

vi.mock("@/components/TourManagement", () => ({
  TourManagement: () => <div>tour-management</div>,
}));

vi.mock("@/components/TeamManagement", () => ({
  TeamManagement: () => <div>team-management</div>,
}));

vi.mock("@/components/EmployeesPage", () => ({
  EmployeesPage: (props: Record<string, unknown>) => {
    employeesPageCalls.push(props);
    return <div data-testid="employees-page">employees-page</div>;
  },
}));

vi.mock("@/components/ProjectForm", () => ({
  ProjectForm: (props: Record<string, unknown>) => {
    projectFormCalls.push(props);
    return <div data-testid="project-form">project-form</div>;
  },
}));

vi.mock("@/components/ProjectsPage", () => ({
  ProjectsPage: () => <div>projects-page</div>,
}));

vi.mock("@/components/AppointmentForm", () => ({
  AppointmentForm: (props: Record<string, unknown>) => {
    appointmentFormCalls.push(props);
    return <div data-testid="appointment-form">appointment-form</div>;
  },
}));

vi.mock("@/components/AppointmentsListPage", () => ({
  AppointmentsListPage: (props: Record<string, unknown>) => {
    appointmentsListCalls.push(props);
    return <div data-testid="appointments-list">appointments-list</div>;
  },
}));

vi.mock("@/components/HelpTextsPage", () => ({
  HelpTextsPage: () => <div>helptexts-page</div>,
}));

vi.mock("@/components/HelpTextForm", () => ({
  HelpTextForm: () => <div>helptext-form</div>,
}));

vi.mock("@/components/SettingsPage", () => ({
  SettingsPage: () => <div>settings-page</div>,
}));

vi.mock("@/components/UsersPage", () => ({
  UsersPage: () => <div>users-page</div>,
}));

vi.mock("@/components/MasterDataPage", () => ({
  MasterDataPage: () => <div>master-data-page</div>,
}));

vi.mock("@/components/ReportsPage", () => ({
  ReportsPage: () => <div>reports-page</div>,
}));

vi.mock("@/components/MonitoringPage", () => ({
  MonitoringPage: () => <div>monitoring-page</div>,
}));

vi.mock("@/components/JournalPage", () => ({
  JournalPage: (props: Record<string, unknown>) => {
    journalPageCalls.push(props);
    return <div data-testid="journal-page">journal-page</div>;
  },
}));

vi.mock("@/components/TourPostalPlanView", () => ({
  TourPostalPlanView: (props: Record<string, unknown>) => {
    tourPostalPlanViewCalls.push(props);
    return <div data-testid="tour-postal-plan-view">tour-postal-plan-view</div>;
  },
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: () => ({
    filters: { employeeId: null },
    setFilter: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => true,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
    toasts: [],
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClient: class QueryClient {
    invalidateQueries = vi.fn();
    refetchQueries = vi.fn();
    setQueryData = vi.fn();
    getQueryData = vi.fn();
    ensureQueryData = vi.fn();
    fetchQuery = vi.fn();
  },
  useQuery: () => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    refetchQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    ensureQueryData: vi.fn(),
    fetchQuery: vi.fn(),
  }),
}));

async function loadHome(stateOverrides: Record<number, unknown>) {
  vi.resetModules();

  const setters = new Map<number, ReturnType<typeof vi.fn>>();

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    let stateCall = 0;
    return {
      ...actual,
      useState: (<T,>(initial: T | (() => T)) => {
        stateCall += 1;
        const setter = vi.fn();
        setters.set(stateCall, setter);
        const initialValue = typeof initial === "function" ? (initial as () => T)() : initial;
        const value = Object.prototype.hasOwnProperty.call(stateOverrides, stateCall)
          ? stateOverrides[stateCall] as T
          : initialValue;
        return [value, setter] as [T, React.Dispatch<React.SetStateAction<T>>];
      }) as typeof actual.useState,
    };
  });

  const module = await import("../../../client/src/pages/Home");
  return { Home: module.default, setters };
}

describe("PKG-08 home behavior wiring", () => {
  const fixedDate = new Date("2099-01-10T00:00:00.000Z");

  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
    sidebarCalls.length = 0;
    appointmentsListCalls.length = 0;
    projectFormCalls.length = 0;
    calendarWorkspaceCalls.length = 0;
    calendarYearViewCalls.length = 0;
    appointmentFormCalls.length = 0;
    employeesPageCalls.length = 0;
    journalPageCalls.length = 0;
    tourPostalPlanViewCalls.length = 0;
  });

  it("opens the appointment form from the standalone appointments list with return context", async () => {
    const { Home, setters } = await loadHome({
      1: fixedDate,
      2: "appointmentsList",
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    const onOpenAppointment = appointmentsListCalls[0].onOpenAppointment as (appointmentId: number) => void;
    onOpenAppointment(77);

    expect(setters.get(24)).toHaveBeenCalledWith({
      appointmentId: 77,
      returnContext: { targetView: "appointmentsList" },
    });
    expect(setters.get(2)).toHaveBeenCalledWith("appointment");
  });

  it("hides the sidebar while the employees form is visible", async () => {
    const { Home } = await loadHome({
      1: fixedDate,
      2: "employees",
      27: true,
    });

    const html = renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(html).not.toContain("data-testid=\"sidebar\"");
    expect(employeesPageCalls[0].onEditingChange).toEqual(expect.any(Function));
  });

  it("opens the contextual calendar from the project form with project-bound return context", async () => {
    const { Home, setters } = await loadHome({
      1: fixedDate,
      2: "project",
      4: 33,
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    const onOpenCalendarWorkspace = projectFormCalls[0].onOpenCalendarWorkspace as (context: { projectId: number }) => void;
    onOpenCalendarWorkspace({ projectId: 33 });

    expect(setters.get(9)).toHaveBeenCalledWith({
      projectId: 33,
      activeView: "week",
      currentDate: fixedDate,
      returnContext: { targetView: "project", projectId: 33 },
    });
    expect(setters.get(2)).toHaveBeenCalledWith("calendarContextual");
  });

  it("passes contextual mode into CalendarWorkspace when the contextual calendar is active", async () => {
    const { Home } = await loadHome({
      1: fixedDate,
      2: "calendarContextual",
      9: {
        projectId: 44,
        activeView: "week",
        currentDate: fixedDate,
        returnContext: { targetView: "project", projectId: 44 },
      },
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(calendarWorkspaceCalls[0]).toMatchObject({
      mode: "contextual",
      projectId: 44,
      hideMainNavigation: true,
    });
  });

  it("opens a project from the global calendar workspace and returns to the calendar view", async () => {
    const { Home, setters } = await loadHome({
      1: fixedDate,
      2: "week",
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    const onOpenProject = calendarWorkspaceCalls[0].onOpenProject as (projectId: number) => void;
    onOpenProject(123);

    expect(setters.get(4)).toHaveBeenCalledWith(123);
    expect(setters.get(8)).toHaveBeenCalledWith("week");
    expect(setters.get(2)).toHaveBeenCalledWith("project");
  });

  it("opens a project from the contextual calendar workspace and returns to the contextual calendar", async () => {
    const { Home, setters } = await loadHome({
      1: fixedDate,
      2: "calendarContextual",
      9: {
        projectId: 44,
        activeView: "week",
        currentDate: fixedDate,
        returnContext: { targetView: "project", projectId: 44 },
      },
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    const onOpenProject = calendarWorkspaceCalls[0].onOpenProject as (projectId: number) => void;
    onOpenProject(456);

    expect(setters.get(4)).toHaveBeenCalledWith(456);
    expect(setters.get(8)).toHaveBeenCalledWith("calendarContextual");
    expect(setters.get(2)).toHaveBeenCalledWith("project");
  });

  it("renders the appointment overlay and closes it via the overlay save handler", async () => {
    const { Home, setters } = await loadHome({
      1: fixedDate,
      2: "appointmentsList",
      25: {
        origin: "monitoring",
        appointmentId: 91,
        returnContext: { targetView: "monitoring" },
      },
    });

    const html = renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(html).toContain("appointment-form-overlay");
    expect(appointmentFormCalls[0]).toMatchObject({
      appointmentId: 91,
      showBackButton: true,
    });

    const onSaved = appointmentFormCalls[0].onSaved as () => void;
    onSaved();
    expect(setters.get(25)).toHaveBeenCalledWith(null);
  });

  it("restores the week scroll position when returning from the fullscreen appointment form", async () => {
    const { Home, setters } = await loadHome({
      1: fixedDate,
      2: "appointment",
      24: {
        appointmentId: 12,
        returnContext: { targetView: "week" },
        weekScrollLeft: 144,
      },
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    const onSaved = appointmentFormCalls[0].onSaved as () => void;
    onSaved();

    expect(setters.get(26)).toHaveBeenCalledWith({
      scrollLeft: 144,
      scrollTop: null,
    });
    expect(setters.get(24)).toHaveBeenCalledWith(null);
    expect(setters.get(2)).toHaveBeenCalledWith("week");
  });

  it("passes pending week scroll restore into the global week workspace", async () => {
    const { Home } = await loadHome({
      1: fixedDate,
      2: "week",
      26: 88,
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(calendarWorkspaceCalls[0]).toMatchObject({
      mode: "global",
      activeView: "week",
      restoreRequest: 88,
    });
    expect(calendarWorkspaceCalls[0].onRestoreApplied).toEqual(expect.any(Function));
  });

  it("passes monitoring items into the global calendar workspace", async () => {
    const { Home } = await loadHome({
      1: fixedDate,
      2: "week",
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(calendarWorkspaceCalls[0]).toMatchObject({
      mode: "global",
      monitoringItems: [],
    });
  });

  it("renders the journal page inside the main view switch", async () => {
    const { Home } = await loadHome({
      1: fixedDate,
      2: "journal",
    });

    const html = renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(html).toContain("data-testid=\"sidebar\"");
    expect(html).toContain("data-testid=\"journal-page\"");
    expect(journalPageCalls).toHaveLength(1);
  });

  it("opens the appointment form from the tour postal plan with date and tour prefill", async () => {
    const { Home, setters } = await loadHome({
      1: fixedDate,
      2: "tourPostalPlan",
    });

    const html = renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(html).toContain("data-testid=\"tour-postal-plan-view\"");
    const onCreateAppointment = tourPostalPlanViewCalls[0].onCreateAppointment as (params: { date: string; tourId: number }) => void;
    onCreateAppointment({ date: "2099-01-14", tourId: 77 });

    expect(setters.get(24)).toHaveBeenCalledWith({
      initialDate: "2099-01-14",
      initialTourId: 77,
      returnContext: { targetView: "tourPostalPlan" },
    });
    expect(setters.get(2)).toHaveBeenCalledWith("appointment");
  });

  it("blocks monitoring for reader roles", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "READER",
      },
    });

    const { Home } = await loadHome({
      1: fixedDate,
      2: "monitoring",
    });

    const html = renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(html).not.toContain("monitoring-page");
  });

  it("blocks the tour postal plan view for reader roles", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "READER",
      },
    });

    const { Home } = await loadHome({
      1: fixedDate,
      2: "tourPostalPlan",
    });

    const html = renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(html).toContain("tour-postal-plan-unavailable");
    expect(html).not.toContain("tour-postal-plan-view");
  });

  it("passes the year calendar into readonly mode for reader roles", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "READER",
      },
    });

    const { Home } = await loadHome({
      1: fixedDate,
      2: "year",
    });

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(calendarYearViewCalls[0]).toMatchObject({
      readOnly: true,
      onOpenAppointment: expect.any(Function),
    });
    expect(calendarYearViewCalls[0].onNewAppointment).toBeUndefined();
  });

});
