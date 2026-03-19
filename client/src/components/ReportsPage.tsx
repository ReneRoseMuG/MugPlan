import { useEffect, useMemo, useState } from "react";
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

type VorlauflisteItem = {
  projectId: number;
  reportState: AppointmentCancellationReportState;
  tags: Tag[];
  amount: string | null;
  customerFullName: string | null;
  postalCode: string | null;
  city: string | null;
  sauna: string | null;
  door: string | null;
  window: string | null;
  oven: string | null;
  control: string | null;
  roof: string | null;
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
  specialMeasureTagId?: number;
};

type CategorySelection = {
  productCategoryIds: number[];
  componentCategoryIds: number[];
};

type ProductVorlaufSelection = CategorySelection & {
  specialMeasureTagId: number | null;
};

const REPORT_PAGE_SIZE = 100;
const VORLAUFLISTE_SETTING_KEY = "reports.vorlaufliste.categorySelection";
const PRODUCT_VORLAUF_SETTING_KEY = "reports.productVorlauf.selection";

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

function resolveValue(value: string | null): string {
  if (!value || value.trim().length === 0) return "-";
  return value.trim();
}

function resolveVorlauflisteStateLabel(state: AppointmentCancellationReportState): string | null {
  if (state === "contains_cancelled") return "Teilweise storniert";
  if (state === "cancelled_only") return "Storniert";
  return null;
}

