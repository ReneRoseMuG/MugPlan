import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ListLayout } from "@/components/ui/list-layout";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import {
  AppointmentsFilterPanel,
  type AppointmentListFilters,
} from "@/components/ui/filter-panels/appointments-filter-panel";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import type { Tag, Tour } from "@shared/schema";
import { domainIcons } from "@/lib/domain-icons";
import { formatListDate, formatListTime } from "@/lib/list-display-format";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";

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
type SortKey = "date" | "customer" | "customerNumber" | "orderNumber";

export type AppointmentsListContext =
  | { type: "standalone" }
  | { type: "tour"; tourId: number | null }
  | { type: "employee"; employeeId: number };

interface AppointmentsListPageProps {
  onCancel?: () => void;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
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
  onRemoveEmployee?: (appointmentId: number) => void;
  splitDateRangeRow?: boolean;
}

const DEFAULT_PAGE_SIZE = 25;

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5" />;
  if (direction === "desc") return <ArrowDown className="w-3.5 h-3.5" />;
  return <ArrowUpDown className="w-3.5 h-3.5" />;
}

function resolveCustomerSortName(row: AppointmentListItem): string {
  return row.customer.fullName ?? "";
}

function resolveDateSortValue(row: AppointmentListItem): string {
  return `${row.startDate}|${row.startTime ?? ""}|${String(row.id).padStart(12, "0")}`;
}

function resolveAppointmentProjectDisplayName(storedProjectName: string): string {
  return storedProjectName.trim();
}

