/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Standalone-Domain-Views reichen keine controlled Listenstate-Props an Projekte, Kunden, Termine und Mitarbeiter weiter.
 *
 * Fehlerfaelle:
 * - Standalone-Aufrufer aktivieren versehentlich den neuen `Home`-gesteuerten Modus.
 *
 * Ziel:
 * Den uncontrolled Fallback der Standalone-Views gegen Regressionen absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const projectsPageCalls: Array<Record<string, unknown>> = [];
const customersPageCalls: Array<Record<string, unknown>> = [];
const appointmentsPageCalls: Array<Record<string, unknown>> = [];
const employeesPageCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/StandaloneLayout", () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/AppointmentForm", () => ({
  AppointmentForm: () => <div>appointment-form</div>,
}));

vi.mock("@/components/CustomerData", () => ({
  CustomerData: () => <div>customer-data</div>,
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

vi.mock("@/components/CustomersPage", () => ({
  CustomersPage: (props: Record<string, unknown>) => {
    customersPageCalls.push(props);
    return <div>customers-page</div>;
  },
}));

vi.mock("@/components/AppointmentsListPage", () => ({
  AppointmentsListPage: (props: Record<string, unknown>) => {
    appointmentsPageCalls.push(props);
    return <div>appointments-page</div>;
  },
}));

vi.mock("@/components/EmployeesPage", () => ({
  EmployeesPage: (props: Record<string, unknown>) => {
    employeesPageCalls.push(props);
    return <div>employees-page</div>;
  },
}));

vi.mock("@/components/ReportsPage", () => ({
  ReportsPage: () => <div>reports</div>,
}));

vi.mock("@/components/TeamManagement", () => ({
  TeamManagement: () => <div>teams</div>,
}));

vi.mock("@/components/TourManagement", () => ({
  TourManagement: () => <div>tours</div>,
}));

describe("standalone domain views list fallback", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    projectsPageCalls.length = 0;
    customersPageCalls.length = 0;
    appointmentsPageCalls.length = 0;
    employeesPageCalls.length = 0;
  });

  it("keeps all four standalone list views uncontrolled", async () => {
    const module = await import("../../../client/src/pages/StandaloneDomainViews");
    const {
      StandaloneAppointments,
      StandaloneProjects,
      StandaloneCustomers,
      StandaloneEmployees,
    } = module;

    renderToStaticMarkup(<StandaloneAppointments />);
    renderToStaticMarkup(<StandaloneProjects />);
    renderToStaticMarkup(<StandaloneCustomers />);
    renderToStaticMarkup(<StandaloneEmployees />);

    expect(appointmentsPageCalls[0]).not.toHaveProperty("filters");
    expect(projectsPageCalls[0]).not.toHaveProperty("filters");
    expect(customersPageCalls[0]).not.toHaveProperty("filters");
    expect(employeesPageCalls[0]).not.toHaveProperty("filters");
  });
});
