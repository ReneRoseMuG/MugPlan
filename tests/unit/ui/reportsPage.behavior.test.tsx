/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Report-Erzeugung bleibt ohne initiales Von-Datum im UI deaktiviert.
 * - Ein geleertes Bis-Datum wird beim Vorlauflisten-URL-Aufbau nicht weitergegeben.
 *
 * Fehlerfaelle:
 * - Reports lassen sich trotz leerem Von-Datum starten.
 * - Ein zuvor sichtbares Bis-Datum bleibt als leerer Parameter im Folge-Request erhalten.
 *
 * Ziel:
 * Die stabil ohne DOM pruefbaren UI-Basisregeln der ReportsPage regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getBerlinTodayDateStringMock = vi.fn(() => "2026-03-29");
const useSettingsMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
  useSetting: (key: string) => useSettingsMock().settingsByKey.get(key)?.resolvedValue,
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => getBerlinTodayDateStringMock(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, disabled, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" disabled={Boolean(disabled)} data-testid={String(props["data-testid"] ?? "")}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input data-testid={String(props["data-testid"] ?? "")} value={String(props.value ?? "")} readOnly />,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: Record<string, unknown>) => <input type="checkbox" data-testid={String(props["data-testid"] ?? "")} checked={Boolean(props.checked)} readOnly />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
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

import {
  ReportsPage,
  buildProductVorlaufReportUrl,
  buildVorlauflisteReportUrl,
} from "../../../client/src/components/ReportsPage";

describe("FT26 UI: ReportsPage behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    getBerlinTodayDateStringMock.mockReset();
    getBerlinTodayDateStringMock.mockReturnValue("2026-03-29");
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
          data: { page: 1, pageSize: 100, total: 0, totalPages: 0, items: [], productCategories: [], componentCategories: [] },
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

  it("renders the generate buttons disabled when fromDate starts empty", () => {
    getBerlinTodayDateStringMock.mockReturnValue("");

    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("button-reports-vorlaufliste-generate");
    expect(html).toContain("button-reports-product-vorlauf-generate");
    expect(html).toContain("disabled");
  });

  it("omits toDate from the vorlaufliste URL when the field was cleared", () => {
    const url = buildVorlauflisteReportUrl({
      fromDate: "2026-03-29",
      productCategoryIds: [1],
      componentCategoryIds: [2],
      useShortCodes: false,
      page: 1,
      pageSize: 100,
      refreshKey: 8,
    });

    expect(url).toContain("/api/reports/vorlaufliste?");
    expect(url).toContain("fromDate=2026-03-29");
    expect(url).toContain("refreshKey=8");
    expect(url).not.toContain("toDate=");
  });

  it("includes shortcodes and sonderblock tags in the product-vorlauf URL", () => {
    const url = buildProductVorlaufReportUrl({
      fromDate: "2026-03-29",
      toDate: "2026-03-30",
      productCategoryIds: [1],
      componentCategoryIds: [2],
      useShortCodes: true,
      sonderblockTagIds: [7, 8],
    });

    expect(url).toContain("/api/reports/product-vorlauf?");
    expect(url).toContain("fromDate=2026-03-29");
    expect(url).toContain("toDate=2026-03-30");
    expect(url).toContain("useShortCodes=true");
    expect(url).toContain("sonderblockTagIds=7");
    expect(url).toContain("sonderblockTagIds=8");
  });
});
