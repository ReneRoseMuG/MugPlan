/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `ProjectsPage` nutzt im controlled Modus uebergebene Filter-, Paging-, Scope- und Sortierwerte.
 * - Die Tabelle sortiert auf Basis des kontrollierten Sortierzustands statt lokaler Defaults.
 *
 * Fehlerfaelle:
 * - Controlled Props werden ignoriert und interne Defaults bleiben aktiv.
 * - Die sichtbare Sortierung driftet trotz externer Steuerung.
 *
 * Ziel:
 * Den controlled Zustand der Projektliste ueber Query-, Filter- und Tabellenverhalten absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const projectFilterPanelCalls: Array<Record<string, unknown>> = [];
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
    filters: { title: "internal", customerLastName: "internal", customerNumber: "0", orderNumber: "0", tagIds: [999] },
    setFilter: vi.fn(),
    page: 99,
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

vi.mock("@/components/ui/filter-panels/project-filter-panel", () => ({
  ProjectFilterPanel: (props: Record<string, unknown>) => {
    projectFilterPanelCalls.push(props);
    return <div>project-filter-panel</div>;
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

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: () => <div>preview</div>,
}));

import { ProjectsPage } from "../../../client/src/components/ProjectsPage";

describe("FT30 projects page controlled state", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    projectFilterPanelCalls.length = 0;
    tableViewCalls.length = 0;
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/projects/list") {
        return {
          data: {
            page: 4,
            pageSize: 50,
            total: 2,
            totalPages: 4,
            items: [
              {
                id: 1,
                customerId: 1,
                name: "Projekt B",
                orderNumber: "200",
                amount: 10,
                notesCount: 0,
                appointmentsCount: 0,
                nextAppointmentStartDate: null,
                nextAppointmentStartTimeHour: null,
                projectArticleItems: [],
                tags: [],
                attachmentsCount: 0,
                customer: { id: 1, customerNumber: "200", fullName: "Kunde Beta" },
              },
              {
                id: 2,
                customerId: 2,
                name: "Projekt A",
                orderNumber: "100",
                amount: 10,
                notesCount: 0,
                appointmentsCount: 0,
                nextAppointmentStartDate: null,
                nextAppointmentStartTimeHour: null,
                projectArticleItems: [],
                tags: [],
                attachmentsCount: 0,
                customer: { id: 2, customerNumber: "100", fullName: "Kunde Alpha" },
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
      <ProjectsPage
        filters={{ title: "Extern", customerLastName: "Extern", customerNumber: "42", orderNumber: "77", tagIds: [] }}
        onFilterChange={vi.fn()}
        page={4}
        onPageChange={vi.fn()}
        projectScope="all"
        onProjectScopeChange={vi.fn()}
        sortKey="customerNumber"
        onSortKeyChange={vi.fn()}
        sortDirection="desc"
        onSortDirectionChange={vi.fn()}
        tableOnly
      />,
    );

    expect(projectFilterPanelCalls[0]).toMatchObject({
      projectTitle: "Extern",
      customerLastName: "Extern",
      customerNumber: "42",
      orderNumber: "77",
      projectScope: "all",
    });
    expect(useQueryMock.mock.calls[0]?.[0]?.queryKey).toEqual([
      "/api/projects/list",
      "scope=all&page=4&pageSize=50&title=Extern&customerLastName=Extern&customerNumber=42&orderNumber=77",
    ]);
  });

  it("sorts table rows from the controlled sort props", () => {
    renderToStaticMarkup(
      <ProjectsPage
        filters={{ title: "", customerLastName: "", customerNumber: "", orderNumber: "", tagIds: [] }}
        onFilterChange={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
        projectScope="upcoming"
        onProjectScopeChange={vi.fn()}
        sortKey="customerNumber"
        onSortKeyChange={vi.fn()}
        sortDirection="desc"
        onSortDirectionChange={vi.fn()}
        tableOnly
      />,
    );

    const rows = tableViewCalls[0].rows as Array<{ project: { id: number } }>;
    expect(rows.map((row) => row.project.id)).toEqual([1, 2]);
  });

  it("uses all as the uncontrolled default scope", () => {
    renderToStaticMarkup(<ProjectsPage tableOnly />);

    expect(projectFilterPanelCalls[0]).toMatchObject({
      projectScope: "all",
    });
    expect(useQueryMock.mock.calls[0]?.[0]?.queryKey).toEqual([
      "/api/projects/list",
      "scope=all&page=99&pageSize=50&title=internal&customerLastName=internal&customerNumber=0&orderNumber=0&tagIds=999",
    ]);
  });
});
