import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Loader2 } from "lucide-react";
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

type ProductVorlaufCategoryTotal = {
  categoryId: number;
  categoryName: string;
  totalQuantity: number;
};

type ProductVorlaufSpecialMeasureProject = {
  projectId: number;
  orderNumber: string | null;
  projectDescription: string | null;
  specialMeasureTag: Tag | null;
};

type ProductVorlaufResponse = {
  productCategoryTotals: ProductVorlaufCategoryTotal[];
  componentCategoryTotals: ProductVorlaufCategoryTotal[];
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

interface ReportsPageProps {
  onCancel?: () => void;
}

export function ReportsPage({ onCancel }: ReportsPageProps) {
  const [reportType, setReportType] = useState<ReportType>("vorlaufliste");
  const [fromDate, setFromDate] = useState(getBerlinTodayDateString());
  const [toDate, setToDate] = useState("");
  const [showToDate, setShowToDate] = useState(false);
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

  const [selectedProductCategoryIds, setSelectedProductCategoryIds] = useState<number[]>([]);
  const [selectedComponentCategoryIds, setSelectedComponentCategoryIds] = useState<number[]>([]);
  const [selectedSpecialMeasureTagId, setSelectedSpecialMeasureTagId] = useState<number | null>(null);

  useEffect(() => {
    const validProductIds = new Set(defaultProductCategories.map((category) => category.id));
    const validComponentIds = new Set(defaultComponentCategories.map((category) => category.id));
    const selection = reportType === "vorlaufliste" ? vorlauflisteSelection : productVorlaufSelection;
    const resolvedProductIds = normalizeIds((selection?.productCategoryIds ?? []).filter((id) => validProductIds.has(id)));
    const resolvedComponentIds = normalizeIds((selection?.componentCategoryIds ?? []).filter((id) => validComponentIds.has(id)));
    const fallbackProductIds = defaultProductCategories.map((category) => category.id);
    const fallbackComponentIds = defaultComponentCategories.map((category) => category.id);

    setSelectedProductCategoryIds(resolvedProductIds.length > 0 ? resolvedProductIds : fallbackProductIds);
    setSelectedComponentCategoryIds(resolvedComponentIds.length > 0 ? resolvedComponentIds : fallbackComponentIds);

    if (reportType === "product-vorlauf") {
      const availableTagIds = new Set(tags.map((tag) => tag.id));
      const persistedTagId = selection?.specialMeasureTagId ?? null;
      setSelectedSpecialMeasureTagId(persistedTagId && availableTagIds.has(persistedTagId) ? persistedTagId : null);
    }
  }, [defaultComponentCategories, defaultProductCategories, productVorlaufSelection, reportType, tags, vorlauflisteSelection]);

  const persistSelection = async (next: CategorySelection | ProductVorlaufSelection) => {
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
    { id: "tags", header: "Tags", accessor: (row) => row.tags.map((tag) => tag.name).join(", "), minWidth: 180, cell: ({ row }) => <EntityTagFooterRow tags={row.tags} testId={`reports-vorlaufliste-tags-${row.projectId}`} /> },
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
    { id: "actualDate", header: "tatsaechlicher Termin", accessor: (row) => row.actualDate, minWidth: 170, cell: ({ row }) => <span>{formatDate(row.actualDate)}</span> },
    { id: "projectDescription", header: "Projekt Beschreibung", accessor: (row) => row.projectDescription ?? "", minWidth: 280, cell: ({ row }) => <span>{resolveValue(row.projectDescription)}</span> },
  ], []);

  const canGenerateReport = fromDate.trim().length > 0;
  const totalPages = vorlauflisteData?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;
  const isVorlauflisteOverlay = isReportOverlayOpen && submittedFilters?.reportType === "vorlaufliste";
  const isProductVorlauflayout = isReportOverlayOpen && submittedFilters?.reportType === "product-vorlauf";

  const handleGenerateReport = () => {
    if (!canGenerateReport) return;
    setPage(1);
    setSubmittedFilters({
      reportType,
      fromDate,
      toDate: showToDate && toDate.trim().length > 0 ? toDate : undefined,
      productCategoryIds: selectedProductCategoryIds,
      componentCategoryIds: selectedComponentCategoryIds,
      specialMeasureTagId: reportType === "product-vorlauf" ? selectedSpecialMeasureTagId ?? undefined : undefined,
    });
    setReportRequestId((current) => current + 1);
    setIsReportOverlayOpen(true);
  };

  const closeOverlay = () => setIsReportOverlayOpen(false);

  const reportDescription = reportType === "vorlaufliste"
    ? "Datumsbereich und Default-Kategorien fuer die Vorlaufliste festlegen."
    : "Datumsbereich, Kategorien und Sondermass-Kennzeichnung fuer den Produkt-Vorlauf festlegen.";

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
              <ReportConfigSurface
                title="Report Konfiguration"
                description={reportDescription}
                actions={(
                  <Button type="button" onClick={handleGenerateReport} disabled={!canGenerateReport} data-testid="button-reports-generate">
                    Report erzeugen
                  </Button>
                )}
              >
                <div className="flex flex-wrap items-center gap-3" data-testid="reports-type-switch">
                  <Button type="button" variant={reportType === "vorlaufliste" ? "default" : "outline"} onClick={() => setReportType("vorlaufliste")} data-testid="button-reports-type-vorlaufliste">Vorlaufliste</Button>
                  <Button type="button" variant={reportType === "product-vorlauf" ? "default" : "outline"} onClick={() => setReportType("product-vorlauf")} data-testid="button-reports-type-product-vorlauf">Produkt Vorlauf</Button>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex w-[150px] flex-none flex-col gap-1">
                    <Label htmlFor="reports-from-date">Datum Beginn</Label>
                    <Input id="reports-from-date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} data-testid="reports-from-date" />
                  </div>
                  {showToDate ? (
                    <div className="flex w-[150px] flex-none flex-col gap-1">
                      <Label htmlFor="reports-to-date">Datum Ende</Label>
                      <Input id="reports-to-date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} data-testid="reports-to-date" />
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <Button type="button" variant="outline" onClick={() => setShowToDate(true)} data-testid="button-reports-show-to-date">Datum Ende anzeigen</Button>
                    </div>
                  )}
                  {reportType === "product-vorlauf" ? (
                    <div className="flex min-w-[260px] flex-1 flex-col gap-1">
                      <Label htmlFor="reports-product-vorlauf-special-measure-tag">Sondermass Kennzeichnung</Label>
                      <select
                        id="reports-product-vorlauf-special-measure-tag"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedSpecialMeasureTagId ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value ? Number(event.target.value) : null;
                          setSelectedSpecialMeasureTagId(nextValue);
                          void persistSelection({
                            productCategoryIds: selectedProductCategoryIds,
                            componentCategoryIds: selectedComponentCategoryIds,
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
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-md border border-border/60 bg-background/70 p-4" data-testid={`reports-${reportType}-product-category-group`}>
                    <h4 className="text-sm font-semibold">Standard Produktkategorien</h4>
                    <div className="mt-3 space-y-2">
                      {defaultProductCategories.map((category) => (
                        <label key={category.id} className="flex items-center gap-3 text-sm text-foreground">
                          <Checkbox
                            checked={selectedProductCategoryIds.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const nextIds = checked ? normalizeIds([...selectedProductCategoryIds, category.id]) : selectedProductCategoryIds.filter((id) => id !== category.id);
                              setSelectedProductCategoryIds(nextIds);
                              void persistSelection({
                                productCategoryIds: nextIds,
                                componentCategoryIds: selectedComponentCategoryIds,
                                specialMeasureTagId: reportType === "product-vorlauf" ? selectedSpecialMeasureTagId : undefined,
                              });
                            }}
                            data-testid={`checkbox-reports-${reportType}-product-category-${category.id}`}
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/70 p-4" data-testid={`reports-${reportType}-component-category-group`}>
                    <h4 className="text-sm font-semibold">Standard Komponentenkategorien</h4>
                    <div className="mt-3 space-y-2">
                      {defaultComponentCategories.map((category) => (
                        <label key={category.id} className="flex items-center gap-3 text-sm text-foreground">
                          <Checkbox
                            checked={selectedComponentCategoryIds.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const nextIds = checked ? normalizeIds([...selectedComponentCategoryIds, category.id]) : selectedComponentCategoryIds.filter((id) => id !== category.id);
                              setSelectedComponentCategoryIds(nextIds);
                              void persistSelection({
                                productCategoryIds: selectedProductCategoryIds,
                                componentCategoryIds: nextIds,
                                specialMeasureTagId: reportType === "product-vorlauf" ? selectedSpecialMeasureTagId : undefined,
                              });
                            }}
                            data-testid={`checkbox-reports-${reportType}-component-category-${category.id}`}
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </ReportConfigSurface>
            </div>

            <div className={cn("absolute inset-0 z-10 bg-card transition-opacity", isVorlauflisteOverlay ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")} data-testid="reports-overlay">
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">Vorlaufliste Report</h3>
                    <p className="text-sm text-muted-foreground">Die Trefferliste nutzt den zuletzt erzeugten Report mit eigenem Paging.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={closeOverlay} data-testid="button-reports-back">Zurueck</Button>
                </div>
                <div className="min-h-0 flex-1">
                  {isVorlauflisteLoading ? (
                    <div className="flex h-full items-center justify-center"><div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/80 px-6 py-5 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Report wird geladen...</span></div></div>
                  ) : (
                    <TableView
                      columns={columns}
                      rows={vorlauflisteData?.items ?? []}
                      rowKey={(row) => row.projectId}
                      testId="table-reports-vorlaufliste"
                      stickyHeader
                      emptyState={<ListEmptyState helpKey="reports.vorlaufliste" fallbackTitle="Keine Treffer gefunden." fallbackBody="Fuer den gewaehlten Datumsbereich konnten keine passenden Projekte ermittelt werden." />}
                    />
                  )}
                </div>
                <div className="border-t border-border px-6 py-4">
                  <ListPagingFooter
                    summaryText={`${vorlauflisteData?.total ?? 0} Eintraege`}
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
                        {productVorlaufData?.productCategoryTotals.length ? (
                          <div className="mt-3 space-y-2">
                            {productVorlaufData.productCategoryTotals.map((entry) => <div key={entry.categoryId} className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2 text-sm"><span>{entry.categoryName}</span><span className="font-medium">{entry.totalQuantity}</span></div>)}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">Keine passenden Produktkategorien gefunden.</p>
                        )}
                      </section>
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-components">
                        <h4 className="text-sm font-semibold">Komponentenkategorien</h4>
                        {productVorlaufData?.componentCategoryTotals.length ? (
                          <div className="mt-3 space-y-2">
                            {productVorlaufData.componentCategoryTotals.map((entry) => <div key={entry.categoryId} className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2 text-sm"><span>{entry.categoryName}</span><span className="font-medium">{entry.totalQuantity}</span></div>)}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">Keine passenden Komponentenkategorien gefunden.</p>
                        )}
                      </section>
                      <section className="rounded-md border border-border/60 bg-background/70 p-4" data-testid="reports-product-vorlauf-special-measures">
                        <h4 className="text-sm font-semibold">Sondermasse</h4>
                        {productVorlaufData?.specialMeasureProjects.length ? (
                          <div className="mt-3 space-y-3">
                            {productVorlaufData.specialMeasureProjects.map((entry) => (
                              <div key={entry.projectId} className="rounded-md border border-border/50 px-4 py-3" data-testid={`reports-product-vorlauf-special-measure-project-${entry.projectId}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-sm font-semibold">{resolveValue(entry.orderNumber)}</span>
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
