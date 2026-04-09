/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `AppointmentsListPage` nutzt controlled Filter-, Paging-, Sortier- und `appointmentScope`-Props.
 * - Ohne controlled Props startet der Standalone-Fallback mit der ungefilterten Terminmenge.
 *
 * Fehlerfaelle:
 * - Controlled Props werden ignoriert und interne Werte bleiben aktiv.
 * - Der uncontrolled Fallback aktiviert unerwartet weiter einen Heute-Filter.
 *
 * Ziel:
 * Die Terminliste auf kontrollierten Zustand und stabilen Standalone-Fallback absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const filterPanelCalls: Array<Record<string, unknown>> = [];
const tableViewCalls: Array<Record<string, unknown>> = [];
const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, contentSlot, footerSlot }: { filterSlot?: React.ReactNode; contentSlot?: React.ReactNode; footerSlot?: React.ReactNode }) => (
    <section>{filterSlot}{contentSlot}{footerSlot}</section>
  ),
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/list-paging-footer", () => ({
  ListPagingFooter: () => <div>paging</div>,
}));

vi.mock("@/components/ui/filter-panels/appointments-filter-panel", () => ({
  AppointmentsFilterPanel: (props: Record<string, unknown>) => {
    filterPanelCalls.push(props);
    return <div>appointments-filter-panel</div>;
  },
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewCalls.push(props);
    return <div>table-view</div>;
  },
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: () => <div>preview</div>,
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-04-08",
}));

import { AppointmentsListPage } from "../../../client/src/components/AppointmentsListPage";

describe("FT04 appointments list page controlled state", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "DISPATCHER",
      },
    });
    filterPanelCalls.length = 0;
    tableViewCalls.length = 0;
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[0] === "/api/tours") return { data: [{ id: 4, name: "Nord" }], isLoading: false };
      if (options.queryKey[0] === "/api/tags") return { data: [], isLoading: false };
      if (options.queryKey[0] === "appointments-list") {
        return {
          data: {
            page: 2,
            pageSize: 25,
            total: 2,
            totalPages: 2,
            items: [
              {
                id: 7,
                version: 1,
                startDate: "2099-04-10",
                startTime: "10:00",
                projectName: "Projekt Z",
                projectOrderNumber: "2",
                customer: { customerNumber: "2", fullName: "Kunde Z" },
                tourName: "Nord",
                isCancelled: false,
              },
              {
                id: 6,
                version: 1,
                startDate: "2099-04-09",
                startTime: "08:00",
                projectName: "Projekt A",
                projectOrderNumber: "1",
                customer: { customerNumber: "1", fullName: "Kunde A" },
                tourName: "Nord",
                isCancelled: false,
              },
            ],
          },
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });
  });

  it("prefers controlled filters, paging, sorting and appointment scope", () => {
    renderToStaticMarkup(
      <AppointmentsListPage
        context={{ type: "standalone" }}
        filters={{
          employeeId: undefined,
          projectTitle: "Extern",
          customerLastName: "Kunde",
          customerNumber: "33",
          orderNumber: "77",
          tagIds: [],
          tourId: 4,
          dateFrom: undefined,
          dateTo: "2099-04-30",
        }}
        onFiltersChange={vi.fn()}
        page={2}
        onPageChange={vi.fn()}
        sortKey="customer"
        onSortKeyChange={vi.fn()}
        sortDirection="desc"
        onSortDirectionChange={vi.fn()}
        appointmentScope="all"
        onAppointmentScopeChange={vi.fn()}
      />,
    );

    expect(filterPanelCalls[0]).toMatchObject({
      filters: {
        projectTitle: "Extern",
        customerLastName: "Kunde",
        customerNumber: "33",
        orderNumber: "77",
        tourId: 4,
        dateFrom: undefined,
        dateTo: "2099-04-30",
      },
      appointmentScope: "all",
    });
    expect(useQueryMock.mock.calls[2]?.[0]?.queryKey).toEqual([
      "appointments-list",
      "all",
      {
        employeeId: undefined,
        projectTitle: "Extern",
        customerLastName: "Kunde",
        customerNumber: "33",
        orderNumber: "77",
        tagIds: [],
        tourId: 4,
        dateFrom: undefined,
        dateTo: "2099-04-30",
      },
      2,
      25,
      "DISPATCHER",
    ]);
    const rows = tableViewCalls[0].rows as Array<{ id: number }>;
    expect(rows.map((row) => row.id)).toEqual([7, 6]);
  });

  it("keeps the standalone fallback defaults when no controlled props are passed", () => {
    renderToStaticMarkup(<AppointmentsListPage context={{ type: "standalone" }} />);

    expect(filterPanelCalls[0]).toMatchObject({
      appointmentScope: "all",
    });
    expect(filterPanelCalls[0].filters).toMatchObject({
      dateFrom: undefined,
      projectTitle: "",
      customerLastName: "",
      customerNumber: "",
      orderNumber: "",
      tagIds: [],
    });
  });
});
