/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Reports-Seite rendert die prototypnahen FT26-Toggles fuer Datum und Kalenderwoche samt Header-Actions.
 * - Die Produktionsplanung zeigt keinen alten Info-Tag-, Sonderblock- oder deaktivierten Kategorie-Block mehr.
 * - Nicht-Admins sehen keinen Kategorie-Layout-Button; Admins erhalten stattdessen den Dialog-Einstieg.
 *
 * Fehlerfaelle:
 * - Alte Produktionsplanung-Blöcke oder Legacy-Tabelle bleiben sichtbar verdrahtet.
 * - Die prototypnahen Toggle- und Action-Elemente fehlen oder fallen auf die alte Tab-Struktur zurueck.
 * - Der Admin-Einstieg fuer das Kategorie-Layout fehlt oder wird Nicht-Admins angezeigt.
 *
 * Ziel:
 * Das sichtbare FT26-UI-Wiring der ReportsPage im UI-Handoff regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSettingsMock = vi.fn();
const useQueryMock = vi.fn();
const tableViewMock = vi.fn();
const localStorageGetItemMock = vi.fn();

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
  useSetting: (key: string) => useSettingsMock().settingsByKey.get(key)?.resolvedValue,
  resolveLegacyProduktionsplanungSelection: (value: unknown) => value,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  QueryClient: class QueryClient {
    invalidateQueries = vi.fn();
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input data-testid={String(props["data-testid"] ?? "")} />,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: Record<string, unknown>) => <input type="checkbox" data-testid={String(props["data-testid"] ?? "")} checked={Boolean(props.checked)} readOnly />,
}));

vi.mock("@/components/ui/list-layout", () => ({
  ListLayout: ({ contentSlot }: { contentSlot?: React.ReactNode }) => <div>{contentSlot}</div>,
}));