function hasUserControlledAppointmentFilters(
  filters: AppointmentListFilters,
  options: {
    todayBerlin: string;
    resolvedTourId: number | null | undefined;
    resolvedEmployeeId: number | undefined;
    resolvedEnforceFromToday: boolean;
  },
): boolean {
  if (filters.projectTitle.trim().length > 0) return true;
  if (filters.customerLastName.trim().length > 0) return true;
  if (filters.customerNumber.trim().length > 0) return true;
  if (filters.orderNumber.trim().length > 0) return true;
  if (filters.tagIds.length > 0) return true;
  if (filters.dateTo !== undefined) return true;

  if (filters.employeeId !== undefined && filters.employeeId !== options.resolvedEmployeeId) {
    return true;
  }

  if (filters.tourId !== undefined && filters.tourId !== (options.resolvedTourId ?? undefined)) {
    return true;
  }

  if (filters.dateFrom === undefined) {
    return false;
  }

  if (options.resolvedEnforceFromToday) {
    return filters.dateFrom !== options.todayBerlin;
  }

  return true;
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
  onRemoveEmployee,
  splitDateRangeRow = false,
}: AppointmentsListPageProps) {
  const contextType = context?.type ?? "standalone";
  const isTourContext = contextType === "tour";
  const isEmployeeContext = contextType === "employee";
  const resolvedTourId = context?.type === "tour" ? context.tourId : lockedTourId;
  const resolvedEmployeeId = context?.type === "employee" ? context.employeeId : undefined;
  const resolvedHideTourFilter = (isTourContext || isEmployeeContext) ? true : hideTourFilter;
  const resolvedHideTourColumn = isTourContext ? true : hideTourColumn;
  const resolvedShowCloseButton = (isTourContext || isEmployeeContext) ? false : showCloseButton;
  const resolvedEnforceFromToday = contextType === "standalone" ? true : (isTourContext || isEmployeeContext || enforceFromToday);

  const todayBerlin = getBerlinTodayDateString();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [hasLoadedAtLeastOnce, setHasLoadedAtLeastOnce] = useState(false);
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [filters, setFilters] = useState<AppointmentListFilters>({
    employeeId: resolvedEmployeeId,
    projectTitle: "",
    customerLastName: "",
    customerNumber: "",
    orderNumber: "",
    tagIds: [],
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

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });
  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("appointment"),
    queryFn: () => fetchTagCatalog("appointment"),
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
      if (filters.projectTitle.trim().length > 0) params.set("projectTitle", filters.projectTitle.trim());
      if (filters.customerLastName.trim().length > 0) params.set("customerLastName", filters.customerLastName.trim());
      if (filters.customerNumber.trim().length > 0) params.set("customerNumber", filters.customerNumber.trim());
      if (filters.orderNumber.trim().length > 0) params.set("orderNumber", filters.orderNumber.trim());
      if (filters.tagIds.length > 0) params.set("tagIds", filters.tagIds.join(","));
      if (filters.tourId) params.set("tourId", String(filters.tourId));
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const response = await fetch(`/api/appointments/list?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Terminliste konnte nicht geladen werden");
      }
      return (await response.json()) as AppointmentListResponse;
    },
  });

  useEffect(() => {
    if (data) {
      setHasLoadedAtLeastOnce(true);
    }
  }, [data]);

  const rows = useMemo(() => {
    if (resolvedTourId === null) return [];
    const source = data?.items ?? [];
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...source].sort((left, right) => {
      if (sortKey === "customer") {
        return resolveCustomerSortName(left).localeCompare(resolveCustomerSortName(right), "de") * multiplier;
      }
      if (sortKey === "customerNumber") {
        return left.customer.customerNumber.localeCompare(right.customer.customerNumber, "de", { numeric: true }) * multiplier;
      }
      if (sortKey === "orderNumber") {
        return (left.projectOrderNumber ?? "").localeCompare(right.projectOrderNumber ?? "", "de", { numeric: true }) * multiplier;
      }
      return resolveDateSortValue(left).localeCompare(resolveDateSortValue(right), "de") * multiplier;
    });
  }, [data?.items, resolvedTourId, sortDirection, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "date" ? "desc" : "asc");
  };

  const renderSortHeader = (label: string, key: SortKey) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs tracking-wide"
      onClick={() => toggleSort(key)}
    >
      <span>{label}</span>
      <SortIcon direction={sortKey === key ? sortDirection : null} />
    </button>
  );

  const tableColumns = useMemo<TableViewColumnDef<AppointmentListItem>[]>(() => {
    const columns: TableViewColumnDef<AppointmentListItem>[] = [
      {
        id: "time",
        header: "Uhrzeit",
        accessor: (row) => formatListTime(row.startTime),
        minWidth: 90,
        cell: ({ row }) => <span>{formatListTime(row.startTime) || " "}</span>,
      },
      {
        id: "date",
        header: renderSortHeader("Datum", "date"),
        accessor: (row) => row.startDate,
        minWidth: 100,
        cell: ({ row }) => <span>{formatListDate(row.startDate)}</span>,
      },
      {
        id: "orderNumber",
        header: renderSortHeader("Auftrag Nr.", "orderNumber"),
        accessor: (row) => row.projectOrderNumber ?? "",
        minWidth: 120,
        cell: ({ row }) => <span>{row.projectOrderNumber?.trim() || "-"}</span>,
      },
      {
        id: "project",
        header: "Projekt",
        accessor: (row) => resolveAppointmentProjectDisplayName(row.projectName),
        minWidth: 220,
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{resolveAppointmentProjectDisplayName(row.projectName)}</span>
            {row.isCancelled ? (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Storniert
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "customerNumber",
        header: renderSortHeader("Kunde Nr.", "customerNumber"),
        accessor: (row) => row.customer.customerNumber,
        minWidth: 110,
      },
      {
        id: "customer",
        header: renderSortHeader("Kunde", "customer"),
        accessor: (row) => resolveCustomerSortName(row),
        minWidth: 220,
        cell: ({ row }) => <span>{row.customer.fullName ?? "-"}</span>,
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

    if (onRemoveEmployee) {
      columns.push({
        id: "removeEmployee",
        header: "",
        accessor: () => "",
        minWidth: 48,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            data-testid={`button-remove-employee-from-appointment-${row.id}`}
            disabled={row.isCancelled}
            onClick={(e) => { e.stopPropagation(); onRemoveEmployee(row.id); }}
            title="Mitarbeiter von Termin entfernen"
          >
            –
          </Button>
        ),
      });
    }

    return columns;
  }, [resolvedHideTourColumn, sortDirection, sortKey, onRemoveEmployee]);

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
  const selectedTags = useMemo(
    () => filters.tagIds
      .map((id) => availableTags.find((tag) => tag.id === id))
      .filter((tag): tag is Tag => Boolean(tag)),
    [availableTags, filters.tagIds],
  );
  const selectedTagIds = useMemo(() => new Set(filters.tagIds), [filters.tagIds]);
  const unselectedTags = useMemo(
    () => availableTags.filter((tag) => !selectedTagIds.has(tag.id)),
    [availableTags, selectedTagIds],
  );
  const hasUserControlledFilters = hasUserControlledAppointmentFilters(filters, {
    todayBerlin,
    resolvedTourId,
    resolvedEmployeeId,
    resolvedEnforceFromToday,
  });
  const emptyState = hasUserControlledFilters ? (
    <ListEmptyState
      helpKey="appointments.emptyFiltered"
      fallbackTitle="Keine Treffer gefunden."
      fallbackBody="Fuer die gewaehlte Filtereinstellung konnten keine Treffer ermittelt werden."
    />
  ) : (
    <ListEmptyState
      helpKey="appointments.empty"
      fallbackTitle="Keine Termine vorhanden."
      fallbackBody="Es sind aktuell keine Termine in dieser Liste vorhanden."
    />
  );

  const AppointmentsIcon = domainIcons.appointmentsList;
  const tableFooter = (
    <ListPagingFooter
      summaryText={`${data?.total ?? 0} Einträge`}
      page={page}
      totalPages={totalPages}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      onPrev={() => canGoPrev && setPage((current) => current - 1)}
      onNext={() => canGoNext && setPage((current) => current + 1)}
      prevTestId="button-appointments-page-prev"
      nextTestId="button-appointments-page-next"
      stateTestId="text-appointments-page-state"
    />
  );

  return (
    <ListLayout
      title={title}
      icon={<AppointmentsIcon className="w-5 h-5" />}
      viewModeKey="appointments"
      helpKey={helpKey}
      isLoading={isLoading && !hasLoadedAtLeastOnce}
      onClose={onCancel}
      showCloseButton={resolvedShowCloseButton}
      closeTestId="button-close-appointments-list"
      className={className}
      contentClassName="flex min-h-0 flex-col"
      filterSlot={
        <AppointmentsFilterPanel
          filters={filters}
          onChange={setFilterAndResetPage}
          showAllAppointments={showAllAppointments}
          onShowAllAppointmentsChange={handleShowAllAppointmentsChange}
          showAllAppointmentsHelpKey="appointments.filter.showAll"
          tours={tours}
          selectedTags={selectedTags}
          availableTags={unselectedTags}
          tagPickerOpen={tagPickerOpen}
          onTagPickerOpenChange={setTagPickerOpen}
          hideTourFilter={resolvedHideTourFilter}
          splitDateRangeRow={splitDateRangeRow}
        />
      }
      footerSlot={tableFooter}
      contentSlot={
        <TableView
          testId="table-appointments-list"
          columns={tableColumns}
          rows={rows}
          rowKey={(row) => row.id}
          onRowDoubleClick={(row) => onOpenAppointment?.(row.id, context ?? { type: "standalone" })}
          rowPreviewRenderer={(row) => createAppointmentWeeklyPanelPreview(row, { sizeProfile: "sidebarTable" })}
          rowClassName={(row) => row.isCancelled ? "bg-amber-50/70 text-muted-foreground" : undefined}
          emptyState={emptyStateOverride ?? emptyState}
          stickyHeader
        />
      }
    />
  );
}