function resolveVorlauflisteRowClassName(row: VorlauflisteItem): string | undefined {
  if (row.reportState === "contains_cancelled") return "bg-amber-50/70";
  if (row.reportState === "cancelled_only") return "bg-rose-50/70 text-muted-foreground";
  return undefined;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
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
  const productVorlaufSelection = useSetting(PRODUCT_VORLAUF_SETTING_KEY) as ProductVorlaufSelection | undefined;
  const { setSetting } = useSettings();

  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/admin/master-data/product-categories?active=all"],
    queryFn: () => fetchJson("/api/admin/master-data/product-categories?active=all"),
  });
  const { data: componentCategories = [] } = useQuery<ComponentCategory[]>({
    queryKey: ["/api/admin/master-data/component-categories?active=all"],
    queryFn: () => fetchJson("/api/admin/master-data/component-categories?active=all"),
  });
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    queryFn: () => fetchJson("/api/tags"),
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
  const [selectedProductVorlaufProductCategoryIds, setSelectedProductVorlaufProductCategoryIds] = useState<number[]>([]);
  const [selectedProductVorlaufComponentCategoryIds, setSelectedProductVorlaufComponentCategoryIds] = useState<number[]>([]);
  const [selectedSpecialMeasureTagId, setSelectedSpecialMeasureTagId] = useState<number | null>(null);

  useEffect(() => {
    const validProductIds = new Set(defaultProductCategories.map((category) => category.id));
    const validComponentIds = new Set(defaultComponentCategories.map((category) => category.id));
    const resolvedProductIds = normalizeIds((vorlauflisteSelection?.productCategoryIds ?? []).filter((id) => validProductIds.has(id)));
    const resolvedComponentIds = normalizeIds((vorlauflisteSelection?.componentCategoryIds ?? []).filter((id) => validComponentIds.has(id)));

    setSelectedVorlauflisteProductCategoryIds(
      resolvedProductIds.length > 0 ? resolvedProductIds : defaultProductCategories.map((category) => category.id),
    );
    setSelectedVorlauflisteComponentCategoryIds(
      resolvedComponentIds.length > 0 ? resolvedComponentIds : defaultComponentCategories.map((category) => category.id),
    );
  }, [defaultComponentCategories, defaultProductCategories, vorlauflisteSelection]);

  useEffect(() => {
    const validProductIds = new Set(defaultProductCategories.map((category) => category.id));
    const validComponentIds = new Set(defaultComponentCategories.map((category) => category.id));
    const availableTagIds = new Set(tags.map((tag) => tag.id));
    const resolvedProductIds = normalizeIds((productVorlaufSelection?.productCategoryIds ?? []).filter((id) => validProductIds.has(id)));
    const resolvedComponentIds = normalizeIds((productVorlaufSelection?.componentCategoryIds ?? []).filter((id) => validComponentIds.has(id)));
    const persistedTagId = productVorlaufSelection?.specialMeasureTagId ?? null;

    setSelectedProductVorlaufProductCategoryIds(
      resolvedProductIds.length > 0 ? resolvedProductIds : defaultProductCategories.map((category) => category.id),
    );
    setSelectedProductVorlaufComponentCategoryIds(
      resolvedComponentIds.length > 0 ? resolvedComponentIds : defaultComponentCategories.map((category) => category.id),
    );
    setSelectedSpecialMeasureTagId(persistedTagId && availableTagIds.has(persistedTagId) ? persistedTagId : null);
  }, [defaultComponentCategories, defaultProductCategories, productVorlaufSelection, tags]);

  const persistSelection = async (reportType: ReportType, next: CategorySelection | ProductVorlaufSelection) => {
    const payload = {
      key: reportType === "vorlaufliste" ? VORLAUFLISTE_SETTING_KEY : PRODUCT_VORLAUF_SETTING_KEY,
      scopeType: "USER" as const,
      value: reportType === "vorlaufliste"
        ? {
          productCategoryIds: normalizeIds(next.productCategoryIds),
          componentCategoryIds: normalizeIds(next.componentCategoryIds),
        }
        : {
          productCategoryIds: normalizeIds(next.productCategoryIds),
          componentCategoryIds: normalizeIds(next.componentCategoryIds),
          specialMeasureTagId: "specialMeasureTagId" in next ? next.specialMeasureTagId : null,
        },
    };
    await setSetting(payload);
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
      return fetchJson(`/api/reports/vorlaufliste?${params.toString()}`);
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
      if (submittedFilters?.specialMeasureTagId) params.set("specialMeasureTagId", String(submittedFilters.specialMeasureTagId));
      return fetchJson(`/api/reports/product-vorlauf?${params.toString()}`);
    },
  });

  const columns = useMemo<TableViewColumnDef<VorlauflisteItem>[]>(() => [
    {
      id: "tags",
      header: "Tags",
      accessor: (row) => row.tags.map((tag) => tag.name).join(", "),
      minWidth: 180,
      cell: ({ row }) => {
        const stateLabel = resolveVorlauflisteStateLabel(row.reportState);
        return (
          <div className="space-y-2">
            <EntityTagFooterRow tags={row.tags} testId={`reports-vorlaufliste-tags-${row.projectId}`} />
            {stateLabel ? (
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  row.reportState === "cancelled_only"
                    ? "border-rose-200 bg-rose-100 text-rose-800"
                    : "border-amber-200 bg-amber-100 text-amber-800",
                )}
              >
                {stateLabel}
              </span>
            ) : null}
          </div>
        );
      },
    },
    { id: "amount", header: "Auftragssumme", accessor: (row) => row.amount ?? "", minWidth: 160, align: "right", cell: ({ row }) => <span>{formatAmount(row.amount)}</span> },
    { id: "customerFullName", header: "Kunde", accessor: (row) => row.customerFullName ?? "", minWidth: 220, cell: ({ row }) => <span>{resolveValue(row.customerFullName)}</span> },
    { id: "postalCode", header: "PLZ", accessor: (row) => row.postalCode ?? "", minWidth: 110, cell: ({ row }) => <span>{resolveValue(row.postalCode)}</span> },
    { id: "city", header: "Ort", accessor: (row) => row.city ?? "", minWidth: 160, cell: ({ row }) => <span>{resolveValue(row.city)}</span> },
    { id: "sauna", header: "Sauna", accessor: (row) => row.sauna ?? "", minWidth: 180, cell: ({ row }) => <span>{resolveValue(row.sauna)}</span> },
    { id: "door", header: "Tuer", accessor: (row) => row.door ?? "", minWidth: 160, cell: ({ row }) => <span>{resolveValue(row.door)}</span> },
    { id: "window", header: "Fenster", accessor: (row) => row.window ?? "", minWidth: 160, cell: ({ row }) => <span>{resolveValue(row.window)}</span> },
    { id: "oven", header: "Ofen", accessor: (row) => row.oven ?? "", minWidth: 160, cell: ({ row }) => <span>{resolveValue(row.oven)}</span> },
    { id: "control", header: "Steuerung", accessor: (row) => row.control ?? "", minWidth: 160, cell: ({ row }) => <span>{resolveValue(row.control)}</span> },
    { id: "roof", header: "Dach", accessor: (row) => row.roof ?? "", minWidth: 160, cell: ({ row }) => <span>{resolveValue(row.roof)}</span> },
    { id: "plannedDateText", header: "vorgeplanter Termin", accessor: (row) => row.plannedDateText ?? "", minWidth: 170, cell: ({ row }) => <span>{resolveValue(row.plannedDateText)}</span> },
    { id: "plannedWeek", header: "KW Vorgeplant", accessor: (row) => row.plannedWeek ?? "", minWidth: 150, cell: ({ row }) => <span>{resolveValue(row.plannedWeek)}</span> },
    { id: "actualDate", header: "tatsächlicher Termin", accessor: (row) => row.actualDate, minWidth: 170, cell: ({ row }) => <span>{formatDate(row.actualDate)}</span> },
    { id: "projectDescription", header: "Anmerkungen", accessor: (row) => row.projectDescription ?? "", minWidth: 280, cell: ({ row }) => <span>{resolveValue(row.projectDescription)}</span> },
  ], []);

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
      specialMeasureTagId: reportType === "product-vorlauf" ? selectedSpecialMeasureTagId ?? undefined : undefined,
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
        helpKey="reports.vorlaufliste"
        onClose={onCancel}
        showCloseButton={Boolean(onCancel)}
        className="h-full w-full"
        contentClassName="min-h-0"
        contentSlot={(
          <div className="relative h-full overflow-hidden" data-testid="reports-panel">
            <div className="h-full overflow-auto p-6">
              <div className="space-y-6">
              <ReportConfigSurface
                title="Vorlaufliste"
                description="Datumsbereich und Default-Kategorien für die Vorlaufliste festlegen."
                actions={(
                  <Button type="button" onClick={() => handleGenerateReport("vorlaufliste")} disabled={vorlauflisteFromDate.trim().length === 0} data-testid="button-reports-vorlaufliste-generate">
                    Report erzeugen
                  </Button>
                )}
              >
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

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-vorlaufliste-product-category-group">
                    <h4 className="text-sm font-semibold">Standard Produktkategorien</h4>
                    <div className="mt-3 space-y-2">
                      {defaultProductCategories.map((category) => (
                        <label key={category.id} className="flex items-center gap-3 text-sm text-foreground">
                          <Checkbox
                            checked={selectedVorlauflisteProductCategoryIds.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const nextIds = checked ? normalizeIds([...selectedVorlauflisteProductCategoryIds, category.id]) : selectedVorlauflisteProductCategoryIds.filter((id) => id !== category.id);
                              setSelectedVorlauflisteProductCategoryIds(nextIds);
                              void persistSelection("vorlaufliste", {
                                productCategoryIds: nextIds,
                                componentCategoryIds: selectedVorlauflisteComponentCategoryIds,
                              });
                            }}
                            data-testid={`checkbox-reports-vorlaufliste-product-category-${category.id}`}
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-vorlaufliste-component-category-group">
                    <h4 className="text-sm font-semibold">Standard Komponentenkategorien</h4>
                    <div className="mt-3 space-y-2">
                      {defaultComponentCategories.map((category) => (
                        <label key={category.id} className="flex items-center gap-3 text-sm text-foreground">
                          <Checkbox
                            checked={selectedVorlauflisteComponentCategoryIds.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const nextIds = checked ? normalizeIds([...selectedVorlauflisteComponentCategoryIds, category.id]) : selectedVorlauflisteComponentCategoryIds.filter((id) => id !== category.id);
                              setSelectedVorlauflisteComponentCategoryIds(nextIds);
                              void persistSelection("vorlaufliste", {
                                productCategoryIds: selectedVorlauflisteProductCategoryIds,
                                componentCategoryIds: nextIds,
                              });
                            }}
                            data-testid={`checkbox-reports-vorlaufliste-component-category-${category.id}`}
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </ReportConfigSurface>
              <ReportConfigSurface
                title="Produkt Vorlauf"
                description="Datumsbereich, Kategorien und Sondermass-Kennzeichnung fuer den Produkt-Vorlauf festlegen."
                actions={(
                  <Button type="button" onClick={() => handleGenerateReport("product-vorlauf")} disabled={productVorlaufFromDate.trim().length === 0} data-testid="button-reports-product-vorlauf-generate">
                    Report erzeugen
                  </Button>
                )}
              >
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
                  <div className="flex min-w-[260px] flex-1 flex-col gap-1">
                    <Label htmlFor="reports-product-vorlauf-special-measure-tag">Sondermass Kennzeichnung</Label>
                    <select
                      id="reports-product-vorlauf-special-measure-tag"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedSpecialMeasureTagId ?? ""}
                      onChange={(event) => {
                        const nextValue = event.target.value ? Number(event.target.value) : null;
                        setSelectedSpecialMeasureTagId(nextValue);
                        void persistSelection("product-vorlauf", {
                          productCategoryIds: selectedProductVorlaufProductCategoryIds,
                          componentCategoryIds: selectedProductVorlaufComponentCategoryIds,
                          specialMeasureTagId: nextValue,
                        });
                      }}
                      data-testid="select-reports-product-vorlauf-special-measure-tag"
                    >
                      <option value="">Kein Tag ausgewaehlt</option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-product-category-group">
                    <h4 className="text-sm font-semibold">Standard Produktkategorien</h4>
                    <div className="mt-3 space-y-2">
                      {defaultProductCategories.map((category) => (
                        <label key={category.id} className="flex items-center gap-3 text-sm text-foreground">
                          <Checkbox
                            checked={selectedProductVorlaufProductCategoryIds.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const nextIds = checked ? normalizeIds([...selectedProductVorlaufProductCategoryIds, category.id]) : selectedProductVorlaufProductCategoryIds.filter((id) => id !== category.id);
                              setSelectedProductVorlaufProductCategoryIds(nextIds);
                              void persistSelection("product-vorlauf", {
                                productCategoryIds: nextIds,
                                componentCategoryIds: selectedProductVorlaufComponentCategoryIds,
                                specialMeasureTagId: selectedSpecialMeasureTagId,
                              });
                            }}
                            data-testid={`checkbox-reports-product-vorlauf-product-category-${category.id}`}
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-component-category-group">
                    <h4 className="text-sm font-semibold">Standard Komponentenkategorien</h4>
                    <div className="mt-3 space-y-2">
                      {defaultComponentCategories.map((category) => (
                        <label key={category.id} className="flex items-center gap-3 text-sm text-foreground">
                          <Checkbox
                            checked={selectedProductVorlaufComponentCategoryIds.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const nextIds = checked ? normalizeIds([...selectedProductVorlaufComponentCategoryIds, category.id]) : selectedProductVorlaufComponentCategoryIds.filter((id) => id !== category.id);
                              setSelectedProductVorlaufComponentCategoryIds(nextIds);
                              void persistSelection("product-vorlauf", {
                                productCategoryIds: selectedProductVorlaufProductCategoryIds,
                                componentCategoryIds: nextIds,
                                specialMeasureTagId: selectedSpecialMeasureTagId,
                              });
                            }}
                            data-testid={`checkbox-reports-product-vorlauf-component-category-${category.id}`}
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>
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
                      columns={columns}
                      rows={vorlauflisteData?.items ?? []}
                      rowKey={(row) => row.projectId}
                      rowClassName={resolveVorlauflisteRowClassName}
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
                    <h3 className="text-base font-semibold text-foreground">Produkt Vorlauf Report</h3>
                    <p className="text-sm text-muted-foreground">Summen nach Kategorien und eine Liste aller erkannten Sondermasse.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={closeOverlay} data-testid="button-reports-product-vorlauf-back">Zurueck</Button>
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
                        <h4 className="text-sm font-semibold">Sondermasse</h4>
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
                          <p className="mt-3 text-sm text-muted-foreground">Keine Sondermasse im gewaehlten Zeitraum gefunden.</p>
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
