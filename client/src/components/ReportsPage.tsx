import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Loader2 } from "lucide-react";
import type { AppointmentCancellationReportState } from "@shared/appointmentCancellation";
import type { ComponentCategory, ProductCategory, Tag } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { ListLayout } from "@/components/ui/list-layout";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";
import { ReportConfigSurface } from "@/components/ui/report-config-surface";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { cn } from "@/lib/utils";

type ReportType = "vorlaufliste" | "product-vorlauf";
type ResolvedScope = "USER" | "ROLE" | "GLOBAL" | "DEFAULT";

type VorlauflisteCategory = {
  id: number;
  name: string;
};

type VorlauflisteItem = {
  projectId: number;
  reportState: AppointmentCancellationReportState;
  tags: Tag[];
  highlightTag: Tag | null;
  amount: string | null;
  customerFullName: string | null;
  postalCode: string | null;
  city: string | null;
  articleValues: Array<{ categoryId: number; value: string | null }>;
  plannedDateText: string | null;
  plannedWeek: string | null;
  actualDate: string;
  projectDescription: string | null;
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
};

type SubmittedFilters = {
  reportType: ReportType;
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes: boolean;
};

type CategorySelection = {
  productCategoryIds: number[];
  componentCategoryIds: number[];
  useShortCodes?: boolean;
  columnWidths?: Record<string, number>;
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
    <div className="rounded-md border border-border/60 bg-background/70 p-4">
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
    const resolvedProductIds = normalizeIds((productVorlaufSelection?.productCategoryIds ?? []).filter((id) => validProductIds.has(id)));
    const resolvedComponentIds = normalizeIds((productVorlaufSelection?.componentCategoryIds ?? []).filter((id) => validComponentIds.has(id)));

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
  }, [defaultComponentCategories, defaultProductCategories, productVorlaufResolvedScope, productVorlaufSelection]);

  const persistSelection = async (reportType: ReportType, next: CategorySelection) => {
    const value: CategorySelection = {
      productCategoryIds: normalizeIds(next.productCategoryIds),
      componentCategoryIds: normalizeIds(next.componentCategoryIds),
    };
    if (reportType === "vorlaufliste") {
      value.useShortCodes = next.useShortCodes ?? false;
      value.columnWidths = normalizeColumnWidths(next.columnWidths);
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
      const params = new URLSearchParams({
        fromDate: submittedFilters!.fromDate,
        page: String(page),
        pageSize: String(REPORT_PAGE_SIZE),
      });
      if (submittedFilters?.toDate) params.set("toDate", submittedFilters.toDate);
      for (const id of submittedFilters?.productCategoryIds ?? []) params.append("productCategoryIds", String(id));
      for (const id of submittedFilters?.componentCategoryIds ?? []) params.append("componentCategoryIds", String(id));
      if (submittedFilters?.useShortCodes) params.set("useShortCodes", "true");
      return fetchJson(`/api/reports/vorlaufliste?${params.toString()}`, { cache: "no-store" });
    },
  });

  const { data: productVorlaufData, isLoading: isProductVorlaufLoading } = useQuery<ProductVorlaufResponse>({
    queryKey: ["reports-product-vorlauf", submittedFilters, reportRequestId],
    enabled: submittedFilters?.reportType === "product-vorlauf" && isReportOverlayOpen,
    queryFn: async () => {
      const params = new URLSearchParams({ fromDate: submittedFilters!.fromDate });
      if (submittedFilters?.toDate) params.set("toDate", submittedFilters.toDate);
      for (const id of submittedFilters?.productCategoryIds ?? []) params.append("productCategoryIds", String(id));
      for (const id of submittedFilters?.componentCategoryIds ?? []) params.append("componentCategoryIds", String(id));
      return fetchJson(`/api/reports/product-vorlauf?${params.toString()}`);
    },
  });

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
      <span className="block whitespace-normal break-words [overflow-wrap:anywhere]">{resolveValue(value)}</span>
    );

    const columns: TableViewColumnDef<VorlauflisteItem>[] = [
      { id: "amount", header: "Auftragssumme", accessor: (row) => row.amount ?? "", width: 160, minWidth: 160, align: "right", resizable: true, cell: ({ row }) => <span>{formatAmount(row.amount)}</span> },
      { id: "customerFullName", header: "Kunde", accessor: (row) => row.customerFullName ?? "", width: 220, minWidth: 220, className: wrapCellClassName, resizable: true, cell: ({ row }) => renderWrappedText(row.customerFullName) },
      { id: "postalCode", header: "PLZ", accessor: (row) => row.postalCode ?? "", width: 110, minWidth: 110, resizable: true, cell: ({ row }) => <span>{resolveValue(row.postalCode)}</span> },
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
      { id: "actualDate", header: "Tatsächlicher Termin", accessor: (row) => row.actualDate, minWidth: 170, cell: ({ row }) => <span>{formatDate(row.actualDate)}</span> },
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
      useShortCodes: isVorlaufliste ? useVorlauflisteShortCodes : false,
    });
    setReportRequestId((current) => current + 1);
    setIsReportOverlayOpen(true);
  };

  const closeOverlay = () => setIsReportOverlayOpen(false);

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
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <div className="space-y-3" data-testid="reports-vorlaufliste-date-range-column">
                      <h4 className="text-sm font-semibold text-foreground">Datumsbereich</h4>
                      <div className="flex flex-wrap items-end gap-4">
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
                          <div className="flex items-end">
                            <Button type="button" variant="outline" onClick={() => setShowVorlauflisteToDate(true)} data-testid="button-reports-vorlaufliste-show-to-date">Datum Ende anzeigen</Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3" data-testid="reports-vorlaufliste-categories-column">
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
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <div className="space-y-3" data-testid="reports-product-vorlauf-date-range-column">
                      <h4 className="text-sm font-semibold text-foreground">Datumsbereich</h4>
                      <div className="flex flex-wrap items-end gap-4">
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
                          <div className="flex items-end">
                            <Button type="button" variant="outline" onClick={() => setShowProductVorlaufToDate(true)} data-testid="button-reports-product-vorlauf-show-to-date">Datum Ende anzeigen</Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3" data-testid="reports-product-vorlauf-categories-column">
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
                          });
                        }}
                        testIdPrefix="reports-product-vorlauf"
                      />
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">Produkt Vorlauf</h3>
                  </div>
                  <Button type="button" variant="outline" onClick={closeOverlay} data-testid="button-reports-product-vorlauf-back">Zurück</Button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-6">
                  {isProductVorlaufLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : (
                    <div className="space-y-6">
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
