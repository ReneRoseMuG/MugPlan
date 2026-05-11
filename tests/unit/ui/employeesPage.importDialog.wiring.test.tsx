/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Admin sieht den Import-Einstieg in der Mitarbeiterliste.
 * - Der Importdialog startet geschlossen mit Reset-Signal 0.
 * - Nicht-Admin sieht keinen Import-Einstieg.
 *
 * Fehlerfaelle:
 * - Import-Button ist fuer Nicht-Admin sichtbar.
 * - Importpanel wird nicht ueber den Dialog gerendert.
 *
 * Ziel:
 * Sichtbare Import-UX der Mitarbeiterliste ohne Source-Assertions absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const setFilterMock = vi.fn();
const setSettingMock = vi.fn();
const buttonCalls: Array<Record<string, unknown>> = [];
const dialogCalls: Array<Record<string, unknown>> = [];
const importPanelCalls: Array<Record<string, unknown>> = [];

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
  Button: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    buttonCalls.push(props);
    return <button type="button">{props.children}</button>;
  },
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ footerSlot, contentSlot, filterSlot }: { footerSlot?: React.ReactNode; contentSlot?: React.ReactNode; filterSlot?: React.ReactNode }) => (
    <div>
      {filterSlot}
      {footerSlot}
      {contentSlot}
    </div>
  ),
}));

vi.mock("@/components/ui/filter-panels/employee-filter-panel", () => ({
  EmployeeFilterPanel: () => <div>filter</div>,
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
  EmployeeImportPanel: (props: Record<string, unknown>) => {
    importPanelCalls.push(props);
    return <div>employee-import-panel</div>;
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    dialogCalls.push(props);
    return <div>{props.children}</div>;
  },
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
  History: () => <span>history</span>,
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
  ArrowLeft: () => <span>left</span>,
  AlertCircle: () => <span>alert-circle</span>,
  CheckCircle2: () => <span>check-circle</span>,
  Circle: () => <span>circle</span>,
  Loader2: () => <span>loader</span>,
  TriangleAlert: () => <span>triangle-alert</span>,
  Power: () => <span>power</span>,
  PowerOff: () => <span>poweroff</span>,
  Info: () => <span>info</span>,
}));

import { EmployeesPage } from "../../../client/src/components/EmployeesPage";

beforeEach(() => {
  buttonCalls.length = 0;
  dialogCalls.length = 0;
  importPanelCalls.length = 0;
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

describe("FT23 UI: employees import dialog", () => {
  it("renders import entry point and closed dialog for admins", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "ADMIN",
      },
    });

    renderToStaticMarkup(<EmployeesPage />);

    expect(buttonCalls.some((call) => call["data-testid"] === "button-open-employee-import-dialog")).toBe(true);
    expect(dialogCalls.at(-1)?.open).toBe(false);
    expect(importPanelCalls.at(-1)?.resetSignal).toBe(0);
  });

  it("hides the import entry point for non-admin users", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "DISPATCHER",
      },
    });

    renderToStaticMarkup(<EmployeesPage />);

    expect(buttonCalls.some((call) => call["data-testid"] === "button-open-employee-import-dialog")).toBe(false);
  });
});
