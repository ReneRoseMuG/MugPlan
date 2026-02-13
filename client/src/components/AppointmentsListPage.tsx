import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ListLayout } from "@/components/ui/list-layout";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import {
  AppointmentsFilterPanel,
  type AppointmentListFilters,
} from "@/components/ui/filter-panels/appointments-filter-panel";
import { Button } from "@/components/ui/button";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import type { Customer, Employee, Project, Tour } from "@shared/schema";

type AppointmentListItem = CalendarAppointment & {
  startTimeHour: number | null;
  allDay: boolean;
  singleEmployee: boolean;
};

type AppointmentListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: AppointmentListItem[];
};

type AppointmentSortKey = "project" | "customer" | "tour";
type SortDirection = "asc" | "desc";

interface AppointmentsListPageProps {
  onCancel?: () => void;
  onOpenAppointment?: (appointmentId: number) => void;
}

const DEFAULT_PAGE_SIZE = 25;

function formatDateLabel(appointment: AppointmentListItem): string {
  const date = new Date(`${appointment.startDate}T00:00:00`);
  const day = format(date, "dd.MM.yyyy", { locale: de });
  if (appointment.startTimeHour == null) {
    return day;
  }
  return `${day}, ${String(appointment.startTimeHour).padStart(2, "0")}:00`;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5" />;
  if (direction === "desc") return <ArrowDown className="w-3.5 h-3.5" />;
  return <ArrowUpDown className="w-3.5 h-3.5" />;
}

export function AppointmentsListPage({ onCancel, onOpenAppointment }: AppointmentsListPageProps) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<AppointmentSortKey>("project");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const [filters, setFilters] = useState<AppointmentListFilters>({
    employeeId: undefined,
    projectId: undefined,
    customerId: undefined,
    tourId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    allDayOnly: false,
    withStartTimeOnly: false,
    lockedOnly: false,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetch("/api/employees?scope=active").then((response) => response.json()),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects?filter=all&scope=all"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data, isLoading } = useQuery<AppointmentListResponse>({
    queryKey: ["appointments-list", filters, page, DEFAULT_PAGE_SIZE, userRole],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });

      if (filters.employeeId) params.set("employeeId", String(filters.employeeId));
      if (filters.projectId) params.set("projectId", String(filters.projectId));
      if (filters.customerId) params.set("customerId", String(filters.customerId));
      if (filters.tourId) params.set("tourId", String(filters.tourId));
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.allDayOnly) params.set("allDayOnly", "true");
      if (filters.withStartTimeOnly) params.set("withStartTimeOnly", "true");
      if (filters.lockedOnly) params.set("lockedOnly", "true");

      const response = await fetch(`/api/appointments/list?${params.toString()}`, {
        credentials: "include",
        headers: {
        },
      });
      if (!response.ok) {
        throw new Error("Terminliste konnte nicht geladen werden");
      }
      return (await response.json()) as AppointmentListResponse;
    },
  });

  const rows = useMemo(() => {
    const source = data?.items ?? [];
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...source].sort((left, right) => {
      if (sortKey === "customer") {
        return left.customer.fullName.localeCompare(right.customer.fullName, "de") * multiplier;
      }
      if (sortKey === "tour") {
        return (left.tourName ?? "").localeCompare(right.tourName ?? "", "de") * multiplier;
      }
      return left.projectName.localeCompare(right.projectName, "de") * multiplier;
    });
  }, [data?.items, sortDirection, sortKey]);

  const handleSortToggle = (nextKey: AppointmentSortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  };

  const renderSortHeader = (label: string, key: AppointmentSortKey) => {
    const isActive = sortKey === key;
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wide"
        onClick={() => handleSortToggle(key)}
      >
        <span>{label}</span>
        <SortIcon direction={isActive ? sortDirection : null} />
      </button>
    );
  };

  const tableColumns = useMemo<TableViewColumnDef<AppointmentListItem>[]>(
    () => [
      {
        id: "date",
        header: "Datum",
        accessor: (row) => row.startDate,
        minWidth: 140,
        cell: ({ row }) => <span>{formatDateLabel(row)}</span>,
      },
      {
        id: "project",
        header: renderSortHeader("Projekt", "project"),
        accessor: (row) => row.projectName,
        minWidth: 220,
        cell: ({ row }) => <span className="font-medium">{row.projectName}</span>,
      },
      {
        id: "customer",
        header: renderSortHeader("Kunde", "customer"),
        accessor: (row) => row.customer.fullName,
        minWidth: 220,
        cell: ({ row }) => (
          <span>{row.customer.fullName} (K: {row.customer.customerNumber})</span>
        ),
      },
      {
        id: "tour",
        header: renderSortHeader("Tour", "tour"),
        accessor: (row) => row.tourName ?? "",
        minWidth: 160,
        cell: ({ row }) => <span>{row.tourName ?? "â€”"}</span>,
      },
      {
        id: "allDay",
        header: "Ganztag",
        accessor: (row) => row.allDay,
        align: "center",
        width: 110,
        cell: ({ row }) => <span>{row.allDay ? "Ja" : "Nein"}</span>,
      },
      {
        id: "isLocked",
        header: "Gesperrt",
        accessor: (row) => row.isLocked,
        align: "center",
        width: 110,
        cell: ({ row }) => <span>{row.isLocked ? "Ja" : "Nein"}</span>,
      },
    ],
    [sortDirection, sortKey],
  );

  const setFilterAndResetPage = (patch: Partial<AppointmentListFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const totalPages = data?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;

  return (
    <ListLayout
      title="Terminliste"
      icon={<CalendarDays className="w-5 h-5" />}
      viewModeKey="appointments"
      helpKey="appointments"
      isLoading={isLoading}
      onClose={onCancel}
      closeTestId="button-close-appointments-list"
      filterSlot={
        <AppointmentsFilterPanel
          filters={filters}
          onChange={setFilterAndResetPage}
          employees={employees}
          projects={projects}
          customers={customers}
          tours={tours}
        />
      }
      footerSlot={
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} Eintraege - {DEFAULT_PAGE_SIZE} pro Seite
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => canGoPrev && setPage((current) => current - 1)}
              disabled={!canGoPrev}
              data-testid="button-appointments-page-prev"
            >
              Zurueck
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="text-appointments-page-state">
              Seite {totalPages === 0 ? 0 : page} von {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => canGoNext && setPage((current) => current + 1)}
              disabled={!canGoNext}
              data-testid="button-appointments-page-next"
            >
              Weiter
            </Button>
          </div>
        </div>
      }
      contentSlot={
        <TableView
          testId="table-appointments-list"
          columns={tableColumns}
          rows={rows}
          rowKey={(row) => row.id}
          onRowDoubleClick={(row) => onOpenAppointment?.(row.id)}
          rowPreviewRenderer={(row) => createAppointmentWeeklyPanelPreview(row).content}
          emptyState={<p className="py-4 text-sm text-slate-400">Keine Termine gefunden.</p>}
          stickyHeader
        />
      }
    />
  );
}

