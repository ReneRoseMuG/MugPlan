import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { format, getISOWeek, getISOWeekYear, getISOWeeksInYear, startOfISOWeek, endOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Columns3, FileText, LayoutGrid, Loader2, Table2 } from "lucide-react";
import {
  isManagedRemarksTagName,
  isManagedSpecialMeasureTagName,
  isProtectedSystemTagName,
  type AppointmentCancellationReportState,
} from "@shared/appointmentCancellation";
import { isReportSaunaProductCategoryName } from "@shared/projectArticleList";
import type { ReportAuftragslisteResponse, ReportProduktionsplanungResponse } from "@shared/routes";
import type { ComponentCategory, Product, ProductCategory, Tag } from "@shared/schema";

import { AuftragslisteProjectCard } from "@/components/reports/AuftragslisteProjectCard";
import { AuftragslistePrintLayout, AuftragslistePrintProjectCard } from "@/components/reports/AuftragslistePrintLayout";
import { ProduktionsplanungProjectCard } from "@/components/reports/ProduktionsplanungProjectCard";
import { ReportConfigPanel, type ReportConfigPanelMode } from "@/components/reports/ReportConfigPanel";
import { DateRangeKwRangePanel } from "@/components/ui/DateRangeKwRangePanel";
import { TagFilterInput } from "@/components/filters/tag-filter-input";
import { ReportOpenToggle } from "@/components/reports/ReportOpenToggle";
import { ReportResultOverlayShell } from "@/components/reports/ReportResultOverlayShell";
import { SpaltenDialog } from "@/components/reports/SpaltenDialog";
import { TourenplanReportPanel } from "@/components/reports/TourenplanReportPanel";
import {
  ProduktionsplanungCategoryLayoutEditor,
  type CategoryLayoutCategoryOption,
} from "@/components/reports/ProduktionsplanungCategoryLayoutEditor";
import {
  buildProduktionsplanungPrintBlocks,
  paginateMeasuredProduktionsplanungPrintPages,
  type ProduktionsplanungPrintCategory,
  renderProduktionsplanungPrintBlock,
} from "@/components/reports/ProduktionsplanungPrintLayout";
import {
  areMeasuredPrintCardMeasurementsEqual,
  MeasuredPrintCardMeasurement,
  type MeasuredPrintCardMeasurementResult,
} from "@/components/print/MeasuredPrintCardMeasurement";
import { PrintPageShell } from "@/components/print/PrintPageShell";
import { ReportPrintPreviewDialog } from "@/components/print/ReportPrintPreviewDialog";
import { PrintSectionHeader } from "@/components/print/PrintSectionHeader";
import { PrintSlimFooter } from "@/components/print/PrintSlimFooter";
import { PrintSlimHeader } from "@/components/print/PrintSlimHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogBaseFooter, DialogBaseInlineMessage, DialogBaseShell } from "@/components/ui/dialog-base";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { ListLayout } from "@/components/ui/list-layout";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  buildVorlauflistePreviewProject,
  VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME,
} from "@/components/reports/vorlauflistePreview";
import { ProjectTableHoverPreview } from "@/components/ui/table-hover-previews";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import {
  useSetting,
  useSettings,
} from "@/hooks/useSettings";
import {
  buildCategoryLayoutBlocks,
  CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS,
  CATEGORY_LAYOUT_RESPONSIVE_CATEGORY_SPAN_CLASS_BY_COLUMNS,
  distributeSortedItemsIntoColumns,
  getCategoryLayoutIds,
  orderCategoriesByLayout,
  type CategoryLayoutConfig,
} from "@/lib/produktionsplanung-category-layout";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import {
  paginateAuftragslistePrintPages,
  paginateMeasuredAuftragslistePrintPages,
} from "@/lib/auftragsliste-print-model";
import { countTouchedIsoWeeks } from "@/lib/isoWeekRange";
import { resolveReportRangeFromKw } from "@/lib/reportRangeFromKw";
import { cn } from "@/lib/utils";
import {
  buildVorlauflistePrintPages,
  type VorlauflistePrintColumn,
} from "@/lib/vorlaufliste-print-model";
import { formatDisplayDate } from "@/lib/date-display-format";
import { normalizeServerError } from "@/lib/error-normalization";

type ConfiguredReportType = "vorlaufliste" | "produktionsplanung" | "auftragsliste";
type ReportType = ConfiguredReportType | "tourenplan";
type ReportPrintOrientation = "portrait" | "landscape";

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

type AuftragslisteResponse = {
  productCategories: VorlauflisteCategory[];
  componentCategories: VorlauflisteCategory[];
  availableSaunaModels: string[];
  items: ReportAuftragslisteResponse["items"];
};

type ReportRangeTab = ReportConfigPanelMode;
type VorlauflistePanelTab = ReportRangeTab;

type SubmittedFilters = {
  reportType: ConfiguredReportType;
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  tagIds: number[];
  saunaModels: string[];
  useShortCodes: boolean;
};

