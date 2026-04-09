/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `Home` reicht den hochgezogenen Listenstatus controlled an Projekte, Kunden, Termine und Mitarbeiter weiter.
 * - Die Hauptnavigation nutzt fuer diese vier Listen keine lokalen Page-Defaults der Kindkomponenten mehr.
 *
 * Fehlerfaelle:
 * - `Home` vergisst einzelne controlled Props oder uebergibt weiter lokale Defaults.
 * - Eine Liste faellt beim View-Wechsel wieder auf ihren internen Initialzustand zurueck.
 *
 * Ziel:
 * Die zentrale Verdrahtung des persistenten Listenstatus in `Home` sichtbar ueber Komponenten-Props absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const customersPageCalls: Array<Record<string, unknown>> = [];
const projectsPageCalls: Array<Record<string, unknown>> = [];
const appointmentsPageCalls: Array<Record<string, unknown>> = [];
const employeesPageCalls: Array<Record<string, unknown>> = [];
const useListFiltersMock = vi.fn();

vi.mock("@/components/Sidebar", () => ({
  Sidebar: () => <div>sidebar</div>,
}));

vi.mock("@/components/CalendarWorkspace", () => ({
  CalendarWorkspace: () => <div>calendar</div>,
}));

vi.mock("@/components/calendar/CalendarYearView", () => ({
  CalendarYearView: () => <div>year</div>,
}));

vi.mock("@/components/ui/filter-panels/calendar-filter-panel", () => ({
  CalendarFilterPanel: () => <div>calendar-filter</div>,
}));

vi.mock("@/components/CustomerData", () => ({
  CustomerData: () => <div>customer-data</div>,
}));

vi.mock("@/components/CustomersPage", () => ({
  CustomersPage: (props: Record<string, unknown>) => {
    customersPageCalls.push(props);
    return <div>customers-page</div>;
  },
}));

vi.mock("@/components/TourManagement", () => ({
  TourManagement: () => <div>tours</div>,
}));

vi.mock("@/components/TeamManagement", () => ({
  TeamManagement: () => <div>teams</div>,
}));

vi.mock("@/components/EmployeesPage", () => ({
  EmployeesPage: (props: Record<string, unknown>) => {
    employeesPageCalls.push(props);
    return <div>employees-page</div>;
  },
}));

vi.mock("@/components/ProjectForm", () => ({
  ProjectForm: () => <div>project-form</div>,
}));

vi.mock("@/components/ProjectsPage", () => ({
  ProjectsPage: (props: Record<string, unknown>) => {
    projectsPageCalls.push(props);
    return <div>projects-page</div>;
  },
}));

vi.mock("@/components/AppointmentForm", () => ({
  AppointmentForm: () => <div>appointment-form</div>,
}));

vi.mock("@/components/AppointmentsListPage", () => ({
  AppointmentsListPage: (props: Record<string, unknown>) => {
    appointmentsPageCalls.push(props);
    return <div>appointments-page</div>;
  },
}));

vi.mock("@/components/HelpTextForm", () => ({
  HelpTextForm: () => <div>helptext-form</div>,
}));

vi.mock("@/components/SettingsPage", () => ({
  SettingsPage: () => <div>settings</div>,
}));

vi.mock("@/components/DemoDataPage", () => ({
  DemoDataPage: () => <div>demo</div>,
}));

vi.mock("@/components/UsersPage", () => ({
  UsersPage: () => <div>users</div>,
}));

vi.mock("@/components/MasterDataPage", () => ({
  MasterDataPage: () => <div>master-data</div>,
}));

vi.mock("@/components/ReportsPage", () => ({
  ReportsPage: () => <div>reports</div>,
}));

vi.mock("@/components/MonitoringPage", () => ({
  MonitoringPage: () => <div>monitoring</div>,
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: (options: unknown) => useListFiltersMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => true,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

async function loadHome(view: string) {
  vi.resetModules();

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    let stateCall = 0;
    return {
      ...actual,
      useState: (<T,>(initial: T | (() => T)) => {
        stateCall += 1;
        const initialValue = typeof initial === "function" ? (initial as () => T)() : initial;
        if (stateCall === 2) {
          return [view as T, vi.fn()] as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        return [initialValue, vi.fn()] as [T, React.Dispatch<React.SetStateAction<T>>];
      }) as typeof actual.useState,
    };
  });

  const module = await import("../../../client/src/pages/Home");
  return module.default;
}

describe("PKG-08 home list state persistence wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
    customersPageCalls.length = 0;
    projectsPageCalls.length = 0;
    appointmentsPageCalls.length = 0;
    employeesPageCalls.length = 0;

    useListFiltersMock.mockReset();
    useListFiltersMock
      .mockReturnValueOnce({
        filters: { employeeId: null },
        setFilter: vi.fn(),
      })
      .mockReturnValueOnce({
        filters: { title: "Projekt Persist", customerLastName: "", customerNumber: "", orderNumber: "4711", tagIds: [] },
        setFilter: vi.fn(),
        page: 3,
        setPage: vi.fn(),
      })
      .mockReturnValueOnce({
        filters: { lastName: "Kundenname", customerNumber: "81", tagIds: [] },
        setFilter: vi.fn(),
        page: 2,
        setPage: vi.fn(),
      })
      .mockReturnValueOnce({
        filters: { lastName: "Mitar", firstName: "Anna" },
        setFilter: vi.fn(),
      });
  });

  it("passes controlled project state from Home into ProjectsPage", async () => {
    const Home = await loadHome("projectList");

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(projectsPageCalls[0]).toMatchObject({
      filters: { title: "Projekt Persist", customerLastName: "", customerNumber: "", orderNumber: "4711", tagIds: [] },
      page: 3,
      projectScope: "all",
      sortKey: "title",
      sortDirection: "asc",
    });
  });

  it("passes controlled customer state from Home into CustomersPage", async () => {
    const Home = await loadHome("customerList");

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(customersPageCalls[0]).toMatchObject({
      filters: { lastName: "Kundenname", customerNumber: "81", tagIds: [] },
      page: 2,
      customerScope: "active",
      sortKey: "customerNumber",
      sortDirection: "asc",
    });
  });

  it("passes controlled appointments state from Home into AppointmentsListPage", async () => {
    const Home = await loadHome("appointmentsList");

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(appointmentsPageCalls[0]).toMatchObject({
      page: 1,
      sortKey: "date",
      sortDirection: "asc",
      appointmentScope: "all",
    });
    expect(appointmentsPageCalls[0].filters).toMatchObject({
      projectTitle: "",
      customerLastName: "",
      customerNumber: "",
      orderNumber: "",
      tagIds: [],
    });
  });

  it("passes controlled employee state from Home into EmployeesPage", async () => {
    const Home = await loadHome("employees");

    renderToStaticMarkup(<Home onLogout={() => undefined} />);

    expect(employeesPageCalls[0]).toMatchObject({
      filters: { lastName: "Mitar", firstName: "Anna" },
      employeeScope: "active",
      sortKey: "lastName",
      sortDirection: "asc",
    });
  });
});
