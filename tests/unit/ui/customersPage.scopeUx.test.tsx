/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Admin sieht den Scope-Switch "Inaktive" im Kundenfilter.
 * - Nicht-Admin erhaelt keinen Scope-Switch im Filterpanel.
 * - Die Kundenliste fragt immer mit einem expliziten Scope ab.
 *
 * Fehlerfaelle:
 * - Inaktive-Sicht fuer Admin fehlt oder ist nicht verdrahtet.
 * - Nicht-Admin kann den Inaktive-Scope dennoch ansteuern.
 *
 * Ziel:
 * Die Rollen-UX und Scope-Abfrage der Kundenliste ueber Komponenten-Props und Query-Keys absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useSettingsMock = vi.fn();
const useListFiltersMock = vi.fn();
const customerFilterPanelCalls: Array<Record<string, unknown>> = [];
const booleanToggleCalls: Array<Record<string, unknown>> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("@/hooks/useListFilters", () => ({
  useListFilters: (options: unknown) => useListFiltersMock(options),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ filterSlot, contentSlot }: { filterSlot?: React.ReactNode; contentSlot?: React.ReactNode }) => (
    <section>
      {filterSlot}
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

vi.mock("@/components/ui/entity-card", () => ({
  EntityCard: ({ children, footer }: { children?: React.ReactNode; footer?: React.ReactNode }) => (
    <article>
      {children}
      {footer}
    </article>
  ),
}));

vi.mock("@/components/ui/appointment-count-badge", () => ({
  AppointmentCountBadge: ({ count }: { count: number }) => <div>{count}</div>,
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: () => <div>notes-preview</div>,
}));

vi.mock("@/components/ui/filter-panels/customer-filter-panel", () => ({
  CustomerFilterPanel: (props: Record<string, unknown>) => {
    customerFilterPanelCalls.push(props);
    return <div>customer-filter-panel</div>;
  },
}));

vi.mock("@/components/ui/filter-panels/filter-panel", () => ({
  FilterPanel: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/filters/customer-name-filter-input", () => ({
  CustomerNameFilterInput: () => <div>name-filter</div>,
}));

vi.mock("@/components/filters/customer-number-filter-input", () => ({
  CustomerNumberFilterInput: () => <div>number-filter</div>,
}));

vi.mock("@/components/filters/boolean-toggle-filter-input", () => ({
  BooleanToggleFilterInput: (props: Record<string, unknown>) => {
    booleanToggleCalls.push(props);
    return <div>{String(props.label)}</div>;
  },
}));

vi.mock("@/components/ui/badge-previews/appointment-weekly-panel-preview", () => ({
  createAppointmentWeeklyPanelPreview: vi.fn(() => <div>preview</div>),
}));

import { CustomersPage } from "../../../client/src/components/CustomersPage";
import { CustomerInactiveScopeFilterInput } from "../../../client/src/components/filters/customer-inactive-scope-filter-input";

describe("FT05+ customers scope UX wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    customerFilterPanelCalls.length = 0;
    booleanToggleCalls.length = 0;

    useSettingsMock.mockReturnValue({
      settingsByKey: new Map(),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useListFiltersMock.mockReturnValue({
      filters: { lastName: "", customerNumber: "" },
      setFilter: vi.fn(),
      page: 1,
      setPage: vi.fn(),
    });
    useQueryMock.mockImplementation((options: { queryKey: unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      if (key === "/api/customers/list") {
        return {
          data: { page: 1, pageSize: 50, total: 0, totalPages: 0, items: [] },
          isLoading: false,
        };
      }
      return { data: undefined, isLoading: false };
    });
  });

  it("wires admin-only customer scope switch and active scope query", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "ADMIN"),
        },
      },
      configurable: true,
    });

    renderToStaticMarkup(<CustomersPage />);

    expect(customerFilterPanelCalls).toHaveLength(1);
    expect(customerFilterPanelCalls[0]).toMatchObject({
      customerScope: "active",
    });
    expect(customerFilterPanelCalls[0].onCustomerScopeChange).toEqual(expect.any(Function));
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/customers/list", "scope=active&page=1&pageSize=50"],
    }));
  });

  it("keeps non-admin users on active scope without filter toggle", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: vi.fn(() => "DISPATCHER"),
        },
      },
      configurable: true,
    });

    renderToStaticMarkup(<CustomersPage />);

    expect(customerFilterPanelCalls).toHaveLength(1);
    expect(customerFilterPanelCalls[0].customerScope).toBeUndefined();
    expect(customerFilterPanelCalls[0].onCustomerScopeChange).toBeUndefined();
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["/api/customers/list", "scope=active&page=1&pageSize=50"],
    }));
  });

  it("uses the stable toggle label for inactive customers", () => {
    renderToStaticMarkup(
      <CustomerInactiveScopeFilterInput
        customerScope="active"
        onCustomerScopeChange={vi.fn()}
      />,
    );

    expect(booleanToggleCalls).toHaveLength(1);
    expect(booleanToggleCalls[0]).toMatchObject({
      id: "customer-filter-scope-inactive",
      label: "Inaktive",
      checked: false,
    });
  });
});
