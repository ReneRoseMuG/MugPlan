/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Admin sieht im Filterpanel den Inaktive-Scope und kann ihn aendern.
 * - Nicht-Admin erhaelt keinen Scope-Schalter.
 * - EmployeesPage fragt keine legacy `all`-Scope-Variante mehr ab.
 *
 * Fehlerfaelle:
 * - Nicht-Admin sieht wieder den Inaktive-Scope.
 * - EmployeesPage verwendet erneut den alten `all`-Scope.
 *
 * Ziel:
 * Sichtbare Rollen-UX und echte Query-Scopes der Mitarbeiterliste absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const setFilterMock = vi.fn();
const setSettingMock = vi.fn();
const employeeFilterCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ settingsByKey: new Map(), setSetting: setSettingMock }),
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: () => ({
    filters: { lastName: "" },
    setFilter: setFilterMock,
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
  getBerlinTodayDateString: () => "2026-03-20",
  PROJECT_APPOINTMENTS_ALL_FROM_DATE: "2026-01-01",
}));

vi.mock("@/lib/employee-filters", () => ({
  applyEmployeeFilters: (employees: unknown[]) => employees,
  defaultEmployeeFilters: { lastName: "" },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, footerSlot, contentSlot }: { filterSlot?: React.ReactNode; footerSlot?: React.ReactNode; contentSlot?: React.ReactNode }) => (
    <div>
      {filterSlot}
      {footerSlot}
      {contentSlot}
    </div>
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
  TableView: () => <div>table-view</div>,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/EmployeeForm", () => ({
  EmployeeForm: () => <div>employee-form</div>,
}));

vi.mock("@/components/ImportExportPage", () => ({
  EmployeeImportPanel: () => <div>import-panel</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/team-info-badge", () => ({
  TeamInfoBadge: () => <span>team</span>,
}));

vi.mock("@/components/ui/tour-info-badge", () => ({
  TourInfoBadge: () => <span>tour</span>,
}));

vi.mock("@/components/ui/appointment-count-badge", () => ({
  AppointmentCountBadge: ({ count }: { count: number }) => <span>{count}</span>,
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: () => null,
}));

vi.mock("lucide-react", () => ({
  Users: () => <span>users</span>,
  FolderKanban: () => <span>folder-kanban</span>,
  UsersRound: () => <span>users-round</span>,
  UserRound: () => <span>user-round</span>,
  MapPin: () => <span>map-pin</span>,
  Layers: () => <span>layers</span>,
  CalendarRange: () => <span>calendar-range</span>,
  ShieldAlert: () => <span>shield-alert</span>,
  FileText: () => <span>file-text</span>,
  Settings: () => <span>settings</span>,
  Phone: () => <span>phone</span>,
  Mail: () => <span>mail</span>,
  Plus: () => <span>plus</span>,
  Upload: () => <span>upload</span>,
  LayoutGrid: () => <span>grid</span>,
  Table2: () => <span>table</span>,
  ArrowDown: () => <span>down</span>,
  ArrowUp: () => <span>up</span>,
  ArrowUpDown: () => <span>updown</span>,
  Power: () => <span>power</span>,
  PowerOff: () => <span>poweroff</span>,
}));

import { EmployeesPage } from "../../../client/src/components/EmployeesPage";

beforeEach(() => {
  employeeFilterCalls.length = 0;
  setFilterMock.mockReset();
  setSettingMock.mockReset();
  useMutationMock.mockReset();
  useQueryMock.mockReset();
  vi.stubGlobal("React", React);
  useMutationMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  useQueryMock.mockImplementation((options: { queryKey?: unknown }) => {
    const key = options.queryKey;
    if (Array.isArray(key) && key[0] === "employees-page-appointments") {
      return { data: new Map(), isLoading: false };
    }
    return { data: [], isLoading: false };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FT05+ employees scope UX", () => {
  it("shows the inactive scope toggle only for admins", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });

    renderToStaticMarkup(<EmployeesPage />);

    const latestFilterCall = employeeFilterCalls.at(-1);
    expect(latestFilterCall?.employeeScope).toBe("active");
    expect(typeof latestFilterCall?.onEmployeeScopeChange).toBe("function");
    const employeeScopes = useQueryMock.mock.calls
      .filter(([options]) => options?.enabled !== false)
      .map(([options]) => options?.queryKey)
      .filter((key) => Array.isArray(key) && key[0] === "/api/employees")
      .map((key) => key[1]?.scope);
    expect(employeeScopes).toContain("active");
    expect(employeeScopes).toContain("inactive");
    expect(employeeScopes).not.toContain("all");
  });

  it("hides the inactive scope toggle for non-admin users", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "DISPATCHER",
      },
    });

    renderToStaticMarkup(<EmployeesPage />);

    const latestFilterCall = employeeFilterCalls.at(-1);
    expect(latestFilterCall?.employeeScope).toBeUndefined();
    expect(latestFilterCall?.onEmployeeScopeChange).toBeUndefined();
    const employeeScopes = useQueryMock.mock.calls
      .filter(([options]) => options?.enabled !== false)
      .map(([options]) => options?.queryKey)
      .filter((key) => Array.isArray(key) && key[0] === "/api/employees")
      .map((key) => key[1]?.scope);
    expect(employeeScopes).toEqual(["active"]);
  });
});
