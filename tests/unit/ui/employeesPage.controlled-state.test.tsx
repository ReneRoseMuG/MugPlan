/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `EmployeesPage` nutzt im controlled Modus uebergebene Filter-, Scope- und Sortierwerte.
 * - Die sichtbare Tabellenreihenfolge folgt dem externen Sortierzustand.
 *
 * Fehlerfaelle:
 * - Controlled Props werden ignoriert und interne Defaults bleiben aktiv.
 * - Die Mitarbeiterliste sortiert trotz externer Steuerung weiterhin lokal.
 *
 * Ziel:
 * Die kontrollierbare Mitarbeiterliste auf extern steuerbaren Zustand absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const employeeFilterCalls: Array<Record<string, unknown>> = [];
const tableViewCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settingsByKey: new Map([["employees.viewMode", { resolvedValue: "table" }]]),
    setSetting: vi.fn().mockResolvedValue(undefined),
  }),
  useSetting: () => undefined,
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: () => ({
    filters: { lastName: "intern", firstName: "intern" },
    setFilter: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => "2099-04-08",
  PROJECT_APPOINTMENTS_ALL_FROM_DATE: "2099-01-01",
}));

vi.mock("@/lib/employee-filters", () => ({
  applyEmployeeFilters: (employees: unknown[]) => employees,
  defaultEmployeeFilters: { lastName: "", firstName: "" },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, contentSlot, footerSlot }: { filterSlot?: React.ReactNode; contentSlot?: React.ReactNode; footerSlot?: React.ReactNode }) => (
    <section>{filterSlot}{contentSlot}{footerSlot}</section>
  ),
}));

vi.mock("@/components/ui/filter-panels/employee-filter-panel", () => ({
  EmployeeFilterPanel: (props: Record<string, unknown>) => {
    employeeFilterCalls.push(props);
    return <div>employee-filter-panel</div>;
  },
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle?: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewCalls.push(props);
    return <div>table-view</div>;
  },
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/EmployeeForm", () => ({
  EmployeeForm: () => <div>employee-form</div>,
}));

vi.mock("@/components/ImportExportPage", () => ({
  EmployeeImportPanel: () => <div>import</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: () => null,
}));

import { EmployeesPage } from "../../../client/src/components/EmployeesPage";

describe("FT05+ employees page controlled state", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });
    employeeFilterCalls.length = 0;
    tableViewCalls.length = 0;
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
      const key = options.queryKey;
      if (Array.isArray(key) && key[0] === "/api/employees") {
        return {
          data: [
            { id: 2, firstName: "Zoe", lastName: "Zulu", fullName: "Zulu, Zoe", isActive: true, teamId: null, tags: [], notesCount: 0, attachmentsCount: 0 },
            { id: 1, firstName: "Anna", lastName: "Alpha", fullName: "Alpha, Anna", isActive: false, teamId: null, tags: [], notesCount: 0, attachmentsCount: 0 },
          ],
          isLoading: false,
        };
      }
      if (Array.isArray(key) && key[0] === "employees-page-appointments") return { data: new Map(), isLoading: false };
      return { data: [], isLoading: false };
    });
  });

  it("prefers controlled filters and scope over internal defaults", () => {
    renderToStaticMarkup(
      <EmployeesPage
        filters={{ lastName: "Extern", firstName: "Anna" }}
        onFilterChange={vi.fn()}
        employeeScope="inactive"
        onEmployeeScopeChange={vi.fn()}
        sortKey="firstName"
        onSortKeyChange={vi.fn()}
        sortDirection="asc"
        onSortDirectionChange={vi.fn()}
      />,
    );

    expect(employeeFilterCalls[0]).toMatchObject({
      employeeLastName: "Extern",
      employeeFirstName: "Anna",
      employeeScope: "inactive",
    });
  });

  it("sorts table rows from the controlled sort props", () => {
    renderToStaticMarkup(
      <EmployeesPage
        filters={{ lastName: "", firstName: "" }}
        onFilterChange={vi.fn()}
        employeeScope="active"
        onEmployeeScopeChange={vi.fn()}
        sortKey="firstName"
        onSortKeyChange={vi.fn()}
        sortDirection="asc"
        onSortDirectionChange={vi.fn()}
      />,
    );

    const rows = tableViewCalls[0].rows as Array<{ employee: { id: number } }>;
    expect(rows.map((row) => row.employee.id)).toEqual([1, 2]);
  });
});
