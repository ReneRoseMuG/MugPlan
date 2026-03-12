import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Phone, MapPin, Building2, Mail, Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityCard } from "@/components/ui/entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CustomerFilterPanel } from "@/components/ui/filter-panels/customer-filter-panel";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { defaultHeaderColor } from "@/lib/colors";
import { defaultCustomerFilters } from "@/lib/customer-filters";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { useSettings } from "@/hooks/useSettings";
import { useListFilters } from "@/hooks/useListFilters";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import { AppointmentCountBadge } from "@/components/ui/appointment-count-badge";
import type { Customer, Tag } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type ViewMode = "board" | "table";
type SortDirection = "asc" | "desc";
type CustomerSortKey = "customerNumber" | "lastName" | "firstName" | "relevantAppointment";

type CustomerListItem = Customer & {
  notesCount: number;
  plannedAppointmentsCount: number;
  nextAppointmentStartDate: string | null;
  nextAppointmentStartTimeHour: number | null;
  tags: Tag[];
};

type CustomerListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: CustomerListItem[];
};

interface CustomersPageProps {
  onCancel?: () => void;
  onNewCustomer?: () => void;
  onSelectCustomer?: (id: number) => void;
  title?: string;
  showCloseButton?: boolean;
  tableOnly?: boolean;
}

function parseViewMode(value: unknown): ViewMode {
  return value === "table" ? "table" : "board";
}

