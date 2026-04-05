import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { addDays, addWeeks, differenceInCalendarDays, endOfISOWeek, format, getISOWeek, getISOWeekYear } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowDown, ArrowRight, ArrowUp, Columns3, FileText, LayoutGrid, Loader2, Lock, Printer, RotateCcw, Table2, X } from "lucide-react";
import type { AppointmentCancellationReportState } from "@shared/appointmentCancellation";
import type { ReportProduktionsplanungResponse } from "@shared/routes";
import type { ComponentCategory, ProductCategory, Tag } from "@shared/schema";

import { ProduktionsplanungProjectCard } from "@/components/reports/ProduktionsplanungProjectCard";
import { ReportConfigPanel, type ReportConfigPanelMode } from "@/components/reports/ReportConfigPanel";
import { SpaltenDialog } from "@/components/reports/SpaltenDialog";
import {
  ProduktionsplanungCategoryLayoutEditor,
  type CategoryLayoutCategoryOption,
} from "@/components/reports/ProduktionsplanungCategoryLayoutEditor";
import { ProduktionsplanungPrintLayout, type ProduktionsplanungPrintCategory } from "@/components/reports/ProduktionsplanungPrintLayout";
import { PrintPageShell } from "@/components/print/PrintPageShell";
import { PrintPreviewDialog } from "@/components/print/PrintPreviewDialog";
import { PrintSectionHeader } from "@/components/print/PrintSectionHeader";
import { PrintSlimFooter } from "@/components/print/PrintSlimFooter";
import { PrintSlimHeader } from "@/components/print/PrintSlimHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { ListLayout } from "@/components/ui/list-layout";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RangeSummary } from "@/components/ui/RangeSummary";
import { SpinField } from "@/components/ui/SpinField";
import {
  buildVorlauflistePreviewProject,
  VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME,
} from "@/components/reports/vorlauflistePreview";
import { ProjectTableHoverPreview } from "@/components/ui/table-hover-previews";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import {
  resolveLegacyProduktionsplanungSelection,
  useSetting,
  useSettings,
} from "@/hooks/useSettings";
import {
  buildCategoryLayoutBlocks,
  CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS,
  distributeSortedItemsIntoColumns,
  getCategoryLayoutIds,
  orderCategoriesByLayout,
  type CategoryLayoutConfig,
} from "@/lib/produktionsplanung-category-layout";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { resolveKwJumpTarget } from "@/lib/kwJump";
import { normalizeKwStart, normalizeWeekCount, resolveReportRangeFromKw } from "@/lib/reportRangeFromKw";
import { cn } from "@/lib/utils";
import {
  buildVorlauflistePrintPages,
  type VorlauflistePrintColumn,
} from "@/lib/vorlaufliste-print-model";

type ReportType = "vorlaufliste" | "produktionsplanung";

type VorlauflisteCategory = {
  id: number;
  name: string;
};

type VorlauflisteItem = {
  projectId: number;
  projectName: string;
  isActive: boolean;
  orderNumber: string | null;
  customerId: number;
  customerNumber: string | null;
  reportState: AppointmentCancellationReportState;
  tags: Tag[];
  highlightTag: Tag | null;
  amount: string | null;
  customerFullName: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  articleValues: Array<{ categoryId: number; value: string | null }>;
  plannedDateText: string | null;
  plannedWeek: string | null;
  actualDate: string;
  projectDescription: string | null;
  notesCount: number;
  plannedAppointmentsCount: number;
  attachmentsCount: number;
};

type VorlauflisteResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  productCategories: VorlauflisteCategory[];
  componentCategories: VorlauflisteCategory[];
  items: VorlauflisteItem[];
};

type VorlauflistePrintPreviewResponse = {
  productCategories: VorlauflisteCategory[];
  componentCategories: VorlauflisteCategory[];
  items: VorlauflisteItem[];
};

type ReportConfigDefaultsResponse = {
  latestProjectAppointmentDate: string | null;
};

type ReportRangeTab = ReportConfigPanelMode;
type VorlauflistePanelTab = ReportRangeTab;

type SubmittedFilters = {
  reportType: ReportType;
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes: boolean;
};

type VorlauflisteSelection = {
  useShortCodes?: boolean;
  columnWidths?: Record<string, number>;
  columnOrder?: string[];
  hiddenColumns?: string[];
};

type ProduktionsplanungSelection = {
  useShortCodes?: boolean;
};

type VorlauflisteRangeConfig = {
  activeTab?: VorlauflistePanelTab;
  fromDate?: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
};

type ProduktionsplanungRangeConfig = {
  activeTab?: ReportRangeTab;
  fromDate?: string;
  toDate?: string;
  kwStart?: number;
  weekCount?: number;
};

type ActiveProduktionsplanungCategory = CategoryLayoutCategoryOption & {
  isDefault: boolean;
};

type VorlauflisteRequestParams = {
  fromDate: string;
  toDate?: string;
  useShortCodes: boolean;
  page: number;
  pageSize: number;
  refreshKey: number;
};

type ProduktionsplanungRequestParams = {
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes: boolean;
};

const REPORT_PAGE_SIZE = 100;
const VORLAUFLISTE_SETTING_KEY = "reports.vorlaufliste.categorySelection";
const PRODUKTIONSPLANUNG_SETTING_KEY = "reports.produktionsplanung.selection";
const VORLAUFLISTE_RANGE_SETTING_KEY = "reports.vorlaufliste.rangeConfig";
const PRODUKTIONSPLANUNG_RANGE_SETTING_KEY = "reports.produktionsplanung.rangeConfig";
const PRODUKTIONSPLANUNG_CATEGORY_LAYOUT_SETTING_KEY = "reports.categoryLayout";
const LEGACY_PRODUCT_VORLAUF_SETTING_KEY = "reports.productVorlauf.selection";
const MIN_REPORT_COLUMN_WIDTH = 80;
const MAX_REPORT_COLUMN_WIDTH = 960;
const VORLAUFLISTE_INDICATOR_COLUMN_ID = "__indicator";
const VORLAUFLISTE_PRINT_ROWS_PER_PAGE = 12;
const VORLAUFLISTE_PRINT_WIDTH_PX = 1000;

function formatDate(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd.MM.yyyy", { locale: de });
}

function formatAmount(value: string | null): string {
  if (!value) return "-";
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return value;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

function normalizeColumnWidths(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, width]) =>
        key.trim().length > 0
        && typeof width === "number"
        && Number.isInteger(width)
        && width >= MIN_REPORT_COLUMN_WIDTH
        && width <= MAX_REPORT_COLUMN_WIDTH)
      .map(([key, width]) => [key, width]),
  );
}

const VORLAUFLISTE_MIN_COLUMN_WIDTH = 50;

function clampColumnWidth(width: number, minWidth: number): number {
  return Math.min(MAX_REPORT_COLUMN_WIDTH, Math.max(minWidth, Math.round(width)));
}

function resolveValue(value: string | null): string {
  if (!value || value.trim().length === 0) return "-";
  return value.trim();
}

function parseDateOnlyInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnlyInput(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function resolveNextMonday(referenceDate: Date): Date {
  const nextMonday = new Date(referenceDate);
  const weekday = nextMonday.getDay();
  const offset = weekday === 0 ? 1 : 8 - weekday;
  nextMonday.setDate(nextMonday.getDate() + offset);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

export function resolveDefaultReportRange(todayBerlin: string, latestProjectAppointmentDate?: string | null): {
  fromDate: string;
  toDate: string;
  weekCount: number;
  referenceDate: Date;
} {
  const parsedToday = parseDateOnlyInput(todayBerlin);
  if (!parsedToday) {
    return {
      fromDate: "",
      toDate: "",
      weekCount: 1,
      referenceDate: new Date("2000-01-03T00:00:00"),
    };
  }

  const nextMonday = resolveNextMonday(parsedToday);
  const currentWeekStart = resolveKwJumpTarget(getISOWeek(parsedToday), parsedToday) ?? parsedToday;
  const parsedLatestProjectAppointmentDate = parseDateOnlyInput(latestProjectAppointmentDate ?? "");
  const fallbackEndDate = addDays(addWeeks(nextMonday, 4), 4);
  const latestWeekEndDate = parsedLatestProjectAppointmentDate ? endOfISOWeek(parsedLatestProjectAppointmentDate) : null;
  const defaultEndDate = latestWeekEndDate && latestWeekEndDate >= nextMonday ? latestWeekEndDate : fallbackEndDate;
  const weekCount = Math.max(1, Math.ceil((differenceInCalendarDays(defaultEndDate, currentWeekStart) + 1) / 7));
  return {
    fromDate: formatDateOnlyInput(nextMonday),
    toDate: formatDateOnlyInput(defaultEndDate),
    weekCount,
    referenceDate: parsedToday,
  };
}

function normalizePersistedDate(value: string | undefined): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function resolveRequiredToDate(value: string | undefined, fallback: string): string {
  return normalizePersistedDate(value) ?? fallback;
}

function resolveVorlauflisteArticleValue(row: Pick<VorlauflisteItem, "articleValues">, categoryId: number): string | null {
  return row.articleValues.find((entry) => entry.categoryId === categoryId)?.value ?? null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

export function buildVorlauflisteReportUrl(params: VorlauflisteRequestParams): string {
  const searchParams = new URLSearchParams({
    fromDate: params.fromDate,
    refreshKey: String(params.refreshKey),
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.toDate) searchParams.set("toDate", params.toDate);
  if (params.useShortCodes) searchParams.set("useShortCodes", "true");
  return `/api/reports/vorlaufliste?${searchParams.toString()}`;
}

export function buildVorlauflistePrintPreviewUrl(params: {
  fromDate: string;
  toDate?: string;
  useShortCodes: boolean;
}): string {
  const searchParams = new URLSearchParams({
    fromDate: params.fromDate,
  });
  if (params.toDate) searchParams.set("toDate", params.toDate);
  if (params.useShortCodes) searchParams.set("useShortCodes", "true");
  return `/api/reports/vorlaufliste/print-preview?${searchParams.toString()}`;
}

export function buildProduktionsplanungReportUrl(params: ProduktionsplanungRequestParams): string {
  const searchParams = new URLSearchParams({
    fromDate: params.fromDate,
  });
  if (params.toDate) searchParams.set("toDate", params.toDate);
  for (const id of params.productCategoryIds) searchParams.append("productCategoryIds", String(id));
  for (const id of params.componentCategoryIds) searchParams.append("componentCategoryIds", String(id));
  if (params.useShortCodes) searchParams.set("useShortCodes", "true");
  return `/api/reports/produktionsplanung?${searchParams.toString()}`;
}

function renderGroupedCategoryList(
  groups: ReportProduktionsplanungResponse["productCategoryGroups"],
  layoutConfig: CategoryLayoutConfig,
  emptyText: string,
  testIdPrefix: string,
) {
  if (groups.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>;
  }

  const layoutBlocks = buildCategoryLayoutBlocks(groups, layoutConfig);
  const content = layoutBlocks.length > 0
    ? layoutBlocks.map((block, blockIndex) => (
      <div
        key={`${testIdPrefix}-block-${blockIndex}`}
        className="space-y-4 rounded-xl border border-slate-300 bg-slate-100/80 p-4 shadow-sm"
        data-testid={`${testIdPrefix}-block-${blockIndex}`}
      >
        {block.categories.map(({ group, columns }) => (
          <div key={group.categoryId} className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm" data-testid={`${testIdPrefix}-category-${group.categoryId}`}>
            <h5 className="text-sm font-semibold text-slate-900">{group.categoryName}</h5>
            <div className={cn("mt-3 grid gap-3", CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS[columns])}>
              {distributeSortedItemsIntoColumns(group.items, columns, (item) => item.itemName).map((columnItems, columnIndex) => (
                <div
                  key={`${group.categoryId}-column-${columnIndex}`}
                  className="space-y-2"
                  data-testid={`${testIdPrefix}-category-${group.categoryId}-column-${columnIndex}`}
                >
                  {columnItems.map((item) => (
                    <div key={`${group.categoryId}-${item.itemName}`} className="flex min-h-[44px] items-center justify-between gap-4 rounded-md bg-slate-100 px-3 py-1.5 text-sm">
                      <span>{item.itemName}</span>
                      <span className="font-medium">{item.totalQuantity}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ))
    : groups.map((group) => (
      <div key={group.categoryId} className="rounded-md border border-border/50 p-3" data-testid={`${testIdPrefix}-category-${group.categoryId}`}>
        <h5 className="text-sm font-semibold text-foreground">{group.categoryName}</h5>
        <div className="mt-3 space-y-2">
          {distributeSortedItemsIntoColumns(group.items, 1, (item) => item.itemName)[0]?.map((item) => (
            <div key={`${group.categoryId}-${item.itemName}`} className="flex min-h-[44px] items-center justify-between gap-4 rounded-md bg-slate-100 px-3 py-1.5 text-sm">
              <span>{item.itemName}</span>
              <span className="font-medium">{item.totalQuantity}</span>
            </div>
          ))}
        </div>
      </div>
    ));

  return (
    <div className="mt-3 space-y-4">
      {content}
    </div>
  );
}

function normalizeColumnIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && entry !== VORLAUFLISTE_INDICATOR_COLUMN_ID),
  ));
}

function resolveOrderedColumnIds(defaultOrder: string[], configuredOrder: string[]): string[] {
  const validIds = new Set(defaultOrder);
  const filteredConfiguredOrder = configuredOrder.filter((columnId) => validIds.has(columnId));
  const missingIds = defaultOrder.filter((columnId) => !filteredConfiguredOrder.includes(columnId));
  return [...filteredConfiguredOrder, ...missingIds];
}

function resolveVisibleHiddenColumnIds(defaultOrder: string[], configuredHiddenColumns: string[]): string[] {
  const validIds = new Set(defaultOrder);
  return configuredHiddenColumns.filter((columnId) => validIds.has(columnId));
}

function resolveVorlauflisteIndicatorColor(row: Pick<VorlauflisteItem, "reportState" | "highlightTag">): string | undefined {
  if (row.reportState === "cancelled_only" || row.reportState === "contains_cancelled") {
    return "#E24B4A";
  }
  const color = row.highlightTag?.color?.trim();
  return color && color.length > 0 ? color : undefined;
}

function resolveVorlauflistePrintCellValue(row: VorlauflisteItem, columnId: string): string {
  if (columnId === VORLAUFLISTE_INDICATOR_COLUMN_ID) return "";
  if (columnId === "amount") return formatAmount(row.amount);
  if (columnId === "customerFullName") return resolveValue(row.customerFullName);
  if (columnId === "postalCode") return resolveValue(row.postalCode);
  if (columnId === "city") return resolveValue(row.city);
  if (columnId === "plannedDateText") return resolveValue(row.plannedDateText);
  if (columnId === "plannedWeek") return resolveValue(row.plannedWeek);
  if (columnId === "actualDate") return formatDate(row.actualDate);
  if (columnId === "projectDescription") return resolveValue(row.projectDescription);
  if (columnId.startsWith("product-") || columnId.startsWith("component-")) {
    const categoryId = Number.parseInt(columnId.split("-")[1] ?? "", 10);
    return resolveValue(Number.isInteger(categoryId) ? resolveVorlauflisteArticleValue(row, categoryId) : null);
  }
  return "-";
}

function renderVorlauflistePrintCellContent(row: VorlauflisteItem, columnId: string, testId: string): JSX.Element {
  return (
    <span className={VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME} data-testid={testId}>
      {resolveVorlauflistePrintCellValue(row, columnId)}
    </span>
  );
}

interface ReportsPageProps {
  onCancel?: () => void;
}

export function ReportsPage({ onCancel }: ReportsPageProps) {
  const [userRole] = useState(() =>
    typeof window === "undefined"
      ? "DISPATCHER"
      : window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
  );
  const isAdmin = userRole === "ADMIN";
  const todayBerlin = getBerlinTodayDateString();
  const { data: reportConfigDefaults } = useQuery<ReportConfigDefaultsResponse>({
    queryKey: ["reports-config-defaults"],
    queryFn: () => fetchJson("/api/reports/defaults"),
  });
  const defaultReportRange = useMemo(
    () => resolveDefaultReportRange(todayBerlin, reportConfigDefaults?.latestProjectAppointmentDate ?? null),
    [reportConfigDefaults?.latestProjectAppointmentDate, todayBerlin],
  );
  const defaultIsoWeek = useMemo(() => getISOWeek(defaultReportRange.referenceDate), [defaultReportRange.referenceDate]);
  const defaultIsoWeekYear = useMemo(() => getISOWeekYear(defaultReportRange.referenceDate), [defaultReportRange.referenceDate]);
  const [vorlauflisteFromDate, setVorlauflisteFromDate] = useState(defaultReportRange.fromDate);
  const [vorlauflisteToDate, setVorlauflisteToDate] = useState(defaultReportRange.toDate);
  const [produktionsplanungFromDate, setProduktionsplanungFromDate] = useState(defaultReportRange.fromDate);
  const [produktionsplanungToDate, setProduktionsplanungToDate] = useState(defaultReportRange.toDate);
  const [activeVorlauflisteTab, setActiveVorlauflisteTab] = useState<VorlauflistePanelTab>("date");
  const [activeProduktionsplanungTab, setActiveProduktionsplanungTab] = useState<ReportRangeTab>("date");
  const [vorlauflisteKwStart, setVorlauflisteKwStart] = useState<number | undefined>(defaultIsoWeek);
  const [vorlauflisteWeekCount, setVorlauflisteWeekCount] = useState<number>(defaultReportRange.weekCount);
  const [produktionsplanungKwStart, setProduktionsplanungKwStart] = useState<number | undefined>(defaultIsoWeek);
  const [produktionsplanungWeekCount, setProduktionsplanungWeekCount] = useState<number>(defaultReportRange.weekCount);
  const [page, setPage] = useState(1);
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null);
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false);
  const [reportRequestId, setReportRequestId] = useState(0);
  const [isProduktionsplanungCategoryLayoutDialogOpen, setIsProduktionsplanungCategoryLayoutDialogOpen] = useState(false);
  const [isVorlauflisteColumnsDialogOpen, setIsVorlauflisteColumnsDialogOpen] = useState(false);

  const vorlauflisteSelection = useSetting(VORLAUFLISTE_SETTING_KEY) as VorlauflisteSelection | undefined;
  const vorlauflisteRangeConfig = useSetting(VORLAUFLISTE_RANGE_SETTING_KEY) as VorlauflisteRangeConfig | undefined;
  const produktionsplanungSelection = useSetting(PRODUKTIONSPLANUNG_SETTING_KEY) as ProduktionsplanungSelection | undefined;
  const produktionsplanungRangeConfig = useSetting(PRODUKTIONSPLANUNG_RANGE_SETTING_KEY) as ProduktionsplanungRangeConfig | undefined;
  const categoryLayoutConfig = useSetting(PRODUKTIONSPLANUNG_CATEGORY_LAYOUT_SETTING_KEY) as CategoryLayoutConfig | undefined;
  const { isSaving, setSetting, settingsByKey } = useSettings();

  const produktionsplanungSettingEntry = settingsByKey.get(PRODUKTIONSPLANUNG_SETTING_KEY);
  const legacyProduktionsplanungSettingEntry = settingsByKey.get(LEGACY_PRODUCT_VORLAUF_SETTING_KEY);
  const effectiveProduktionsplanungSelection = useMemo(() => {
    if (produktionsplanungSettingEntry?.resolvedScope === "USER") {
      return produktionsplanungSelection;
    }
    if (legacyProduktionsplanungSettingEntry?.resolvedScope === "USER") {
      const legacySelection = resolveLegacyProduktionsplanungSelection(legacyProduktionsplanungSettingEntry.resolvedValue);
      return {
        useShortCodes: legacySelection.useShortCodes ?? false,
      };
    }
    return produktionsplanungSelection;
  }, [legacyProduktionsplanungSettingEntry, produktionsplanungSelection, produktionsplanungSettingEntry]);
  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/admin/master-data/product-categories?active=all"],
    queryFn: () => fetchJson("/api/admin/master-data/product-categories?active=all"),
  });
  const { data: componentCategories = [] } = useQuery<ComponentCategory[]>({
    queryKey: ["/api/admin/master-data/component-categories?active=all"],
    queryFn: () => fetchJson("/api/admin/master-data/component-categories?active=all"),
  });
  const activeProductCategories = useMemo<ActiveProduktionsplanungCategory[]>(
    () => productCategories
      .filter((category) => category.isActive)
      .map((category) => ({ id: category.id, name: category.name, categoryType: "product" as const, isDefault: category.isDefault })),
    [productCategories],
  );
  const activeComponentCategories = useMemo<ActiveProduktionsplanungCategory[]>(
    () => componentCategories
      .filter((category) => category.isActive)
      .map((category) => ({ id: category.id, name: category.name, categoryType: "component" as const, isDefault: category.isDefault })),
    [componentCategories],
  );
  const defaultProductCategories = useMemo(
    () => activeProductCategories.filter((category) => category.isDefault),
    [activeProductCategories],
  );
  const defaultComponentCategories = useMemo(
    () => activeComponentCategories.filter((category) => category.isDefault),
    [activeComponentCategories],
  );
  const allActiveProduktionsplanungCategories = useMemo(
    () => [...activeProductCategories, ...activeComponentCategories],
    [activeComponentCategories, activeProductCategories],
  );

  const [useVorlauflisteShortCodes, setUseVorlauflisteShortCodes] = useState(false);
  const [vorlauflisteColumnWidths, setVorlauflisteColumnWidths] = useState<Record<string, number>>({});
  const [vorlauflisteColumnOrder, setVorlauflisteColumnOrder] = useState<string[]>([]);
  const [vorlauflisteHiddenColumns, setVorlauflisteHiddenColumns] = useState<string[]>([]);
  const [isVorlauflisteColumnsPopoverOpen, setIsVorlauflisteColumnsPopoverOpen] = useState(false);
  const [isVorlauflistePrintPreviewOpen, setIsVorlauflistePrintPreviewOpen] = useState(false);
  const [activeVorlauflistePrintPageIndex, setActiveVorlauflistePrintPageIndex] = useState(0);
  const [useProduktionsplanungShortCodes, setUseProduktionsplanungShortCodes] = useState(false);
  const hasHydratedVorlauflisteSelectionRef = useRef(false);
  const hasHydratedProduktionsplanungSelectionRef = useRef(false);

  useEffect(() => {
    if (hasHydratedVorlauflisteSelectionRef.current) {
      return;
    }
    hasHydratedVorlauflisteSelectionRef.current = true;
    setUseVorlauflisteShortCodes(vorlauflisteSelection?.useShortCodes ?? false);
    setVorlauflisteColumnWidths(normalizeColumnWidths(vorlauflisteSelection?.columnWidths));
    setVorlauflisteColumnOrder(normalizeColumnIdList(vorlauflisteSelection?.columnOrder));
    setVorlauflisteHiddenColumns(normalizeColumnIdList(vorlauflisteSelection?.hiddenColumns));
  }, [vorlauflisteSelection]);

  useEffect(() => {
    if (hasHydratedProduktionsplanungSelectionRef.current) {
      return;
    }
    hasHydratedProduktionsplanungSelectionRef.current = true;
    setUseProduktionsplanungShortCodes(effectiveProduktionsplanungSelection?.useShortCodes ?? false);
  }, [effectiveProduktionsplanungSelection]);

  useEffect(() => {
    setActiveVorlauflisteTab(vorlauflisteRangeConfig?.activeTab ?? "date");
  }, [vorlauflisteRangeConfig?.activeTab]);

  useEffect(() => {
    setActiveProduktionsplanungTab(produktionsplanungRangeConfig?.activeTab ?? "date");
  }, [produktionsplanungRangeConfig?.activeTab]);

  useEffect(() => {
    setVorlauflisteFromDate(defaultReportRange.fromDate);
    setVorlauflisteToDate(defaultReportRange.toDate);
    setVorlauflisteKwStart(defaultIsoWeek);
    setVorlauflisteWeekCount(defaultReportRange.weekCount);
    setProduktionsplanungFromDate(defaultReportRange.fromDate);
    setProduktionsplanungToDate(defaultReportRange.toDate);
    setProduktionsplanungKwStart(defaultIsoWeek);
    setProduktionsplanungWeekCount(defaultReportRange.weekCount);
  }, [defaultIsoWeek, defaultReportRange.fromDate, defaultReportRange.toDate, defaultReportRange.weekCount]);

  const isProduktionsplanungCategoryLayoutConfigured = (categoryLayoutConfig?.length ?? 0) > 0;
  const activeProductCategoryIds = useMemo(
    () => new Set(activeProductCategories.map((category) => category.id)),
    [activeProductCategories],
  );
  const activeComponentCategoryIds = useMemo(
    () => new Set(activeComponentCategories.map((category) => category.id)),
    [activeComponentCategories],
  );
  const effectiveProduktionsplanungCategoryIds = useMemo(
    () => (isProduktionsplanungCategoryLayoutConfigured
      ? getCategoryLayoutIds(categoryLayoutConfig ?? []).filter((id) =>
        activeProductCategoryIds.has(id) || activeComponentCategoryIds.has(id))
      : [
        ...defaultProductCategories.map((category) => category.id),
        ...defaultComponentCategories.map((category) => category.id),
      ]),
    [
      activeComponentCategoryIds,
      activeProductCategoryIds,
      categoryLayoutConfig,
      defaultComponentCategories,
      defaultProductCategories,
      isProduktionsplanungCategoryLayoutConfigured,
    ],
  );
  const effectiveProduktionsplanungProductCategoryIds = useMemo(
    () => effectiveProduktionsplanungCategoryIds.filter((id) => activeProductCategoryIds.has(id)),
    [activeProductCategoryIds, effectiveProduktionsplanungCategoryIds],
  );
  const effectiveProduktionsplanungComponentCategoryIds = useMemo(
    () => effectiveProduktionsplanungCategoryIds.filter((id) => activeComponentCategoryIds.has(id)),
    [activeComponentCategoryIds, effectiveProduktionsplanungCategoryIds],
  );
  const configuredProduktionsplanungPrintCategories = useMemo<ProduktionsplanungPrintCategory[]>(
    () => orderCategoriesByLayout(allActiveProduktionsplanungCategories, categoryLayoutConfig ?? [])
      .map((category) => ({ id: category.id, name: category.name })),
    [allActiveProduktionsplanungCategories, categoryLayoutConfig],
  );

  const persistSelection = async (reportType: ReportType, next: VorlauflisteSelection | ProduktionsplanungSelection) => {
    if (reportType === "vorlaufliste") {
      const vorlauflisteNext = next as VorlauflisteSelection;
      const value: VorlauflisteSelection = {
        useShortCodes: next.useShortCodes ?? false,
        columnWidths: normalizeColumnWidths(vorlauflisteNext.columnWidths),
      };
      const columnOrder = normalizeColumnIdList(vorlauflisteNext.columnOrder);
      const hiddenColumns = normalizeColumnIdList(vorlauflisteNext.hiddenColumns);
      if (columnOrder.length > 0) value.columnOrder = columnOrder;
      if (hiddenColumns.length > 0) value.hiddenColumns = hiddenColumns;
      await setSetting({
        key: VORLAUFLISTE_SETTING_KEY,
        scopeType: "USER",
        value,
      });
    } else {
      const produktionsplanungNext = next as ProduktionsplanungSelection;
      const value: ProduktionsplanungSelection = {
        useShortCodes: produktionsplanungNext.useShortCodes ?? false,
      };
      await setSetting({
        key: PRODUKTIONSPLANUNG_SETTING_KEY,
        scopeType: "USER",
        value,
      });
    }
  };

  const persistVorlauflisteSelection = async (next?: Partial<VorlauflisteSelection>) => {
    await persistSelection("vorlaufliste", {
      useShortCodes: next?.useShortCodes ?? useVorlauflisteShortCodes,
      columnWidths: next?.columnWidths ?? vorlauflisteColumnWidths,
      columnOrder: next?.columnOrder ?? vorlauflisteColumnOrder,
      hiddenColumns: next?.hiddenColumns ?? vorlauflisteHiddenColumns,
    });
  };

  const persistVorlauflisteRangeConfig = async (next: Partial<VorlauflisteRangeConfig>) => {
    await setSetting({
      key: VORLAUFLISTE_RANGE_SETTING_KEY,
      scopeType: "USER",
      value: {
        activeTab: next.activeTab ?? activeVorlauflisteTab,
        fromDate: normalizePersistedDate(next.fromDate ?? vorlauflisteFromDate),
        toDate: resolveRequiredToDate(next.toDate ?? vorlauflisteToDate, defaultReportRange.toDate),
        kwStart: normalizeKwStart(next.kwStart ?? vorlauflisteKwStart),
        weekCount: normalizeWeekCount(next.weekCount ?? vorlauflisteWeekCount),
      },
    });
  };

  const persistProduktionsplanungRangeConfig = async (next: Partial<ProduktionsplanungRangeConfig>) => {
    await setSetting({
      key: PRODUKTIONSPLANUNG_RANGE_SETTING_KEY,
      scopeType: "USER",
      value: {
        activeTab: next.activeTab ?? activeProduktionsplanungTab,
        fromDate: normalizePersistedDate(next.fromDate ?? produktionsplanungFromDate),
        toDate: resolveRequiredToDate(next.toDate ?? produktionsplanungToDate, defaultReportRange.toDate),
        kwStart: normalizeKwStart(next.kwStart ?? produktionsplanungKwStart),
        weekCount: normalizeWeekCount(next.weekCount ?? produktionsplanungWeekCount),
      },
    });
  };

  const { data: vorlauflisteData, isLoading: isVorlauflisteLoading } = useQuery<VorlauflisteResponse>({
    queryKey: ["reports-vorlaufliste", submittedFilters, reportRequestId, page],
    enabled: submittedFilters?.reportType === "vorlaufliste" && isReportOverlayOpen,
    queryFn: async () => {
      return fetchJson(buildVorlauflisteReportUrl({
        fromDate: submittedFilters!.fromDate,
        toDate: submittedFilters?.toDate,
        useShortCodes: submittedFilters?.useShortCodes ?? false,
        page,
        pageSize: REPORT_PAGE_SIZE,
        refreshKey: reportRequestId,
      }), { cache: "no-store" });
    },
  });
  const {
    data: vorlauflistePrintPreviewData,
    isLoading: isVorlauflistePrintPreviewLoading,
    isError: isVorlauflistePrintPreviewError,
  } = useQuery<VorlauflistePrintPreviewResponse>({
    queryKey: ["reports-vorlaufliste-print-preview", submittedFilters, reportRequestId],
    enabled: isVorlauflistePrintPreviewOpen && submittedFilters?.reportType === "vorlaufliste",
    queryFn: async () => fetchJson(buildVorlauflistePrintPreviewUrl({
      fromDate: submittedFilters!.fromDate,
      toDate: submittedFilters?.toDate,
      useShortCodes: submittedFilters?.useShortCodes ?? false,
    }), { cache: "no-store" }),
  });

  const { data: produktionsplanungData, isLoading: isProduktionsplanungLoading } = useQuery<ReportProduktionsplanungResponse>({
    queryKey: ["reports-produktionsplanung", submittedFilters, reportRequestId],
    enabled: submittedFilters?.reportType === "produktionsplanung" && isReportOverlayOpen,
    queryFn: async () => {
      return fetchJson(buildProduktionsplanungReportUrl({
        fromDate: submittedFilters!.fromDate,
        toDate: submittedFilters?.toDate,
        productCategoryIds: submittedFilters?.productCategoryIds ?? [],
        componentCategoryIds: submittedFilters?.componentCategoryIds ?? [],
        useShortCodes: submittedFilters?.useShortCodes ?? false,
      }));
    },
  });
  const availableVorlauflisteProductCategories = useMemo<VorlauflisteCategory[]>(() => {
    if ((vorlauflisteData?.productCategories?.length ?? 0) > 0) {
      return vorlauflisteData?.productCategories ?? [];
    }
    return productCategories
      .filter((category) => category.isActive)
      .map((category) => ({ id: category.id, name: category.name }));
  }, [productCategories, vorlauflisteData?.productCategories]);
  const availableVorlauflisteComponentCategories = useMemo<VorlauflisteCategory[]>(() => {
    if ((vorlauflisteData?.componentCategories?.length ?? 0) > 0) {
      return vorlauflisteData?.componentCategories ?? [];
    }
    return componentCategories
      .filter((category) => category.isActive)
      .map((category) => ({ id: category.id, name: category.name }));
  }, [componentCategories, vorlauflisteData?.componentCategories]);
  const effectiveProduktionsplanungPrintCategories = useMemo<ProduktionsplanungPrintCategory[]>(() => {
    if (isProduktionsplanungCategoryLayoutConfigured) {
      return configuredProduktionsplanungPrintCategories;
    }

    const categoryById = new Map(
      [...defaultProductCategories, ...defaultComponentCategories]
        .map((category) => [category.id, category] as const),
    );

    return effectiveProduktionsplanungCategoryIds
      .map((id) => categoryById.get(id))
      .filter((category): category is ActiveProduktionsplanungCategory => Boolean(category))
      .map((category) => ({ id: category.id, name: category.name }));
  }, [
    configuredProduktionsplanungPrintCategories,
    defaultComponentCategories,
    defaultProductCategories,
    effectiveProduktionsplanungCategoryIds,
    isProduktionsplanungCategoryLayoutConfigured,
  ]);
  const persistCategoryLayoutConfig = async (nextConfig: CategoryLayoutConfig) => {
    await setSetting({
      key: PRODUKTIONSPLANUNG_CATEGORY_LAYOUT_SETTING_KEY,
      scopeType: "GLOBAL",
      value: nextConfig,
    });
  };

  useEffect(() => {
    if (!isVorlauflistePrintPreviewOpen) {
      setActiveVorlauflistePrintPageIndex(0);
      return;
    }
    setActiveVorlauflistePrintPageIndex(0);
  }, [isVorlauflistePrintPreviewOpen, vorlauflistePrintPreviewData]);

  const resolvePersistedColumnWidth = (columnId: string, defaultWidth: number, minWidth = VORLAUFLISTE_MIN_COLUMN_WIDTH) => {
    if (columnId === VORLAUFLISTE_INDICATOR_COLUMN_ID) {
      return { width: 8, minWidth: 8 };
    }
    const width = clampColumnWidth(vorlauflisteColumnWidths[columnId] ?? defaultWidth, minWidth);
    return { width, minWidth };
  };

  const allVorlauflisteColumns = useMemo<TableViewColumnDef<VorlauflisteItem>[]>(() => {
    const wrapCellClassName = "align-top";
    const renderWrappedText = (value: string | null) => (
      <span className={VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME}>{resolveValue(value)}</span>
    );

    const columns: TableViewColumnDef<VorlauflisteItem>[] = [
      {
        id: VORLAUFLISTE_INDICATOR_COLUMN_ID,
        header: "",
        width: 8,
        minWidth: 8,
        className: "p-0",
        headerClassName: "p-0",
        resizable: false,
        cell: ({ row }) => (
          <div
            className="h-full min-h-[24px] w-[8px]"
            style={{ backgroundColor: resolveVorlauflisteIndicatorColor(row) }}
            data-testid={`reports-vorlaufliste-indicator-${row.projectId}`}
          />
        ),
      },
      { id: "amount", header: "Auftragssumme", accessor: (row) => row.amount ?? "", width: 160, minWidth: 160, className: wrapCellClassName, resizable: true, cell: ({ row }) => <span>{formatAmount(row.amount)}</span> },
      { id: "customerFullName", header: "Kunde", accessor: (row) => row.customerFullName ?? "", width: 220, minWidth: 220, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.customerFullName) },
      { id: "postalCode", header: "PLZ", accessor: (row) => row.postalCode ?? "", width: 110, minWidth: 110, className: wrapCellClassName, resizable: true, cell: ({ row }) => <span>{resolveValue(row.postalCode)}</span> },
      { id: "city", header: "Ort", accessor: (row) => row.city ?? "", width: 160, minWidth: 160, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.city) },
    ];

    for (const category of availableVorlauflisteProductCategories) {
      columns.push({
        id: `product-${category.id}`,
        header: category.name,
        accessor: (row) => resolveVorlauflisteArticleValue(row, category.id) ?? "",
        width: 220,
        minWidth: 220,
        className: wrapCellClassName,
        headerClassName: "whitespace-nowrap",
        resizable: true,
        cell: ({ row }) => renderWrappedText(resolveVorlauflisteArticleValue(row, category.id)),
      });
    }

    for (const category of availableVorlauflisteComponentCategories) {
      columns.push({
        id: `component-${category.id}`,
        header: category.name,
        accessor: (row) => resolveVorlauflisteArticleValue(row, category.id) ?? "",
        width: 220,
        minWidth: 220,
        className: wrapCellClassName,
        headerClassName: "whitespace-nowrap",
        resizable: true,
        cell: ({ row }) => renderWrappedText(resolveVorlauflisteArticleValue(row, category.id)),
      });
    }

    columns.push(
      { id: "plannedDateText", header: "Vorgeplanter Termin", accessor: (row) => row.plannedDateText ?? "", width: 190, minWidth: 190, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.plannedDateText) },
      { id: "plannedWeek", header: "KW Vorgeplant", accessor: (row) => row.plannedWeek ?? "", width: 150, minWidth: 150, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.plannedWeek) },
      { id: "actualDate", header: "Tatsächlicher Termin", accessor: (row) => row.actualDate, minWidth: 170, className: wrapCellClassName, cell: ({ row }) => <span>{formatDate(row.actualDate)}</span> },
      { id: "projectDescription", header: "Anmerkungen", accessor: (row) => row.projectDescription ?? "", width: 320, minWidth: 320, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.projectDescription) },
    );

    return columns.map((column) => {
      const defaultWidth = typeof column.width === "number"
        ? column.width
        : typeof column.minWidth === "number"
          ? column.minWidth
          : 160;
      const minWidth = typeof column.minWidth === "number" ? column.minWidth : VORLAUFLISTE_MIN_COLUMN_WIDTH;
      const resolved = resolvePersistedColumnWidth(column.id, defaultWidth, minWidth);
      return {
        ...column,
        width: resolved.width,
        minWidth: resolved.minWidth,
        resizable: column.resizable ?? true,
      };
    });
  }, [
    availableVorlauflisteComponentCategories,
    availableVorlauflisteProductCategories,
    vorlauflisteColumnWidths,
  ]);

  const configurableVorlauflisteColumns = useMemo(
    () => allVorlauflisteColumns.filter((column) => column.id !== VORLAUFLISTE_INDICATOR_COLUMN_ID),
    [allVorlauflisteColumns],
  );
  const defaultVorlauflisteColumnOrder = useMemo(
    () => configurableVorlauflisteColumns.map((column) => column.id),
    [configurableVorlauflisteColumns],
  );
  const resolvedVorlauflisteColumnOrder = useMemo(
    () => resolveOrderedColumnIds(defaultVorlauflisteColumnOrder, vorlauflisteColumnOrder),
    [defaultVorlauflisteColumnOrder, vorlauflisteColumnOrder],
  );
  const resolvedVorlauflisteHiddenColumns = useMemo(
    () => resolveVisibleHiddenColumnIds(defaultVorlauflisteColumnOrder, vorlauflisteHiddenColumns),
    [defaultVorlauflisteColumnOrder, vorlauflisteHiddenColumns],
  );
  const vorlauflisteColumns = useMemo<TableViewColumnDef<VorlauflisteItem>[]>(() => {
    const indicatorColumn = allVorlauflisteColumns.find((column) => column.id === VORLAUFLISTE_INDICATOR_COLUMN_ID);
    const columnById = new Map(configurableVorlauflisteColumns.map((column) => [column.id, column] as const));
    const orderedColumns = resolvedVorlauflisteColumnOrder
      .map((columnId) => columnById.get(columnId))
      .filter((column): column is TableViewColumnDef<VorlauflisteItem> => Boolean(column))
      .filter((column) => !resolvedVorlauflisteHiddenColumns.includes(column.id));

    return indicatorColumn ? [indicatorColumn, ...orderedColumns] : orderedColumns;
  }, [
    allVorlauflisteColumns,
    configurableVorlauflisteColumns,
    resolvedVorlauflisteColumnOrder,
    resolvedVorlauflisteHiddenColumns,
  ]);

  const updateVorlauflisteColumnWidth = (columnId: string, width: number) => {
    if (columnId === VORLAUFLISTE_INDICATOR_COLUMN_ID) return;
    setVorlauflisteColumnWidths((current) => ({ ...current, [columnId]: width }));
  };

  const commitVorlauflisteColumnWidth = (columnId: string, width: number) => {
    if (columnId === VORLAUFLISTE_INDICATOR_COLUMN_ID) return;
    const next = { ...vorlauflisteColumnWidths, [columnId]: width };
    setVorlauflisteColumnWidths(next);
    void persistVorlauflisteSelection({ columnWidths: next });
  };

  const vorlauflistePrintColumns = useMemo<VorlauflistePrintColumn[]>(() => (
    vorlauflisteColumns.map((column) => ({
      id: column.id,
      headerText: typeof column.header === "string" ? column.header : "",
      width: typeof column.width === "number" ? column.width : 160,
      isIndicator: column.id === VORLAUFLISTE_INDICATOR_COLUMN_ID,
    }))
  ), [vorlauflisteColumns]);

  const vorlauflistePrintPages = useMemo(() => buildVorlauflistePrintPages<VorlauflisteItem>({
    columns: vorlauflistePrintColumns,
    rows: vorlauflistePrintPreviewData?.items ?? [],
    rowsPerPage: VORLAUFLISTE_PRINT_ROWS_PER_PAGE,
    availableWidthPx: VORLAUFLISTE_PRINT_WIDTH_PX,
  }), [vorlauflistePrintColumns, vorlauflistePrintPreviewData]);

  const totalPages = vorlauflisteData?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;
  const isVorlauflisteOverlay = isReportOverlayOpen && submittedFilters?.reportType === "vorlaufliste";
  const isProduktionsplanungLayout = isReportOverlayOpen && submittedFilters?.reportType === "produktionsplanung";
  const vorlauflisteKwRange = useMemo(() => resolveReportRangeFromKw({
    kwStart: vorlauflisteKwStart,
    weekCount: vorlauflisteWeekCount,
    referenceDate: defaultReportRange.referenceDate,
  }), [defaultReportRange.referenceDate, vorlauflisteKwStart, vorlauflisteWeekCount]);
  const produktionsplanungKwRange = useMemo(() => resolveReportRangeFromKw({
    kwStart: produktionsplanungKwStart,
    weekCount: produktionsplanungWeekCount,
    referenceDate: defaultReportRange.referenceDate,
  }), [defaultReportRange.referenceDate, produktionsplanungKwStart, produktionsplanungWeekCount]);
  const isVorlauflisteGenerateDisabled = activeVorlauflisteTab === "calendarWeek"
    ? !vorlauflisteKwRange
    : vorlauflisteFromDate.trim().length === 0;
  const isProduktionsplanungGenerateDisabled = activeProduktionsplanungTab === "calendarWeek"
    ? !produktionsplanungKwRange
    : produktionsplanungFromDate.trim().length === 0;

  const handleGenerateReport = (reportType: ReportType) => {
    const isVorlaufliste = reportType === "vorlaufliste";
    const activeTab = isVorlaufliste ? activeVorlauflisteTab : activeProduktionsplanungTab;
    const kwRange = isVorlaufliste ? vorlauflisteKwRange : produktionsplanungKwRange;
    const fromDate = activeTab === "calendarWeek"
      ? (kwRange?.fromDate ?? "")
      : (isVorlaufliste ? vorlauflisteFromDate : produktionsplanungFromDate);
    const toDate = activeTab === "calendarWeek"
      ? kwRange?.toDate
      : (() => {
        const value = isVorlaufliste ? vorlauflisteToDate : produktionsplanungToDate;
        return value.trim().length > 0 ? value : undefined;
      })();
    const productCategoryIds = isVorlaufliste ? [] : effectiveProduktionsplanungProductCategoryIds;
    const componentCategoryIds = isVorlaufliste ? [] : effectiveProduktionsplanungComponentCategoryIds;

    if (fromDate.trim().length === 0) return;
    setPage(1);
    setSubmittedFilters({
      reportType,
      fromDate,
      toDate,
      productCategoryIds,
      componentCategoryIds,
      useShortCodes: isVorlaufliste ? useVorlauflisteShortCodes : useProduktionsplanungShortCodes,
    });
    setReportRequestId((current) => current + 1);
    setIsReportOverlayOpen(true);
  };

  const closeOverlay = () => {
    setIsReportOverlayOpen(false);
    setIsVorlauflisteColumnsPopoverOpen(false);
    setIsVorlauflistePrintPreviewOpen(false);
    setIsProduktionsplanungCategoryLayoutDialogOpen(false);
  };
  const handleVorlauflistePrint = () => window.print();
  const fixedVorlauflisteColumnIds = useMemo(
    () => configurableVorlauflisteColumns
      .filter((column) => !column.id.startsWith("product-") && !column.id.startsWith("component-"))
      .map((column) => column.id),
    [configurableVorlauflisteColumns],
  );
  const categoryVorlauflisteColumnIds = useMemo(
    () => configurableVorlauflisteColumns
      .filter((column) => column.id.startsWith("product-") || column.id.startsWith("component-"))
      .map((column) => column.id),
    [configurableVorlauflisteColumns],
  );
  const vorlauflisteColumnById = useMemo(
    () => new Map(configurableVorlauflisteColumns.map((column) => [column.id, column] as const)),
    [configurableVorlauflisteColumns],
  );
  const orderedConfigurableVorlauflisteColumns = useMemo(
    () => resolvedVorlauflisteColumnOrder
      .map((columnId) => {
        const column = vorlauflisteColumnById.get(columnId);
        if (!column) return null;
        return {
          id: columnId,
          label: typeof column.header === "string" ? column.header : columnId,
        };
      })
      .filter((column): column is { id: string; label: string } => Boolean(column)),
    [resolvedVorlauflisteColumnOrder, vorlauflisteColumnById],
  );
  const updateVorlauflisteColumnVisibility = (columnId: string, checked: boolean) => {
    const nextHiddenColumns = checked
      ? resolvedVorlauflisteHiddenColumns.filter((entry) => entry !== columnId)
      : Array.from(new Set([...resolvedVorlauflisteHiddenColumns, columnId]));
    setVorlauflisteHiddenColumns(nextHiddenColumns);
    void persistVorlauflisteSelection({ hiddenColumns: nextHiddenColumns });
  };

  const moveVorlauflisteColumn = (columnId: string, direction: -1 | 1) => {
    const index = resolvedVorlauflisteColumnOrder.indexOf(columnId);
    if (index === -1) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= resolvedVorlauflisteColumnOrder.length) return;
    const nextOrder = [...resolvedVorlauflisteColumnOrder];
    [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];
    setVorlauflisteColumnOrder(nextOrder);
    void persistVorlauflisteSelection({ columnOrder: nextOrder });
  };

  const resetVorlauflisteColumns = () => {
    setVorlauflisteColumnOrder(defaultVorlauflisteColumnOrder);
    setVorlauflisteHiddenColumns([]);
    void persistVorlauflisteSelection({
      columnOrder: defaultVorlauflisteColumnOrder,
      hiddenColumns: [],
    });
  };

  return (
    <div className="h-full w-full">
      <ListLayout
        title="Reports"
        icon={<FileText className="h-5 w-5" />}
        helpKey="reports"
        onClose={onCancel}
        showCloseButton={Boolean(onCancel)}
        className="h-full w-full"
        contentClassName="min-h-0"
        contentSlot={(
          <div
            className={cn(
              "relative h-full overflow-hidden",
              isProduktionsplanungLayout ? "reports-print-produktionsplanung-active" : undefined,
            )}
            data-testid="reports-panel"
          >
            <style>
              {`
                @media print {
                  @page {
                    size: A4 landscape;
                    margin: 1cm;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  [data-testid="print-document-root"],
                  [data-testid="print-document-root"] * {
                    visibility: visible !important;
                  }
                  .reports-print-produktionsplanung-active [data-testid="reports-produktionsplanung-overlay"],
                  .reports-print-produktionsplanung-active [data-testid="reports-produktionsplanung-overlay"] * {
                    visibility: visible !important;
                  }
                  .reports-print-produktionsplanung-active [data-testid="reports-produktionsplanung-overlay"] {
                    position: absolute !important;
                    inset: 0 !important;
                    overflow: visible !important;
                    background: white !important;
                  }
                }
              `}
            </style>
            <div className="h-full overflow-auto p-6">
              <SpaltenDialog
                open={isVorlauflisteColumnsDialogOpen}
                columns={orderedConfigurableVorlauflisteColumns}
                hiddenColumnIds={resolvedVorlauflisteHiddenColumns}
                onClose={() => setIsVorlauflisteColumnsDialogOpen(false)}
                onReset={resetVorlauflisteColumns}
                onToggleColumn={updateVorlauflisteColumnVisibility}
                onMoveColumn={moveVorlauflisteColumn}
                testId="dialog-reports-vorlaufliste-columns"
              />

              {isAdmin && isProduktionsplanungCategoryLayoutDialogOpen ? (
                <Dialog open={isProduktionsplanungCategoryLayoutDialogOpen} onOpenChange={setIsProduktionsplanungCategoryLayoutDialogOpen}>
                  <DialogContent
                    className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl"
                    data-testid="dialog-reports-produktionsplanung-category-layout"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Kategorie-Layout</p>
                        <p className="mt-0.5 text-xs text-slate-400">Bloecke und Spaltenaufteilung</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsProduktionsplanungCategoryLayoutDialogOpen(false)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        data-testid="button-reports-produktionsplanung-category-layout-dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="min-h-0 overflow-auto p-5">
                      <ProduktionsplanungCategoryLayoutEditor
                        layoutConfig={categoryLayoutConfig ?? []}
                        categories={allActiveProduktionsplanungCategories}
                        isSaving={isSaving}
                        onAddEntries={async (entries) => {
                          await persistCategoryLayoutConfig([...(categoryLayoutConfig ?? []), ...entries]);
                        }}
                        onRemoveEntry={async (index) => {
                          await persistCategoryLayoutConfig((categoryLayoutConfig ?? []).filter((_, entryIndex) => entryIndex !== index));
                        }}
                        onUpdateEntry={async (index, patch) => {
                          const currentEntry = (categoryLayoutConfig ?? [])[index];
                          if (!currentEntry) {
                            return;
                          }
                          if (
                            (patch.block === undefined || patch.block === currentEntry.block)
                            && (patch.columns === undefined || patch.columns === currentEntry.columns)
                          ) {
                            return;
                          }
                          await persistCategoryLayoutConfig((categoryLayoutConfig ?? []).map((entry, entryIndex) => (
                            entryIndex === index ? { ...entry, ...patch } : entry
                          )));
                        }}
                      />
                    </div>

                    <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setIsProduktionsplanungCategoryLayoutDialogOpen(false)}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                        data-testid="button-reports-produktionsplanung-category-layout-close"
                      >
                        Schliessen
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}

              <div className="flex items-stretch gap-5 overflow-x-auto pb-2">
                <ReportConfigPanel
                  title="Vorlaufliste"
                  helpKey="reports-vorlaufliste"
                  mode={activeVorlauflisteTab}
                  onModeChange={(nextMode) => {
                    setActiveVorlauflisteTab(nextMode);
                    void persistVorlauflisteRangeConfig({ activeTab: nextMode });
                  }}
                  actionButton={(
                    <button
                      type="button"
                      onClick={() => setIsVorlauflisteColumnsDialogOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                      data-testid="button-reports-vorlaufliste-open-columns-dialog"
                    >
                      <Table2 className="h-3.5 w-3.5" />
                      Spalten
                    </button>
                  )}
                  optionsSlot={(
                    <label className="flex cursor-pointer items-center gap-2.5" data-testid="reports-vorlaufliste-shortcodes-option">
                      <input
                        type="checkbox"
                        checked={useVorlauflisteShortCodes}
                        onChange={(event) => {
                          const next = event.target.checked;
                          setUseVorlauflisteShortCodes(next);
                          void persistVorlauflisteSelection({ useShortCodes: next });
                        }}
                        className="h-4 w-4 rounded accent-slate-700"
                        data-testid="checkbox-reports-vorlaufliste-use-shortcodes"
                      />
                      <span className="text-sm text-slate-600">Shortcodes verwenden</span>
                    </label>
                  )}
                  footer={(
                    <button
                      type="button"
                      onClick={() => handleGenerateReport("vorlaufliste")}
                      disabled={isVorlauflisteGenerateDisabled}
                      className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="button-reports-vorlaufliste-generate"
                    >
                      Report erzeugen
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                  testId="reports-vorlaufliste-config-panel"
                  togglePrefix="reports-vorlaufliste"
                >
                  {activeVorlauflisteTab === "date" ? (
                    <div className="space-y-3" data-testid="reports-vorlaufliste-date-panel">
                      <div className="flex w-full flex-wrap items-end justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Datum Beginn</span>
                          <input
                            type="date"
                            value={vorlauflisteFromDate}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setVorlauflisteFromDate(nextValue);
                              void persistVorlauflisteRangeConfig({ fromDate: nextValue });
                            }}
                            className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="reports-vorlaufliste-from-date"
                          />
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Datum Ende</span>
                          <input
                            type="date"
                            value={vorlauflisteToDate}
                            onChange={(event) => {
                              const nextValue = resolveRequiredToDate(event.target.value, defaultReportRange.toDate);
                              setVorlauflisteToDate(nextValue);
                              void persistVorlauflisteRangeConfig({ toDate: nextValue });
                            }}
                            className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="reports-vorlaufliste-to-date"
                          />
                        </div>
                      </div>
                      <RangeSummary
                        fromDate={vorlauflisteFromDate}
                        toDate={vorlauflisteToDate}
                        testId="reports-vorlaufliste-date-summary"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3" data-testid="reports-vorlaufliste-calendar-week-panel">
                      <div className="flex flex-wrap items-start gap-4">
                        <SpinField
                          label="KW Start"
                          value={vorlauflisteKwStart ?? defaultIsoWeek}
                          onChange={(nextValue) => {
                            setVorlauflisteKwStart(nextValue);
                            void persistVorlauflisteRangeConfig({ kwStart: nextValue });
                          }}
                          min={1}
                          max={53}
                          strictTextBounds
                          hint={`KW ${String(vorlauflisteKwStart ?? defaultIsoWeek).padStart(2, "0")} · ${defaultIsoWeekYear}`}
                          inputTestId="input-reports-vorlaufliste-kw-start"
                          incrementTestId="button-reports-vorlaufliste-kw-start-up"
                          decrementTestId="button-reports-vorlaufliste-kw-start-down"
                        />
                        <SpinField
                          label="Anzahl Wochen"
                          value={vorlauflisteWeekCount}
                          onChange={(nextValue) => {
                            setVorlauflisteWeekCount(nextValue);
                            void persistVorlauflisteRangeConfig({ weekCount: nextValue });
                          }}
                          min={1}
                          max={52}
                          hint={`${vorlauflisteWeekCount} ${vorlauflisteWeekCount === 1 ? "Woche" : "Wochen"}`}
                          inputTestId="input-reports-vorlaufliste-week-count"
                          incrementTestId="button-reports-vorlaufliste-week-count-up"
                          decrementTestId="button-reports-vorlaufliste-week-count-down"
                        />
                      </div>
                      <RangeSummary
                        fromDate={vorlauflisteKwRange?.fromDate ?? ""}
                        toDate={vorlauflisteKwRange?.toDate ?? ""}
                        testId="reports-vorlaufliste-calendar-week-summary"
                      />
                    </div>
                  )}
                </ReportConfigPanel>

                <ReportConfigPanel
                  title="Produktionsplanung"
                  helpKey="reports-produkte"
                  mode={activeProduktionsplanungTab}
                  onModeChange={(nextMode) => {
                    setActiveProduktionsplanungTab(nextMode);
                    void persistProduktionsplanungRangeConfig({ activeTab: nextMode });
                  }}
                  actionButton={isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setIsProduktionsplanungCategoryLayoutDialogOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                      data-testid="button-reports-produktionsplanung-open-category-layout"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Kategorie-Layout
                    </button>
                  ) : null}
                  optionsSlot={(
                    <label className="flex cursor-pointer items-center gap-2.5" data-testid="reports-produktionsplanung-shortcodes-option">
                      <input
                        type="checkbox"
                        checked={useProduktionsplanungShortCodes}
                        onChange={(event) => {
                          const next = event.target.checked;
                          setUseProduktionsplanungShortCodes(next);
                          void persistSelection("produktionsplanung", { useShortCodes: next });
                        }}
                        className="h-4 w-4 rounded accent-slate-700"
                        data-testid="checkbox-reports-produktionsplanung-use-shortcodes"
                      />
                      <span className="text-sm text-slate-600">Shortcodes verwenden</span>
                    </label>
                  )}
                  footer={(
                    <button
                      type="button"
                      onClick={() => handleGenerateReport("produktionsplanung")}
                      disabled={isProduktionsplanungGenerateDisabled}
                      className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="button-reports-produktionsplanung-generate"
                    >
                      Report erzeugen
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                  testId="reports-produktionsplanung-config-panel"
                  togglePrefix="reports-produktionsplanung"
                >
                  {activeProduktionsplanungTab === "date" ? (
                    <div className="space-y-3" data-testid="reports-produktionsplanung-date-panel">
                      <div className="flex w-full flex-wrap items-end justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Datum Beginn</span>
                          <input
                            type="date"
                            value={produktionsplanungFromDate}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setProduktionsplanungFromDate(nextValue);
                              void persistProduktionsplanungRangeConfig({ fromDate: nextValue });
                            }}
                            className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="reports-produktionsplanung-from-date"
                          />
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Datum Ende</span>
                          <input
                            type="date"
                            value={produktionsplanungToDate}
                            onChange={(event) => {
                              const nextValue = resolveRequiredToDate(event.target.value, defaultReportRange.toDate);
                              setProduktionsplanungToDate(nextValue);
                              void persistProduktionsplanungRangeConfig({ toDate: nextValue });
                            }}
                            className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="reports-produktionsplanung-to-date"
                          />
                        </div>
                      </div>
                      <RangeSummary
                        fromDate={produktionsplanungFromDate}
                        toDate={produktionsplanungToDate}
                        testId="reports-produktionsplanung-date-summary"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3" data-testid="reports-produktionsplanung-calendar-week-panel">
                      <div className="flex flex-wrap items-start gap-4">
                        <SpinField
                          label="KW Start"
                          value={produktionsplanungKwStart ?? defaultIsoWeek}
                          onChange={(nextValue) => {
                            setProduktionsplanungKwStart(nextValue);
                            void persistProduktionsplanungRangeConfig({ kwStart: nextValue });
                          }}
                          min={1}
                          max={53}
                          strictTextBounds
                          hint={`KW ${String(produktionsplanungKwStart ?? defaultIsoWeek).padStart(2, "0")} · ${defaultIsoWeekYear}`}
                          inputTestId="input-reports-produktionsplanung-kw-start"
                          incrementTestId="button-reports-produktionsplanung-kw-start-up"
                          decrementTestId="button-reports-produktionsplanung-kw-start-down"
                        />
                        <SpinField
                          label="Anzahl Wochen"
                          value={produktionsplanungWeekCount}
                          onChange={(nextValue) => {
                            setProduktionsplanungWeekCount(nextValue);
                            void persistProduktionsplanungRangeConfig({ weekCount: nextValue });
                          }}
                          min={1}
                          max={52}
                          hint={`${produktionsplanungWeekCount} ${produktionsplanungWeekCount === 1 ? "Woche" : "Wochen"}`}
                          inputTestId="input-reports-produktionsplanung-week-count"
                          incrementTestId="button-reports-produktionsplanung-week-count-up"
                          decrementTestId="button-reports-produktionsplanung-week-count-down"
                        />
                      </div>
                      <RangeSummary
                        fromDate={produktionsplanungKwRange?.fromDate ?? ""}
                        toDate={produktionsplanungKwRange?.toDate ?? ""}
                        testId="reports-produktionsplanung-calendar-week-summary"
                      />
                    </div>
                  )}
                </ReportConfigPanel>
              </div>
            </div>

            <div className={cn("absolute inset-0 z-10 bg-card transition-opacity", isVorlauflisteOverlay ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")} data-testid="reports-overlay">
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">Vorlaufliste</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover open={isVorlauflisteColumnsPopoverOpen} onOpenChange={setIsVorlauflisteColumnsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" data-testid="button-reports-vorlaufliste-columns">
                          <Columns3 className="h-4 w-4" />
                          Spalten
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[420px] p-0" align="end">
                        <div className="border-b border-border px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">Spalten konfigurieren</h4>
                              <p className="text-xs text-muted-foreground">Sichtbarkeit und Reihenfolge der Vorlaufliste anpassen.</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={resetVorlauflisteColumns} data-testid="button-reports-vorlaufliste-columns-reset">
                              <RotateCcw className="h-4 w-4" />
                              Reset
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-[70vh] space-y-4 overflow-auto px-4 py-4">
                          <section data-testid="reports-vorlaufliste-columns-fixed-indicator">
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feststehend</h5>
                            <div className="mt-2 flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                              <div className="flex items-center gap-3">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Statusindikator</span>
                              </div>
                              <span className="text-xs text-muted-foreground">Fix</span>
                            </div>
                          </section>
                          <section data-testid="reports-vorlaufliste-columns-fixed-columns">
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Festspalten</h5>
                            <div className="mt-2 space-y-2">
                              {fixedVorlauflisteColumnIds.map((columnId) => {
                                const column = vorlauflisteColumnById.get(columnId);
                                if (!column) return null;
                                const label = typeof column.header === "string" ? column.header : columnId;
                                const index = resolvedVorlauflisteColumnOrder.indexOf(columnId);
                                return (
                                  <div key={columnId} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                                    <label className="flex min-w-0 items-center gap-3 text-sm text-foreground">
                                      <Checkbox
                                        checked={!resolvedVorlauflisteHiddenColumns.includes(columnId)}
                                        onCheckedChange={(checked) => updateVorlauflisteColumnVisibility(columnId, Boolean(checked))}
                                        data-testid={`checkbox-reports-vorlaufliste-column-${columnId}`}
                                      />
                                      <span className="truncate">{label}</span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <Button type="button" variant="ghost" size="icon" onClick={() => moveVorlauflisteColumn(columnId, -1)} disabled={index <= 0} data-testid={`button-reports-vorlaufliste-column-${columnId}-up`}>
                                        <ArrowUp className="h-4 w-4" />
                                      </Button>
                                      <Button type="button" variant="ghost" size="icon" onClick={() => moveVorlauflisteColumn(columnId, 1)} disabled={index === -1 || index >= resolvedVorlauflisteColumnOrder.length - 1} data-testid={`button-reports-vorlaufliste-column-${columnId}-down`}>
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                          <section data-testid="reports-vorlaufliste-columns-categories">
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Artikel-Kategorien</h5>
                            <div className="mt-2 space-y-2">
                              {categoryVorlauflisteColumnIds.map((columnId) => {
                                const column = vorlauflisteColumnById.get(columnId);
                                if (!column) return null;
                                const label = typeof column.header === "string" ? column.header : columnId;
                                const index = resolvedVorlauflisteColumnOrder.indexOf(columnId);
                                return (
                                  <div key={columnId} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                                    <label className="flex min-w-0 items-center gap-3 text-sm text-foreground">
                                      <Checkbox
                                        checked={!resolvedVorlauflisteHiddenColumns.includes(columnId)}
                                        onCheckedChange={(checked) => updateVorlauflisteColumnVisibility(columnId, Boolean(checked))}
                                        data-testid={`checkbox-reports-vorlaufliste-column-${columnId}`}
                                      />
                                      <span className="truncate">{label}</span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <Button type="button" variant="ghost" size="icon" onClick={() => moveVorlauflisteColumn(columnId, -1)} disabled={index <= 0} data-testid={`button-reports-vorlaufliste-column-${columnId}-up`}>
                                        <ArrowUp className="h-4 w-4" />
                                      </Button>
                                      <Button type="button" variant="ghost" size="icon" onClick={() => moveVorlauflisteColumn(columnId, 1)} disabled={index === -1 || index >= resolvedVorlauflisteColumnOrder.length - 1} data-testid={`button-reports-vorlaufliste-column-${columnId}-down`}>
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" variant="outline" onClick={() => setIsVorlauflistePrintPreviewOpen(true)} data-testid="button-reports-vorlaufliste-print-preview">
                      <Printer className="h-4 w-4" />
                      Druckvorschau
                    </Button>
                    <Button type="button" variant="outline" onClick={closeOverlay} data-testid="button-reports-back">Zurück</Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {isVorlauflisteLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : (
                    <div className="flex h-full flex-col">
                      <div className="min-h-0 flex-1 overflow-hidden">
                        <TableView
                          columns={vorlauflisteColumns}
                          rows={vorlauflisteData?.items ?? []}
                          rowKey={(row) => row.projectId}
                          rowTitle={(row) => row.highlightTag?.name}
                          rowPreviewRenderer={(row) => (
                            <ProjectTableHoverPreview
                              project={{
                                ...buildVorlauflistePreviewProject(
                                  row,
                                  vorlauflisteData?.productCategories ?? [],
                                  vorlauflisteData?.componentCategories ?? [],
                                ),
                                appointmentsCount: row.plannedAppointmentsCount,
                              }}
                            />
                          )}
                          onColumnResize={updateVorlauflisteColumnWidth}
                          onColumnResizeEnd={commitVorlauflisteColumnWidth}
                          tableClassName="table-fixed"
                          testId="table-reports-vorlaufliste"
                          stickyHeader
                          emptyState={<ListEmptyState helpKey="reports.vorlaufliste" fallbackTitle="Keine Treffer gefunden." fallbackBody="Für den gewählten Datumsbereich konnten keine passenden Projekte ermittelt werden." />}
                        />
                      </div>
                      <div className="border-t border-border px-6 py-3" data-testid="reports-vorlaufliste-legend">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="block h-4 w-2 rounded-sm" style={{ backgroundColor: "#E24B4A" }} />
                            <span>Storniert</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="block h-4 w-2 rounded-sm" style={{ backgroundColor: "#1e3a8a" }} />
                            <span>Sondermaß / Info-Tag</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-border px-6 py-4">
                  <ListPagingFooter
                    summaryText={`${vorlauflisteData?.total ?? 0} Einträge`}
                    page={page}
                    totalPages={totalPages}
                    canGoPrev={canGoPrev}
                    canGoNext={canGoNext}
                    onPrev={() => canGoPrev && setPage((current) => current - 1)}
                    onNext={() => canGoNext && setPage((current) => current + 1)}
                    prevTestId="button-reports-vorlaufliste-page-prev"
                    nextTestId="button-reports-vorlaufliste-page-next"
                    stateTestId="text-reports-vorlaufliste-page-state"
                  />
                </div>
              </div>
            </div>

            <PrintPreviewDialog
              open={isVorlauflistePrintPreviewOpen}
              onOpenChange={setIsVorlauflistePrintPreviewOpen}
              title="Druckvorschau Vorlaufliste"
              pages={vorlauflistePrintPages}
              activePageIndex={activeVorlauflistePrintPageIndex}
              onPageChange={setActiveVorlauflistePrintPageIndex}
              testIdPrefix="vorlaufliste-print-preview"
              dialogTestId="dialog-vorlaufliste-print-preview"
              showPageMetaBar={false}
              getPageKey={(page) => page.pageNumber}
              headerActions={vorlauflistePrintPages.length > 0 ? (
                <Button type="button" variant="outline" onClick={handleVorlauflistePrint} data-testid="button-reports-vorlaufliste-print">
                  <Printer className="h-4 w-4" />
                  Drucken
                </Button>
              ) : null}
              renderPage={(page) => (
                <PrintPageShell
                  orientation="landscape"
                  paddingMm={10}
                  testId={`vorlaufliste-print-page-${page.pageNumber}`}
                  footer={<PrintSlimFooter pageNumber={page.pageNumber} testId={`vorlaufliste-print-page-footer-${page.pageNumber}`} />}
                >
                  <PrintSlimHeader
                    label="Vorlaufliste"
                    context={
                      submittedFilters?.toDate
                        ? `${formatDate(submittedFilters.fromDate)} bis ${formatDate(submittedFilters.toDate)}`
                        : formatDate(submittedFilters?.fromDate ?? null)
                    }
                    testId={`vorlaufliste-print-page-header-${page.pageNumber}`}
                  />
                  <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                    {page.weekSections.map((weekSection) => (
                      <section
                        key={`vorlaufliste-print-week-${page.pageNumber}-${weekSection.weekStart}-${weekSection.continuedFromPrevious ? "continued" : "start"}`}
                        className="space-y-2"
                        data-testid={`vorlaufliste-print-week-${page.pageNumber}-${weekSection.weekStart}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <PrintSectionHeader label={`KW ${weekSection.weekNumber}`} className="tracking-widest" />
                            {weekSection.continuedFromPrevious ? (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-500">
                                Fortsetzung
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {formatDate(weekSection.weekStart)} - {formatDate(weekSection.weekEnd)}
                          </p>
                        </div>
                        <div className="overflow-hidden rounded border border-slate-300">
                          <table className="w-full border-collapse text-[11px] text-slate-900">
                            <thead className="bg-slate-100">
                              <tr>
                                {page.columns.map((column) => (
                                  <th
                                    key={column.id}
                                    className={cn("border-b border-slate-300 px-2 py-2 text-left font-semibold", column.isIndicator ? "px-0" : "")}
                                    style={column.isIndicator ? { width: 8, minWidth: 8 } : { width: `${(column.scaledWidthPx / VORLAUFLISTE_PRINT_WIDTH_PX) * 100}%` }}
                                  >
                                    {column.isIndicator ? "" : column.headerText}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {weekSection.rows.map((row) => (
                                <tr key={`vorlaufliste-print-row-${page.pageNumber}-${weekSection.weekStart}-${row.projectId}`} className="align-top">
                                  {page.columns.map((column) => (
                                    <td
                                      key={`${row.projectId}-${column.id}`}
                                      className={cn("border-b border-slate-200 px-2 py-2", column.isIndicator ? "px-0 py-0" : "")}
                                    >
                                      {column.isIndicator ? (
                                        <div className="min-h-[28px] w-[8px]" style={{ backgroundColor: resolveVorlauflisteIndicatorColor(row) }} />
                                      ) : (
                                        renderVorlauflistePrintCellContent(
                                          row,
                                          column.id,
                                          `vorlaufliste-print-cell-${page.pageNumber}-${row.projectId}-${column.id}`,
                                        )
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}
                  </div>
                </PrintPageShell>
              )}
              loadingState={isVorlauflistePrintPreviewLoading ? <div className="text-sm text-slate-700">Druckdaten werden geladen...</div> : null}
              errorState={isVorlauflistePrintPreviewError ? <div className="text-sm text-destructive">Druckvorschau konnte nicht geladen werden.</div> : null}
            />

            <div className={cn("absolute inset-0 z-10 bg-card transition-opacity", isProduktionsplanungLayout ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")} data-testid="reports-produktionsplanung-overlay">
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 print:hidden">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">Produktionsplanung</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={closeOverlay} data-testid="button-reports-produktionsplanung-back">Zurück</Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-6">
                  {isProduktionsplanungLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : (
                    <>
                      <div className="space-y-6 print:hidden">
                      {isAdmin && !isProduktionsplanungCategoryLayoutConfigured ? (
                        <section className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" data-testid="reports-produktionsplanung-layout-warning">
                          Kategorie-Layout noch nicht konfiguriert. Bildschirm- und Druckansicht nutzen aktuell die Standardkategorien.
                        </section>
                      ) : null}
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-produktionsplanung-categories">
                        {renderGroupedCategoryList(
                          [
                            ...(produktionsplanungData?.productCategoryGroups ?? []),
                            ...(produktionsplanungData?.componentCategoryGroups ?? []),
                          ],
                          categoryLayoutConfig ?? [],
                          "Keine passenden Kategorien im gewählten Zeitraum gefunden.",
                          "reports-produktionsplanung-categories",
                        )}
                      </section>
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-produktionsplanung-project-cards">
                        <h4 className="text-sm font-semibold">Projekte</h4>
                        {produktionsplanungData?.projectRows?.length ? (
                          <div className="mt-3 flex flex-col gap-4">
                            {(produktionsplanungData?.projectRows ?? []).map((row) => (
                              <ProduktionsplanungProjectCard
                                key={row.projectId}
                                row={row}
                                categories={effectiveProduktionsplanungPrintCategories}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">Keine passenden Projekte im gewählten Zeitraum gefunden.</p>
                        )}
                      </section>
                      </div>
                      <ProduktionsplanungPrintLayout
                        data={produktionsplanungData ?? {
                          productCategoryGroups: [],
                          componentCategoryGroups: [],
                          projectRows: [],
                        }}
                        categories={effectiveProduktionsplanungPrintCategories}
                        layoutConfig={categoryLayoutConfig ?? []}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
