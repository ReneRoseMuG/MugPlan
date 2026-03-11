import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListLayout } from "@/components/ui/list-layout";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { getBerlinTodayDateString } from "@/lib/project-appointments";

type VorlauflisteItem = {
  projectId: number;
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
};

const REPORT_PAGE_SIZE = 100;

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

interface ReportsPageProps {
  onCancel?: () => void;
}

export function ReportsPage({ onCancel }: ReportsPageProps) {
  const [fromDate, setFromDate] = useState(getBerlinTodayDateString());
  const [toDate, setToDate] = useState("");
  const [showToDate, setShowToDate] = useState(false);
  const [page, setPage] = useState(1);
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null);
  const canGenerateReport = fromDate.trim().length > 0;

  const { data, isLoading } = useQuery<VorlauflisteResponse>({
    queryKey: ["reports-vorlaufliste", submittedFilters, page],
    enabled: submittedFilters !== null,
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate: submittedFilters!.fromDate,
        page: String(page),
        pageSize: String(REPORT_PAGE_SIZE),
      });

      if (submittedFilters?.toDate) {
        params.set("toDate", submittedFilters.toDate);
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
      header: "Tür",
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
      header: "tatsächlicher Termin",
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

  return (
    <div className="h-full w-full">
      <ListLayout
        title="Vorlaufliste"
        icon={<FileText className="w-5 h-5" />}
        helpKey="reports.vorlaufliste"
        onClose={onCancel}
        showCloseButton={Boolean(onCancel)}
        isLoading={isLoading}
        className="h-full w-full"
        filterPlacement="top"
        filterSlot={(
          <div className="flex w-full flex-col gap-4" data-testid="reports-vorlaufliste-panel">
            <div className="flex w-full flex-wrap items-end gap-4">
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

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={() => {
                    if (fromDate.trim().length === 0) return;
                    setPage(1);
                    setSubmittedFilters({
                      fromDate,
                      toDate: showToDate && toDate.trim().length > 0 ? toDate : undefined,
                    });
                  }}
                  disabled={!canGenerateReport}
                  data-testid="button-reports-vorlaufliste-generate"
                >
                  Report erzeugen
                </Button>
              </div>
            </div>
          </div>
        )}
        contentSlot={(
          <TableView
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(row) => row.projectId}
            testId="table-reports-vorlaufliste"
            emptyState={(
              <ListEmptyState
                helpKey="reports.vorlaufliste"
                fallbackTitle={hasReport ? "Keine Treffer gefunden." : "Noch kein Report erzeugt."}
                fallbackBody={hasReport
                  ? "Fuer den gewaehlten Datumsbereich konnten keine passenden Projekte ermittelt werden."
                  : "Waehlen Sie mindestens ein Datum Beginn und erzeugen Sie den Report."}
              />
            )}
          />
        )}
        footerSlot={(
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" data-testid="text-reports-vorlaufliste-page-state">
              {data?.total ?? 0} Eintraege - Seite {totalPages === 0 ? 0 : page} von {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => canGoPrev && setPage((current) => current - 1)}
                disabled={!canGoPrev}
                data-testid="button-reports-vorlaufliste-page-prev"
              >
                Zurueck
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => canGoNext && setPage((current) => current + 1)}
                disabled={!canGoNext}
                data-testid="button-reports-vorlaufliste-page-next"
              >
                Weiter
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
