import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  keepPreviousData: Symbol("keepPreviousData"),
  QueryClient: class QueryClient {},
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ settingsByKey: new Map(), setSetting: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: () => ({
    filters: { lastName: "", customerNumber: "", tagIds: [] },
    setFilter: vi.fn(),
    page: 1,
    setPage: vi.fn(),
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
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
  CustomerFilterPanel: () => <div>customer-filter-panel</div>,
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: () => <div>table-view</div>,
}));

vi.mock("@/components/ui/list-paging-footer", () => ({
  ListPagingFooter: ({ leadingSlot }: { leadingSlot?: React.ReactNode }) => <div>{leadingSlot}</div>,
}));

import { CustomersPage } from "../../../client/src/components/CustomersPage";

describe("Reader customers page readonly smoke", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "READER",
      },
    });
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/customers/list") {
        return {
          data: {
            page: 1,
            pageSize: 50,
            total: 1,
            totalPages: 1,
            items: [
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

  it("hides the create entrypoint for reader roles", () => {
    const markup = renderToStaticMarkup(<CustomersPage onNewCustomer={vi.fn()} tableOnly />);

    expect(markup).not.toContain("button-new-customer");
  });
});
