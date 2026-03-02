import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { parseProjectStoredName } from "@/lib/project-name-format";
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

type SortDirection = "asc" | "desc";

type AppointmentsListContext =
  | { type: "standalone" }
  | { type: "tour"; tourId: number | null }
  | { type: "employee"; employeeId: number };

interface AppointmentsListPageProps {
  onCancel?: () => void;
  onOpenAppointment?: (appointmentId: number) => void;
  title?: string;
  helpKey?: string;
  context?: AppointmentsListContext;
  showCloseButton?: boolean;
  // TODO(deprecated): use `context` instead.
  hideTourFilter?: boolean;
  // TODO(deprecated): use `context` instead.
  lockedTourId?: number | null;
  // TODO(deprecated): use `context` instead.
  hideTourColumn?: boolean;
  // TODO(deprecated): use `context` instead.
  enforceFromToday?: boolean;
  emptyStateOverride?: ReactNode;
  className?: string;
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

function resolveAppointmentProjectDisplayName(storedProjectName: string): string {
  const normalized = storedProjectName.trim();
  if (!normalized) return "";

  const kPrefixed = normalized.startsWith("K: ");
  const withoutKPrefix = kPrefixed ? normalized.slice(3).trim() : normalized;
  const separator = " - ";
  const separatorIndex = withoutKPrefix.indexOf(separator);

  if (separatorIndex >= 0) {
    const prefix = withoutKPrefix.slice(0, separatorIndex).trim();
    const suffix = withoutKPrefix.slice(separatorIndex + separator.length).trim();
    if (suffix && (kPrefixed || /\d/.test(prefix))) {
      return suffix;
    }
  }

  const parsed = parseProjectStoredName(normalized);
  return parsed.isolatedProjectName || normalized;
}

export function AppointmentsListPage({
  onCancel,
  onOpenAppointment,
  title = "Termine",
  helpKey = "appointments",
  context,
  showCloseButton = true,
  hideTourFilter = false,
  lockedTourId,
  hideTourColumn = false,
  enforceFromToday = false,
  emptyStateOverride,
  className,
}: AppointmentsListPageProps) {
  const contextType = context?.type ?? "standalone";
  const isTourContext = contextType === "tour";
  const isEmployeeContext = contextType === "employee";
  const resolvedTourId = context?.type === "tour" ? context.tourId : lockedTourId;
  const resolvedEmployeeId = context?.type === "employee" ? context.employeeId : undefined;
  const resolvedHideTourFilter = (isTourContext || isEmployeeContext) ? true : hideTourFilter;
  const resolvedHideEmployeeFilter = isEmployeeContext;
  const resolvedHideTourColumn = (isTourContext || isEmployeeContext) ? true : hideTourColumn;
  const resolvedShowCloseButton = (isTourContext || isEmployeeContext) ? false : showCloseButton;
  const resolvedEnforceFromToday = contextType === "standalone" ? true : (isTourContext || isEmployeeContext || enforceFromToday);

  const todayBerlin = getBerlinTodayDateString();
  const [page, setPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const [filters, setFilters] = useState<AppointmentListFilters>({
    employeeId: resolvedEmployeeId,
    projectId: undefined,
    customerId: undefined,
    tourId: resolvedTourId ?? undefined,
    dateFrom: todayBerlin,
    dateTo: undefined,
  });

  useEffect(() => {
    setFilters((current) => ({ ...current, tourId: resolvedTourId ?? undefined }));
    setPage(1);
  }, [resolvedTourId]);

  useEffect(() => {
    if (!isEmployeeContext) return;
    setFilters((current) => ({ ...current, employeeId: resolvedEmployeeId }));
    setPage(1);
  }, [isEmployeeContext, resolvedEmployeeId]);

  useEffect(() => {
    if (showAllAppointments) return;
    if (!resolvedEnforceFromToday) return;
    setFilters((current) => {
      if (current.dateFrom === todayBerlin) return current;
      return { ...current, dateFrom: todayBerlin };
    });
  }, [resolvedEnforceFromToday, showAllAppointments, todayBerlin]);

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
    enabled: resolvedTourId !== null,
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

      const response = await fetch(`/api/appointments/list?${params.toString()}`, {
        credentials: "include",
        headers: {},
      });
      if (!response.ok) {
        throw new Error("Terminliste konnte nicht geladen werden");
      }
      return (await response.json()) as AppointmentListResponse;
    },
  });

  const rows = useMemo(() => {
    if (resolvedTourId === null) return [];
    const source = data?.items ?? [];
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...source].sort((left, right) => {
      const dateCompare = left.startDate.localeCompare(right.startDate) * multiplier;
      if (dateCompare !== 0) return dateCompare;

      const leftTime = left.startTimeHour ?? -1;
      const rightTime = right.startTimeHour ?? -1;
      const timeCompare = (leftTime - rightTime) * multiplier;
      if (timeCompare !== 0) return timeCompare;

      return (left.id - right.id) * multiplier;
    });
  }, [data?.items, resolvedTourId, sortDirection]);

  const handleDateSortToggle = () => {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  };

  const tableColumns = useMemo<TableViewColumnDef<AppointmentListItem>[]>(() => {
    const columns: TableViewColumnDef<AppointmentListItem>[] = [
      {
        id: "date",
        header: (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs tracking-wide"
            onClick={handleDateSortToggle}
          >
            <span>Datum</span>
            <SortIcon direction={sortDirection} />
          </button>
        ),
        accessor: (row) => row.startDate,
        minWidth: 140,
        cell: ({ row }) => <span>{formatDateLabel(row)}</span>,
      },
      {
        id: "project",
        header: "Projekt",
        accessor: (row) => resolveAppointmentProjectDisplayName(row.projectName),
        minWidth: 220,
        cell: ({ row }) => <span className="font-medium">{resolveAppointmentProjectDisplayName(row.projectName)}</span>,
      },
      {
        id: "customer",
        header: "Kunde",
        accessor: (row) => row.customer.fullName,
        minWidth: 220,
        cell: ({ row }) => (
          <span>{row.customer.fullName} (K: {row.customer.customerNumber})</span>
        ),
      },
    ];

    if (!resolvedHideTourColumn) {
      columns.push({
        id: "tour",
        header: "Tour",
        accessor: (row) => row.tourName ?? "",
        minWidth: 160,
        cell: ({ row }) => <span>{row.tourName ?? "---"}</span>,
      });
    }

    return columns;
  }, [resolvedHideTourColumn, sortDirection]);

  const setFilterAndResetPage = (patch: Partial<AppointmentListFilters>) => {
    const patchWithDate = (!showAllAppointments && resolvedEnforceFromToday)
      ? { ...patch, dateFrom: todayBerlin }
      : patch;
    const patchWithTour = resolvedTourId == null
      ? patchWithDate
      : { ...patchWithDate, tourId: resolvedTourId };
    const nextPatch = resolvedEmployeeId == null
      ? patchWithTour
      : { ...patchWithTour, employeeId: resolvedEmployeeId };
    setFilters((current) => ({ ...current, ...nextPatch }));
    setPage(1);
  };

  const handleShowAllAppointmentsChange = (checked: boolean) => {
    setShowAllAppointments(checked);
    setFilters((current) => ({
      ...current,
      dateFrom: checked ? undefined : todayBerlin,
    }));
    setPage(1);
  };

  const totalPages = data?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;

  return (
    <ListLayout
      title={title}
      icon={<CalendarDays className="w-5 h-5" />}
      viewModeKey="appointments"
      helpKey={helpKey}
      isLoading={isLoading}
      onClose={onCancel}
      showCloseButton={resolvedShowCloseButton}
      closeTestId="button-close-appointments-list"
      className={className}
      filterSlot={
        <AppointmentsFilterPanel
          filters={filters}
          onChange={setFilterAndResetPage}
          showAllAppointments={showAllAppointments}
          onShowAllAppointmentsChange={handleShowAllAppointmentsChange}
          showAllAppointmentsHelpKey="appointments.filter.showAll"
          employees={employees}
          projects={projects}
          customers={customers}
          tours={tours}
          hideEmployeeFilter={resolvedHideEmployeeFilter}
          hideTourFilter={resolvedHideTourFilter}
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
          rowPreviewRenderer={(row) => createAppointmentWeeklyPanelPreview(row, { sizeProfile: "sidebarTable" })}
          emptyState={emptyStateOverride ?? <p className="py-4 text-sm text-slate-400">Keine Termine gefunden.</p>}
          stickyHeader
        />
      }
    />
  );
}
