import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowDown, ArrowUp, Columns3, FileText, Loader2, Lock, Printer, RotateCcw } from "lucide-react";
import type { AppointmentCancellationReportState } from "@shared/appointmentCancellation";
import {
  isManagedReportExclusionTagName,
  isReservedAppointmentCancellationTagName,
} from "@shared/appointmentCancellation";
import type { ComponentCategory, ProductCategory, Tag } from "@shared/schema";

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
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { ListLayout } from "@/components/ui/list-layout";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";
import { ReportConfigSurface } from "@/components/ui/report-config-surface";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  buildVorlauflistePreviewProject,
  VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME,
} from "@/components/reports/vorlauflistePreview";
import { ProjectTableHoverPreview } from "@/components/ui/table-hover-previews";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { resolveProduktionsplanungSelection, useSetting, useSettings } from "@/hooks/useSettings";
import {
  buildCategoryLayoutBlocks,
  CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS,
  distributeSortedItemsIntoColumns,
  getCategoryLayoutIds,
  orderCategoriesByLayout,
  type CategoryLayoutConfig,
} from "@/lib/produktionsplanung-category-layout";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
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

type ProduktionsplanungItemTotal = {
  itemName: string;
  totalQuantity: number;
};

type ProduktionsplanungCategoryGroup = {
  categoryId: number;
  categoryName: string;
  items: ProduktionsplanungItemTotal[];
};

type ProduktionsplanungSpecialMeasureProject = {
  projectId: number;
  orderNumber: string | null;
  customerNumber: string | null;
  customerFullName: string | null;
  actualDate: string | null;
  projectDescription: string | null;
  specialMeasureTag: Tag | null;
};

type ProduktionsplanungResponse = {
  productCategoryGroups: ProduktionsplanungCategoryGroup[];
  componentCategoryGroups: ProduktionsplanungCategoryGroup[];
  specialMeasureProjects: ProduktionsplanungSpecialMeasureProject[];
  projectRows: ProduktionsplanungProjectRow[];
};

type ProduktionsplanungProjectRow = {
  projectId: number;
  projectName: string;
  orderNumber: string | null;
  actualDate: string;
  tourName: string | null;
  articleValues: Array<{ categoryId: number; value: string | null }>;
  projectDescription: string | null;
  matchedSonderblockTagIds: number[];
};

type SubmittedFilters = {
  reportType: ReportType;
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes: boolean;
  sonderblockTagIds: number[];
};

type VorlauflisteSelection = {
  useShortCodes?: boolean;
  columnWidths?: Record<string, number>;
  columnOrder?: string[];
  hiddenColumns?: string[];
};

type ProduktionsplanungSelection = {
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes?: boolean;
  sonderblockTagIds?: number[];
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
  sonderblockTagIds: number[];
};

type ArticleCategorySelectionProps = {
  productCategories: Array<Pick<ProductCategory, "id" | "name">>;
  componentCategories: Array<Pick<ComponentCategory, "id" | "name">>;
  selectedProductCategoryIds: number[];
  selectedComponentCategoryIds: number[];
  onProductCategoryToggle: (categoryId: number, checked: boolean) => void;
  onComponentCategoryToggle: (categoryId: number, checked: boolean) => void;
  testIdPrefix: string;
  disabled?: boolean;
  helperText?: string;
};

const REPORT_PAGE_SIZE = 100;
const VORLAUFLISTE_SETTING_KEY = "reports.vorlaufliste.categorySelection";
const PRODUKTIONSPLANUNG_SETTING_KEY = "reports.produktionsplanung.selection";
const PRODUKTIONSPLANUNG_CATEGORY_LAYOUT_SETTING_KEY = "reports.categoryLayout";
const LEGACY_PRODUCT_VORLAUF_SETTING_KEY = "reports.productVorlauf.selection";
const MIN_REPORT_COLUMN_WIDTH = 80;
const MAX_REPORT_COLUMN_WIDTH = 960;
const VORLAUFLISTE_INDICATOR_COLUMN_ID = "__indicator";
const VORLAUFLISTE_PRINT_ROWS_PER_PAGE = 12;
const VORLAUFLISTE_PRINT_WIDTH_PX = 1000;

