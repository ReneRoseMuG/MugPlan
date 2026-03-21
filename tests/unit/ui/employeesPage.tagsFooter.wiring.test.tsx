/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - EmployeesPage rendert in der Board-Karte den Footer mit Terminzaehler und Tag-Zeile.
 * - Die Mitarbeiterkarte uebergibt die serverseitig gelieferten Tags an EntityTagFooterRow.
 *
 * Fehlerfaelle:
 * - Mitarbeiter-Tags gehen im Kartenfooter verloren.
 * - Der Kartenfooter rendert nur noch den Terminzaehler ohne Tag-Zeile.
 *
 * Ziel:
 * Das Footer-Wiring der Mitarbeiterkarte fuer Tags ueber gerenderte Komponenten-Props absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingsMock = vi.fn();
const useListFiltersMock = vi.fn();
const entityCardCalls: Array<Record<string, unknown>> = [];
const appointmentBadgeCalls: Array<Record<string, unknown>> = [];
const tagFooterCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: (options: unknown) => useListFiltersMock(options),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, footerSlot, contentSlot }: { filterSlot?: React.ReactNode; footerSlot?: React.ReactNode; contentSlot?: React.ReactNode }) => (
    <section>
      {filterSlot}
      {footerSlot}
      {contentSlot}
    </section>
  ),
}));

vi.mock("@/components/ui/board-view", () => ({
  BoardView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: ({ fallbackTitle }: { fallbackTitle: string }) => <div>{fallbackTitle}</div>,
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: () => <div>table-view</div>,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/filter-panels/employee-filter-panel", () => ({
  EmployeeFilterPanel: () => <div>employee-filter-panel</div>,
}));

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: (props: Record<string, unknown> & { children?: React.ReactNode; footer?: React.ReactNode }) => {
    entityCardCalls.push(props);
    return (
      <article data-testid={String(props.testId)}>
        {props.children}
        {props.footer}
      </article>
    );
  },
}));

vi.mock("@/components/ui/appointment-count-badge", () => ({
  AppointmentCountBadge: (props: Record<string, unknown>) => {
    appointmentBadgeCalls.push(props);
    return <div data-testid={String(props.testId)}>Geplante Termine:{String(props.count)}</div>;
  },
}));

vi.mock("@/components/ui/entity-tag-footer-row", () => ({
  EntityTagFooterRow: (props: Record<string, unknown>) => {
    tagFooterCalls.push(props);
    return <div data-testid={String(props.testId)}>tags</div>;
  },
}));

vi.mock("@/components/EmployeeForm", () => ({
  EmployeeForm: () => <div>employee-form</div>,
}));

vi.mock("@/components/ImportExportPage", () => ({
  EmployeeImportPanel: () => <div>employee-import-panel</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/team-info-badge", () => ({
  TeamInfoBadge: () => <div>team</div>,
}));

vi.mock("@/components/ui/tour-info-badge", () => ({
  TourInfoBadge: () => <div>tour</div>,
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: vi.fn(() => <div>preview</div>),
}));

import { EmployeesPage } from "../../../client/src/components/EmployeesPage";

describe("FT05+ employees page tags footer wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    entityCardCalls.length = 0;
    appointmentBadgeCalls.length = 0;
    tagFooterCalls.length = 0;

    useSettingsMock.mockReturnValue({
      settingsByKey: new Map(),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useListFiltersMock.mockReturnValue({
      filters: { lastName: "" },
      setFilter: vi.fn(),
    });

    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const queryKey = options.queryKey;
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

      if (key === "/api/employees") {
        return {
          data: [
            {
              id: 8,
              firstName: "Mia",
              lastName: "Muster",
              fullName: "Muster, Mia",
              phone: "0123",
              email: "mia@example.test",
              teamId: null,
              tourId: null,
              isActive: true,
              version: 2,
              tags: [
                { id: 4, name: "Montage", color: "#112233", isDefault: false, version: 1 },
              ],
            },
          ],
          isLoading: false,
        };
      }

      if (key === "/api/tours" || key === "/api/teams") {
        return { data: [], isLoading: false };
      }

      if (key === "employees-page-appointments") {
        return {
          data: new Map([[8, [{ id: 91, startDate: "2099-03-10", startTimeHour: 8 }]]]),
          isLoading: false,
        };
      }

      return { data: [], isLoading: false };
    });

    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "DISPATCHER"),
        },
      },
      configurable: true,
    });
  });

  it("renders employee tags in the visible entity card footer", () => {
    const markup = renderToStaticMarkup(<EmployeesPage />);

    expect(markup).toContain("Geplante Termine:1");
    expect(entityCardCalls).toHaveLength(1);
    expect(entityCardCalls[0]).toMatchObject({
      testId: "employee-card-8",
      footerVisibility: "visible",
    });
    expect(appointmentBadgeCalls[0]).toMatchObject({
      count: 1,
      testId: "text-employee-current-appointments-8",
      fullWidth: true,
    });
    expect(tagFooterCalls).toHaveLength(1);
    expect(tagFooterCalls[0]).toMatchObject({
      testId: "employee-card-tags-8",
      tags: [{ id: 4, name: "Montage" }],
    });
  });
});