export type StandaloneReportLaunch = Omit<SubmittedFilters, "reportType"> & {
  reportType: ReportType;
  activeTab: ReportRangeTab;
  kwStart?: number;
  weekCount?: number;
  allToursSelected?: boolean;
  selectedTourIds?: number[];
  includeWithoutTour?: boolean;
  printMode?: "farbdruck" | "spardruck";
  fontSize?: "small" | "medium" | "large";
  orientation?: "portrait" | "landscape";
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

type AuftragslisteSelection = {
  tagIds?: number[];
  saunaModels?: string[];
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

type AuftragslisteRangeConfig = {
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

type AuftragslisteRequestParams = {
  fromDate: string;
  toDate?: string;
  tagIds: number[];
  saunaModels: string[];
  useShortCodes: boolean;
};

const REPORT_PAGE_SIZE = 100;
const PRODUKTIONSPLANUNG_CATEGORY_LAYOUT_SETTING_KEY = "reports.categoryLayout";
const MAX_REPORT_COLUMN_WIDTH = 960;
const VORLAUFLISTE_INDICATOR_COLUMN_ID = "__indicator";
const VORLAUFLISTE_PRINT_ROWS_PER_PAGE = 12;
const VORLAUFLISTE_PRINT_WIDTH_PX = 1000;
const AUFTRAGSLISTE_PRINT_AVAILABLE_HEIGHT_PX = 920;
function toTestIdToken(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function resolvePrintPreviewDialogWidthClassName(orientation: ReportPrintOrientation): string | undefined {
  return orientation === "portrait" ? "w-[calc(210mm+88px)]" : undefined;
}

function formatDate(value: string | null): string {
  return formatDisplayDate(value, "-");
}

function formatCompactWeekdayDate(value: string | null | undefined): string {
  const normalized = typeof value === "string" ? value : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return "-";
  }
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }
  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(parsed).replace(/\.$/, "");
  return `${weekday} ${format(parsed, "dd.MM.yy", { locale: de })}`;
}

function resolveReportRangeMetaLabel(params: {
  activeTab: ReportRangeTab;
  fromDate: string;
  toDate?: string;
  kwRange?: { fromDate: string; toDate: string } | null;
}): string {
  const fromDate = params.activeTab === "calendarWeek"
    ? params.kwRange?.fromDate ?? ""
    : params.fromDate;
  const toDate = params.activeTab === "calendarWeek"
    ? params.kwRange?.toDate ?? ""
    : (params.toDate ?? "");

  if (!fromDate) return "-";

  const parsedFromDate = parseDateOnlyInput(fromDate);
  const parsedToDate = parseDateOnlyInput(toDate);
  const weekCount = parsedFromDate && parsedToDate
    ? countTouchedIsoWeeks(parsedFromDate, parsedToDate)
    : 1;
  const fromLabel = formatCompactWeekdayDate(fromDate);
  const toLabel = parsedToDate ? formatCompactWeekdayDate(toDate) : null;

  return toLabel
    ? `${fromLabel} - ${toLabel} = ${weekCount} KW`
    : `${fromLabel} = ${weekCount} KW`;
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

export function resolveDefaultReportRange(todayBerlin: string, _latestProjectAppointmentDate?: string | null): {
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

  const currentWeekStart = startOfISOWeek(parsedToday);
  const currentWeekEnd = endOfISOWeek(parsedToday);
  return {
    fromDate: formatDateOnlyInput(currentWeekStart),
    toDate: formatDateOnlyInput(currentWeekEnd),
    weekCount: 1,
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
    const bodyText = await response.text();
    throw new Error(`${response.status}: ${bodyText || `Request failed for ${url}`}`);
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

export function buildAuftragslisteReportUrl(params: AuftragslisteRequestParams): string {
  const searchParams = new URLSearchParams({
    fromDate: params.fromDate,
  });
  if (params.toDate) searchParams.set("toDate", params.toDate);
  for (const id of params.tagIds) searchParams.append("tagIds", String(id));
  for (const model of params.saunaModels) searchParams.append("saunaModels", model);
  if (params.useShortCodes) searchParams.set("useShortCodes", "true");
  return `/api/reports/auftragsliste?${searchParams.toString()}`;
}

export function buildStandaloneReportUrl(params: StandaloneReportLaunch): string {
  const searchParams = new URLSearchParams({
    reportType: params.reportType,
    activeTab: params.activeTab,
    fromDate: params.fromDate,
  });
  if (params.toDate) searchParams.set("toDate", params.toDate);
  if (typeof params.kwStart === "number") searchParams.set("kwStart", String(params.kwStart));
  if (typeof params.weekCount === "number") searchParams.set("weekCount", String(params.weekCount));
  if (params.reportType === "produktionsplanung") {
    for (const id of params.productCategoryIds) searchParams.append("productCategoryIds", String(id));
    for (const id of params.componentCategoryIds) searchParams.append("componentCategoryIds", String(id));
  }
  for (const id of params.tagIds) searchParams.append("tagIds", String(id));
  for (const model of params.saunaModels) searchParams.append("saunaModels", model);
  if (params.useShortCodes) searchParams.set("useShortCodes", "true");
  if (typeof params.allToursSelected === "boolean") searchParams.set("allToursSelected", String(params.allToursSelected));
  for (const id of params.selectedTourIds ?? []) searchParams.append("selectedTourIds", String(id));
  if (typeof params.includeWithoutTour === "boolean") searchParams.set("includeWithoutTour", String(params.includeWithoutTour));
  if (params.printMode) searchParams.set("printMode", params.printMode);
  if (params.fontSize) searchParams.set("fontSize", params.fontSize);
  if (params.orientation) searchParams.set("orientation", params.orientation);
  return `/standalone/reports?${searchParams.toString()}`;
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
        className="grid grid-cols-1 gap-4 rounded-xl border border-slate-300 bg-slate-100/80 p-4 shadow-sm md:grid-cols-3"
        data-testid={`${testIdPrefix}-block-${blockIndex}`}
      >
        {block.categories.map(({ group, columns }) => (
          <div
            key={group.categoryId}
            className={cn("rounded-lg border border-slate-300 bg-white p-4 shadow-sm", CATEGORY_LAYOUT_RESPONSIVE_CATEGORY_SPAN_CLASS_BY_COLUMNS[columns])}
            data-testid={`${testIdPrefix}-category-${group.categoryId}`}
          >
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
  standaloneLaunch?: StandaloneReportLaunch | null;
}

export function ReportsPage({ onCancel, standaloneLaunch = null }: ReportsPageProps) {
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
  const defaultKwStartMax = useMemo(() => getISOWeeksInYear(new Date(defaultIsoWeekYear, 0, 4)), [defaultIsoWeekYear]);
  const [vorlauflisteFromDate, setVorlauflisteFromDate] = useState(defaultReportRange.fromDate);
  const [vorlauflisteToDate, setVorlauflisteToDate] = useState(defaultReportRange.toDate);
  const [produktionsplanungFromDate, setProduktionsplanungFromDate] = useState(defaultReportRange.fromDate);
  const [produktionsplanungToDate, setProduktionsplanungToDate] = useState(defaultReportRange.toDate);
  const [auftragslisteFromDate, setAuftragslisteFromDate] = useState(defaultReportRange.fromDate);
  const [auftragslisteToDate, setAuftragslisteToDate] = useState(defaultReportRange.toDate);
  const [activeVorlauflisteTab, setActiveVorlauflisteTab] = useState<VorlauflistePanelTab>("calendarWeek");
  const [activeProduktionsplanungTab, setActiveProduktionsplanungTab] = useState<ReportRangeTab>("calendarWeek");
  const [activeAuftragslisteTab, setActiveAuftragslisteTab] = useState<ReportRangeTab>("calendarWeek");
  const [vorlauflisteKwStart, setVorlauflisteKwStart] = useState<number | undefined>(defaultIsoWeek);
  const [vorlauflisteWeekCount, setVorlauflisteWeekCount] = useState<number>(defaultReportRange.weekCount);
  const [produktionsplanungKwStart, setProduktionsplanungKwStart] = useState<number | undefined>(defaultIsoWeek);
  const [produktionsplanungWeekCount, setProduktionsplanungWeekCount] = useState<number>(defaultReportRange.weekCount);
  const [auftragslisteKwStart, setAuftragslisteKwStart] = useState<number | undefined>(defaultIsoWeek);
  const [auftragslisteWeekCount, setAuftragslisteWeekCount] = useState<number>(defaultReportRange.weekCount);
  const [page, setPage] = useState(1);
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null);
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false);
  const [reportRequestId, setReportRequestId] = useState(0);
  const [isProduktionsplanungCategoryLayoutDialogOpen, setIsProduktionsplanungCategoryLayoutDialogOpen] = useState(false);
  const [isVorlauflisteColumnsDialogOpen, setIsVorlauflisteColumnsDialogOpen] = useState(false);

  const categoryLayoutConfig = useSetting(PRODUKTIONSPLANUNG_CATEGORY_LAYOUT_SETTING_KEY) as CategoryLayoutConfig | undefined;
  const { isSaving, setSetting } = useSettings();
  const activeProduktionsplanungCategoryLayoutConfig = categoryLayoutConfig ?? [];
  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/admin/master-data/product-categories?active=all"],
    queryFn: () => fetchJson("/api/admin/master-data/product-categories?active=all"),
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/admin/master-data/products?active=all"],
    queryFn: () => fetchJson("/api/admin/master-data/products?active=all"),
  });
  const { data: componentCategories = [] } = useQuery<ComponentCategory[]>({
    queryKey: ["/api/admin/master-data/component-categories?active=all"],
    queryFn: () => fetchJson("/api/admin/master-data/component-categories?active=all"),
  });
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags", "reports"],
    queryFn: () => fetchJson("/api/tags?includeReportTags=true"),
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
  const [isVorlauflistePrintPreviewOpen, setIsVorlauflistePrintPreviewOpen] = useState(false);
  const [activeVorlauflistePrintPageIndex, setActiveVorlauflistePrintPageIndex] = useState(0);
  const [vorlauflistePrintOrientation, setVorlauflistePrintOrientation] = useState<ReportPrintOrientation>("landscape");
  const [useProduktionsplanungShortCodes, setUseProduktionsplanungShortCodes] = useState(false);
  const [isProduktionsplanungPrintPreviewOpen, setIsProduktionsplanungPrintPreviewOpen] = useState(false);
  const [activeProduktionsplanungPrintPageIndex, setActiveProduktionsplanungPrintPageIndex] = useState(0);
  const [produktionsplanungPaginationMeasurement, setProduktionsplanungPaginationMeasurement] = useState<MeasuredPrintCardMeasurementResult | null>(null);
  const [produktionsplanungPrintOrientation, setProduktionsplanungPrintOrientation] = useState<ReportPrintOrientation>("landscape");
  const [useAuftragslisteShortCodes, setUseAuftragslisteShortCodes] = useState(false);
  const [selectedAuftragslisteTagIds, setSelectedAuftragslisteTagIds] = useState<number[]>([]);
  const [selectedAuftragslisteSaunaModels, setSelectedAuftragslisteSaunaModels] = useState<string[]>([]);
  const [isAuftragslisteTagPickerOpen, setIsAuftragslisteTagPickerOpen] = useState(false);
  const [isAuftragslisteSaunaModelPopoverOpen, setIsAuftragslisteSaunaModelPopoverOpen] = useState(false);
  const [isAuftragslistePrintPreviewOpen, setIsAuftragslistePrintPreviewOpen] = useState(false);
  const [activeAuftragslistePrintPageIndex, setActiveAuftragslistePrintPageIndex] = useState(0);
  const [auftragslistePaginationMeasurement, setAuftragslistePaginationMeasurement] = useState<MeasuredPrintCardMeasurementResult | null>(null);
  const [auftragslistePrintOrientation, setAuftragslistePrintOrientation] = useState<ReportPrintOrientation>("portrait");
  const [reportOverlayHost, setReportOverlayHost] = useState<HTMLDivElement | null>(null);
  const hasAppliedStandaloneLaunchRef = useRef(false);

  useEffect(() => {
    if (standaloneLaunch) return;
    setVorlauflisteFromDate(defaultReportRange.fromDate);
    setVorlauflisteToDate(defaultReportRange.toDate);
    setVorlauflisteKwStart(defaultIsoWeek);
    setVorlauflisteWeekCount(defaultReportRange.weekCount);
    setProduktionsplanungFromDate(defaultReportRange.fromDate);
    setProduktionsplanungToDate(defaultReportRange.toDate);
    setProduktionsplanungKwStart(defaultIsoWeek);
    setProduktionsplanungWeekCount(defaultReportRange.weekCount);
    setAuftragslisteFromDate(defaultReportRange.fromDate);
    setAuftragslisteToDate(defaultReportRange.toDate);
    setAuftragslisteKwStart(defaultIsoWeek);
    setAuftragslisteWeekCount(defaultReportRange.weekCount);
  }, [standaloneLaunch, defaultIsoWeek, defaultReportRange.fromDate, defaultReportRange.toDate, defaultReportRange.weekCount]);

  useEffect(() => {
    if (!standaloneLaunch || hasAppliedStandaloneLaunchRef.current) {
      return;
    }
    hasAppliedStandaloneLaunchRef.current = true;

    if (standaloneLaunch.reportType === "tourenplan") {
      return;
    }

    if (standaloneLaunch.reportType === "vorlaufliste") {
      setActiveVorlauflisteTab(standaloneLaunch.activeTab);
      setVorlauflisteFromDate(standaloneLaunch.fromDate);
      setVorlauflisteToDate(standaloneLaunch.toDate ?? "");
      if (typeof standaloneLaunch.kwStart === "number") setVorlauflisteKwStart(standaloneLaunch.kwStart);
      if (typeof standaloneLaunch.weekCount === "number") setVorlauflisteWeekCount(standaloneLaunch.weekCount);
      setUseVorlauflisteShortCodes(standaloneLaunch.useShortCodes);
    } else if (standaloneLaunch.reportType === "produktionsplanung") {
      setActiveProduktionsplanungTab(standaloneLaunch.activeTab);
      setProduktionsplanungFromDate(standaloneLaunch.fromDate);
      setProduktionsplanungToDate(standaloneLaunch.toDate ?? "");
      if (typeof standaloneLaunch.kwStart === "number") setProduktionsplanungKwStart(standaloneLaunch.kwStart);
      if (typeof standaloneLaunch.weekCount === "number") setProduktionsplanungWeekCount(standaloneLaunch.weekCount);
      setUseProduktionsplanungShortCodes(standaloneLaunch.useShortCodes);
    } else {
      setActiveAuftragslisteTab(standaloneLaunch.activeTab);
      setAuftragslisteFromDate(standaloneLaunch.fromDate);
      setAuftragslisteToDate(standaloneLaunch.toDate ?? "");
      if (typeof standaloneLaunch.kwStart === "number") setAuftragslisteKwStart(standaloneLaunch.kwStart);
      if (typeof standaloneLaunch.weekCount === "number") setAuftragslisteWeekCount(standaloneLaunch.weekCount);
      setUseAuftragslisteShortCodes(standaloneLaunch.useShortCodes);
      setSelectedAuftragslisteTagIds(standaloneLaunch.tagIds);
      setSelectedAuftragslisteSaunaModels(standaloneLaunch.saunaModels);
    }

    setPage(1);
    setSubmittedFilters({
      reportType: standaloneLaunch.reportType,
      fromDate: standaloneLaunch.fromDate,
      toDate: standaloneLaunch.toDate,
      productCategoryIds: standaloneLaunch.reportType === "auftragsliste" ? [] : standaloneLaunch.productCategoryIds,
      componentCategoryIds: standaloneLaunch.reportType === "auftragsliste" ? [] : standaloneLaunch.componentCategoryIds,
      tagIds: standaloneLaunch.tagIds,
      saunaModels: standaloneLaunch.saunaModels,
      useShortCodes: standaloneLaunch.useShortCodes,
    });
    setReportRequestId((current) => current + 1);
    setIsReportOverlayOpen(true);
  }, [standaloneLaunch, defaultIsoWeek, defaultReportRange.fromDate, defaultReportRange.toDate, defaultReportRange.weekCount]);

  const isProduktionsplanungCategoryLayoutConfigured = activeProduktionsplanungCategoryLayoutConfig.length > 0;
  const activeProductCategoryIds = useMemo(
    () => new Set(activeProductCategories.map((category) => category.id)),
    [activeProductCategories],
  );
  const activeComponentCategoryIds = useMemo(
    () => new Set(activeComponentCategories.map((category) => category.id)),
    [activeComponentCategories],
  );
  const auftragslisteTagOptions = useMemo(
    () => tags
      .filter((tag) =>
        isManagedSpecialMeasureTagName(tag.name)
        || isManagedRemarksTagName(tag.name)
        || (!tag.isDefault && !isProtectedSystemTagName(tag.name)))
      .sort((left, right) => left.name.localeCompare(right.name, "de") || left.id - right.id),
    [tags],
  );
  const auftragslisteTagOptionIds = useMemo(
    () => new Set(auftragslisteTagOptions.map((tag) => tag.id)),
    [auftragslisteTagOptions],
  );
  const effectiveAuftragslisteTagIds = useMemo(
    () => selectedAuftragslisteTagIds.filter((id) => auftragslisteTagOptionIds.has(id)),
    [auftragslisteTagOptionIds, selectedAuftragslisteTagIds],
  );
  const selectedAuftragslisteTags = useMemo(
    () => effectiveAuftragslisteTagIds
      .map((id) => auftragslisteTagOptions.find((tag) => tag.id === id))
      .filter((tag): tag is Tag => Boolean(tag)),
    [auftragslisteTagOptions, effectiveAuftragslisteTagIds],
  );
  const unselectedAuftragslisteTags = useMemo(() => {
    const selectedIds = new Set(effectiveAuftragslisteTagIds);
    return auftragslisteTagOptions.filter((tag) => !selectedIds.has(tag.id));
  }, [auftragslisteTagOptions, effectiveAuftragslisteTagIds]);
  const effectiveProduktionsplanungCategoryIds = useMemo(
    () => (isProduktionsplanungCategoryLayoutConfigured
      ? getCategoryLayoutIds(activeProduktionsplanungCategoryLayoutConfig).filter((id) =>
        activeProductCategoryIds.has(id) || activeComponentCategoryIds.has(id))
      : [
        ...defaultProductCategories.map((category) => category.id),
        ...defaultComponentCategories.map((category) => category.id),
      ]),
    [
      activeComponentCategoryIds,
      activeProductCategoryIds,
      activeProduktionsplanungCategoryLayoutConfig,
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
    () => orderCategoriesByLayout(allActiveProduktionsplanungCategories, activeProduktionsplanungCategoryLayoutConfig)
      .map((category) => ({ id: category.id, name: category.name })),
    [activeProduktionsplanungCategoryLayoutConfig, allActiveProduktionsplanungCategories],
  );

  const persistSelection = async (_reportType: ConfiguredReportType, _next: VorlauflisteSelection | ProduktionsplanungSelection | AuftragslisteSelection) => undefined;
  const persistVorlauflisteSelection = async (_next?: Partial<VorlauflisteSelection>) => undefined;
  const persistAuftragslisteSelection = async (_next?: Partial<AuftragslisteSelection>) => undefined;
  const persistVorlauflisteRangeConfig = async (_next: Partial<VorlauflisteRangeConfig>) => undefined;
  const persistProduktionsplanungRangeConfig = async (_next: Partial<ProduktionsplanungRangeConfig>) => undefined;
  const persistAuftragslisteRangeConfig = async (_next: Partial<AuftragslisteRangeConfig>) => undefined;

  const {
    data: vorlauflisteData,
    error: vorlauflisteError,
    isLoading: isVorlauflisteLoading,
    isError: isVorlauflisteError,
  } = useQuery<VorlauflisteResponse>({
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
    error: vorlauflistePrintPreviewError,
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

  const {
    data: produktionsplanungData,
    error: produktionsplanungError,
    isLoading: isProduktionsplanungLoading,
    isError: isProduktionsplanungError,
  } = useQuery<ReportProduktionsplanungResponse>({
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
  const {
    data: auftragslisteData,
    error: auftragslisteError,
    isLoading: isAuftragslisteLoading,
    isError: isAuftragslisteError,
  } = useQuery<AuftragslisteResponse>({
    queryKey: ["reports-auftragsliste", submittedFilters, reportRequestId],
    enabled: submittedFilters?.reportType === "auftragsliste" && isReportOverlayOpen,
    queryFn: async () => fetchJson(buildAuftragslisteReportUrl({
      fromDate: submittedFilters!.fromDate,
      toDate: submittedFilters?.toDate,
      tagIds: submittedFilters?.tagIds ?? [],
      saunaModels: submittedFilters?.saunaModels ?? [],
      useShortCodes: submittedFilters?.useShortCodes ?? false,
    }), { cache: "no-store" }),
  });
  const normalizedVorlauflisteError = isVorlauflisteError
    ? normalizeServerError(vorlauflisteError, { title: "Vorlaufliste konnte nicht geladen werden" })
    : null;
  const normalizedVorlauflistePrintPreviewError = isVorlauflistePrintPreviewError
    ? normalizeServerError(vorlauflistePrintPreviewError, { title: "Druckvorschau konnte nicht geladen werden" })
    : null;
  const normalizedProduktionsplanungError = isProduktionsplanungError
    ? normalizeServerError(produktionsplanungError, { title: "Produktionsplanung konnte nicht geladen werden" })
    : null;
  const normalizedAuftragslisteError = isAuftragslisteError
    ? normalizeServerError(auftragslisteError, { title: "Auftragsliste konnte nicht geladen werden" })
    : null;
  const auftragslisteSaunaModelOptions = useMemo(() => {
    if ((auftragslisteData?.availableSaunaModels?.length ?? 0) > 0) {
      return auftragslisteData?.availableSaunaModels ?? [];
    }
    const saunaModelCategory = activeProductCategories.find((category) =>
      isReportSaunaProductCategoryName(category.name));
    if (!saunaModelCategory) return [];

    return Array.from(new Set(
      products
        .filter((product) => product.isActive && product.categoryId === saunaModelCategory.id && product.name.trim().length > 0)
        .map((product) => product.name.trim()),
    )).sort((left, right) => left.localeCompare(right, "de", { sensitivity: "base", numeric: true }));
  }, [activeProductCategories, auftragslisteData?.availableSaunaModels, products]);
  const effectiveAuftragslisteSaunaModels = useMemo(() => {
    const availableModels = new Set(auftragslisteSaunaModelOptions);
    return selectedAuftragslisteSaunaModels
      .map((value) => value.trim())
      .filter((value) => value.length > 0 && (availableModels.size === 0 || availableModels.has(value)));
  }, [auftragslisteSaunaModelOptions, selectedAuftragslisteSaunaModels]);
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
  const vorlauflisteKwRange = useMemo(() => resolveReportRangeFromKw({
    kwStart: vorlauflisteKwStart,
    weekCount: vorlauflisteWeekCount,
    isoWeekYear: defaultIsoWeekYear,
  }), [defaultIsoWeekYear, vorlauflisteKwStart, vorlauflisteWeekCount]);
  const produktionsplanungKwRange = useMemo(() => resolveReportRangeFromKw({
    kwStart: produktionsplanungKwStart,
    weekCount: produktionsplanungWeekCount,
    isoWeekYear: defaultIsoWeekYear,
  }), [defaultIsoWeekYear, produktionsplanungKwStart, produktionsplanungWeekCount]);
  const auftragslisteKwRange = useMemo(() => resolveReportRangeFromKw({
    kwStart: auftragslisteKwStart,
    weekCount: auftragslisteWeekCount,
    isoWeekYear: defaultIsoWeekYear,
  }), [auftragslisteKwStart, auftragslisteWeekCount, defaultIsoWeekYear]);

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
  }, [isVorlauflistePrintPreviewOpen, vorlauflistePrintOrientation, vorlauflistePrintPreviewData]);

  useEffect(() => {
    if (!isAuftragslistePrintPreviewOpen) {
      setActiveAuftragslistePrintPageIndex(0);
      setAuftragslistePaginationMeasurement(null);
      return;
    }
    setActiveAuftragslistePrintPageIndex(0);
    setAuftragslistePaginationMeasurement(null);
  }, [auftragslisteData, auftragslistePrintOrientation, isAuftragslistePrintPreviewOpen]);

  useEffect(() => {
    if (!isProduktionsplanungPrintPreviewOpen) {
      setActiveProduktionsplanungPrintPageIndex(0);
      setProduktionsplanungPaginationMeasurement(null);
      return;
    }
    setActiveProduktionsplanungPrintPageIndex(0);
    setProduktionsplanungPaginationMeasurement(null);
  }, [
    activeProduktionsplanungCategoryLayoutConfig,
    effectiveProduktionsplanungPrintCategories,
    isProduktionsplanungPrintPreviewOpen,
    produktionsplanungPrintOrientation,
    produktionsplanungData,
  ]);

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
  const auftragslisteItems = useMemo(() => auftragslisteData?.items ?? [], [auftragslisteData?.items]);
  const estimatedAuftragslistePrintPages = useMemo(
    () => paginateAuftragslistePrintPages(auftragslisteItems, AUFTRAGSLISTE_PRINT_AVAILABLE_HEIGHT_PX),
    [auftragslisteItems],
  );
  const measuredAuftragslistePrintPages = useMemo(
    () => auftragslistePaginationMeasurement
      ? paginateMeasuredAuftragslistePrintPages(
          auftragslisteItems,
          auftragslistePaginationMeasurement.pageCapacityPx,
          auftragslistePaginationMeasurement.cardHeights,
        )
      : [],
    [auftragslisteItems, auftragslistePaginationMeasurement],
  );
  const auftragslistePrintPages = useMemo(
    () => (
      typeof window === "undefined" || measuredAuftragslistePrintPages.length === 0
        ? estimatedAuftragslistePrintPages
        : measuredAuftragslistePrintPages
    ),
    [estimatedAuftragslistePrintPages, measuredAuftragslistePrintPages],
  );
  const isAuftragslistePaginationMeasuring = typeof window !== "undefined"
    && isAuftragslistePrintPreviewOpen
    && auftragslisteItems.length > 0
    && auftragslistePaginationMeasurement === null;
  const produktionsplanungPrintData = produktionsplanungData ?? {
    productCategoryGroups: [],
    componentCategoryGroups: [],
    projectRows: [],
  };
  const produktionsplanungPrintBlocks = useMemo(
    () => buildProduktionsplanungPrintBlocks(produktionsplanungPrintData, activeProduktionsplanungCategoryLayoutConfig),
    [activeProduktionsplanungCategoryLayoutConfig, produktionsplanungPrintData],
  );
  const produktionsplanungPrintPages = useMemo(
    () => produktionsplanungPaginationMeasurement
      ? paginateMeasuredProduktionsplanungPrintPages(
          produktionsplanungPrintBlocks,
          produktionsplanungPaginationMeasurement.pageCapacityPx,
          produktionsplanungPaginationMeasurement.cardHeights,
        )
      : [],
    [produktionsplanungPaginationMeasurement, produktionsplanungPrintBlocks],
  );
  const isProduktionsplanungPaginationMeasuring = typeof window !== "undefined"
    && isProduktionsplanungPrintPreviewOpen
    && produktionsplanungPrintBlocks.length > 0
    && produktionsplanungPaginationMeasurement === null;

  const totalPages = vorlauflisteData?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;
  const isVorlauflisteOverlay = isReportOverlayOpen && submittedFilters?.reportType === "vorlaufliste";
  const isProduktionsplanungLayout = isReportOverlayOpen && submittedFilters?.reportType === "produktionsplanung";
  const isAuftragslisteOverlay = isReportOverlayOpen && submittedFilters?.reportType === "auftragsliste";
  const vorlauflisteRangeMetaLabel = useMemo(() => resolveReportRangeMetaLabel({
    activeTab: activeVorlauflisteTab,
    fromDate: vorlauflisteFromDate,
    toDate: vorlauflisteToDate,
    kwRange: vorlauflisteKwRange,
  }), [activeVorlauflisteTab, vorlauflisteFromDate, vorlauflisteKwRange, vorlauflisteToDate]);
  const produktionsplanungRangeMetaLabel = useMemo(() => resolveReportRangeMetaLabel({
    activeTab: activeProduktionsplanungTab,
    fromDate: produktionsplanungFromDate,
    toDate: produktionsplanungToDate,
    kwRange: produktionsplanungKwRange,
  }), [activeProduktionsplanungTab, produktionsplanungFromDate, produktionsplanungKwRange, produktionsplanungToDate]);
  const auftragslisteRangeMetaLabel = useMemo(() => resolveReportRangeMetaLabel({
    activeTab: activeAuftragslisteTab,
    fromDate: auftragslisteFromDate,
    toDate: auftragslisteToDate,
    kwRange: auftragslisteKwRange,
  }), [activeAuftragslisteTab, auftragslisteFromDate, auftragslisteKwRange, auftragslisteToDate]);
  const isVorlauflisteGenerateDisabled = activeVorlauflisteTab === "calendarWeek"
    ? !vorlauflisteKwRange
    : vorlauflisteFromDate.trim().length === 0;
  const isProduktionsplanungGenerateDisabled = activeProduktionsplanungTab === "calendarWeek"
    ? !produktionsplanungKwRange
    : produktionsplanungFromDate.trim().length === 0;
  const isAuftragslisteGenerateDisabled = activeAuftragslisteTab === "calendarWeek"
    ? !auftragslisteKwRange
    : auftragslisteFromDate.trim().length === 0;
  const resolveStandaloneLaunch = (reportType: ConfiguredReportType): StandaloneReportLaunch | null => {
    const isVorlaufliste = reportType === "vorlaufliste";
    const isAuftragsliste = reportType === "auftragsliste";
    const activeTab = isVorlaufliste
      ? activeVorlauflisteTab
      : isAuftragsliste
        ? activeAuftragslisteTab
        : activeProduktionsplanungTab;
    const kwRange = isVorlaufliste
      ? vorlauflisteKwRange
      : isAuftragsliste
        ? auftragslisteKwRange
        : produktionsplanungKwRange;
    const fromDate = activeTab === "calendarWeek"
      ? (kwRange?.fromDate ?? "")
      : (isVorlaufliste ? vorlauflisteFromDate : isAuftragsliste ? auftragslisteFromDate : produktionsplanungFromDate);
    const toDate = activeTab === "calendarWeek"
      ? kwRange?.toDate
      : (() => {
        const value = isVorlaufliste ? vorlauflisteToDate : isAuftragsliste ? auftragslisteToDate : produktionsplanungToDate;
        return value.trim().length > 0 ? value : undefined;
      })();
    const productCategoryIds = isVorlaufliste
      ? []
      : isAuftragsliste
        ? []
        : effectiveProduktionsplanungProductCategoryIds;
    const componentCategoryIds = isVorlaufliste
      ? []
      : isAuftragsliste
        ? []
        : effectiveProduktionsplanungComponentCategoryIds;

    if (fromDate.trim().length === 0) return null;
    const kwStart = activeTab === "calendarWeek"
      ? (isVorlaufliste ? vorlauflisteKwStart : isAuftragsliste ? auftragslisteKwStart : produktionsplanungKwStart)
      : undefined;
    const weekCount = activeTab === "calendarWeek"
      ? (isVorlaufliste ? vorlauflisteWeekCount : isAuftragsliste ? auftragslisteWeekCount : produktionsplanungWeekCount)
      : undefined;
    return {
      reportType,
      activeTab,
      fromDate,
      toDate,
      kwStart,
      weekCount,
      productCategoryIds,
      componentCategoryIds,
      tagIds: isAuftragsliste ? effectiveAuftragslisteTagIds : [],
      saunaModels: isAuftragsliste ? effectiveAuftragslisteSaunaModels : [],
      useShortCodes: isVorlaufliste ? useVorlauflisteShortCodes : isAuftragsliste ? useAuftragslisteShortCodes : useProduktionsplanungShortCodes,
    };
  };

  const openGeneratedReport = (launch: StandaloneReportLaunch, openPrintPreview = false) => {
    if (launch.reportType === "tourenplan") return;
    setIsVorlauflistePrintPreviewOpen(false);
    setIsProduktionsplanungPrintPreviewOpen(false);
    setIsAuftragslistePrintPreviewOpen(false);
    setPage(1);
    setSubmittedFilters({
      reportType: launch.reportType,
      fromDate: launch.fromDate,
      toDate: launch.toDate,
      productCategoryIds: launch.productCategoryIds,
      componentCategoryIds: launch.componentCategoryIds,
      tagIds: launch.tagIds,
      saunaModels: launch.saunaModels,
      useShortCodes: launch.useShortCodes,
    });
    setReportRequestId((current) => current + 1);
    setIsReportOverlayOpen(true);
    if (openPrintPreview) {
      if (launch.reportType === "vorlaufliste") setIsVorlauflistePrintPreviewOpen(true);
      if (launch.reportType === "produktionsplanung") setIsProduktionsplanungPrintPreviewOpen(true);
      if (launch.reportType === "auftragsliste") setIsAuftragslistePrintPreviewOpen(true);
    }
  };

  const handleGenerateReport = (reportType: ConfiguredReportType) => {
    const launch = resolveStandaloneLaunch(reportType);
    if (!launch) return;
    openGeneratedReport(launch);
  };

  const handleOpenReportInTab = (reportType: ConfiguredReportType) => {
    const launch = resolveStandaloneLaunch(reportType);
    if (!launch) return;
    window.open(buildStandaloneReportUrl(launch), "_blank");
  };

  const closeOverlay = () => {
    setIsReportOverlayOpen(false);
    setIsVorlauflistePrintPreviewOpen(false);
    setIsProduktionsplanungPrintPreviewOpen(false);
    setIsAuftragslistePrintPreviewOpen(false);
    setIsProduktionsplanungCategoryLayoutDialogOpen(false);
  };
  const handleVorlauflistePrint = () => window.print();
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
            className="relative h-full overflow-hidden"
            data-testid="reports-panel"
          >
            <style>
              {`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  [data-testid="print-document-root"],
                  [data-testid="print-document-root"] * {
                    visibility: visible !important;
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
                <DialogBaseShell
                  open={isProduktionsplanungCategoryLayoutDialogOpen}
                  onOpenChange={setIsProduktionsplanungCategoryLayoutDialogOpen}
                  title="Kategorie-Layout"
                  description="Blöcke und Spaltenaufteilung"
                  icon={<LayoutGrid />}
                  size="xl"
                  testId="dialog-reports-produktionsplanung-category-layout"
                  footer={(
                    <DialogBaseFooter
                      primaryAction={{
                        label: "Schließen",
                        onClick: () => setIsProduktionsplanungCategoryLayoutDialogOpen(false),
                        testId: "button-reports-produktionsplanung-category-layout-close",
                      }}
                    />
                  )}
                >
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
                </DialogBaseShell>
              ) : null}

              <div className="flex flex-col gap-5 pb-2">
                <ReportConfigPanel
                  title="Vorlaufliste"
                  helpKey="reports-vorlaufliste"
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
                    <div className="flex h-full w-fit items-start rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700">
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
                    </div>
                  )}
                  footer={(
                    <ReportOpenToggle
                      disabled={isVorlauflisteGenerateDisabled}
                      onOpen={() => handleGenerateReport("vorlaufliste")}
                      onOpenInTab={() => handleOpenReportInTab("vorlaufliste")}
                      openTestId="button-reports-vorlaufliste-generate"
                      openInTabTestId="button-reports-vorlaufliste-open-tab"
                    />
                  )}
                  testId="reports-vorlaufliste-config-panel"
                >
                  <DateRangeKwRangePanel
                    mode={activeVorlauflisteTab}
                    onModeChange={(nextMode) => {
                      setActiveVorlauflisteTab(nextMode);
                      void persistVorlauflisteRangeConfig({ activeTab: nextMode });
                    }}
                    fromDate={activeVorlauflisteTab === "date" ? vorlauflisteFromDate : (vorlauflisteKwRange?.fromDate ?? "")}
                    toDate={activeVorlauflisteTab === "date" ? vorlauflisteToDate : (vorlauflisteKwRange?.toDate ?? "")}
                    onFromDateChange={(nextValue) => {
                      setVorlauflisteFromDate(nextValue);
                      void persistVorlauflisteRangeConfig({ fromDate: nextValue });
                    }}
                    onToDateChange={(nextValue) => {
                      const resolved = resolveRequiredToDate(nextValue, defaultReportRange.toDate);
                      setVorlauflisteToDate(resolved);
                      void persistVorlauflisteRangeConfig({ toDate: resolved });
                    }}
                    kwStart={vorlauflisteKwStart ?? defaultIsoWeek}
                    kwStartMax={defaultKwStartMax}
                    weekCount={vorlauflisteWeekCount}
                    onKwStartChange={(nextValue) => {
                      setVorlauflisteKwStart(nextValue);
                      void persistVorlauflisteRangeConfig({ kwStart: nextValue });
                    }}
                    onWeekCountChange={(nextValue) => {
                      setVorlauflisteWeekCount(nextValue);
                      void persistVorlauflisteRangeConfig({ weekCount: nextValue });
                    }}
                    togglePrefix="reports-vorlaufliste"
                    fromDateTestId="reports-vorlaufliste-from-date"
                    toDateTestId="reports-vorlaufliste-to-date"
                    kwStartInputTestId="input-reports-vorlaufliste-kw-start"
                    kwStartIncrementTestId="button-reports-vorlaufliste-kw-start-up"
                    kwStartDecrementTestId="button-reports-vorlaufliste-kw-start-down"
                    weekCountInputTestId="input-reports-vorlaufliste-week-count"
                    weekCountIncrementTestId="button-reports-vorlaufliste-week-count-up"
                    weekCountDecrementTestId="button-reports-vorlaufliste-week-count-down"
                    rangeSummaryTestId="reports-vorlaufliste-date-summary"
                  />
                </ReportConfigPanel>

                <ReportConfigPanel
                  title="Produktionsplanung"
                  helpKey="reports-produkte"
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
                    <div className="flex h-full w-fit items-start rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700">
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
                    </div>
                  )}
                  footer={(
                    <ReportOpenToggle
                      disabled={isProduktionsplanungGenerateDisabled}
                      onOpen={() => handleGenerateReport("produktionsplanung")}
                      onOpenInTab={() => handleOpenReportInTab("produktionsplanung")}
                      openTestId="button-reports-produktionsplanung-generate"
                      openInTabTestId="button-reports-produktionsplanung-open-tab"
                    />
                  )}
                  testId="reports-produktionsplanung-config-panel"
                >
                  <DateRangeKwRangePanel
                    mode={activeProduktionsplanungTab}
                    onModeChange={(nextMode) => {
                      setActiveProduktionsplanungTab(nextMode);
                      void persistProduktionsplanungRangeConfig({ activeTab: nextMode });
                    }}
                    fromDate={activeProduktionsplanungTab === "date" ? produktionsplanungFromDate : (produktionsplanungKwRange?.fromDate ?? "")}
                    toDate={activeProduktionsplanungTab === "date" ? produktionsplanungToDate : (produktionsplanungKwRange?.toDate ?? "")}
                    onFromDateChange={(nextValue) => {
                      setProduktionsplanungFromDate(nextValue);
                      void persistProduktionsplanungRangeConfig({ fromDate: nextValue });
                    }}
                    onToDateChange={(nextValue) => {
                      const resolved = resolveRequiredToDate(nextValue, defaultReportRange.toDate);
                      setProduktionsplanungToDate(resolved);
                      void persistProduktionsplanungRangeConfig({ toDate: resolved });
                    }}
                    kwStart={produktionsplanungKwStart ?? defaultIsoWeek}
                    kwStartMax={defaultKwStartMax}
                    weekCount={produktionsplanungWeekCount}
                    onKwStartChange={(nextValue) => {
                      setProduktionsplanungKwStart(nextValue);
                      void persistProduktionsplanungRangeConfig({ kwStart: nextValue });
                    }}
                    onWeekCountChange={(nextValue) => {
                      setProduktionsplanungWeekCount(nextValue);
                      void persistProduktionsplanungRangeConfig({ weekCount: nextValue });
                    }}
                    togglePrefix="reports-produktionsplanung"
                    fromDateTestId="reports-produktionsplanung-from-date"
                    toDateTestId="reports-produktionsplanung-to-date"
                    kwStartInputTestId="input-reports-produktionsplanung-kw-start"
                    kwStartIncrementTestId="button-reports-produktionsplanung-kw-start-up"
                    kwStartDecrementTestId="button-reports-produktionsplanung-kw-start-down"
                    weekCountInputTestId="input-reports-produktionsplanung-week-count"
                    weekCountIncrementTestId="button-reports-produktionsplanung-week-count-up"
                    weekCountDecrementTestId="button-reports-produktionsplanung-week-count-down"
                    rangeSummaryTestId="reports-produktionsplanung-date-summary"
                  />
                </ReportConfigPanel>

                <ReportConfigPanel
                  title="Auftragsliste"
                  helpKey="report-auftragsliste"
                  optionsSlot={(
                    <div
                      className="flex h-full w-fit flex-col items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700"
                      data-testid="reports-auftragsliste-filter-box"
                    >
                      <label className="flex cursor-pointer items-center gap-2.5" data-testid="reports-auftragsliste-shortcodes-option">
                        <input
                          type="checkbox"
                          checked={useAuftragslisteShortCodes}
                          onChange={(event) => {
                            const next = event.target.checked;
                            setUseAuftragslisteShortCodes(next);
                            void persistAuftragslisteSelection({ useShortCodes: next });
                          }}
                          className="h-4 w-4 rounded accent-slate-700"
                          data-testid="checkbox-reports-auftragsliste-use-shortcodes"
                        />
                        <span className="text-sm text-slate-600">Shortcodes verwenden</span>
                      </label>
                      <TagFilterInput
                        label="Tags"
                        selectedTags={selectedAuftragslisteTags}
                        availableTags={unselectedAuftragslisteTags}
                        isOpen={isAuftragslisteTagPickerOpen}
                        onOpenChange={setIsAuftragslisteTagPickerOpen}
                        onAddTag={(tagId) => {
                          const nextIds = Array.from(new Set([...effectiveAuftragslisteTagIds, tagId]));
                          setSelectedAuftragslisteTagIds(nextIds);
                          void persistAuftragslisteSelection({ tagIds: nextIds });
                        }}
                        onRemoveTag={(tagId) => {
                          const nextIds = effectiveAuftragslisteTagIds.filter((id) => id !== tagId);
                          setSelectedAuftragslisteTagIds(nextIds);
                          void persistAuftragslisteSelection({ tagIds: nextIds });
                        }}
                        addButtonTestId="button-reports-auftragsliste-add-tag-filter"
                        testIdPrefix="reports-auftragsliste-tag-filter"
                        className="w-[170px] sm:min-w-0"
                        disableAddWhenEmpty={false}
                      />
                      <div className="flex w-[170px] flex-col gap-1" data-testid="reports-auftragsliste-sauna-model-filter">
                        <span className="text-xs text-slate-500">Sauna Modell</span>
                        <Popover open={isAuftragslisteSaunaModelPopoverOpen} onOpenChange={setIsAuftragslisteSaunaModelPopoverOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex min-h-9 w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                              data-testid="button-reports-auftragsliste-open-sauna-model-filter"
                            >
                              <span className="truncate">
                                {effectiveAuftragslisteSaunaModels.length > 0
                                  ? effectiveAuftragslisteSaunaModels.join(", ")
                                  : "Alle Modelle"}
                              </span>
                              <Columns3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-80" data-testid="reports-auftragsliste-sauna-model-popover">
                            <div className="space-y-2">
                              {auftragslisteSaunaModelOptions.length > 0 ? auftragslisteSaunaModelOptions.map((model) => {
                                const checked = effectiveAuftragslisteSaunaModels.includes(model);
                                return (
                                  <label key={model} className="flex items-center gap-3 text-sm text-foreground">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(nextChecked) => {
                                        const nextModels = Boolean(nextChecked)
                                          ? Array.from(new Set([...effectiveAuftragslisteSaunaModels, model]))
                                          : effectiveAuftragslisteSaunaModels.filter((value) => value !== model);
                                        setSelectedAuftragslisteSaunaModels(nextModels);
                                        void persistAuftragslisteSelection({ saunaModels: nextModels });
                                      }}
                                      data-testid={`checkbox-reports-auftragsliste-sauna-model-${toTestIdToken(model)}`}
                                    />
                                    <span>{model}</span>
                                  </label>
                                );
                              }) : (
                                <p className="text-sm text-muted-foreground">Keine Sauna-Modelle verfügbar</p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                  footer={(
                    <ReportOpenToggle
                      disabled={isAuftragslisteGenerateDisabled}
                      onOpen={() => handleGenerateReport("auftragsliste")}
                      onOpenInTab={() => handleOpenReportInTab("auftragsliste")}
                      openTestId="button-reports-auftragsliste-generate"
                      openInTabTestId="button-reports-auftragsliste-open-tab"
                    />
                  )}
                  testId="reports-auftragsliste-config-panel"
                >
                  <DateRangeKwRangePanel
                    mode={activeAuftragslisteTab}
                    onModeChange={(nextMode) => {
                      setActiveAuftragslisteTab(nextMode);
                      void persistAuftragslisteRangeConfig({ activeTab: nextMode });
                    }}
                    fromDate={activeAuftragslisteTab === "date" ? auftragslisteFromDate : (auftragslisteKwRange?.fromDate ?? "")}
                    toDate={activeAuftragslisteTab === "date" ? auftragslisteToDate : (auftragslisteKwRange?.toDate ?? "")}
                    onFromDateChange={(nextValue) => {
                      setAuftragslisteFromDate(nextValue);
                      void persistAuftragslisteRangeConfig({ fromDate: nextValue });
                    }}
                    onToDateChange={(nextValue) => {
                      const resolved = resolveRequiredToDate(nextValue, defaultReportRange.toDate);
                      setAuftragslisteToDate(resolved);
                      void persistAuftragslisteRangeConfig({ toDate: resolved });
                    }}
                    kwStart={auftragslisteKwStart ?? defaultIsoWeek}
                    kwStartMax={defaultKwStartMax}
                    weekCount={auftragslisteWeekCount}
                    onKwStartChange={(nextValue) => {
                      setAuftragslisteKwStart(nextValue);
                      void persistAuftragslisteRangeConfig({ kwStart: nextValue });
                    }}
                    onWeekCountChange={(nextValue) => {
                      setAuftragslisteWeekCount(nextValue);
                      void persistAuftragslisteRangeConfig({ weekCount: nextValue });
                    }}
                    togglePrefix="reports-auftragsliste"
                    fromDateTestId="reports-auftragsliste-from-date"
                    toDateTestId="reports-auftragsliste-to-date"
                    kwStartInputTestId="input-reports-auftragsliste-kw-start"
                    kwStartIncrementTestId="button-reports-auftragsliste-kw-start-up"
                    kwStartDecrementTestId="button-reports-auftragsliste-kw-start-down"
                    weekCountInputTestId="input-reports-auftragsliste-week-count"
                    weekCountIncrementTestId="button-reports-auftragsliste-week-count-up"
                    weekCountDecrementTestId="button-reports-auftragsliste-week-count-down"
                    rangeSummaryTestId="reports-auftragsliste-date-summary"
                  />
                </ReportConfigPanel>

                <TourenplanReportPanel
                  defaultReportRange={defaultReportRange}
                  defaultIsoWeek={defaultIsoWeek}
                  defaultIsoWeekYear={defaultIsoWeekYear}
                  isAdmin={isAdmin}
                  overlayHost={reportOverlayHost}
                  standaloneLaunch={standaloneLaunch?.reportType === "tourenplan" ? { ...standaloneLaunch, reportType: "tourenplan" as const } : null}
                  buildStandaloneReportUrl={buildStandaloneReportUrl}
                />
              </div>
            </div>

            <ReportResultOverlayShell
              open={isVorlauflisteOverlay}
              title="Vorlaufliste"
              metaLabel={vorlauflisteRangeMetaLabel}
              onOpenPrintPreview={() => setIsVorlauflistePrintPreviewOpen(true)}
              onBack={closeOverlay}
              testId="reports-overlay"
              printPreviewTestId="button-reports-vorlaufliste-print-preview"
              backTestId="button-reports-back"
              footer={(
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
              )}
            >
                  {isVorlauflisteLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : normalizedVorlauflisteError ? (
                    <div className="p-6">
                      <DialogBaseInlineMessage error={normalizedVorlauflisteError} />
                    </div>
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
                    </div>
                  )}
            </ReportResultOverlayShell>

            <ReportPrintPreviewDialog
              open={isVorlauflistePrintPreviewOpen}
              onOpenChange={setIsVorlauflistePrintPreviewOpen}
              title="Druckvorschau - Vorlaufliste"
              dialogWidthClassName={resolvePrintPreviewDialogWidthClassName(vorlauflistePrintOrientation)}
              pages={vorlauflistePrintPages}
              activePageIndex={activeVorlauflistePrintPageIndex}
              onPageChange={setActiveVorlauflistePrintPageIndex}
              testIdPrefix="vorlaufliste-print-preview"
              dialogTestId="dialog-vorlaufliste-print-preview"
              showPageMetaBar={false}
              pageOrientation={vorlauflistePrintOrientation}
              onPageOrientationChange={setVorlauflistePrintOrientation}
              orientationTestIdPrefix="button-reports-vorlaufliste-orientation"
              getPageKey={(page) => page.pageNumber}
              onPrint={handleVorlauflistePrint}
              printDisabled={vorlauflistePrintPages.length === 0}
              printTestId="button-reports-vorlaufliste-print"
              renderPage={(page) => (
                <PrintPageShell
                  orientation={vorlauflistePrintOrientation}
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
              errorState={normalizedVorlauflistePrintPreviewError ? (
                <DialogBaseInlineMessage className="mx-auto max-w-xl bg-white text-sm" error={normalizedVorlauflistePrintPreviewError} />
              ) : null}
            />

            <ReportResultOverlayShell
              open={isAuftragslisteOverlay}
              title="Auftragsliste"
              metaLabel={auftragslisteRangeMetaLabel}
              onOpenPrintPreview={() => setIsAuftragslistePrintPreviewOpen(true)}
              onBack={closeOverlay}
              className="bg-slate-100"
              contentClassName="overflow-auto bg-slate-100 p-6"
              testId="reports-auftragsliste-overlay"
              printPreviewTestId="button-reports-auftragsliste-print-preview"
              backTestId="button-reports-auftragsliste-back"
            >
                  {isAuftragslisteLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : normalizedAuftragslisteError ? (
                    <DialogBaseInlineMessage className="bg-white text-sm" error={normalizedAuftragslisteError} />
                  ) : (
                    <section data-testid="reports-auftragsliste-project-cards">
                      {auftragslisteData?.items?.length ? (
                        <div className="grid grid-cols-1 gap-4">
                          {(auftragslisteData?.items ?? []).map((row) => (
                            <AuftragslisteProjectCard
                              key={row.projectId}
                              row={row}
                              useShortCodes={submittedFilters?.useShortCodes ?? false}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Keine passenden Projekte im gewählten Zeitraum gefunden.</p>
                      )}
                    </section>
                  )}
            </ReportResultOverlayShell>

            {isAuftragslistePrintPreviewOpen && auftragslisteItems.length > 0 ? (
              <MeasuredPrintCardMeasurement
                items={auftragslisteItems}
                getItemKey={(row) => row.projectId}
                measurementKey={`${auftragslisteRangeMetaLabel}-${auftragslistePrintOrientation}`}
                testId="auftragsliste-print-measurement"
                renderCard={(row) => (
                  <AuftragslistePrintProjectCard
                    row={row}
                    useShortCodes={submittedFilters?.useShortCodes ?? false}
                  />
                )}
                renderMeasurementLayout={({ contentRef, cards }) => (
                  <PrintPageShell
                    orientation={auftragslistePrintOrientation}
                    paddingMm={10}
                    footer={<PrintSlimFooter pageNumber={1} />}
                  >
                    <PrintSlimHeader
                      label="Auftragsliste"
                      context={
                        submittedFilters?.toDate
                          ? `${formatDate(submittedFilters.fromDate)} bis ${formatDate(submittedFilters.toDate)}`
                          : formatDate(submittedFilters?.fromDate ?? null)
                      }
                    />
                    <div ref={contentRef} className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4">
                        {cards}
                      </div>
                    </div>
                  </PrintPageShell>
                )}
                onMeasured={(nextMeasurement) => {
                  setAuftragslistePaginationMeasurement((currentMeasurement) => (
                    areMeasuredPrintCardMeasurementsEqual(currentMeasurement, nextMeasurement)
                      ? currentMeasurement
                      : nextMeasurement
                  ));
                }}
              />
            ) : null}

            <ReportPrintPreviewDialog
              open={isAuftragslistePrintPreviewOpen}
              onOpenChange={setIsAuftragslistePrintPreviewOpen}
              title="Druckvorschau - Auftragsliste"
              dialogWidthClassName={resolvePrintPreviewDialogWidthClassName(auftragslistePrintOrientation)}
              pages={auftragslistePrintPages}
              activePageIndex={activeAuftragslistePrintPageIndex}
              onPageChange={setActiveAuftragslistePrintPageIndex}
              testIdPrefix="auftragsliste-print-preview"
              dialogTestId="dialog-auftragsliste-print-preview"
              showPageMetaBar={false}
              pageOrientation={auftragslistePrintOrientation}
              onPageOrientationChange={setAuftragslistePrintOrientation}
              orientationTestIdPrefix="button-reports-auftragsliste-orientation"
              getPageKey={(page) => page.pageNumber}
              onPrint={handleVorlauflistePrint}
              printDisabled={auftragslistePrintPages.length === 0 || isAuftragslistePaginationMeasuring}
              printTestId="button-reports-auftragsliste-print"
              renderPage={(page) => (
                <PrintPageShell
                  orientation={auftragslistePrintOrientation}
                  paddingMm={10}
                  testId={`auftragsliste-print-page-${page.pageNumber}`}
                  footer={<PrintSlimFooter pageNumber={page.pageNumber} testId={`auftragsliste-print-page-footer-${page.pageNumber}`} />}
                >
                  <PrintSlimHeader
                    label="Auftragsliste"
                    context={
                      submittedFilters?.toDate
                        ? `${formatDate(submittedFilters.fromDate)} bis ${formatDate(submittedFilters.toDate)}`
                        : formatDate(submittedFilters?.fromDate ?? null)
                    }
                    testId={`auftragsliste-print-page-header-${page.pageNumber}`}
                  />
                  <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                    <AuftragslistePrintLayout
                      items={page.items}
                      useShortCodes={submittedFilters?.useShortCodes ?? false}
                    />
                  </div>
                </PrintPageShell>
              )}
              loadingState={isAuftragslisteLoading || isAuftragslistePaginationMeasuring ? <div className="text-sm text-slate-700">Druckdaten werden geladen...</div> : null}
              errorState={normalizedAuftragslisteError ? (
                <DialogBaseInlineMessage className="mx-auto max-w-xl bg-white text-sm" error={normalizedAuftragslisteError} />
              ) : null}
            />

            <ReportResultOverlayShell
              open={isProduktionsplanungLayout}
              title="Produktionsplanung"
              metaLabel={produktionsplanungRangeMetaLabel}
              onOpenPrintPreview={() => setIsProduktionsplanungPrintPreviewOpen(true)}
              onBack={closeOverlay}
              contentClassName="overflow-auto p-6"
              testId="reports-produktionsplanung-overlay"
              printPreviewTestId="button-reports-produktionsplanung-print-preview"
              backTestId="button-reports-produktionsplanung-back"
            >
                  {isProduktionsplanungLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : normalizedProduktionsplanungError ? (
                    <DialogBaseInlineMessage className="bg-white text-sm" error={normalizedProduktionsplanungError} />
                  ) : (
                    <div className="space-y-6">
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
                          activeProduktionsplanungCategoryLayoutConfig,
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
                  )}
            </ReportResultOverlayShell>

            {isProduktionsplanungPrintPreviewOpen && produktionsplanungPrintBlocks.length > 0 ? (
              <MeasuredPrintCardMeasurement
                items={produktionsplanungPrintBlocks}
                getItemKey={(block) => block.key}
                measurementKey={`${produktionsplanungRangeMetaLabel}-${produktionsplanungPrintOrientation}-${activeProduktionsplanungCategoryLayoutConfig.length}-${effectiveProduktionsplanungPrintCategories.length}`}
                testId="produktionsplanung-print-measurement"
                renderCard={(block) => renderProduktionsplanungPrintBlock(block, effectiveProduktionsplanungPrintCategories)}
                renderMeasurementLayout={({ contentRef, cards }) => (
                  <PrintPageShell
                    orientation={produktionsplanungPrintOrientation}
                    paddingMm={10}
                    footer={<PrintSlimFooter pageNumber={1} />}
                  >
                    <PrintSlimHeader
                      label="Produktionsplanung"
                      context={
                        submittedFilters?.toDate
                          ? `${formatDate(submittedFilters.fromDate)} bis ${formatDate(submittedFilters.toDate)}`
                          : formatDate(submittedFilters?.fromDate ?? null)
                      }
                    />
                    <div ref={contentRef} className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                      {cards}
                    </div>
                  </PrintPageShell>
                )}
                onMeasured={(nextMeasurement) => {
                  setProduktionsplanungPaginationMeasurement((currentMeasurement) => (
                    areMeasuredPrintCardMeasurementsEqual(currentMeasurement, nextMeasurement)
                      ? currentMeasurement
                      : nextMeasurement
                  ));
                }}
              />
            ) : null}

            <ReportPrintPreviewDialog
              open={isProduktionsplanungPrintPreviewOpen}
              onOpenChange={setIsProduktionsplanungPrintPreviewOpen}
              title="Druckvorschau - Produktionsplanung"
              dialogWidthClassName={resolvePrintPreviewDialogWidthClassName(produktionsplanungPrintOrientation)}
              pages={produktionsplanungPrintPages}
              activePageIndex={activeProduktionsplanungPrintPageIndex}
              onPageChange={setActiveProduktionsplanungPrintPageIndex}
              testIdPrefix="produktionsplanung-print-preview"
              dialogTestId="dialog-produktionsplanung-print-preview"
              showPageMetaBar={false}
              pageOrientation={produktionsplanungPrintOrientation}
              onPageOrientationChange={setProduktionsplanungPrintOrientation}
              orientationTestIdPrefix="button-reports-produktionsplanung-orientation"
              getPageKey={(page) => page.pageNumber}
              onPrint={handleVorlauflistePrint}
              printDisabled={produktionsplanungPrintPages.length === 0 || isProduktionsplanungPaginationMeasuring}
              printTestId="button-reports-produktionsplanung-print"
              renderPage={(page) => (
                <PrintPageShell
                  orientation={produktionsplanungPrintOrientation}
                  paddingMm={10}
                  testId={`produktionsplanung-print-page-${page.pageNumber}`}
                  footer={<PrintSlimFooter pageNumber={page.pageNumber} testId={`produktionsplanung-print-page-footer-${page.pageNumber}`} />}
                >
                  <PrintSlimHeader
                    label="Produktionsplanung"
                    context={
                      submittedFilters?.toDate
                        ? `${formatDate(submittedFilters.fromDate)} bis ${formatDate(submittedFilters.toDate)}`
                        : formatDate(submittedFilters?.fromDate ?? null)
                    }
                    testId={`produktionsplanung-print-page-header-${page.pageNumber}`}
                  />
                  <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                    {page.blocks.map((block) => (
                      <div key={block.key} data-testid={`produktionsplanung-print-block-${block.key}`}>
                        {renderProduktionsplanungPrintBlock(block, effectiveProduktionsplanungPrintCategories)}
                      </div>
                    ))}
                  </div>
                </PrintPageShell>
              )}
              loadingState={isProduktionsplanungLoading || isProduktionsplanungPaginationMeasuring ? <div className="text-sm text-slate-700">Druckdaten werden geladen...</div> : null}
              errorState={normalizedProduktionsplanungError ? (
                <DialogBaseInlineMessage className="mx-auto max-w-xl bg-white text-sm" error={normalizedProduktionsplanungError} />
              ) : null}
            />

            <div ref={setReportOverlayHost} />
          </div>
        )}
      />
    </div>
  );
}
