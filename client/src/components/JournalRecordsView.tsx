import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { formatDisplayTimestamp } from "@/lib/date-display-format";
import { cn } from "@/lib/utils";

type JournalContextItem = {
  contextTable: string;
  contextId: number | null;
  contextKey: string | null;
  relationRole: string | null;
};

type JournalItem = {
  id: number;
  tableName: string;
  recordId: number | null;
  recordKey: string | null;
  op: string;
  field: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  snapshot: unknown | null;
  actorUserId: number | null;
  actorName: string | null;
  triggerKey: string | null;
  messageText: string;
  isRaw: boolean;
  createdAt: string;
  contexts: JournalContextItem[];
};

type JournalListResponse = {
  items: JournalItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type JournalContextFilter = {
  tableName: string;
  recordId?: number | null;
  recordKey?: string | null;
};

type JournalRecordsViewProps = {
  context?: JournalContextFilter;
  pageSize?: number;
  testIdPrefix?: string;
};

const entityLabels: Record<string, string> = {
  appointment: "Termin",
  customer: "Kunde",
  project: "Projekt",
  employee: "Mitarbeiter",
  appointment_attachment: "Terminanhang",
  customer_attachment: "Kundenanhang",
  project_attachment: "Projektanhang",
  employee_attachment: "Mitarbeiteranhang",
  note: "Notiz",
  project_order_item: "Auftragsposition",
  product: "Produkt",
  component: "Komponente",
  product_category: "Produktkategorie",
  component_category: "Komponentenkategorie",
  tag: "Tag",
  calendar_week: "Kalenderwoche",
  employee_week_assignment: "Wochenplanung",
  appointment_employee: "Terminzuweisung",
};

function getEntityLabel(tableName: string): string {
  return entityLabels[tableName] ?? tableName;
}

function formatTimestamp(value: string): string {
  return formatDisplayTimestamp(value, value);
}

export function JournalRecordsView({
  context,
  pageSize = 20,
  testIdPrefix = "journal",
}: JournalRecordsViewProps) {
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [queryFilter, setQueryFilter] = useState("");
  const deferredActorFilter = useDeferredValue(actorFilter);
  const deferredQueryFilter = useDeferredValue(queryFilter);

  useEffect(() => {
    setPage(1);
  }, [context?.recordId, context?.recordKey, context?.tableName, deferredActorFilter, deferredQueryFilter, fromDate, toDate]);

  const queryKey = [
    api.journal.list.path,
    page,
    pageSize,
    fromDate,
    toDate,
    deferredActorFilter,
    deferredQueryFilter,
    context?.tableName ?? null,
    context?.recordId ?? null,
    context?.recordKey ?? null,
  ] as const;

  const { data, error } = useQuery<JournalListResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (deferredActorFilter.trim()) params.set("actor", deferredActorFilter.trim());
      if (deferredQueryFilter.trim()) params.set("q", deferredQueryFilter.trim());
      if (context?.tableName) params.set("contextTable", context.tableName);
      if (typeof context?.recordId === "number") params.set("contextId", String(context.recordId));
      if (context?.recordKey?.trim()) params.set("contextKey", context.recordKey.trim());

      const response = await fetch(`${api.journal.list.path}?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? payload?.code ?? "Journal konnte nicht geladen werden");
      }
      return (await response.json()) as JournalListResponse;
    },
  });

  const columns = useMemo<TableViewColumnDef<JournalItem>[]>(() => [
    {
      id: "createdAt",
      header: "Zeitpunkt",
      width: 150,
      accessor: (row) => formatTimestamp(row.createdAt),
      truncate: true,
    },
    {
      id: "tableName",
      header: "Bereich",
      width: 140,
      accessor: (row) => getEntityLabel(row.tableName),
      truncate: true,
    },
    {
      id: "messageText",
      header: "Eintrag",
      minWidth: 420,
      cell: ({ row }) => (
        <div className={cn("space-y-1", row.isRaw && "font-mono text-xs")}>
          <div className="whitespace-normal break-words">{row.messageText}</div>
          {row.triggerKey ? (
            <div className="text-xs text-muted-foreground">
              {row.triggerKey}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "actorName",
      header: "Akteur",
      width: 180,
      accessor: (row) => row.actorName ?? "System",
      truncate: true,
    },
  ], []);

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setActorFilter("");
    setQueryFilter("");
    setPage(1);
  };

  if (error instanceof Error) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-lg border border-destructive/30 bg-card p-6 text-center">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Journal konnte nicht geladen werden.</h3>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4" data-testid={`${testIdPrefix}-records`}>
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-5">
        <Input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          data-testid={`${testIdPrefix}-filter-from`}
        />
        <Input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          data-testid={`${testIdPrefix}-filter-to`}
        />
        <Input
          value={actorFilter}
          onChange={(event) => setActorFilter(event.target.value)}
          placeholder="Akteur filtern"
          data-testid={`${testIdPrefix}-filter-actor`}
        />
        <Input
          value={queryFilter}
          onChange={(event) => setQueryFilter(event.target.value)}
          placeholder="Freitext suchen"
          data-testid={`${testIdPrefix}-filter-query`}
        />
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            data-testid={`${testIdPrefix}-filter-reset`}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Filter leeren
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <TableView
          testId={`${testIdPrefix}-table`}
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(row) => row.id}
          density="compact"
          stickyHeader
          rowClassName={(row) => row.isRaw ? "bg-slate-50/80 text-slate-700" : undefined}
          emptyState={(
            <ListEmptyState
              fallbackTitle="Keine Journaleinträge gefunden."
              fallbackBody="Für die aktuellen Filter liegen keine passenden Änderungen vor."
            />
          )}
          footerSlot={(
            <ListPagingFooter
              summaryText={data ? `${data.total} Einträge` : undefined}
              page={data?.page ?? 1}
              totalPages={data?.totalPages ?? 0}
              canGoPrev={(data?.page ?? 1) > 1}
              canGoNext={Boolean(data && data.page < data.totalPages)}
              onPrev={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => current + 1)}
              prevTestId={`${testIdPrefix}-page-prev`}
              nextTestId={`${testIdPrefix}-page-next`}
              stateTestId={`${testIdPrefix}-page-state`}
            />
          )}
          className="flex-1"
        />
      </div>
    </div>
  );
}