function normalizeIds(ids: number[]): number[] {
  return Array.from(new Set(ids.filter((value) => Number.isInteger(value) && value > 0))).sort((left, right) => left - right);
}

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
  for (const id of params.sonderblockTagIds) searchParams.append("sonderblockTagIds", String(id));
  return `/api/reports/produktionsplanung?${searchParams.toString()}`;
}

function formatProjectRowArticles(
  row: ProduktionsplanungProjectRow,
  categories: ProduktionsplanungPrintCategory[],
): JSX.Element | string {
  const groupedValues = buildProjectRowArticleGroups(row, categories);

  if (groupedValues.length === 0) {
    return "-";
  }

  return (
    <div className="space-y-3" data-testid={`reports-produktionsplanung-project-row-${row.projectId}-articles`}>
      {groupedValues.map((group) => (
        <div key={`${row.projectId}-${group.categoryId}`} className="space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-foreground">
            {group.categoryName}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => (
              <div
                key={`${row.projectId}-${group.categoryId}-${item}`}
                className="text-sm leading-5 text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function splitProjectRowArticleValue(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function buildProjectRowArticleGroups(
  row: ProduktionsplanungProjectRow,
  categories: ProduktionsplanungPrintCategory[],
): Array<{ categoryId: number; categoryName: string; items: string[] }> {
  return categories
    .map((category) => {
      const value = row.articleValues.find((entry) => entry.categoryId === category.id)?.value ?? null;
      if (!value || value.trim().length === 0) return null;
      const items = splitProjectRowArticleValue(value);
      if (items.length === 0) return null;
      return {
        categoryId: category.id,
        categoryName: category.name,
        items,
      };
    })
    .filter((value): value is { categoryId: number; categoryName: string; items: string[] } => Boolean(value));
}

function renderGroupedCategoryList(
  groups: ProduktionsplanungCategoryGroup[],
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

function ArticleCategorySelection({
  productCategories,
  componentCategories,
  selectedProductCategoryIds,
  selectedComponentCategoryIds,
  onProductCategoryToggle,
  onComponentCategoryToggle,
  testIdPrefix,
  disabled = false,
  helperText,
}: ArticleCategorySelectionProps) {
  return (
    <div className="inline-block w-fit max-w-full rounded-md border border-border/60 bg-background/70 p-4 align-top">
      <div className="space-y-5">
        <section data-testid={`${testIdPrefix}-product-category-group`}>
          <h5 className="text-sm font-semibold text-foreground">Produkte</h5>
          <div className="mt-3 space-y-2">
            {productCategories.map((category) => (
              <label key={category.id} className="flex items-center gap-3 text-sm text-foreground">
                <Checkbox
                  checked={selectedProductCategoryIds.includes(category.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) => onProductCategoryToggle(category.id, Boolean(checked))}
                  data-testid={`checkbox-${testIdPrefix}-product-category-${category.id}`}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section data-testid={`${testIdPrefix}-component-category-group`}>
          <h5 className="text-sm font-semibold text-foreground">Komponenten</h5>
          <div className="mt-3 space-y-2">
            {componentCategories.map((category) => (
              <label key={category.id} className="flex items-center gap-3 text-sm text-foreground">
                <Checkbox
                  checked={selectedComponentCategoryIds.includes(category.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) => onComponentCategoryToggle(category.id, Boolean(checked))}
                  data-testid={`checkbox-${testIdPrefix}-component-category-${category.id}`}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
      {helperText ? (
        <p className="mt-4 text-sm text-muted-foreground" data-testid={`${testIdPrefix}-disabled-hint`}>
          {helperText}
        </p>
      ) : null}
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
  const [vorlauflisteFromDate, setVorlauflisteFromDate] = useState(getBerlinTodayDateString());
  const [vorlauflisteToDate, setVorlauflisteToDate] = useState("");
  const [showVorlauflisteToDate, setShowVorlauflisteToDate] = useState(false);
  const [produktionsplanungFromDate, setProduktionsplanungFromDate] = useState(getBerlinTodayDateString());
  const [produktionsplanungToDate, setProduktionsplanungToDate] = useState("");
  const [showProduktionsplanungToDate, setShowProduktionsplanungToDate] = useState(false);
  const [page, setPage] = useState(1);
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null);
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false);
  const [reportRequestId, setReportRequestId] = useState(0);

  const vorlauflisteSelection = useSetting(VORLAUFLISTE_SETTING_KEY) as VorlauflisteSelection | undefined;
  const produktionsplanungSelection = useSetting(PRODUKTIONSPLANUNG_SETTING_KEY) as ProduktionsplanungSelection | undefined;
  const categoryLayoutConfig = useSetting(PRODUKTIONSPLANUNG_CATEGORY_LAYOUT_SETTING_KEY) as CategoryLayoutConfig | undefined;
  const { isSaving, setSetting, settingsByKey } = useSettings();

  const produktionsplanungSettingEntry = settingsByKey.get(PRODUKTIONSPLANUNG_SETTING_KEY);
  const legacyProduktionsplanungSettingEntry = settingsByKey.get(LEGACY_PRODUCT_VORLAUF_SETTING_KEY);
  const effectiveProduktionsplanungSelection = useMemo(() => {
    if (produktionsplanungSettingEntry?.resolvedScope === "USER") {
      return produktionsplanungSelection;
    }
    if (legacyProduktionsplanungSettingEntry?.resolvedScope === "USER") {
      return resolveProduktionsplanungSelection(legacyProduktionsplanungSettingEntry.resolvedValue);
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
  const { data: projectTagCatalog = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("project"),
    queryFn: () => fetchTagCatalog("project"),
  });
  const { data: appointmentTagCatalog = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("appointment"),
    queryFn: () => fetchTagCatalog("appointment"),
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
  const [selectedProduktionsplanungSonderblockTagIds, setSelectedProduktionsplanungSonderblockTagIds] = useState<number[]>([]);
  const availableSonderblockTags = useMemo(() => {
    const merged = [...projectTagCatalog, ...appointmentTagCatalog];
    return Array.from(new Map(
      merged
        .filter((tag) =>
          !isManagedReportExclusionTagName(tag.name)
          && !isReservedAppointmentCancellationTagName(tag.name))
        .map((tag) => [tag.id, tag]),
    ).values()).sort((left, right) => left.name.localeCompare(right.name, "de"));
  }, [appointmentTagCatalog, projectTagCatalog]);

  useEffect(() => {
    setUseVorlauflisteShortCodes(vorlauflisteSelection?.useShortCodes ?? false);
    setVorlauflisteColumnWidths(normalizeColumnWidths(vorlauflisteSelection?.columnWidths));
    setVorlauflisteColumnOrder(normalizeColumnIdList(vorlauflisteSelection?.columnOrder));
    setVorlauflisteHiddenColumns(normalizeColumnIdList(vorlauflisteSelection?.hiddenColumns));
  }, [vorlauflisteSelection]);

  useEffect(() => {
    const validSonderblockTagIds = new Set(availableSonderblockTags.map((tag) => tag.id));
    const resolvedSonderblockTagIds = normalizeIds((effectiveProduktionsplanungSelection?.sonderblockTagIds ?? []).filter((id) => validSonderblockTagIds.has(id)));

    setUseProduktionsplanungShortCodes(effectiveProduktionsplanungSelection?.useShortCodes ?? false);
    setSelectedProduktionsplanungSonderblockTagIds(resolvedSonderblockTagIds);
  }, [availableSonderblockTags, effectiveProduktionsplanungSelection]);

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
  const visibleProduktionsplanungEditorProductCategories = useMemo(
    () => (isProduktionsplanungCategoryLayoutConfigured ? activeProductCategories : defaultProductCategories),
    [activeProductCategories, defaultProductCategories, isProduktionsplanungCategoryLayoutConfigured],
  );
  const visibleProduktionsplanungEditorComponentCategories = useMemo(
    () => (isProduktionsplanungCategoryLayoutConfigured ? activeComponentCategories : defaultComponentCategories),
    [activeComponentCategories, defaultComponentCategories, isProduktionsplanungCategoryLayoutConfigured],
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
        productCategoryIds: normalizeIds(produktionsplanungNext.productCategoryIds),
        componentCategoryIds: normalizeIds(produktionsplanungNext.componentCategoryIds),
        useShortCodes: produktionsplanungNext.useShortCodes ?? false,
        sonderblockTagIds: normalizeIds(produktionsplanungNext.sonderblockTagIds ?? []),
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

  const { data: produktionsplanungData, isLoading: isProduktionsplanungLoading } = useQuery<ProduktionsplanungResponse>({
    queryKey: ["reports-produktionsplanung", submittedFilters, reportRequestId],
    enabled: submittedFilters?.reportType === "produktionsplanung" && isReportOverlayOpen,
    queryFn: async () => {
      return fetchJson(buildProduktionsplanungReportUrl({
        fromDate: submittedFilters!.fromDate,
        toDate: submittedFilters?.toDate,
        productCategoryIds: submittedFilters?.productCategoryIds ?? [],
        componentCategoryIds: submittedFilters?.componentCategoryIds ?? [],
        useShortCodes: submittedFilters?.useShortCodes ?? false,
        sonderblockTagIds: submittedFilters?.sonderblockTagIds ?? [],
      }));
    },
  });
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
  const persistedProduktionsplanungCategoryIds = useMemo(
    () => ({
      productCategoryIds: normalizeIds(effectiveProduktionsplanungSelection?.productCategoryIds ?? []),
      componentCategoryIds: normalizeIds(effectiveProduktionsplanungSelection?.componentCategoryIds ?? []),
    }),
    [effectiveProduktionsplanungSelection],
  );
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
    const productCategories: VorlauflisteCategory[] = vorlauflisteData?.productCategories ?? [];
    const componentCategories: VorlauflisteCategory[] = vorlauflisteData?.componentCategories ?? [];
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

    for (const category of productCategories) {
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

    for (const category of componentCategories) {
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
  }, [vorlauflisteColumnWidths, vorlauflisteData]);

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

  const handleGenerateReport = (reportType: ReportType) => {
    const isVorlaufliste = reportType === "vorlaufliste";
    const fromDate = isVorlaufliste ? vorlauflisteFromDate : produktionsplanungFromDate;
    const toDate = isVorlaufliste ? vorlauflisteToDate : produktionsplanungToDate;
    const showToDate = isVorlaufliste ? showVorlauflisteToDate : showProduktionsplanungToDate;
    const productCategoryIds = isVorlaufliste ? [] : effectiveProduktionsplanungProductCategoryIds;
    const componentCategoryIds = isVorlaufliste ? [] : effectiveProduktionsplanungComponentCategoryIds;

    if (fromDate.trim().length === 0) return;
    setPage(1);
    setSubmittedFilters({
      reportType,
      fromDate,
      toDate: showToDate && toDate.trim().length > 0 ? toDate : undefined,
      productCategoryIds,
      componentCategoryIds,
      useShortCodes: isVorlaufliste ? useVorlauflisteShortCodes : useProduktionsplanungShortCodes,
      sonderblockTagIds: isVorlaufliste ? [] : selectedProduktionsplanungSonderblockTagIds,
    });
    setReportRequestId((current) => current + 1);
    setIsReportOverlayOpen(true);
  };

  const closeOverlay = () => {
    setIsReportOverlayOpen(false);
    setIsVorlauflisteColumnsPopoverOpen(false);
    setIsVorlauflistePrintPreviewOpen(false);
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
              <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                <ReportConfigSurface
                  title="Vorlaufliste"
                  helpKey="reports-vorlaufliste"
                  footer={(
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => handleGenerateReport("vorlaufliste")} disabled={vorlauflisteFromDate.trim().length === 0} data-testid="button-reports-vorlaufliste-generate">
                        Report erzeugen
                      </Button>
                    </div>
                  )}
                >
                  <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-3" data-testid="reports-vorlaufliste-date-range-column">
                      <h4 className="text-sm font-semibold text-foreground">Datumsbereich</h4>
                      <div className="flex flex-wrap items-end gap-4 sm:flex-nowrap">
                        <div className="flex w-[150px] flex-none flex-col gap-1">
                          <Label htmlFor="reports-vorlaufliste-from-date">Datum Beginn</Label>
                          <Input id="reports-vorlaufliste-from-date" type="date" value={vorlauflisteFromDate} onChange={(event) => setVorlauflisteFromDate(event.target.value)} data-testid="reports-vorlaufliste-from-date" />
                        </div>
                        {showVorlauflisteToDate ? (
                          <div className="flex w-[150px] flex-none flex-col gap-1">
                            <Label htmlFor="reports-vorlaufliste-to-date">Datum Ende</Label>
                            <Input id="reports-vorlaufliste-to-date" type="date" value={vorlauflisteToDate} onChange={(event) => setVorlauflisteToDate(event.target.value)} data-testid="reports-vorlaufliste-to-date" />
                          </div>
                        ) : (
                          <div className="flex w-[150px] flex-none flex-col gap-1">
                            <Label htmlFor="button-reports-vorlaufliste-show-to-date">Datum Ende</Label>
                            <Button type="button" variant="outline" className="w-fit px-3" onClick={() => setShowVorlauflisteToDate(true)} data-testid="button-reports-vorlaufliste-show-to-date">
                              Anzeigen
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3" data-testid="reports-vorlaufliste-settings-column">
                      <h4 className="text-sm font-semibold text-foreground">Optionen</h4>
                      <label className="mt-3 flex items-center gap-3 text-sm text-foreground" data-testid="reports-vorlaufliste-use-shortcodes-label">
                        <Checkbox
                          checked={useVorlauflisteShortCodes}
                          onCheckedChange={(checked) => {
                            const next = Boolean(checked);
                            setUseVorlauflisteShortCodes(next);
                            void persistVorlauflisteSelection({ useShortCodes: next });
                          }}
                          data-testid="checkbox-reports-vorlaufliste-use-shortcodes"
                        />
                        <span>Shortcodes verwenden?</span>
                      </label>
                    </div>
                  </div>
                </ReportConfigSurface>

                <ReportConfigSurface
                  title="Produktionsplanung"
                  helpKey="reports-produkte"
                  footer={(
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => handleGenerateReport("produktionsplanung")} disabled={produktionsplanungFromDate.trim().length === 0} data-testid="button-reports-produktionsplanung-generate">
                        Report erzeugen
                      </Button>
                    </div>
                  )}
                >
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[max-content_minmax(0,1fr)] xl:items-start">
                    <div className="space-y-4" data-testid="reports-produktionsplanung-date-range-column">
                      <h4 className="text-sm font-semibold text-foreground">Datumsbereich</h4>
                      <div className="flex flex-wrap items-end gap-4 sm:flex-nowrap">
                        <div className="flex w-[150px] flex-none flex-col gap-1">
                          <Label htmlFor="reports-produktionsplanung-from-date">Datum Beginn</Label>
                          <Input id="reports-produktionsplanung-from-date" type="date" value={produktionsplanungFromDate} onChange={(event) => setProduktionsplanungFromDate(event.target.value)} data-testid="reports-produktionsplanung-from-date" />
                        </div>
                        {showProduktionsplanungToDate ? (
                          <div className="flex w-[150px] flex-none flex-col gap-1">
                            <Label htmlFor="reports-produktionsplanung-to-date">Datum Ende</Label>
                            <Input id="reports-produktionsplanung-to-date" type="date" value={produktionsplanungToDate} onChange={(event) => setProduktionsplanungToDate(event.target.value)} data-testid="reports-produktionsplanung-to-date" />
                          </div>
                        ) : (
                          <div className="flex w-[150px] flex-none flex-col gap-1">
                            <Label htmlFor="button-reports-produktionsplanung-show-to-date">Datum Ende</Label>
                            <Button type="button" variant="outline" className="w-fit px-3" onClick={() => setShowProduktionsplanungToDate(true)} data-testid="button-reports-produktionsplanung-show-to-date">
                              Anzeigen
                            </Button>
                          </div>
                        )}
                      </div>

                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-produktionsplanung-info-tags">
                        <h5 className="text-sm font-semibold text-foreground">Info Tags</h5>
                        <div className="mt-3 space-y-2">
                          {availableSonderblockTags.length > 0 ? availableSonderblockTags.map((tag) => (
                            <label key={tag.id} className="flex items-center gap-3 text-sm text-foreground">
                              <Checkbox
                                checked={selectedProduktionsplanungSonderblockTagIds.includes(tag.id)}
                                onCheckedChange={(checked) => {
                                  const nextIds = Boolean(checked)
                                    ? normalizeIds([...selectedProduktionsplanungSonderblockTagIds, tag.id])
                                    : selectedProduktionsplanungSonderblockTagIds.filter((id) => id !== tag.id);
                                  setSelectedProduktionsplanungSonderblockTagIds(nextIds);
                                  void persistSelection("produktionsplanung", {
                                    productCategoryIds: persistedProduktionsplanungCategoryIds.productCategoryIds,
                                    componentCategoryIds: persistedProduktionsplanungCategoryIds.componentCategoryIds,
                                    useShortCodes: useProduktionsplanungShortCodes,
                                    sonderblockTagIds: nextIds,
                                  });
                                }}
                                data-testid={`checkbox-reports-produktionsplanung-sonderblock-tag-${tag.id}`}
                              />
                              <span>{tag.name}</span>
                            </label>
                          )) : (
                            <p className="text-sm text-muted-foreground">Keine auswählbaren Info Tags gefunden.</p>
                          )}
                        </div>
                      </section>
                    </div>

                    <div className="justify-self-end space-y-3" data-testid="reports-produktionsplanung-categories-column">
                      <h4 className="text-sm font-semibold text-foreground">Artikel Kategorien</h4>
                      <ArticleCategorySelection
                        productCategories={visibleProduktionsplanungEditorProductCategories}
                        componentCategories={visibleProduktionsplanungEditorComponentCategories}
                        selectedProductCategoryIds={effectiveProduktionsplanungProductCategoryIds}
                        selectedComponentCategoryIds={effectiveProduktionsplanungComponentCategoryIds}
                        onProductCategoryToggle={() => undefined}
                        onComponentCategoryToggle={() => undefined}
                        testIdPrefix="reports-produktionsplanung"
                        disabled
                        helperText="Die Kategorieauswahl wird über das Kategorie-Layout gesteuert."
                      />
                      {isAdmin ? (
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
                      ) : null}
                      <label className="mt-3 flex items-center gap-3 text-sm text-foreground" data-testid="reports-produktionsplanung-use-shortcodes-label">
                        <Checkbox
                          checked={useProduktionsplanungShortCodes}
                          onCheckedChange={(checked) => {
                            const next = Boolean(checked);
                            setUseProduktionsplanungShortCodes(next);
                            void persistSelection("produktionsplanung", {
                              productCategoryIds: persistedProduktionsplanungCategoryIds.productCategoryIds,
                              componentCategoryIds: persistedProduktionsplanungCategoryIds.componentCategoryIds,
                              useShortCodes: next,
                              sonderblockTagIds: selectedProduktionsplanungSonderblockTagIds,
                            });
                          }}
                          data-testid="checkbox-reports-produktionsplanung-use-shortcodes"
                        />
                        <span>Shortcodes verwenden?</span>
                      </label>
                      <section className="hidden" data-testid="reports-produktionsplanung-sonderblock-tags">
                        <h5 className="text-sm font-semibold text-foreground">Sonderblock-Tags</h5>
                        <div className="mt-3 space-y-2">
                          {availableSonderblockTags.length > 0 ? availableSonderblockTags.map((tag) => (
                            <label key={tag.id} className="flex items-center gap-3 text-sm text-foreground">
                              <Checkbox
                                checked={selectedProduktionsplanungSonderblockTagIds.includes(tag.id)}
                                onCheckedChange={(checked) => {
                                  const nextIds = Boolean(checked)
                                    ? normalizeIds([...selectedProduktionsplanungSonderblockTagIds, tag.id])
                                    : selectedProduktionsplanungSonderblockTagIds.filter((id) => id !== tag.id);
                                  setSelectedProduktionsplanungSonderblockTagIds(nextIds);
                                  void persistSelection("produktionsplanung", {
                                    productCategoryIds: persistedProduktionsplanungCategoryIds.productCategoryIds,
                                    componentCategoryIds: persistedProduktionsplanungCategoryIds.componentCategoryIds,
                                    useShortCodes: useProduktionsplanungShortCodes,
                                    sonderblockTagIds: nextIds,
                                  });
                                }}
                                data-testid={`checkbox-reports-produktionsplanung-sonderblock-tag-${tag.id}`}
                              />
                              <span>{tag.name}</span>
                            </label>
                          )) : (
                            <p className="text-sm text-muted-foreground">Keine auswählbaren Sonderblock-Tags gefunden.</p>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </ReportConfigSurface>
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
                              project={buildVorlauflistePreviewProject(
                                row,
                                vorlauflisteData?.productCategories ?? [],
                                vorlauflisteData?.componentCategories ?? [],
                              )}
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
                          Kategorie-Layout noch nicht konfiguriert. Bildschirmansicht nutzt aktuell die Standardkategorien, der Druck bleibt im bisherigen Voll-Output.
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
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-produktionsplanung-projects">
                        <h4 className="text-sm font-semibold">Projektliste</h4>
                        {produktionsplanungData?.projectRows?.length ? (
                          <div className="mt-3 overflow-auto">
                            <table className="min-w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-border/70 text-left">
                                  <th className="px-2 py-2 font-semibold">Tatsächlicher Termin</th>
                                  <th className="px-2 py-2 font-semibold">Tour</th>
                                  <th className="px-2 py-2 font-semibold">Projekt / Auftrag</th>
                                  <th className="px-2 py-2 font-semibold">Artikel</th>
                                  <th className="px-2 py-2 font-semibold">Anmerkungen</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(produktionsplanungData?.projectRows ?? []).map((row) => (
                                  <tr key={row.projectId} className="border-b border-border/40 align-top" data-testid={`reports-produktionsplanung-project-row-${row.projectId}`}>
                                    <td className="px-2 py-2">{formatDate(row.actualDate)}</td>
                                    <td className="px-2 py-2">{resolveValue(row.tourName)}</td>
                                    <td className="px-2 py-2">
                                      <div className="font-semibold">{row.projectName}</div>
                                      <div className="text-xs text-muted-foreground">{resolveValue(row.orderNumber)}</div>
                                    </td>
                                    <td className="px-2 py-2">{formatProjectRowArticles(row, effectiveProduktionsplanungPrintCategories)}</td>
                                    <td className="px-2 py-2">{resolveValue(row.projectDescription)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">Keine passenden Projekte im gewählten Zeitraum gefunden.</p>
                        )}
                      </section>
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-produktionsplanung-special-measures">
                        <h4 className="text-sm font-semibold">Sondermaße</h4>
                        {produktionsplanungData?.specialMeasureProjects.length ? (
                          <div className="mt-3 space-y-3">
                            {produktionsplanungData.specialMeasureProjects.map((entry) => (
                              <div key={entry.projectId} className="rounded-md border border-border/50 px-4 py-3" data-testid={`reports-produktionsplanung-special-measure-project-${entry.projectId}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                      <span className="font-semibold">{resolveValue(entry.orderNumber)}</span>
                                      <span>{resolveValue(entry.customerFullName)}</span>
                                      <span>{resolveValue(entry.customerNumber)}</span>
                                      <span>{formatDate(entry.actualDate)}</span>
                                    </div>
                                  </div>
                                  {entry.specialMeasureTag ? <EntityTagFooterRow tags={[entry.specialMeasureTag]} testId={`reports-produktionsplanung-special-measure-tag-${entry.projectId}`} /> : null}
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{resolveValue(entry.projectDescription)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">Keine Sondermaße im gewählten Zeitraum gefunden.</p>
                        )}
                      </section>
                      </div>
                      <ProduktionsplanungPrintLayout
                        data={produktionsplanungData ?? {
                          productCategoryGroups: [],
                          componentCategoryGroups: [],
                          specialMeasureProjects: [],
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