function toAppointmentDateTime(appointment: { startDate: string; startTimeHour: number | null }): Date {
  const hour = appointment.startTimeHour ?? 23;
  const date = new Date(`${appointment.startDate}T00:00:00`);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function formatAppointmentLabel(appointment: { startDate: string; startTimeHour: number | null } | null): string {
  if (!appointment) return "---";

  const date = new Date(`${appointment.startDate}T00:00:00`);
  const dateLabel = format(date, "dd.MM.yyyy", { locale: de });
  if (appointment.startTimeHour == null) return dateLabel;
  return `${dateLabel}, ${String(appointment.startTimeHour).padStart(2, "0")}:00`;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5" />;
  if (direction === "desc") return <ArrowDown className="w-3.5 h-3.5" />;
  return <ArrowUpDown className="w-3.5 h-3.5" />;
}

const DEFAULT_CUSTOMERS_PAGE_SIZE = 50;

export function CustomersPage({
  onCancel,
  onNewCustomer,
  onSelectCustomer,
  title,
  showCloseButton = true,
  tableOnly = false,
}: CustomersPageProps) {
  const { settingsByKey, setSetting } = useSettings();
  const viewModeKey = "customers";
  const settingsViewModeKey = `${viewModeKey}.viewMode`;
  const resolvedViewMode = parseViewMode(settingsByKey.get(settingsViewModeKey)?.resolvedValue);

  const [viewMode, setViewMode] = useState<ViewMode>(tableOnly ? "table" : resolvedViewMode);
  const {
    filters,
    setFilter,
    page,
    setPage,
  } = useListFilters({
    initialFilters: defaultCustomerFilters,
  });
  const [sortKey, setSortKey] = useState<CustomerSortKey>("customerNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const [customerScope, setCustomerScope] = useState<"active" | "inactive">("active");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  useEffect(() => {
    setViewMode(tableOnly ? "table" : resolvedViewMode);
  }, [resolvedViewMode, tableOnly]);

  const effectiveCustomerScope = isAdmin ? customerScope : "active";

  const customersQueryParams = useMemo(() => {
    const params = new URLSearchParams({
      scope: effectiveCustomerScope,
      page: String(page),
      pageSize: String(DEFAULT_CUSTOMERS_PAGE_SIZE),
    });

    if (filters.lastName.trim().length > 0) params.set("lastName", filters.lastName.trim());
    if (filters.customerNumber.trim().length > 0) params.set("customerNumber", filters.customerNumber.trim());
    if (filters.tagIds.length > 0) params.set("tagIds", filters.tagIds.join(","));

    return params.toString();
  }, [effectiveCustomerScope, filters, page]);

  const { data, isLoading: customersLoading } = useQuery<CustomerListResponse>({
    queryKey: ["/api/customers/list", customersQueryParams],
    queryFn: async () => {
      const response = await fetch(`/api/customers/list?${customersQueryParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Kunden konnten nicht geladen werden");
      return (await response.json()) as CustomerListResponse;
    },
  });
  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const customers = data?.items ?? [];
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

  const customerRows = useMemo(() => {
    return customers.map((customer) => ({
      customer,
      relevantAppointment: customer.nextAppointmentStartDate
        ? {
            startDate: customer.nextAppointmentStartDate,
            startTimeHour: customer.nextAppointmentStartTimeHour,
          }
        : null,
    }));
  }, [customers]);

  const sortedCustomerRows = useMemo(() => {
    const rows = [...customerRows];
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      if (sortKey === "lastName") {
        return (a.customer.lastName ?? "").localeCompare(b.customer.lastName ?? "", "de") * directionMultiplier;
      }

      if (sortKey === "firstName") {
        return (a.customer.firstName ?? "").localeCompare(b.customer.firstName ?? "", "de") * directionMultiplier;
      }

      if (sortKey === "relevantAppointment") {
        const leftDate = a.relevantAppointment ? toAppointmentDateTime(a.relevantAppointment).getTime() : null;
        const rightDate = b.relevantAppointment ? toAppointmentDateTime(b.relevantAppointment).getTime() : null;

        if (leftDate == null && rightDate == null) return 0;
        if (leftDate == null) return 1;
        if (rightDate == null) return -1;

        return (leftDate - rightDate) * directionMultiplier;
      }

      return a.customer.customerNumber.localeCompare(b.customer.customerNumber, "de", { numeric: true }) * directionMultiplier;
    });

    return rows;
  }, [customerRows, sortDirection, sortKey]);

  const handleViewModeChange = (next: string) => {
    if (tableOnly) return;
    if (next !== "board" && next !== "table") return;
    if (next === viewMode) return;

    const nextMode = next as ViewMode;
    setViewMode(nextMode);

    void setSetting({
      key: settingsViewModeKey,
      scopeType: "USER",
      value: nextMode,
    }).catch(() => {
      setViewMode(resolvedViewMode);
    });
  };

  const handleSortToggle = (key: CustomerSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortHeader = (label: string, key: CustomerSortKey) => {
    const isActive = sortKey === key;
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs tracking-wide"
        onClick={() => handleSortToggle(key)}
      >
        <span>{label}</span>
        <SortIcon direction={isActive ? sortDirection : null} />
      </button>
    );
  };

  const tableColumns = useMemo<TableViewColumnDef<(typeof sortedCustomerRows)[number]>[]>(
    () => [
      {
        id: "customerNumber",
        header: renderSortHeader("Kundennummer", "customerNumber"),
        accessor: (row) => row.customer.customerNumber,
        minWidth: 150,
        cell: ({ row }) => <span>{row.customer.customerNumber}</span>,
      },
      {
        id: "lastName",
        header: renderSortHeader("Name", "lastName"),
        accessor: (row) => row.customer.lastName ?? "",
        minWidth: 150,
      },
      {
        id: "firstName",
        header: renderSortHeader("Vorname", "firstName"),
        accessor: (row) => row.customer.firstName ?? "",
        minWidth: 150,
      },
      {
        id: "phone",
        header: "Telefon",
        accessor: (row) => row.customer.phone,
        minWidth: 150,
      },
      {
        id: "email",
        header: "E-Mail",
        accessor: (row) => row.customer.email ?? "",
        minWidth: 200,
        cell: ({ row }) => <span>{row.customer.email || ""}</span>,
      },
      {
        id: "relevantAppointment",
        header: renderSortHeader("Nächster Termin", "relevantAppointment"),
        accessor: (row) => row.relevantAppointment?.startDate ?? "",
        minWidth: 220,
        cell: ({ row }) => <span>{formatAppointmentLabel(row.relevantAppointment)}</span>,
      },
    ],
    [sortDirection, sortKey],
  );

  const resolvedTitle = title ?? "Kunden";
  const totalPages = data?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;
  const hasActiveFilters =
    filters.lastName.trim().length > 0
    || filters.customerNumber.trim().length > 0
    || filters.tagIds.length > 0
    || (isAdmin && customerScope !== "active");
  const emptyState = hasActiveFilters ? (
    <ListEmptyState
      helpKey="customers.emptyFiltered"
      fallbackTitle="Keine Treffer gefunden."
      fallbackBody="Fuer die gewaehlte Filtereinstellung konnten keine Treffer ermittelt werden."
    />
  ) : (
    <ListEmptyState
      helpKey="customers.empty"
      fallbackTitle="Keine Kunden vorhanden."
      fallbackBody="Es sind aktuell keine Kunden in dieser Liste vorhanden."
    />
  );

  return (
    <>
      <ListLayout
        title={resolvedTitle}
        icon={<User className="w-5 h-5" />}
        viewModeKey={viewModeKey}
        helpKey="customers"
        isLoading={customersLoading}
        onClose={onCancel}
        showCloseButton={showCloseButton}
        closeTestId="button-close-customers"
        filterSlot={(
          <CustomerFilterPanel
            title="Kundenfilter"
            customerLastName={filters.lastName}
            onCustomerLastNameChange={(value) => setFilter("lastName", value)}
            onCustomerLastNameClear={() => setFilter("lastName", "")}
            customerNumber={filters.customerNumber}
            onCustomerNumberChange={(value) => setFilter("customerNumber", value)}
            onCustomerNumberClear={() => setFilter("customerNumber", "")}
            selectedTags={selectedTags}
            availableTags={unselectedTags}
            tagPickerOpen={tagPickerOpen}
            onTagPickerOpenChange={setTagPickerOpen}
            onAddTag={(tagId) => setFilter("tagIds", [...filters.tagIds, tagId])}
            onRemoveTag={(tagId) => setFilter("tagIds", filters.tagIds.filter((id) => id !== tagId))}
            customerScope={isAdmin ? customerScope : undefined}
            onCustomerScopeChange={isAdmin ? setCustomerScope : undefined}
          />
        )}
        viewModeToggle={tableOnly ? undefined : (
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewModeChange}
            variant="outline"
            size="sm"
            data-testid="toggle-customers-view-mode"
          >
            <ToggleGroupItem value="board" aria-label="Board-Ansicht" data-testid="toggle-customers-board">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Tabellen-Ansicht" data-testid="toggle-customers-table">
              <Table2 className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        footerSlot={(
          <div className="flex justify-between items-center gap-4">
            {onNewCustomer ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={onNewCustomer}
                  className="flex items-center gap-2"
                  data-testid="button-new-customer"
                >
                  <Plus className="w-4 h-4" />
                  Neuer Kunde
                </Button>
              </div>
            ) : <span />}

            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground" data-testid="text-customers-page-state">
                {data?.total ?? 0} Eintraege - Seite {totalPages === 0 ? 0 : page} von {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => canGoPrev && setPage((current) => current - 1)}
                  disabled={!canGoPrev}
                  data-testid="button-customers-page-prev"
                >
                  Zurueck
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => canGoNext && setPage((current) => current + 1)}
                  disabled={!canGoNext}
                  data-testid="button-customers-page-next"
                >
                  Weiter
                </Button>
              </div>
              {onCancel ? (
                <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-customers">
                  Schliessen
                </Button>
              ) : null}
            </div>
          </div>
        )}
        contentSlot={
          !tableOnly && viewMode === "board" ? (
            <BoardView
              gridTestId="list-customers"
              gridCols="3"
              isEmpty={customers.length === 0}
              emptyState={emptyState}
            >
              {customers.map((customer) => {
                const handleSelect = () => onSelectCustomer?.(customer.id);

                return (
                  <EntityCard
                    key={customer.id}
                    title={customer.fullName ?? "Ohne Name"}
                    icon={<User className="w-4 h-4" />}
                    headerMeta={<span>{`K-Nr. ${customer.customerNumber?.trim() || "-"}`}</span>}
                    headerColor={defaultHeaderColor}
                    testId={`customer-card-${customer.id}`}
                    onDoubleClick={handleSelect}
                    footer={(
                      <div className="flex w-full flex-col gap-2">
                        <div className="grid w-full grid-cols-[2fr_1fr] gap-2">
                          <AppointmentCountBadge
                            count={customer.plannedAppointmentsCount}
                            testId={`text-customer-planned-appointments-${customer.id}`}
                            fullWidth
                          />
                          {customer.notesCount > 0 ? (
                            <div
                              className="flex min-h-[32px] items-center justify-end px-1 text-[10px] font-semibold text-slate-700"
                              data-testid={`text-customer-notes-count-${customer.id}`}
                            >
                              <EntityNotesHoverPreview
                                sourceMode="single-parent"
                                sources={{ type: "customer", id: customer.id, count: customer.notesCount ?? 0 }}
                                triggerTestId={`text-customer-notes-count-${customer.id}`}
                              />
                            </div>
                          ) : null}
                        </div>
                        <EntityTagFooterRow tags={customer.tags} testId={`customer-card-tags-${customer.id}`} />
                      </div>
                    )}
                    footerVisibility="visible"
                  >
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {customer.company && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span className="font-medium">{customer.company}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{customer.phone}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{customer.postalCode} {customer.city}</span>
                      </div>
                    </div>
                  </EntityCard>
                );
              })}
            </BoardView>
          ) : (
            <TableView
              testId="table-customers"
              columns={tableColumns}
              rows={sortedCustomerRows}
              rowKey={(row) => row.customer.id}
              onRowDoubleClick={(row) => onSelectCustomer?.(row.customer.id)}
              rowPreviewRenderer={(row) => {
                if (!row.relevantAppointment) {
                  return (
                    <div className="rounded-md border border-border bg-card p-3">
                      Keine Termine geplant
                    </div>
                  );
                }

                return createAppointmentWeeklyPanelPreview({
                  id: row.customer.id,
                  startDate: row.relevantAppointment.startDate,
                  endDate: null,
                  startTime: row.relevantAppointment.startTimeHour == null ? null : `${String(row.relevantAppointment.startTimeHour).padStart(2, "0")}:00:00`,
                  projectId: null,
                  projectName: row.customer.fullName ?? "Kunde",
                  projectVersion: row.customer.version,
                  projectOrderNumber: null,
                  projectArticleItems: [],
                  projectDescription: null,
                  tourId: null,
                  tourName: null,
                  tourColor: null,
                  customer: {
                    id: row.customer.id,
                    customerNumber: row.customer.customerNumber,
                    fullName: row.customer.fullName,
                    addressLine1: row.customer.addressLine1,
                    addressLine2: row.customer.addressLine2,
                    postalCode: row.customer.postalCode,
                    city: row.customer.city,
                  },
                  employees: [],
                  customerNotesCount: row.customer.notesCount,
                  projectNotesCount: 0,
                  appointmentNotesCount: 0,
                  appointmentTags: [],
                  customerTags: row.customer.tags,
                  projectTags: [],
                  displayMode: "compact",
                  isLocked: false,
                  version: row.customer.version,
                }, { sizeProfile: "sidebarTable" });
              }}
              emptyState={emptyState}
              stickyHeader
            />
          )
        }
      />
    </>
  );
}
