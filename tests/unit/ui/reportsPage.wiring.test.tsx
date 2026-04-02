/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Reports-Seite rendert die Vorlaufliste ohne alten Kategorie-Checkbox-Block.
 * - Das Vorlauflisten-Overlay enthält Spalten- und Druckvorschau-Aktion sowie eine feste Indikatorspalte.
 * - Die Tabellenverdrahtung verwendet keine Zeilen-Hintergrundfunktion mehr.
 *
 * Fehlerfälle:
 * - Die Vorlaufliste zeigt weiterhin einen separaten Kategorienblock.
 * - Spalten- oder Druckvorschau-Button fehlen im Overlay.
 * - Die TableView erhält weiterhin rowClassName statt nur der Indikatorspalte.
 *
 * Ziel:
 * Das sichtbare UI-Wiring der neuen Vorlaufliste-Konfiguration regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSettingsMock = vi.fn();
const useQueryMock = vi.fn();
const tableViewMock = vi.fn();

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
  useSetting: (key: string) => useSettingsMock().settingsByKey.get(key)?.resolvedValue,
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

import { ReportsPage } from "../../../client/src/components/ReportsPage";

describe("FT26/FT32 UI: ReportsPage wiring", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    useSettingsMock.mockReset();
    useQueryMock.mockReset();
    tableViewMock.mockReset();
    useSettingsMock.mockReturnValue({
      settingsByKey: new Map<string, { resolvedValue: unknown; resolvedScope?: string }>(),
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
      const key = options.queryKey?.[0];
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
      if (key === "reports-product-vorlauf") {
        return {
          data: { productCategoryGroups: [], componentCategoryGroups: [], specialMeasureProjects: [], projectRows: [] },
          isLoading: false,
        };
      }
      return { data: [], isLoading: false, isError: false };
    });
  });

  it("renders the new vorlaufliste settings and overlay actions", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("reports-vorlaufliste-date-range-column");
    expect(html).toContain("reports-vorlaufliste-settings-column");
    expect(html).not.toContain("reports-vorlaufliste-categories-column");
    expect(html).toContain("button-reports-vorlaufliste-columns");
    expect(html).toContain("button-reports-vorlaufliste-print-preview");
    expect(html).toContain("reports-vorlaufliste-legend");
    expect(html).not.toContain("checkbox-reports-vorlaufliste-product-category-");
    expect(html).not.toContain("checkbox-reports-vorlaufliste-component-category-");
  });

  it("passes an indicator column to the table and no rowClassName callback", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("data-column-ids=\"__indicator,amount,customerFullName,postalCode,city,product-1,component-2,plannedDateText,plannedWeek,actualDate,projectDescription\"");
    expect(html).toContain("data-has-row-class=\"false\"");
  });
});
