/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Reports-Seite rendert die prototypnahen FT26-Toggles fuer Datum und Kalenderwoche samt Header-Actions.
 * - Die Auftragsliste erscheint als dritter Report-Block mit eigener Kategorien-Aktion.
 * - Die Produktionsplanung zeigt keinen alten Info-Tag-, Sonderblock- oder deaktivierten Kategorie-Block mehr.
 * - Nicht-Admins sehen keinen Kategorie-Layout-Button; Admins erhalten stattdessen den Dialog-Einstieg.
 *
 * Fehlerfaelle:
 * - Alte Produktionsplanung-Blöcke oder Legacy-Tabelle bleiben sichtbar verdrahtet.
 * - Die prototypnahen Toggle- und Action-Elemente fehlen oder fallen auf die alte Tab-Struktur zurueck.
 * - Die Auftragsliste fehlt oder rendert ohne ihren Kategorien-Einstieg.
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
  }: {
    title: string;
    pages?: unknown[];
    renderPage?: (page: unknown, index: number) => React.ReactNode;
    dialogWidthClassName?: string;
    pageOrientation?: string;
  }) => (
    <div
      data-testid="print-preview-dialog-marker"
      data-dialog-width={dialogWidthClassName ?? ""}
      data-page-orientation={pageOrientation ?? ""}
    >
      {title}
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

vi.mock("@/components/calendar/CalendarWeekAppointmentEmployeesHover", () => ({
  CalendarWeekAppointmentEmployeesHover: ({ employees }: { employees: Array<{ id: number; fullName: string }> }) => (
    <div data-testid="employees-hover">{employees.map((employee) => employee.fullName).join(", ") || "leer"}</div>
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

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

import { ReportsPage } from "../../../client/src/components/ReportsPage";

function buildQueryResponseOverrides(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    "reports-config-defaults": {
      data: { latestProjectAppointmentDate: "2026-10-05" },
      isLoading: false,
    },
    "/api/admin/master-data/product-categories?active=all": {
      data: [{ id: 1, name: "Fass Saunen", isDefault: true, isActive: true }],
      isLoading: false,
    },
    "/api/admin/master-data/component-categories?active=all": {
      data: [{ id: 2, name: "Fenster", isDefault: true, isActive: true }],
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
      data: { productCategories: [], componentCategories: [], items: [] },
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
    localStorageGetItemMock.mockReturnValue("DISPATCHER");
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
    expect(html).toContain("button-reports-auftragsliste-open-categories");
    expect(html).toContain("button-reports-vorlaufliste-open-tab");
    expect(html).toContain("button-reports-produktionsplanung-open-tab");
    expect(html).toContain("button-reports-auftragsliste-open-tab");
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
    expect(html).toContain("select-reports-tourenplan-tour");
    expect(html).toContain("checkbox-reports-tourenplan-use-shortcodes");
  });

  it("renders the auftragsliste categories as one article list with product categories first", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect(html).toContain("Artikelliste");
    expect(html).toContain("checkbox-reports-auftragsliste-product-category-1");
    expect(html).toContain("checkbox-reports-auftragsliste-category-2");
    expect(html.indexOf("Fass Saunen")).toBeLessThan(html.indexOf("Fenster"));
  });

  it("renders the latest appointment week sunday as default end date in both panels", () => {
    const html = renderToStaticMarkup(<ReportsPage />);

    expect((html.match(/value=\"2026-10-11\"/g) ?? []).length).toBeGreaterThanOrEqual(2);
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
          useShortCodes: false,
        }}
      />,
    );

    expect(html).toContain("Druckvorschau Auftragsliste");
    expect(html).toContain('data-page-orientation="portrait"');
    expect(html).toContain('data-dialog-width="w-[calc(210mm+88px)]"');
    expect(html).toContain('data-print-orientation="portrait"');
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
        data: { productCategories: [], componentCategories: [], items: [] },
        isLoading: false,
      },
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
