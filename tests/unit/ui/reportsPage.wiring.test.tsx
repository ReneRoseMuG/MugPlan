/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Reports-Seite rendert die prototypnahen FT26-Toggles fuer Datum und Kalenderwoche samt Header-Actions.
 * - Die Auftragsliste erscheint als dritter Report-Block ohne alte Kategorien-Aktion.
 * - Die Produktionsplanung zeigt keinen alten Info-Tag-, Sonderblock- oder deaktivierten Kategorie-Block mehr.
 * - Nicht-Admins sehen keinen Kategorie-Layout-Button; Admins erhalten stattdessen den Dialog-Einstieg.
 *
 * Fehlerfaelle:
 * - Alte Produktionsplanung-Blöcke oder Legacy-Tabelle bleiben sichtbar verdrahtet.
 * - Die prototypnahen Toggle- und Action-Elemente fehlen oder fallen auf die alte Tab-Struktur zurueck.
 * - Die Auftragsliste fehlt oder zeigt den entfernten Kategorien-Einstieg weiter an.
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
const getBerlinTodayDateStringMock = vi.fn(() => "2026-03-29");

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
  useSetting: (key: string) => useSettingsMock().settingsByKey.get(key)?.resolvedValue,
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
  Button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")} disabled={Boolean(props.disabled)}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => (
    <input
      data-testid={String(props["data-testid"] ?? "")}
      value={String(props.value ?? "")}
      readOnly
    />
  ),
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
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? ""}</span>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
}));

vi.mock("@/components/print/PrintPreviewDialog", () => ({
  PrintPreviewDialog: ({
    title,
    pages = [],
    renderPage,
    dialogWidthClassName,
    pageOrientation,
    headerActions,
  }: {
    title: string;
    pages?: unknown[];
    renderPage?: (page: unknown, index: number) => React.ReactNode;
    dialogWidthClassName?: string;
    pageOrientation?: string;
    headerActions?: React.ReactNode;
  }) => (
    <div
      data-testid="print-preview-dialog-marker"
      data-dialog-width={dialogWidthClassName ?? ""}
      data-page-orientation={pageOrientation ?? ""}
    >
      {title}
      {headerActions}
      {pages.length > 0 && renderPage ? renderPage(pages[0], 0) : null}
    </div>
  ),
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

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({
    testId,
    fullName,
    renderMode,
  }: {
    testId?: string;
    fullName?: string;
    renderMode?: string;
  }) => (
    <div data-testid={testId ?? "employee-badge"}>
      {[fullName ?? "leer", renderMode ?? ""].join("|")}
    </div>
  ),
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: ({ triggerLabel }: { triggerLabel?: string }) => (
    <div data-testid="notes-hover">{triggerLabel ?? "Notizen"}</div>
  ),
}));

vi.mock("@/components/calendar/CalendarWeekAppointmentAttachmentsHover", () => ({
  CalendarWeekAppointmentAttachmentsHover: ({ totalAttachmentsCount }: { totalAttachmentsCount: number }) => (
    <div data-testid="attachments-hover">Anhaenge {totalAttachmentsCount}</div>
  ),
}));

