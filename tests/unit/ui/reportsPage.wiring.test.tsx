/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Reports-Seite rendert fuer beide Reports getrennte Datums- und Artikelkategorien-Spalten.
 * - Das ausgeblendete Bis-Datum erscheint als eigenes Feld mit Label "Datum Ende" und schmalem Button "Anzeigen".
 * - Der Produkt-Vorlauf zeigt Shortcode-Option, den Block "Info Tags" und die Druckaktion.
 * - Die Checkbox "Shortcodes verwenden?" ist in der Vorlaufliste-Konfiguration sichtbar.
 * - Die alten Beschreibungssaetze werden nicht mehr gerendert.
 *
 * Fehlerfaelle:
 * - Die Konfigurationsbereiche bleiben einspaltig oder verlieren die Artikelkategorien-Spalte.
 * - Die Datumssteuerung faellt auf den breiten Textbutton "Datum Ende anzeigen" zurueck.
 * - Die neue Produkt-Report-Konfiguration rendert den Block "Info Tags" nicht korrekt.
 * - Die Shortcodes-Checkbox fehlt in der Konfiguration.
 *
 * Ziel:
 * Die sichtbare Reports-Konfiguration fuer den Refactor ueber gerendertes Markup absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSettingsMock = vi.fn();
const useQueryMock = vi.fn();

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

vi.mock("@/components/ui/table-view", () => ({
  TableView: () => <div data-testid="reports-table-view" />,
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
          data: { page: 1, pageSize: 100, total: 0, totalPages: 0, items: [] },
          isLoading: false,
        };
      }
      if (key === "reports-product-vorlauf") {
        return {
          data: { productCategoryGroups: [], componentCategoryGroups: [], specialMeasureProjects: [], projectRows: [] },
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });
  });

  it("renders both report configs with split columns and product-report extras", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("data-help-key=\"reports-vorlaufliste\"");
    expect(html).toContain("data-help-key=\"reports-produkte\"");
    expect(html).toContain("reports-vorlaufliste-date-range-column");
    expect(html).toContain("reports-vorlaufliste-categories-column");
    expect(html).toContain("reports-product-vorlauf-date-range-column");
    expect(html).toContain("reports-product-vorlauf-categories-column");
    expect(html).toContain("Artikel Kategorien");
    expect(html).toContain("Datum Ende");
    expect(html).toContain("Anzeigen");
    expect(html).not.toContain("Datum Ende anzeigen");
    expect(html).toContain("button-reports-vorlaufliste-generate");
    expect(html).toContain("button-reports-product-vorlauf-generate");
    expect(html).toContain("checkbox-reports-vorlaufliste-use-shortcodes");
    expect(html).toContain("checkbox-reports-product-vorlauf-use-shortcodes");
    expect(html).toContain("reports-product-vorlauf-info-tags");
    expect(html).toContain("Info Tags");
    expect(html).not.toContain("Datumsbereich und Default-Kategorien für die Vorlaufliste festlegen.");
    expect(html).not.toContain("Datumsbereich, Kategorien und Sondermass-Kennzeichnung fuer den Produkt-Vorlauf festlegen.");
  });
});
