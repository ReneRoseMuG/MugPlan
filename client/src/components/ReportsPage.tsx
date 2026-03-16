import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { ComponentCategory, ProductCategory } from "@shared/schema";
import type { Tag } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListLayout } from "@/components/ui/list-layout";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { ReportConfigSurface } from "@/components/ui/report-config-surface";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";
import { useSetting, useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";

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

type SubmittedFilters = {
  fromDate: string;
  toDate?: string;
  productCategoryIds: number[];
  componentCategoryIds: number[];
};

const REPORT_PAGE_SIZE = 100;
const REPORT_SETTING_KEY = "reports.vorlaufliste.categorySelection";

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

function normalizeIds(ids: number[]): number[] {
  return Array.from(new Set(ids.filter((value) => Number.isInteger(value) && value > 0))).sort((left, right) => left - right);
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
  const [fromDate, setFromDate] = useState(getBerlinTodayDateString());
  const [toDate, setToDate] = useState("");
  const [showToDate, setShowToDate] = useState(false);
  const [page, setPage] = useState(1);
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null);
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false);
  const [reportRequestId, setReportRequestId] = useState(0);
  const persistedSelection = useSetting(REPORT_SETTING_KEY);
  const { setSetting } = useSettings();
  const canGenerateReport = fromDate.trim().length > 0;

  const productCategoriesUrl = "/api/admin/master-data/product-categories?active=all";
  const componentCategoriesUrl = "/api/admin/master-data/component-categories?active=all";

  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: [productCategoriesUrl],
    queryFn: () => fetchJson(productCategoriesUrl),
  });
  const { data: componentCategories = [] } = useQuery<ComponentCategory[]>({
    queryKey: [componentCategoriesUrl],
    queryFn: () => fetchJson(componentCategoriesUrl),
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

  useEffect(() => {
    const validProductIds = new Set(defaultProductCategories.map((category) => category.id));
    const validComponentIds = new Set(defaultComponentCategories.map((category) => category.id));
    const persistedProductIds = normalizeIds((persistedSelection?.productCategoryIds ?? []).filter((id) => validProductIds.has(id)));
    const persistedComponentIds = normalizeIds((persistedSelection?.componentCategoryIds ?? []).filter((id) => validComponentIds.has(id)));
    const resolvedProductIds = persistedProductIds.length > 0
      ? persistedProductIds
      : defaultProductCategories.map((category) => category.id);
    const resolvedComponentIds = persistedComponentIds.length > 0
      ? persistedComponentIds
      : defaultComponentCategories.map((category) => category.id);

    setSelectedProductCategoryIds((current) => JSON.stringify(current) === JSON.stringify(resolvedProductIds) ? current : resolvedProductIds);
    setSelectedComponentCategoryIds((current) => JSON.stringify(current) === JSON.stringify(resolvedComponentIds) ? current : resolvedComponentIds);
  }, [defaultComponentCategories, defaultProductCategories, persistedSelection]);

  const persistCategorySelection = async (next: {
    productCategoryIds: number[];
    componentCategoryIds: number[];
  }) => {
    await setSetting({
      key: REPORT_SETTING_KEY,
      scopeType: "USER",
      value: {
        productCategoryIds: normalizeIds(next.productCategoryIds),
        componentCategoryIds: normalizeIds(next.componentCategoryIds),
      },
    });
  };

  const { data, isLoading } = useQuery<VorlauflisteResponse>({
    queryKey: ["reports-vorlaufliste", submittedFilters, reportRequestId, page],
    enabled: submittedFilters !== null && isReportOverlayOpen,
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate: submittedFilters!.fromDate,
        page: String(page),
        pageSize: String(REPORT_PAGE_SIZE),
      });

      if (submittedFilters?.toDate) {
        params.set("toDate", submittedFilters.toDate);
      }

      for (const productCategoryId of submittedFilters?.productCategoryIds ?? []) {
        params.append("productCategoryIds", String(productCategoryId));
      }
      for (const componentCategoryId of submittedFilters?.componentCategoryIds ?? []) {
        params.append("componentCategoryIds", String(componentCategoryId));
      }

      const response = await fetch(`/api/reports/vorlaufliste?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Report konnte nicht geladen werden");
      }
      return (await response.json()) as VorlauflisteResponse;
    },
  });

  const columns = useMemo<TableViewColumnDef<VorlauflisteItem>[]>(() => [
    {
      id: "tags",
      header: "Tags",
      accessor: (row) => row.tags.map((tag) => tag.name).join(", "),
      minWidth: 180,
      cell: ({ row }) => <EntityTagFooterRow tags={row.tags} testId={`reports-vorlaufliste-tags-${row.projectId}`} />,
    },
    {
      id: "amount",
      header: "Auftragssumme",
      accessor: (row) => row.amount ?? "",
      minWidth: 160,
      cell: ({ row }) => <span>{formatAmount(row.amount)}</span>,
      align: "right",
    },
    {
      id: "customerFullName",
      header: "Kunde",
      accessor: (row) => row.customerFullName ?? "",
      minWidth: 220,
      cell: ({ row }) => <span>{resolveValue(row.customerFullName)}</span>,
    },
    {
      id: "postalCode",
      header: "PLZ",
      accessor: (row) => row.postalCode ?? "",
      minWidth: 110,
      cell: ({ row }) => <span>{resolveValue(row.postalCode)}</span>,
    },
    {
      id: "city",
      header: "Ort",
      accessor: (row) => row.city ?? "",
      minWidth: 160,
      cell: ({ row }) => <span>{resolveValue(row.city)}</span>,
    },
    {
      id: "sauna",
      header: "Sauna",
      accessor: (row) => row.sauna ?? "",
      minWidth: 180,
      cell: ({ row }) => <span>{resolveValue(row.sauna)}</span>,
    },
    {
      id: "door",
      header: "Tuer",
      accessor: (row) => row.door ?? "",
      minWidth: 160,
      cell: ({ row }) => <span>{resolveValue(row.door)}</span>,
    },
    {
      id: "window",
      header: "Fenster",
      accessor: (row) => row.window ?? "",
      minWidth: 160,
      cell: ({ row }) => <span>{resolveValue(row.window)}</span>,
    },
    {
      id: "oven",
      header: "Ofen",
      accessor: (row) => row.oven ?? "",
      minWidth: 160,
      cell: ({ row }) => <span>{resolveValue(row.oven)}</span>,
    },
    {
      id: "control",
      header: "Steuerung",
      accessor: (row) => row.control ?? "",
      minWidth: 160,
      cell: ({ row }) => <span>{resolveValue(row.control)}</span>,
    },
    {
      id: "roof",
      header: "Dach",
      accessor: (row) => row.roof ?? "",
      minWidth: 160,
      cell: ({ row }) => <span>{resolveValue(row.roof)}</span>,
    },
    {
      id: "plannedDateText",
      header: "vorgeplanter Termin",
      accessor: (row) => row.plannedDateText ?? "",
      minWidth: 170,
      cell: ({ row }) => <span>{resolveValue(row.plannedDateText)}</span>,
    },
    {
      id: "plannedWeek",
      header: "KW Vorgeplant",
      accessor: (row) => row.plannedWeek ?? "",
      minWidth: 150,
      cell: ({ row }) => <span>{resolveValue(row.plannedWeek)}</span>,
    },
    {
      id: "actualDate",
      header: "tatsaechlicher Termin",
      accessor: (row) => row.actualDate,
      minWidth: 170,
      cell: ({ row }) => <span>{formatDate(row.actualDate)}</span>,
    },
    {
      id: "projectDescription",
      header: "Projekt Beschreibung",
      accessor: (row) => row.projectDescription ?? "",
      minWidth: 280,
      cell: ({ row }) => <span>{resolveValue(row.projectDescription)}</span>,
    },
  ], []);

  const totalPages = data?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;
  const hasReport = submittedFilters !== null;
  const isReportLoading = isReportOverlayOpen && isLoading;
  const handleGenerateReport = () => {
    if (fromDate.trim().length === 0) return;
    setPage(1);
    setSubmittedFilters({
      fromDate,
      toDate: showToDate && toDate.trim().length > 0 ? toDate : undefined,
      productCategoryIds: selectedProductCategoryIds,
      componentCategoryIds: selectedComponentCategoryIds,
    });
    setReportRequestId((current) => current + 1);
    setIsReportOverlayOpen(true);
  };
  const tableFooter = (
    <ListPagingFooter
      summaryText={`${data?.total ?? 0} Eintraege`}
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
  );

  return (
    <div className="h-full w-full">
      <ListLayout
        title="Vorlaufliste"
        icon={<FileText className="h-5 w-5" />}
        helpKey="reports.vorlaufliste"
        onClose={onCancel}
        showCloseButton={Boolean(onCancel)}
        className="h-full w-full"
        contentSlot={(
          <div className="relative h-full overflow-hidden" data-testid="reports-vorlaufliste-panel">
            <div className="h-full overflow-auto p-6">
              <ReportConfigSurface
                title="Report Konfiguration"
                description="Datumsbereich und Default-Kategorien fuer die Vorlaufliste festlegen."
                actions={(
                  <Button
                    type="button"
                    onClick={handleGenerateReport}
                    disabled={!canGenerateReport}
                    data-testid="button-reports-vorlaufliste-generate"
                  >
                    Report erzeugen
                  </Button>
                )}
              >
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex w-[150px] flex-none flex-col gap-1">
                    <Label htmlFor="reports-vorlaufliste-from-date">Datum Beginn</Label>
                    <Input
                      id="reports-vorlaufliste-from-date"
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      data-testid="reports-vorlaufliste-from-date"
                    />
                  </div>

                  {showToDate ? (
                    <div className="flex w-[150px] flex-none flex-col gap-1">
                      <Label htmlFor="reports-vorlaufliste-to-date">Datum Ende</Label>
                      <Input
                        id="reports-vorlaufliste-to-date"
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                        data-testid="reports-vorlaufliste-to-date"
                      />
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowToDate(true)}
                        data-testid="button-reports-vorlaufliste-show-to-date"
                      >
                        Datum Ende anzeigen
                      </Button>
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
                            checked={selectedProductCategoryIds.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const nextIds = checked
                                ? normalizeIds([...selectedProductCategoryIds, category.id])
                                : selectedProductCategoryIds.filter((id) => id !== category.id);
                              setSelectedProductCategoryIds(nextIds);
                              void persistCategorySelection({
                                productCategoryIds: nextIds,
                                componentCategoryIds: selectedComponentCategoryIds,
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
                            checked={selectedComponentCategoryIds.includes(category.id)}
                            onCheckedChange={(checked) => {
                              const nextIds = checked
                                ? normalizeIds([...selectedComponentCategoryIds, category.id])
                                : selectedComponentCategoryIds.filter((id) => id !== category.id);
                              setSelectedComponentCategoryIds(nextIds);
                              void persistCategorySelection({
                                productCategoryIds: selectedProductCategoryIds,
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
            </div>

            <div
              className={cn(
                "absolute inset-0 z-10 bg-card transition-opacity",
                isReportOverlayOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
              )}
              data-testid="reports-vorlaufliste-overlay"
            >
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">Vorlaufliste Report</h3>
                    <p className="text-sm text-muted-foreground">
                      {hasReport
                        ? "Die Trefferliste nutzt den zuletzt erzeugten Report mit eigenem Paging."
                        : "Noch kein Report erzeugt."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReportOverlayOpen(false)}
                    data-testid="button-reports-vorlaufliste-back"
                  >
                    Zurueck
                  </Button>
                </div>

                <div className="min-h-0 flex-1">
                  {isReportLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-md border border-border/60 bg-background/80 px-6 py-5">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Report wird geladen...</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <TableView
                      columns={columns}
                      rows={data?.items ?? []}
                      rowKey={(row) => row.projectId}
                      testId="table-reports-vorlaufliste"
                      emptyState={(
                        <ListEmptyState
                          helpKey="reports.vorlaufliste"
                          fallbackTitle="Keine Treffer gefunden."
                          fallbackBody="Fuer den gewaehlten Datumsbereich konnten keine passenden Projekte ermittelt werden."
                        />
                      )}
                      stickyHeader
                    />
                  )}
                </div>

                <div className="border-t border-border px-6 py-4">
                  {tableFooter}
                </div>
              </div>
            </div>
          </div>
        )}
        contentClassName="min-h-0"
      />
    </div>
  );
}