vi.mock("@/components/ui/report-config-surface", () => ({
  ReportConfigSurface: ({
    title,
    children,
    footer,
  }: {
    title: string;
    children?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <section>
      <h3>{title}</h3>
      {children}
      {footer}
    </section>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <div data-testid={String(props["data-testid"] ?? "")}>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/print/PrintPreviewDialog", () => ({
  PrintPreviewDialog: ({ title }: { title: string }) => <div data-testid="print-preview-dialog-marker">{title}</div>,
}));

vi.mock("@/components/ui/table-view", () => ({
  TableView: (props: Record<string, unknown>) => {
    tableViewMock(props);
    const columns = Array.isArray(props.columns)
      ? props.columns.map((column) => (column as { id?: string }).id ?? "").join(",")
      : "";
    return (
      <div
        data-testid="reports-table-view"
        data-column-ids={columns}
        data-has-row-class={String(typeof props.rowClassName === "function")}
      />
    );
  },
}));

vi.mock("@/components/ui/list-empty-state", () => ({
  ListEmptyState: () => <div>empty</div>,
}));

vi.mock("@/components/ui/list-paging-footer", () => ({
  ListPagingFooter: () => <div>paging</div>,
}));

vi.mock("@/components/ui/entity-tag-footer-row", () => ({
  EntityTagFooterRow: () => <div>tag-row</div>,
}));

vi.mock("@/components/ui/help/help-icon", () => ({
  HelpIcon: ({ helpKey }: { helpKey: string }) => <span data-help-key={helpKey}>help</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

import { ReportsPage } from "../../../client/src/components/ReportsPage";

describe("FT26 UI: ReportsPage wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: localStorageGetItemMock,
      },
    });
    useSettingsMock.mockReset();
    useQueryMock.mockReset();
    tableViewMock.mockReset();
    localStorageGetItemMock.mockReset();
    localStorageGetItemMock.mockReturnValue("DISPATCHER");
    useSettingsMock.mockReturnValue({
      settingsByKey: new Map<string, { resolvedValue: unknown; resolvedScope?: string }>(),
      isSaving: false,
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
      const key = options.queryKey?.[0];
      if (key === "reports-config-defaults") {
        return {
          data: { latestProjectAppointmentDate: "2026-10-05" },
          isLoading: false,
        };
      }
      if (key === "/api/admin/master-data/product-categories?active=all") {
        return {
          data: [{ id: 1, name: "Fass Saunen", isDefault: true, isActive: true }],
          isLoading: false,
        };
      }
      if (key === "/api/admin/master-data/component-categories?active=all") {
        return {
          data: [{ id: 2, name: "Fenster", isDefault: true, isActive: true }],
          isLoading: false,
        };
      }
      if (key === "reports-vorlaufliste") {
        return {
          data: {
            page: 1,
            pageSize: 100,
            total: 1,
            totalPages: 1,
            productCategories: [{ id: 1, name: "Fass Saunen" }],
            componentCategories: [{ id: 2, name: "Fenster" }],
            items: [{
              projectId: 10,
              projectName: "Projekt",
              isActive: true,
              orderNumber: null,
              customerId: 20,
              customerNumber: null,
              reportState: "default",
              tags: [],
              highlightTag: null,
              amount: null,
              customerFullName: "Kunde",
              postalCode: null,
              city: null,
              country: null,
              articleValues: [],
              plannedDateText: null,
              plannedWeek: null,
              actualDate: "2026-03-29",
              projectDescription: null,
              notesCount: 0,
              plannedAppointmentsCount: 0,
              attachmentsCount: 0,
            }],
          },
          isLoading: false,
        };
      }
      if (key === "reports-vorlaufliste-print-preview") {
        return {
          data: { items: [], productCategories: [], componentCategories: [] },
          isLoading: false,
          isError: false,
        };
      }
      if (key === "reports-produktionsplanung") {
        return {
          data: { productCategoryGroups: [], componentCategoryGroups: [], projectRows: [] },
          isLoading: false,
        };
      }
      return { data: [], isLoading: false, isError: false };
    });
  });

  it("renders the new prototype toggles and action buttons", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("toggle-reports-vorlaufliste-date");
    expect(html).toContain("toggle-reports-vorlaufliste-calendarWeek");
    expect(html).toContain("toggle-reports-produktionsplanung-date");
    expect(html).toContain("toggle-reports-produktionsplanung-calendarWeek");
    expect(html).toContain("button-reports-vorlaufliste-open-columns-dialog");
    expect(html).toContain("button-reports-vorlaufliste-print-preview");
    expect(html).not.toContain("tab-reports-vorlaufliste-columns");
    expect(html).not.toContain("button-reports-vorlaufliste-clear-to-date");
    expect(html).not.toContain("button-reports-vorlaufliste-show-to-date");
    expect(html).not.toContain("button-reports-produktionsplanung-clear-to-date");
    expect(html).not.toContain("button-reports-produktionsplanung-show-to-date");
    expect(html).toContain("reports-vorlaufliste-config-panel");
    expect(html).toContain("reports-produktionsplanung-config-panel");
  });

  it("renders the latest appointment week sunday as default end date in both panels", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect((html.match(/value=\"2026-10-11\"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("passes an indicator column to the table and no rowClassName callback", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("data-column-ids=\"__indicator,amount,customerFullName,postalCode,city,product-1,component-2,plannedDateText,plannedWeek,actualDate,projectDescription\"");
    expect(html).toContain("data-has-row-class=\"false\"");
  });

  it("shows product and component category columns in the actual report table definition before report data exists", () => {
    useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
      const key = options.queryKey?.[0];
      if (key === "reports-config-defaults") {
        return {
          data: { latestProjectAppointmentDate: "2026-10-05" },
          isLoading: false,
        };
      }
      if (key === "/api/admin/master-data/product-categories?active=all") {
        return {
          data: [{ id: 1, name: "Fass Saunen", isDefault: true, isActive: true }],
          isLoading: false,
        };
      }
      if (key === "/api/admin/master-data/component-categories?active=all") {
        return {
          data: [{ id: 2, name: "Fenster", isDefault: true, isActive: true }],
          isLoading: false,
        };
      }
      if (key === "reports-vorlaufliste") {
        return {
          data: {
            page: 1,
            pageSize: 100,
            total: 0,
            totalPages: 0,
            productCategories: [],
            componentCategories: [],
            items: [],
          },
          isLoading: false,
        };
      }
      if (key === "reports-vorlaufliste-print-preview") {
        return {
          data: { items: [], productCategories: [], componentCategories: [] },
          isLoading: false,
          isError: false,
        };
      }
      if (key === "reports-produktionsplanung") {
        return {
          data: { productCategoryGroups: [], componentCategoryGroups: [], projectRows: [] },
          isLoading: false,
        };
      }
      return { data: [], isLoading: false, isError: false };
    });

    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("Fass Saunen");
    expect(html).toContain("Fenster");
    expect(html).toContain("data-column-ids=\"__indicator,amount,customerFullName,postalCode,city,product-1,component-2,plannedDateText,plannedWeek,actualDate,projectDescription\"");
  });

  it("removes the legacy produktionsplanung config blocks for non-admins", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("toggle-reports-produktionsplanung-date");
    expect(html).toContain("toggle-reports-produktionsplanung-calendarWeek");
    expect(html).not.toContain("reports-produktionsplanung-info-tags");
    expect(html).not.toContain("reports-produktionsplanung-sonderblock-tags");
    expect(html).not.toContain("reports-produktionsplanung-categories-column");
    expect(html).not.toContain("button-reports-produktionsplanung-open-category-layout");
    expect(html).not.toContain("reports-produktionsplanung-projects");
    expect(html).not.toContain("reports-produktionsplanung-special-measures");
    expect(html).toContain("reports-produktionsplanung-project-cards");
  });

  it("shows the admin category-layout entry and warning when no global layout is configured", () => {
    localStorageGetItemMock.mockReturnValue("ADMIN");

    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("button-reports-produktionsplanung-open-category-layout");
    expect(html).not.toContain("dialog-reports-produktionsplanung-category-layout");
    expect(html).toContain("reports-produktionsplanung-layout-warning");
    expect(html).toContain("Kategorie-Layout noch nicht konfiguriert.");
  });
});
