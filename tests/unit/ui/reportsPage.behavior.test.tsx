/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Report-Erzeugung bleibt ohne initiales Von-Datum im UI deaktiviert.
 * - Die Default-Range leitet Enddatum und KW-Reichweite aus dem letzten verfügbaren Projektermin ab.
 * - Der URL-Aufbau der Reports bleibt beim optionalen toDate-Parameter technisch korrekt.
 * - Der Produktionsplanung-URL-Aufbau enthaelt nur noch Kategorien, Zeitraum und Shortcodes.
 * - Die Auftragsliste uebergibt Kategorien und Shortcodes ueber einen eigenen URL-Builder.
 *
 * Fehlerfaelle:
 * - Reports lassen sich trotz leerem Von-Datum starten.
 * - Datum Ende oder KW-Anzahl fallen trotz spaetem Projektermin auf den alten 5-Wochen-Default zurueck.
 * - Der URL-Builder setzt einen toDate-Parameter trotz fehlendem Wert.
 * - Der Produktionsplanung-Request uebernimmt versehentlich entfernte Sonderblock-Parameter.
 * - Der Auftragslisten-Request verliert Komponentenkategorien oder den Shortcode-Schalter.
 *
 * Ziel:
 * Die stabil ohne DOM pruefbaren FT26-Basisregeln der ReportsPage regressionssicher absichern.
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
  resolveLegacyProduktionsplanungSelection: (value: unknown) => value,
}));

vi.mock("@/lib/project-appointments", () => ({
  getBerlinTodayDateString: () => getBerlinTodayDateStringMock(),
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
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/help/help-icon", () => ({
  HelpIcon: ({ helpKey }: { helpKey: string }) => <span data-help-key={helpKey}>help</span>,
}));

import {
  ReportsPage,
  buildProduktionsplanungReportUrl,
  buildAuftragslisteReportUrl,
  buildStandaloneReportUrl,
  buildVorlauflistePrintPreviewUrl,
  buildVorlauflisteReportUrl,
  resolveDefaultReportRange,
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
          data: { page: 1, pageSize: 100, total: 0, totalPages: 0, items: [], productCategories: [], componentCategories: [] },
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
      if (key === "reports-tourenplan-preview") {
        return {
          data: [{
            sectionKey: "tour-1",
            previewData: {
              fromDate: "2026-03-30",
              toDate: "2026-04-05",
              weeks: [],
              appointments: [],
              tour: { id: 1, name: "Testtour", color: "#2266aa" },
            },
            appointmentItems: [],
          }],
          isLoading: false,
          isError: false,
        };
      }
      if (key === "reports-tourenplan-appointments") {
        return {
          data: [],
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
      if (key === "reports-auftragsliste") {
        return {
          data: { productCategories: [], componentCategories: [], items: [] },
          isLoading: false,
        };
      }
      return { data: [], isLoading: false, isError: false };
    });
  });

  it("renders the generate buttons disabled when fromDate starts empty", () => {
    getBerlinTodayDateStringMock.mockReturnValue("");

    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("button-reports-vorlaufliste-generate");
    expect(html).toContain("button-reports-produktionsplanung-generate");
    expect(html).toContain("disabled");
  });

  it("derives the date and kw defaults from the latest available project appointment week", () => {
    const defaults = resolveDefaultReportRange("2026-04-03", "2026-10-05");

    expect(defaults.fromDate).toBe("2026-04-06");
    expect(defaults.toDate).toBe("2026-10-11");
    expect(defaults.weekCount).toBe(28);
  });

  it("keeps the fallback default when no latest project appointment date is available", () => {
    const defaults = resolveDefaultReportRange("2026-04-03", null);

    expect(defaults.fromDate).toBe("2026-04-06");
    expect(defaults.toDate).toBe("2026-05-08");
    expect(defaults.weekCount).toBe(6);
  });

  it("omits toDate from the vorlaufliste URL when the field was cleared", () => {
    const url = buildVorlauflisteReportUrl({
      fromDate: "2026-03-29",
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

  it("builds the dedicated print-preview URL without paging or category filters", () => {
    const url = buildVorlauflistePrintPreviewUrl({
      fromDate: "2026-03-29",
      toDate: "2026-03-30",
      useShortCodes: true,
    });

    expect(url).toContain("/api/reports/vorlaufliste/print-preview?");
    expect(url).toContain("fromDate=2026-03-29");
    expect(url).toContain("toDate=2026-03-30");
    expect(url).toContain("useShortCodes=true");
    expect(url).not.toContain("page=");
    expect(url).not.toContain("pageSize=");
  });

  it("builds the produktionsplanung URL without removed sonderblock parameters", () => {
    const url = buildProduktionsplanungReportUrl({
      fromDate: "2026-03-29",
      toDate: "2026-03-30",
      productCategoryIds: [1],
      componentCategoryIds: [2],
      useShortCodes: true,
    });

    expect(url).toContain("/api/reports/produktionsplanung?");
    expect(url).toContain("fromDate=2026-03-29");
    expect(url).toContain("toDate=2026-03-30");
    expect(url).toContain("productCategoryIds=1");
    expect(url).toContain("componentCategoryIds=2");
    expect(url).toContain("useShortCodes=true");
    expect(url).not.toContain("sonderblockTagIds=");
  });

  it("builds the auftragsliste URL with product and component categories plus shortcodes", () => {
    const url = buildAuftragslisteReportUrl({
      fromDate: "2026-03-29",
      toDate: "2026-03-30",
      productCategoryIds: [1],
      componentCategoryIds: [2, 4],
      useShortCodes: true,
    });

    expect(url).toContain("/api/reports/auftragsliste?");
    expect(url).toContain("fromDate=2026-03-29");
    expect(url).toContain("toDate=2026-03-30");
    expect(url).toContain("productCategoryIds=1");
    expect(url).toContain("componentCategoryIds=2");
    expect(url).toContain("componentCategoryIds=4");
    expect(url).toContain("useShortCodes=true");
  });

  it("builds the standalone reports URL with report type and current filters", () => {
    const url = buildStandaloneReportUrl({
      reportType: "auftragsliste",
      activeTab: "calendarWeek",
      fromDate: "2026-03-30",
      toDate: "2026-04-05",
      kwStart: 14,
      weekCount: 1,
      productCategoryIds: [1],
      componentCategoryIds: [2],
      useShortCodes: true,
    });

    expect(url).toContain("/standalone/reports?");
    expect(url).toContain("reportType=auftragsliste");
    expect(url).toContain("activeTab=calendarWeek");
    expect(url).toContain("fromDate=2026-03-30");
    expect(url).toContain("toDate=2026-04-05");
    expect(url).toContain("kwStart=14");
    expect(url).toContain("weekCount=1");
    expect(url).toContain("productCategoryIds=1");
    expect(url).toContain("componentCategoryIds=2");
    expect(url).toContain("useShortCodes=true");
  });
});
