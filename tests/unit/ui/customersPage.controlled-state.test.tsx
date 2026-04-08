/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `CustomersPage` nutzt im controlled Modus uebergebene Filter-, Paging-, Scope- und Sortierwerte.
 * - Die Tabellenreihenfolge folgt den kontrollierten Sortierwerten.
 *
 * Fehlerfaelle:
 * - Controlled Props werden ignoriert und die Liste arbeitet mit internen Defaults weiter.
 * - Die Tabelle sortiert trotz externer Steuerung weiterhin nach dem lokalen Standard.
 *
 * Ziel:
 * Die kontrollierbare Kundenliste auf ihren extern steuerbaren Zustand absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const customerFilterPanelCalls: Array<Record<string, unknown>> = [];
const tableViewCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  keepPreviousData: Symbol("keepPreviousData"),
  QueryClient: class QueryClient {},
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ settingsByKey: new Map(), setSetting: vi.fn().mockResolvedValue(undefined) }),
  useSetting: () => undefined,
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: () => ({
    filters: { lastName: "intern", customerNumber: "0", tagIds: [999] },
    setFilter: vi.fn(),
    page: 77,
    setPage: vi.fn(),
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, contentSlot, footerSlot }: { filterSlot?: React.ReactNode; contentSlot?: React.ReactNode; footerSlot?: React.ReactNode }) => (
    <section>{filterSlot}{contentSlot}{footerSlot}</section>
  ),
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/filter-panels/customer-filter-panel", () => ({
  CustomerFilterPanel: (props: Record<string, unknown>) => {
    customerFilterPanelCalls.push(props);
    return <div>customer-filter-panel</div>;
  },
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewCalls.push(props);
    return <div>table-view</div>;
  },
}));

vi.mock("@/components/ui/list-paging-footer", () => ({
  ListPagingFooter: () => <div>paging</div>,
}));

import { CustomersPage } from "../../../client/src/components/CustomersPage";

describe("FT30 customers page controlled state", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
    customerFilterPanelCalls.length = 0;
    tableViewCalls.length = 0;
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/customers/list") {
        return {
          data: {
            page: 5,
            pageSize: 50,
            total: 2,
            totalPages: 5,
            items: [
              {
                id: 10,
                customerNumber: "200",
                firstName: "Zoe",
                lastName: "Zulu",
                phone: "",
                email: "",
                tags: [],
                notesCount: 0,
                appointmentsCount: 0,
                nextAppointmentStartDate: null,
                nextAppointmentStartTimeHour: null,
                nextAppointmentId: null,
                historicalAppointments: [],
                attachmentsCount: 0,
              },
              {
                id: 11,
                customerNumber: "100",
                firstName: "Anna",
                lastName: "Alpha",
                phone: "",
                email: "",
                tags: [],
                notesCount: 0,
                appointmentsCount: 0,
                nextAppointmentStartDate: null,
                nextAppointmentStartTimeHour: null,
                nextAppointmentId: null,
                historicalAppointments: [],
                attachmentsCount: 0,
              },
            ],
          },
          isLoading: false,
        };
      }
      if (key === "/api/tags") return { data: [], isLoading: false };
      return { data: undefined, isLoading: false };
    });
  });

  it("prefers controlled filters, paging and scope over internal defaults", () => {
    renderToStaticMarkup(
      <CustomersPage
        filters={{ lastName: "Extern", customerNumber: "55", tagIds: [] }}
        onFilterChange={vi.fn()}
        page={5}
        onPageChange={vi.fn()}
        customerScope="inactive"
        onCustomerScopeChange={vi.fn()}
        sortKey="lastName"
        onSortKeyChange={vi.fn()}
        sortDirection="asc"
        onSortDirectionChange={vi.fn()}
        tableOnly
      />,
    );

    expect(customerFilterPanelCalls[0]).toMatchObject({
      customerLastName: "Extern",
      customerNumber: "55",
      customerScope: "inactive",
    });
    expect(useQueryMock.mock.calls[0]?.[0]?.queryKey).toEqual([
      "/api/customers/list",
      "scope=inactive&page=5&pageSize=50&lastName=Extern&customerNumber=55",
    ]);
  });

  it("sorts table rows from the controlled sort props", () => {
    renderToStaticMarkup(
      <CustomersPage
        filters={{ lastName: "", customerNumber: "", tagIds: [] }}
        onFilterChange={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
        customerScope="active"
        onCustomerScopeChange={vi.fn()}
        sortKey="lastName"
        onSortKeyChange={vi.fn()}
        sortDirection="asc"
        onSortDirectionChange={vi.fn()}
        tableOnly
      />,
    );

    const rows = tableViewCalls[0].rows as Array<{ customer: { id: number } }>;
    expect(rows.map((row) => row.customer.id)).toEqual([11, 10]);
  });
});
