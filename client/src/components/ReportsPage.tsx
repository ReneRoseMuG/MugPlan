import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Loader2 } from "lucide-react";
import type { AppointmentCancellationReportState } from "@shared/appointmentCancellation";
import {
  isManagedReportExclusionTagName,
  isReservedAppointmentCancellationTagName,
} from "@shared/appointmentCancellation";
import type { ComponentCategory, ProductCategory, Tag } from "@shared/schema";

import { ProductVorlaufPrintLayout, type ProductVorlaufPrintCategory } from "@/components/reports/ProductVorlaufPrintLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { ListLayout } from "@/components/ui/list-layout";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";
import { ReportConfigSurface } from "@/components/ui/report-config-surface";
import {
  buildVorlauflistePreviewProject,
  VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME,
} from "@/components/reports/vorlauflistePreview";
import { ProjectTableHoverPreview } from "@/components/ui/table-hover-previews";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { cn } from "@/lib/utils";

type ReportType = "vorlaufliste" | "product-vorlauf";
type ResolvedScope = "USER" | "ROLE" | "GLOBAL" | "DEFAULT";

type VorlauflisteCategory = {
  id: number;
  name: string;
};

type VorlauflisteItem = {
  projectId: number;
  projectName: string;
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

type ProductVorlaufItemTotal = {
  itemName: string;
  totalQuantity: number;
};

type ProductVorlaufCategoryGroup = {
  categoryId: number;
  categoryName: string;
  items: ProductVorlaufItemTotal[];
};

type ProductVorlaufSpecialMeasureProject = {
  projectId: number;
  orderNumber: string | null;
  customerNumber: string | null;
  customerFullName: string | null;
  actualDate: string | null;
  projectDescription: string | null;
  specialMeasureTag: Tag | null;
};

type ProductVorlaufResponse = {
  productCategoryGroups: ProductVorlaufCategoryGroup[];
  componentCategoryGroups: ProductVorlaufCategoryGroup[];
  specialMeasureProjects: ProductVorlaufSpecialMeasureProject[];
  projectRows: ProductVorlaufProjectRow[];
};

type ProductVorlaufProjectRow = {
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

type CategorySelection = {
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes?: boolean;
  columnWidths?: Record<string, number>;
  sonderblockTagIds?: number[];
};

type VorlauflisteRequestParams = {
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes: boolean;
  page: number;
  pageSize: number;
  refreshKey: number;
};

type ProductVorlaufRequestParams = {
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes: boolean;
  sonderblockTagIds: number[];
};

type ArticleCategorySelectionProps = {
  productCategories: ProductCategory[];
  componentCategories: ComponentCategory[];
  selectedProductCategoryIds: number[];
  selectedComponentCategoryIds: number[];
  onProductCategoryToggle: (categoryId: number, checked: boolean) => void;
  onComponentCategoryToggle: (categoryId: number, checked: boolean) => void;
  testIdPrefix: string;
};

const REPORT_PAGE_SIZE = 100;
const VORLAUFLISTE_SETTING_KEY = "reports.vorlaufliste.categorySelection";
const PRODUCT_VORLAUF_SETTING_KEY = "reports.productVorlauf.selection";
const MIN_REPORT_COLUMN_WIDTH = 80;
const MAX_REPORT_COLUMN_WIDTH = 960;

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

function resolveColumnMinWidth(header: string, fallback: number): number {
  return Math.max(fallback, Math.min(MAX_REPORT_COLUMN_WIDTH, Math.ceil(header.trim().length * 9) + 56));
}

function clampColumnWidth(width: number, minWidth: number): number {
  return Math.min(MAX_REPORT_COLUMN_WIDTH, Math.max(minWidth, Math.round(width)));
}

function resolveValue(value: string | null): string {
  if (!value || value.trim().length === 0) return "-";
  return value.trim();
}

function parseHexColor(color: string | null | undefined): [number, number, number] | null {
  if (!color) return null;
  const normalized = color.trim().replace(/^#/, "");
  if (normalized.length !== 3 && normalized.length !== 6) return null;
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  if ([red, green, blue].some((part) => Number.isNaN(part))) return null;
  return [red, green, blue];
}

function resolveTagBackgroundStyle(tag: Tag | null): CSSProperties | undefined {
  const parsedColor = parseHexColor(tag?.color);
  if (!parsedColor) return undefined;
  const [red, green, blue] = parsedColor;
  return {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.16)`,
  };
}

function resolveInitialSelectionIds(params: {
  resolvedScope: ResolvedScope;
  persistedIds: number[];
  defaultIds: number[];
}): number[] {
  if (params.resolvedScope === "USER") {
    return params.persistedIds;
  }
  return params.persistedIds.length > 0 ? params.persistedIds : params.defaultIds;
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
  for (const id of params.productCategoryIds) searchParams.append("productCategoryIds", String(id));
  for (const id of params.componentCategoryIds) searchParams.append("componentCategoryIds", String(id));
  if (params.useShortCodes) searchParams.set("useShortCodes", "true");
  return `/api/reports/vorlaufliste?${searchParams.toString()}`;
}

export function buildProductVorlaufReportUrl(params: ProductVorlaufRequestParams): string {
  const searchParams = new URLSearchParams({
    fromDate: params.fromDate,
  });
  if (params.toDate) searchParams.set("toDate", params.toDate);
  for (const id of params.productCategoryIds) searchParams.append("productCategoryIds", String(id));
  for (const id of params.componentCategoryIds) searchParams.append("componentCategoryIds", String(id));
  if (params.useShortCodes) searchParams.set("useShortCodes", "true");
  for (const id of params.sonderblockTagIds) searchParams.append("sonderblockTagIds", String(id));
  return `/api/reports/product-vorlauf?${searchParams.toString()}`;
}

function formatProjectRowArticles(
  row: ProductVorlaufProjectRow,
  categories: ProductVorlaufPrintCategory[],
): string {
  const values = categories
    .map((category) => {
      const value = row.articleValues.find((entry) => entry.categoryId === category.id)?.value ?? null;
      if (!value || value.trim().length === 0) return null;
      return `${category.name}: ${value}`;
    })
    .filter((value): value is string => Boolean(value));

  return values.length > 0 ? values.join(" | ") : "-";
}

function renderGroupedCategoryList(groups: ProductVorlaufCategoryGroup[], emptyText: string, testIdPrefix: string) {
  if (groups.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="mt-3 space-y-4">
      {groups.map((group) => (
        <div key={group.categoryId} className="rounded-md border border-border/50 p-3" data-testid={`${testIdPrefix}-category-${group.categoryId}`}>
          <h5 className="text-sm font-semibold text-foreground">{group.categoryName}</h5>
          <div className="mt-3 space-y-2">
            {group.items.map((item) => (
              <div key={`${group.categoryId}-${item.itemName}`} className="flex items-center justify-between gap-4 rounded-md border border-border/40 px-3 py-2 text-sm">
                <span>{item.itemName}</span>
                <span className="font-medium">{item.totalQuantity}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
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
                  onCheckedChange={(checked) => onComponentCategoryToggle(category.id, Boolean(checked))}
                  data-testid={`checkbox-${testIdPrefix}-component-category-${category.id}`}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

interface ReportsPageProps {
  onCancel?: () => void;
}

export function ReportsPage({ onCancel }: ReportsPageProps) {
  const [vorlauflisteFromDate, setVorlauflisteFromDate] = useState(getBerlinTodayDateString());
  const [vorlauflisteToDate, setVorlauflisteToDate] = useState("");
  const [showVorlauflisteToDate, setShowVorlauflisteToDate] = useState(false);
  const [productVorlaufFromDate, setProductVorlaufFromDate] = useState(getBerlinTodayDateString());
  const [productVorlaufToDate, setProductVorlaufToDate] = useState("");
  const [showProductVorlaufToDate, setShowProductVorlaufToDate] = useState(false);
  const [page, setPage] = useState(1);
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null);
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false);
  const [reportRequestId, setReportRequestId] = useState(0);

  const vorlauflisteSelection = useSetting(VORLAUFLISTE_SETTING_KEY) as CategorySelection | undefined;
  const productVorlaufSelection = useSetting(PRODUCT_VORLAUF_SETTING_KEY) as CategorySelection | undefined;
  const { setSetting, settingsByKey } = useSettings();

  const vorlauflisteResolvedScope = (settingsByKey.get(VORLAUFLISTE_SETTING_KEY)?.resolvedScope ?? "DEFAULT") as ResolvedScope;
  const productVorlaufResolvedScope = (settingsByKey.get(PRODUCT_VORLAUF_SETTING_KEY)?.resolvedScope ?? "DEFAULT") as ResolvedScope;

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

  const defaultProductCategories = useMemo(
    () => productCategories.filter((category) => category.isDefault && category.isActive),
    [productCategories],
  );
  const defaultComponentCategories = useMemo(
    () => componentCategories.filter((category) => category.isDefault && category.isActive),
    [componentCategories],
  );

  const [selectedVorlauflisteProductCategoryIds, setSelectedVorlauflisteProductCategoryIds] = useState<number[]>([]);
  const [selectedVorlauflisteComponentCategoryIds, setSelectedVorlauflisteComponentCategoryIds] = useState<number[]>([]);
  const [useVorlauflisteShortCodes, setUseVorlauflisteShortCodes] = useState(false);
  const [vorlauflisteColumnWidths, setVorlauflisteColumnWidths] = useState<Record<string, number>>({});
  const [selectedProductVorlaufProductCategoryIds, setSelectedProductVorlaufProductCategoryIds] = useState<number[]>([]);
  const [selectedProductVorlaufComponentCategoryIds, setSelectedProductVorlaufComponentCategoryIds] = useState<number[]>([]);
  const [useProductVorlaufShortCodes, setUseProductVorlaufShortCodes] = useState(false);
  const [selectedProductVorlaufSonderblockTagIds, setSelectedProductVorlaufSonderblockTagIds] = useState<number[]>([]);
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
    const validProductIds = new Set(defaultProductCategories.map((category) => category.id));
    const validComponentIds = new Set(defaultComponentCategories.map((category) => category.id));
    const resolvedProductIds = normalizeIds((vorlauflisteSelection?.productCategoryIds ?? []).filter((id) => validProductIds.has(id)));
    const resolvedComponentIds = normalizeIds((vorlauflisteSelection?.componentCategoryIds ?? []).filter((id) => validComponentIds.has(id)));

    setSelectedVorlauflisteProductCategoryIds(resolveInitialSelectionIds({
      resolvedScope: vorlauflisteResolvedScope,
      persistedIds: resolvedProductIds,
      defaultIds: defaultProductCategories.map((category) => category.id),
    }));
    setSelectedVorlauflisteComponentCategoryIds(resolveInitialSelectionIds({
      resolvedScope: vorlauflisteResolvedScope,
      persistedIds: resolvedComponentIds,
      defaultIds: defaultComponentCategories.map((category) => category.id),
    }));
    setUseVorlauflisteShortCodes(vorlauflisteSelection?.useShortCodes ?? false);
    setVorlauflisteColumnWidths(normalizeColumnWidths(vorlauflisteSelection?.columnWidths));
  }, [defaultComponentCategories, defaultProductCategories, vorlauflisteResolvedScope, vorlauflisteSelection]);

  useEffect(() => {
    const validProductIds = new Set(defaultProductCategories.map((category) => category.id));
    const validComponentIds = new Set(defaultComponentCategories.map((category) => category.id));
    const validSonderblockTagIds = new Set(availableSonderblockTags.map((tag) => tag.id));
    const resolvedProductIds = normalizeIds((productVorlaufSelection?.productCategoryIds ?? []).filter((id) => validProductIds.has(id)));
    const resolvedComponentIds = normalizeIds((productVorlaufSelection?.componentCategoryIds ?? []).filter((id) => validComponentIds.has(id)));
    const resolvedSonderblockTagIds = normalizeIds((productVorlaufSelection?.sonderblockTagIds ?? []).filter((id) => validSonderblockTagIds.has(id)));

    setSelectedProductVorlaufProductCategoryIds(resolveInitialSelectionIds({
      resolvedScope: productVorlaufResolvedScope,
      persistedIds: resolvedProductIds,
      defaultIds: defaultProductCategories.map((category) => category.id),
    }));
    setSelectedProductVorlaufComponentCategoryIds(resolveInitialSelectionIds({
      resolvedScope: productVorlaufResolvedScope,
      persistedIds: resolvedComponentIds,
      defaultIds: defaultComponentCategories.map((category) => category.id),
    }));
    setUseProductVorlaufShortCodes(productVorlaufSelection?.useShortCodes ?? false);
    setSelectedProductVorlaufSonderblockTagIds(resolvedSonderblockTagIds);
  }, [availableSonderblockTags, defaultComponentCategories, defaultProductCategories, productVorlaufResolvedScope, productVorlaufSelection]);

  const persistSelection = async (reportType: ReportType, next: CategorySelection) => {
    const value: CategorySelection = {
      productCategoryIds: normalizeIds(next.productCategoryIds),
      componentCategoryIds: normalizeIds(next.componentCategoryIds),
    };
    if (reportType === "vorlaufliste") {
      value.useShortCodes = next.useShortCodes ?? false;
      value.columnWidths = normalizeColumnWidths(next.columnWidths);
    } else {
      value.useShortCodes = next.useShortCodes ?? false;
      value.sonderblockTagIds = normalizeIds(next.sonderblockTagIds ?? []);
    }
    await setSetting({
      key: reportType === "vorlaufliste" ? VORLAUFLISTE_SETTING_KEY : PRODUCT_VORLAUF_SETTING_KEY,
      scopeType: "USER",
      value,
    });
  };

  const persistVorlauflisteSelection = async (columnWidths: Record<string, number>) => {
    await persistSelection("vorlaufliste", {
      productCategoryIds: selectedVorlauflisteProductCategoryIds,
      componentCategoryIds: selectedVorlauflisteComponentCategoryIds,
      useShortCodes: useVorlauflisteShortCodes,
      columnWidths,
    });
  };

  const { data: vorlauflisteData, isLoading: isVorlauflisteLoading } = useQuery<VorlauflisteResponse>({
    queryKey: ["reports-vorlaufliste", submittedFilters, reportRequestId, page],
    enabled: submittedFilters?.reportType === "vorlaufliste" && isReportOverlayOpen,
    queryFn: async () => {
      return fetchJson(buildVorlauflisteReportUrl({
        fromDate: submittedFilters!.fromDate,
        toDate: submittedFilters?.toDate,
        productCategoryIds: submittedFilters?.productCategoryIds ?? [],
        componentCategoryIds: submittedFilters?.componentCategoryIds ?? [],
        useShortCodes: submittedFilters?.useShortCodes ?? false,
        page,
        pageSize: REPORT_PAGE_SIZE,
        refreshKey: reportRequestId,
      }), { cache: "no-store" });
    },
  });

  const { data: productVorlaufData, isLoading: isProductVorlaufLoading } = useQuery<ProductVorlaufResponse>({
    queryKey: ["reports-product-vorlauf", submittedFilters, reportRequestId],
    enabled: submittedFilters?.reportType === "product-vorlauf" && isReportOverlayOpen,
    queryFn: async () => {
      return fetchJson(buildProductVorlaufReportUrl({
        fromDate: submittedFilters!.fromDate,
        toDate: submittedFilters?.toDate,
        productCategoryIds: submittedFilters?.productCategoryIds ?? [],
        componentCategoryIds: submittedFilters?.componentCategoryIds ?? [],
        useShortCodes: submittedFilters?.useShortCodes ?? false,
        sonderblockTagIds: submittedFilters?.sonderblockTagIds ?? [],
      }));
    },
  });
  const selectedProductVorlaufPrintCategories = useMemo<ProductVorlaufPrintCategory[]>(() => {
    const productCategoryById = new Map(defaultProductCategories.map((category) => [category.id, category] as const));
    const componentCategoryById = new Map(defaultComponentCategories.map((category) => [category.id, category] as const));

    return [
      ...selectedProductVorlaufProductCategoryIds
        .map((id) => productCategoryById.get(id))
        .filter((category): category is ProductCategory => Boolean(category))
        .map((category) => ({ id: category.id, name: category.name })),
      ...selectedProductVorlaufComponentCategoryIds
        .map((id) => componentCategoryById.get(id))
        .filter((category): category is ComponentCategory => Boolean(category))
        .map((category) => ({ id: category.id, name: category.name })),
    ];
  }, [
    defaultComponentCategories,
    defaultProductCategories,
    selectedProductVorlaufComponentCategoryIds,
    selectedProductVorlaufProductCategoryIds,
  ]);

  const resolvePersistedColumnWidth = (columnId: string, header: string, defaultWidth: number) => {
    const minWidth = resolveColumnMinWidth(header, defaultWidth);
    const width = clampColumnWidth(vorlauflisteColumnWidths[columnId] ?? defaultWidth, minWidth);
    return { width, minWidth };
  };

  const vorlauflisteColumns = useMemo<TableViewColumnDef<VorlauflisteItem>[]>(() => {
    const productCategories: VorlauflisteCategory[] = vorlauflisteData?.productCategories ?? [];
    const componentCategories: VorlauflisteCategory[] = vorlauflisteData?.componentCategories ?? [];
    const wrapCellClassName = "align-top";
    const renderWrappedText = (value: string | null) => (
      <span className={VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME}>{resolveValue(value)}</span>
    );

    const columns: TableViewColumnDef<VorlauflisteItem>[] = [
      { id: "amount", header: "Auftragssumme", accessor: (row) => row.amount ?? "", width: 160, minWidth: 160, align: "right", className: wrapCellClassName, resizable: true, cell: ({ row }) => <span>{formatAmount(row.amount)}</span> },
      { id: "customerFullName", header: "Kunde", accessor: (row) => row.customerFullName ?? "", width: 220, minWidth: 220, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.customerFullName) },
      { id: "postalCode", header: "PLZ", accessor: (row) => row.postalCode ?? "", width: 110, minWidth: 110, className: wrapCellClassName, resizable: true, cell: ({ row }) => <span>{resolveValue(row.postalCode)}</span> },
      { id: "city", header: "Ort", accessor: (row) => row.city ?? "", width: 160, minWidth: 160, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.city) },
    ];

    for (const category of productCategories) {
      columns.push({
        id: `product-${category.id}`,
        header: category.name,
        accessor: (row) => row.articleValues.find((v) => v.categoryId === category.id)?.value ?? "",
        width: 220,
        minWidth: 220,
        className: wrapCellClassName,
        headerClassName: "whitespace-nowrap",
        resizable: true,
        cell: ({ row }) => {
          const value = row.articleValues.find((v) => v.categoryId === category.id)?.value ?? null;
          return renderWrappedText(value);
        },
      });
    }

    for (const category of componentCategories) {
      columns.push({
        id: `component-${category.id}`,
        header: category.name,
        accessor: (row) => row.articleValues.find((v) => v.categoryId === category.id)?.value ?? "",
        width: 220,
        minWidth: 220,
        className: wrapCellClassName,
        headerClassName: "whitespace-nowrap",
        resizable: true,
        cell: ({ row }) => {
          const value = row.articleValues.find((v) => v.categoryId === category.id)?.value ?? null;
          return renderWrappedText(value);
        },
      });
    }

    columns.push(
      { id: "plannedDateText", header: "Vorgeplanter Termin", accessor: (row) => row.plannedDateText ?? "", width: 190, minWidth: 190, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.plannedDateText) },
      { id: "plannedWeek", header: "KW Vorgeplant", accessor: (row) => row.plannedWeek ?? "", width: 150, minWidth: 150, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.plannedWeek) },
      { id: "actualDate", header: "Tatsächlicher Termin", accessor: (row) => row.actualDate, minWidth: 170, className: wrapCellClassName, cell: ({ row }) => <span>{formatDate(row.actualDate)}</span> },
      { id: "projectDescription", header: "Anmerkungen", accessor: (row) => row.projectDescription ?? "", width: 320, minWidth: 320, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.projectDescription) },
    );

    return columns.map((column) => {
      const headerText = typeof column.header === "string" ? column.header : column.id;
      const defaultWidth = typeof column.width === "number"
        ? column.width
        : typeof column.minWidth === "number"
          ? column.minWidth
          : 160;
      const { width, minWidth } = resolvePersistedColumnWidth(column.id, headerText, defaultWidth);
      return {
        ...column,
        width,
        minWidth,
        resizable: column.resizable ?? true,
      };
    });
  }, [vorlauflisteColumnWidths, vorlauflisteData]);

  const updateVorlauflisteColumnWidth = (columnId: string, width: number) => {
    setVorlauflisteColumnWidths((current) => ({ ...current, [columnId]: width }));
  };

  const commitVorlauflisteColumnWidth = (columnId: string, width: number) => {
    const next = { ...vorlauflisteColumnWidths, [columnId]: width };
    setVorlauflisteColumnWidths(next);
    void persistVorlauflisteSelection(next);
  };

  const totalPages = vorlauflisteData?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;
  const isVorlauflisteOverlay = isReportOverlayOpen && submittedFilters?.reportType === "vorlaufliste";
  const isProductVorlauflayout = isReportOverlayOpen && submittedFilters?.reportType === "product-vorlauf";

  const handleGenerateReport = (reportType: ReportType) => {
    const isVorlaufliste = reportType === "vorlaufliste";
    const fromDate = isVorlaufliste ? vorlauflisteFromDate : productVorlaufFromDate;
    const toDate = isVorlaufliste ? vorlauflisteToDate : productVorlaufToDate;
    const showToDate = isVorlaufliste ? showVorlauflisteToDate : showProductVorlaufToDate;
    const productCategoryIds = isVorlaufliste ? selectedVorlauflisteProductCategoryIds : selectedProductVorlaufProductCategoryIds;
    const componentCategoryIds = isVorlaufliste ? selectedVorlauflisteComponentCategoryIds : selectedProductVorlaufComponentCategoryIds;

    if (fromDate.trim().length === 0) return;
    setPage(1);
    setSubmittedFilters({
      reportType,
      fromDate,
      toDate: showToDate && toDate.trim().length > 0 ? toDate : undefined,
      productCategoryIds,
      componentCategoryIds,
      useShortCodes: isVorlaufliste ? useVorlauflisteShortCodes : useProductVorlaufShortCodes,
      sonderblockTagIds: isVorlaufliste ? [] : selectedProductVorlaufSonderblockTagIds,
    });
    setReportRequestId((current) => current + 1);
    setIsReportOverlayOpen(true);
  };

  const closeOverlay = () => setIsReportOverlayOpen(false);
  const handleProductVorlaufPrint = () => window.print();

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
          <div className="relative h-full overflow-hidden" data-testid="reports-panel">
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
                  [data-testid="reports-product-vorlauf-overlay"],
                  [data-testid="reports-product-vorlauf-overlay"] * {
                    visibility: visible !important;
                  }
                  [data-testid="reports-product-vorlauf-overlay"] {
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
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[max-content_minmax(0,1fr)] xl:items-start">
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

                    <div className="justify-self-end space-y-3" data-testid="reports-vorlaufliste-categories-column">
                      <h4 className="text-sm font-semibold text-foreground">Artikel Kategorien</h4>
                      <ArticleCategorySelection
                        productCategories={defaultProductCategories}
                        componentCategories={defaultComponentCategories}
                        selectedProductCategoryIds={selectedVorlauflisteProductCategoryIds}
                        selectedComponentCategoryIds={selectedVorlauflisteComponentCategoryIds}
                        onProductCategoryToggle={(categoryId, checked) => {
                          const nextIds = checked
                            ? normalizeIds([...selectedVorlauflisteProductCategoryIds, categoryId])
                            : selectedVorlauflisteProductCategoryIds.filter((id) => id !== categoryId);
                          setSelectedVorlauflisteProductCategoryIds(nextIds);
                          void persistSelection("vorlaufliste", {
                            productCategoryIds: nextIds,
                            componentCategoryIds: selectedVorlauflisteComponentCategoryIds,
                            useShortCodes: useVorlauflisteShortCodes,
                            columnWidths: vorlauflisteColumnWidths,
                          });
                        }}
                        onComponentCategoryToggle={(categoryId, checked) => {
                          const nextIds = checked
                            ? normalizeIds([...selectedVorlauflisteComponentCategoryIds, categoryId])
                            : selectedVorlauflisteComponentCategoryIds.filter((id) => id !== categoryId);
                          setSelectedVorlauflisteComponentCategoryIds(nextIds);
                          void persistSelection("vorlaufliste", {
                            productCategoryIds: selectedVorlauflisteProductCategoryIds,
                            componentCategoryIds: nextIds,
                            useShortCodes: useVorlauflisteShortCodes,
                            columnWidths: vorlauflisteColumnWidths,
                          });
                        }}
                        testIdPrefix="reports-vorlaufliste"
                      />
                      <label className="mt-3 flex items-center gap-3 text-sm text-foreground" data-testid="reports-vorlaufliste-use-shortcodes-label">
                        <Checkbox
                          checked={useVorlauflisteShortCodes}
                          onCheckedChange={(checked) => {
                            const next = Boolean(checked);
                            setUseVorlauflisteShortCodes(next);
                            void persistSelection("vorlaufliste", {
                              productCategoryIds: selectedVorlauflisteProductCategoryIds,
                              componentCategoryIds: selectedVorlauflisteComponentCategoryIds,
                              useShortCodes: next,
                              columnWidths: vorlauflisteColumnWidths,
                            });
                          }}
                          data-testid="checkbox-reports-vorlaufliste-use-shortcodes"
                        />
                        <span>Shortcodes verwenden?</span>
                      </label>
                    </div>
                  </div>
                </ReportConfigSurface>

                <ReportConfigSurface
                  title="Produkt Vorlauf"
                  helpKey="reports-produkte"
                  footer={(
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => handleGenerateReport("product-vorlauf")} disabled={productVorlaufFromDate.trim().length === 0} data-testid="button-reports-product-vorlauf-generate">
                        Report erzeugen
                      </Button>
                    </div>
                  )}
                >
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[max-content_minmax(0,1fr)] xl:items-start">
                    <div className="space-y-4" data-testid="reports-product-vorlauf-date-range-column">
                      <h4 className="text-sm font-semibold text-foreground">Datumsbereich</h4>
                      <div className="flex flex-wrap items-end gap-4 sm:flex-nowrap">
                        <div className="flex w-[150px] flex-none flex-col gap-1">
                          <Label htmlFor="reports-product-vorlauf-from-date">Datum Beginn</Label>
                          <Input id="reports-product-vorlauf-from-date" type="date" value={productVorlaufFromDate} onChange={(event) => setProductVorlaufFromDate(event.target.value)} data-testid="reports-product-vorlauf-from-date" />
                        </div>
                        {showProductVorlaufToDate ? (
                          <div className="flex w-[150px] flex-none flex-col gap-1">
                            <Label htmlFor="reports-product-vorlauf-to-date">Datum Ende</Label>
                            <Input id="reports-product-vorlauf-to-date" type="date" value={productVorlaufToDate} onChange={(event) => setProductVorlaufToDate(event.target.value)} data-testid="reports-product-vorlauf-to-date" />
                          </div>
                        ) : (
                          <div className="flex w-[150px] flex-none flex-col gap-1">
                            <Label htmlFor="button-reports-product-vorlauf-show-to-date">Datum Ende</Label>
                            <Button type="button" variant="outline" className="w-fit px-3" onClick={() => setShowProductVorlaufToDate(true)} data-testid="button-reports-product-vorlauf-show-to-date">
                              Anzeigen
                            </Button>
                          </div>
                        )}
                      </div>

                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-info-tags">
                        <h5 className="text-sm font-semibold text-foreground">Info Tags</h5>
                        <div className="mt-3 space-y-2">
                          {availableSonderblockTags.length > 0 ? availableSonderblockTags.map((tag) => (
                            <label key={tag.id} className="flex items-center gap-3 text-sm text-foreground">
                              <Checkbox
                                checked={selectedProductVorlaufSonderblockTagIds.includes(tag.id)}
                                onCheckedChange={(checked) => {
                                  const nextIds = Boolean(checked)
                                    ? normalizeIds([...selectedProductVorlaufSonderblockTagIds, tag.id])
                                    : selectedProductVorlaufSonderblockTagIds.filter((id) => id !== tag.id);
                                  setSelectedProductVorlaufSonderblockTagIds(nextIds);
                                  void persistSelection("product-vorlauf", {
                                    productCategoryIds: selectedProductVorlaufProductCategoryIds,
                                    componentCategoryIds: selectedProductVorlaufComponentCategoryIds,
                                    useShortCodes: useProductVorlaufShortCodes,
                                    sonderblockTagIds: nextIds,
                                  });
                                }}
                                data-testid={`checkbox-reports-product-vorlauf-sonderblock-tag-${tag.id}`}
                              />
                              <span>{tag.name}</span>
                            </label>
                          )) : (
                            <p className="text-sm text-muted-foreground">Keine auswählbaren Info Tags gefunden.</p>
                          )}
                        </div>
                      </section>
                    </div>

                    <div className="justify-self-end space-y-3" data-testid="reports-product-vorlauf-categories-column">
                      <h4 className="text-sm font-semibold text-foreground">Artikel Kategorien</h4>
                      <ArticleCategorySelection
                        productCategories={defaultProductCategories}
                        componentCategories={defaultComponentCategories}
                        selectedProductCategoryIds={selectedProductVorlaufProductCategoryIds}
                        selectedComponentCategoryIds={selectedProductVorlaufComponentCategoryIds}
                        onProductCategoryToggle={(categoryId, checked) => {
                          const nextIds = checked
                            ? normalizeIds([...selectedProductVorlaufProductCategoryIds, categoryId])
                            : selectedProductVorlaufProductCategoryIds.filter((id) => id !== categoryId);
                          setSelectedProductVorlaufProductCategoryIds(nextIds);
                          void persistSelection("product-vorlauf", {
                            productCategoryIds: nextIds,
                            componentCategoryIds: selectedProductVorlaufComponentCategoryIds,
                            useShortCodes: useProductVorlaufShortCodes,
                            sonderblockTagIds: selectedProductVorlaufSonderblockTagIds,
                          });
                        }}
                        onComponentCategoryToggle={(categoryId, checked) => {
                          const nextIds = checked
                            ? normalizeIds([...selectedProductVorlaufComponentCategoryIds, categoryId])
                            : selectedProductVorlaufComponentCategoryIds.filter((id) => id !== categoryId);
                          setSelectedProductVorlaufComponentCategoryIds(nextIds);
                          void persistSelection("product-vorlauf", {
                            productCategoryIds: selectedProductVorlaufProductCategoryIds,
                            componentCategoryIds: nextIds,
                            useShortCodes: useProductVorlaufShortCodes,
                            sonderblockTagIds: selectedProductVorlaufSonderblockTagIds,
                          });
                        }}
                        testIdPrefix="reports-product-vorlauf"
                      />
                      <label className="mt-3 flex items-center gap-3 text-sm text-foreground" data-testid="reports-product-vorlauf-use-shortcodes-label">
                        <Checkbox
                          checked={useProductVorlaufShortCodes}
                          onCheckedChange={(checked) => {
                            const next = Boolean(checked);
                            setUseProductVorlaufShortCodes(next);
                            void persistSelection("product-vorlauf", {
                              productCategoryIds: selectedProductVorlaufProductCategoryIds,
                              componentCategoryIds: selectedProductVorlaufComponentCategoryIds,
                              useShortCodes: next,
                              sonderblockTagIds: selectedProductVorlaufSonderblockTagIds,
                            });
                          }}
                          data-testid="checkbox-reports-product-vorlauf-use-shortcodes"
                        />
                        <span>Shortcodes verwenden?</span>
                      </label>
                      <section className="hidden" data-testid="reports-product-vorlauf-sonderblock-tags">
                        <h5 className="text-sm font-semibold text-foreground">Sonderblock-Tags</h5>
                        <div className="mt-3 space-y-2">
                          {availableSonderblockTags.length > 0 ? availableSonderblockTags.map((tag) => (
                            <label key={tag.id} className="flex items-center gap-3 text-sm text-foreground">
                              <Checkbox
                                checked={selectedProductVorlaufSonderblockTagIds.includes(tag.id)}
                                onCheckedChange={(checked) => {
                                  const nextIds = Boolean(checked)
                                    ? normalizeIds([...selectedProductVorlaufSonderblockTagIds, tag.id])
                                    : selectedProductVorlaufSonderblockTagIds.filter((id) => id !== tag.id);
                                  setSelectedProductVorlaufSonderblockTagIds(nextIds);
                                  void persistSelection("product-vorlauf", {
                                    productCategoryIds: selectedProductVorlaufProductCategoryIds,
                                    componentCategoryIds: selectedProductVorlaufComponentCategoryIds,
                                    useShortCodes: useProductVorlaufShortCodes,
                                    sonderblockTagIds: nextIds,
                                  });
                                }}
                                data-testid={`checkbox-reports-product-vorlauf-sonderblock-tag-${tag.id}`}
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
                  <Button type="button" variant="outline" onClick={closeOverlay} data-testid="button-reports-back">Zurück</Button>
                </div>
                <div className="min-h-0 flex-1">
                  {isVorlauflisteLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : (
                    
                      <TableView
                      columns={vorlauflisteColumns}
                      rows={vorlauflisteData?.items ?? []}
                      rowKey={(row) => row.projectId}
                      rowStyle={(row) => resolveTagBackgroundStyle(row.highlightTag)}
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

            <div className={cn("absolute inset-0 z-10 bg-card transition-opacity", isProductVorlauflayout ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")} data-testid="reports-product-vorlauf-overlay">
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 print:hidden">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">Produkt Vorlauf</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={handleProductVorlaufPrint} data-testid="button-reports-product-vorlauf-print">Produktionsplanung drucken</Button>
                    <Button type="button" variant="outline" onClick={closeOverlay} data-testid="button-reports-product-vorlauf-back">Zurück</Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-6">
                  {isProductVorlaufLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : (
                    <>
                      <div className="space-y-6 print:hidden">
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-products">
                        <h4 className="text-sm font-semibold">Produktkategorien</h4>
                        {renderGroupedCategoryList(
                          productVorlaufData?.productCategoryGroups ?? [],
                          "Keine passenden Produkte gefunden.",
                          "reports-product-vorlauf-products",
                        )}
                      </section>
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-components">
                        <h4 className="text-sm font-semibold">Komponentenkategorien</h4>
                        {renderGroupedCategoryList(
                          productVorlaufData?.componentCategoryGroups ?? [],
                          "Keine passenden Komponenten gefunden.",
                          "reports-product-vorlauf-components",
                        )}
                      </section>
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-projects">
                        <h4 className="text-sm font-semibold">Projektliste</h4>
                        {productVorlaufData?.projectRows?.length ? (
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
                                {(productVorlaufData?.projectRows ?? []).map((row) => (
                                  <tr key={row.projectId} className="border-b border-border/40 align-top" data-testid={`reports-product-vorlauf-project-row-${row.projectId}`}>
                                    <td className="px-2 py-2">{formatDate(row.actualDate)}</td>
                                    <td className="px-2 py-2">{resolveValue(row.tourName)}</td>
                                    <td className="px-2 py-2">
                                      <div className="font-semibold">{row.projectName}</div>
                                      <div className="text-xs text-muted-foreground">{resolveValue(row.orderNumber)}</div>
                                    </td>
                                    <td className="px-2 py-2">{formatProjectRowArticles(row, selectedProductVorlaufPrintCategories)}</td>
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
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-special-measures">
                        <h4 className="text-sm font-semibold">Sondermaße</h4>
                        {productVorlaufData?.specialMeasureProjects.length ? (
                          <div className="mt-3 space-y-3">
                            {productVorlaufData.specialMeasureProjects.map((entry) => (
                              <div key={entry.projectId} className="rounded-md border border-border/50 px-4 py-3" data-testid={`reports-product-vorlauf-special-measure-project-${entry.projectId}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                      <span className="font-semibold">{resolveValue(entry.orderNumber)}</span>
                                      <span>{resolveValue(entry.customerFullName)}</span>
                                      <span>{resolveValue(entry.customerNumber)}</span>
                                      <span>{formatDate(entry.actualDate)}</span>
                                    </div>
                                  </div>
                                  {entry.specialMeasureTag ? <EntityTagFooterRow tags={[entry.specialMeasureTag]} testId={`reports-product-vorlauf-special-measure-tag-${entry.projectId}`} /> : null}
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
                      <ProductVorlaufPrintLayout
                        data={productVorlaufData ?? {
                          productCategoryGroups: [],
                          componentCategoryGroups: [],
                          specialMeasureProjects: [],
                          projectRows: [],
                        }}
                        categories={selectedProductVorlaufPrintCategories}
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