vi.mock("@/components/ui/help/help-icon", () => ({
  HelpIcon: ({ helpKey }: { helpKey: string }) => <span data-help-key={helpKey}>help</span>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

import { ReportsPage } from "../../../client/src/components/ReportsPage";
import {
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_VACANT_TAG_NAME,
} from "../../../shared/appointmentCancellation";

function buildQueryResponseOverrides(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    "reports-config-defaults": {
      data: { latestProjectAppointmentDate: "2026-10-05" },
      isLoading: false,
    },
    "/api/admin/master-data/product-categories?active=all": {
      data: [
        { id: 1, name: "Fass Saunen", isDefault: true, isActive: true },
        { id: 3, name: "Sauna Modell", isDefault: false, isActive: true },
      ],
      isLoading: false,
    },
    "/api/admin/master-data/products?active=all": {
      data: [{ id: 9, name: "Modell Alpha", categoryId: 3, isActive: true, shortCode: null, description: null, version: 1 }],
      isLoading: false,
    },
    "/api/admin/master-data/component-categories?active=all": {
      data: [{ id: 2, name: "Fenster", isDefault: true, isActive: true }],
      isLoading: false,
    },
    "/api/tags": {
      data: [{ id: 8, name: "Sondermaß", color: "#BA7517", isDefault: false, version: 1 }],
      isLoading: false,
    },
    "/api/tours": {
      data: [{ id: 7, name: "Tour Alpha", color: "#2266aa", isActive: true, version: 1 }],
      isLoading: false,
    },
    "reports-vorlaufliste": {
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
    },
    "reports-vorlaufliste-print-preview": {
      data: { items: [], productCategories: [], componentCategories: [] },
      isLoading: false,
      isError: false,
    },
    "reports-produktionsplanung": {
      data: { productCategoryGroups: [], componentCategoryGroups: [], projectRows: [] },
      isLoading: false,
    },
    "reports-auftragsliste": {
      data: { productCategories: [], componentCategories: [], availableSaunaModels: [], items: [] },
      isLoading: false,
    },
    "reports-tourenplan-preview": {
      data: undefined,
      isLoading: false,
      isError: false,
    },
    "reports-tourenplan-appointments": {
      data: [],
      isLoading: false,
      isError: false,
    },
  };

  return { ...defaults, ...overrides };
}

function installReportsPageQueryMock(overrides: Record<string, unknown> = {}) {
  const responses = buildQueryResponseOverrides(overrides);
  useQueryMock.mockImplementation((options: { queryKey?: unknown[] }) => {
    const key = options.queryKey?.[0];
    return (typeof key === "string" && key in responses)
      ? responses[key]
      : { data: [], isLoading: false, isError: false };
  });
}

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
    getBerlinTodayDateStringMock.mockReset();
    localStorageGetItemMock.mockReturnValue("DISPATCHER");
    getBerlinTodayDateStringMock.mockReturnValue("2026-03-29");
    useSettingsMock.mockReturnValue({
      settingsByKey: new Map<string, { resolvedValue: unknown; resolvedScope?: string }>(),
      isSaving: false,
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    installReportsPageQueryMock();
  });

  it("renders the new prototype toggles and action buttons", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("toggle-reports-vorlaufliste-date");
    expect(html).toContain("toggle-reports-vorlaufliste-calendarWeek");
    expect(html).toContain("toggle-reports-produktionsplanung-date");
    expect(html).toContain("toggle-reports-produktionsplanung-calendarWeek");
    expect(html).toContain("toggle-reports-auftragsliste-date");
    expect(html).toContain("toggle-reports-auftragsliste-calendarWeek");
    expect(html).toContain("button-reports-vorlaufliste-open-columns-dialog");
    expect(html).not.toContain("button-reports-auftragsliste-open-categories");
    expect(html).not.toContain("dialog-reports-auftragsliste-categories");
    expect(html).toContain("button-reports-auftragsliste-add-tag-filter");
    expect(html).toContain("button-reports-auftragsliste-open-sauna-model-filter");
    expect(html).toContain("button-reports-vorlaufliste-open-tab");
    expect(html).toContain("button-reports-produktionsplanung-open-tab");
    expect(html).toContain("button-reports-auftragsliste-open-tab");
    expect(html).toContain("button-reports-tourenplan-open-tab");
    expect(html).toContain("button-reports-vorlaufliste-print-preview");
    expect(html).not.toContain("tab-reports-vorlaufliste-columns");
    expect(html).not.toContain("button-reports-vorlaufliste-clear-to-date");
    expect(html).not.toContain("button-reports-vorlaufliste-show-to-date");
    expect(html).not.toContain("button-reports-produktionsplanung-clear-to-date");
    expect(html).not.toContain("button-reports-produktionsplanung-show-to-date");
    expect(html).toContain("reports-vorlaufliste-config-panel");
    expect(html).toContain("reports-produktionsplanung-config-panel");
    expect(html).toContain("reports-auftragsliste-config-panel");
    expect(html).toContain("reports-tourenplan-config-panel");
    expect(html).toContain("reports-tourenplan-tour-list");
    expect(html).toContain("checkbox-reports-tourenplan-all-tours");
    expect(html).toContain("checkbox-reports-tourenplan-use-shortcodes");
  });

  it("does not render the obsolete auftragsliste category selection", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).not.toContain("checkbox-reports-auftragsliste-product-category-1");
    expect(html).not.toContain("checkbox-reports-auftragsliste-category-2");
    expect(html).not.toContain("reports-auftragsliste-categories-dialog");
  });

  it("offers non-system tags plus Sondermaß and Anmerkungen in the auftragsliste tag filter", () => {
    installReportsPageQueryMock({
      "/api/tags": {
        data: [
          { id: 11, name: "Kundeninfo", color: "#2563eb", isDefault: false, version: 1 },
          { id: 12, name: "Montagehinweis", color: "#0f766e", isDefault: false, version: 1 },
          { id: 13, name: MANAGED_SPECIAL_MEASURE_TAG_NAME, color: "#BA7517", isDefault: false, version: 1 },
          { id: 14, name: MANAGED_COMPLAINT_TAG_NAME, color: "#FF011B", isDefault: true, version: 1 },
          { id: 15, name: MANAGED_REMARKS_TAG_NAME, color: "#888780", isDefault: true, version: 1 },
          { id: 16, name: RESERVED_VACANT_TAG_NAME, color: "#D4537E", isDefault: true, version: 1 },
        ],
        isLoading: false,
      },
    });

    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("reports-auftragsliste-tag-filter-add-11");
    expect(html).toContain("reports-auftragsliste-tag-filter-add-12");
    expect(html).toContain("reports-auftragsliste-tag-filter-add-13");
    expect(html).not.toContain("reports-auftragsliste-tag-filter-add-14");
    expect(html).toContain("reports-auftragsliste-tag-filter-add-15");
    expect(html).not.toContain("reports-auftragsliste-tag-filter-add-16");
  });

  it("renders the current calendar week sunday as default summary in report panels", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect((html.match(/So 29\.03\.26/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("renders the auftragsliste print preview in portrait with a narrower dialog shell", () => {
    installReportsPageQueryMock({
      "reports-vorlaufliste": {
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
      },
      "reports-auftragsliste": {
        data: {
          productCategories: [{ id: 1, name: "Fass Saunen" }],
          componentCategories: [{ id: 2, name: "Fenster" }],
          availableSaunaModels: ["Modell Alpha"],
          items: [{
            projectId: 31,
            customerId: 44,
            appointmentId: 55,
            projectName: "Projekt Auftragsliste",
            orderNumber: "AO-31",
            customerNumber: "K-31",
            customerFullName: "Kunde Auftragsliste",
            actualDate: "2026-04-07",
            durationDays: 2,
            tourName: "Tour 1",
            tourColor: "#0f766e",
            employees: [],
            customerNotesCount: 0,
            projectNotesCount: 0,
            appointmentNotesCount: 0,
            notesCount: 0,
            customerAttachmentsCount: 0,
            projectAttachmentsCount: 0,
            appointmentAttachmentsCount: 0,
            attachmentsCount: 0,
            tags: [],
            articleValues: [{ categoryId: 1, value: "Sauna Alpha" }],
            projectArticleItems: [{ label: "Sauna", value: "Sauna Alpha", source: "product" }],
            projectDescription: "Hinweis Alpha",
          }],
        },
        isLoading: false,
      },
    });

    const html = renderToStaticMarkup(
      <ReportsPage
        standaloneLaunch={{
          reportType: "auftragsliste",
          activeTab: "date",
          fromDate: "2026-04-06",
          toDate: "2026-05-03",
          productCategoryIds: [1],
          componentCategoryIds: [2],
          tagIds: [8],
          saunaModels: ["Modell Alpha"],
          useShortCodes: false,
        }}
      />,
    );

    expect(html).toContain("Druckvorschau - Auftragsliste");
    expect(html).toContain('data-page-orientation="portrait"');
    expect(html).toContain('data-dialog-width="w-[calc(210mm+88px)]"');
    expect(html).toContain('data-print-orientation="portrait"');
    expect(html).toContain("button-reports-vorlaufliste-orientation-landscape");
    expect(html).toContain("button-reports-vorlaufliste-orientation-portrait");
    expect(html).toContain("button-reports-auftragsliste-orientation-landscape");
    expect(html).toContain("button-reports-auftragsliste-orientation-portrait");
    expect(html).toContain("button-reports-produktionsplanung-orientation-landscape");
    expect(html).toContain("button-reports-produktionsplanung-orientation-portrait");
  });

  it("passes an indicator column to the table and no rowClassName callback", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("data-column-ids=\"__indicator,amount,customerFullName,postalCode,city,product-1,component-2,plannedDateText,plannedWeek,actualDate,projectDescription\"");
    expect(html).toContain("data-has-row-class=\"false\"");
  });

  it("shows product and component category columns in the actual report table definition before report data exists", () => {
    installReportsPageQueryMock({
      "reports-vorlaufliste": {
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
      },
      "reports-auftragsliste": {
        data: { productCategories: [], componentCategories: [], availableSaunaModels: [], items: [] },
        isLoading: false,
      },
    });

    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("data-column-ids=\"__indicator,amount,customerFullName,postalCode,city,product-1,product-3,component-2,plannedDateText,plannedWeek,actualDate,projectDescription\"");
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

  it("renders production planning categories side by side when they share a block", () => {
    useSettingsMock.mockReturnValue({
      settingsByKey: new Map<string, { resolvedValue: unknown; resolvedScope?: string }>([
        ["reports.categoryLayout", {
          resolvedValue: [
            { categoryId: 1, block: 1, columns: 1 },
            { categoryId: 2, block: 1, columns: 2 },
          ],
        }],
      ]),
      isSaving: false,
      setSetting: vi.fn().mockResolvedValue(undefined),
    });
    installReportsPageQueryMock({
      "reports-produktionsplanung": {
        data: {
          productCategoryGroups: [
            {
              categoryId: 1,
              categoryName: "Fass Saunen",
              items: [{ itemName: "Sauna Alpha", totalQuantity: 1 }],
            },
          ],
          componentCategoryGroups: [
            {
              categoryId: 2,
              categoryName: "Fenster",
              items: [
                { itemName: "Fenster Breit", totalQuantity: 2 },
                { itemName: "Fenster Schmal", totalQuantity: 3 },
              ],
            },
          ],
          projectRows: [],
        },
        isLoading: false,
      },
    });

    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("reports-produktionsplanung-categories-block-0");
    expect(html).toContain("reports-produktionsplanung-categories-category-1");
    expect(html).toContain("reports-produktionsplanung-categories-category-2");
    expect(html).toContain("md:grid-cols-3");
    expect(html).toContain("md:col-span-1");
    expect(html).toContain("md:col-span-2");
    expect(html).toContain("reports-produktionsplanung-categories-category-2-column-1");
  });

  it("renders report load errors as normalized inline messages", () => {
    installReportsPageQueryMock({
      "reports-auftragsliste": {
        data: undefined,
        error: new Error('422: {"code":"VALIDATION_ERROR"}'),
        isLoading: false,
        isError: true,
      },
    });

    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("Eingaben");
    expect(html).not.toContain("VALIDATION_ERROR");
  });
});
