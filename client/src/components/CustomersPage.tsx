import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CustomerFilterPanel } from "@/components/ui/filter-panels/customer-filter-panel";
import { CustomerEntityCard } from "@/components/ui/entity-preview-cards";
import { defaultCustomerFilters } from "@/lib/customer-filters";
import { useSettings } from "@/hooks/useSettings";
import { useListFilters } from "@/hooks/useListFilters";
import type { Customer, Tag } from "@shared/schema";
import { domainIcons } from "@/lib/domain-icons";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { formatListDateTime } from "@/lib/list-display-format";
import { CustomerTableHoverPreview } from "@/components/ui/table-hover-previews";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";
import type { CustomerFilters } from "@/lib/customer-filters";

type ViewMode = "board" | "table";
export type SortDirection = "asc" | "desc";
export type CustomerSortKey = "customerNumber" | "lastName" | "firstName" | "relevantAppointment";
export type CustomerScope = "active" | "inactive";

type CustomerListItem = Customer & {
  notesCount: number;
  appointmentsCount: number;
  nextAppointmentStartDate: string | null;
  nextAppointmentStartTimeHour: number | null;
  nextAppointmentId: number | null;
  tags: Tag[];
  historicalAppointments: Array<{
    id: number;
    startDate: string;
    startTime: string | null;
    orderNumber: string | null;
    projectName: string;
  }>;
  attachmentsCount: number;
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
  filters?: CustomerFilters;
  onFilterChange?: <K extends keyof CustomerFilters>(key: K, value: CustomerFilters[K]) => void;
  page?: number;
  onPageChange?: React.Dispatch<React.SetStateAction<number>>;
  customerScope?: CustomerScope;
  onCustomerScopeChange?: (scope: CustomerScope) => void;
  sortKey?: CustomerSortKey;
  onSortKeyChange?: (key: CustomerSortKey) => void;
  sortDirection?: SortDirection;
  onSortDirectionChange?: (direction: SortDirection) => void;
}

function parseViewMode(value: unknown): ViewMode {
  return value === "table" ? "table" : "board";
}

function toAppointmentDateTime(appointment: { startDate: string; startTimeHour: number | null }): string {
  return `${appointment.startDate}|${String(appointment.startTimeHour ?? 99).padStart(2, "0")}`;
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
  filters: controlledFilters,
  onFilterChange,
  page: controlledPage,
  onPageChange,
  customerScope: controlledCustomerScope,
  onCustomerScopeChange,
  sortKey: controlledSortKey,
  onSortKeyChange,
  sortDirection: controlledSortDirection,
  onSortDirectionChange,
}: CustomersPageProps) {
  const { settingsByKey, setSetting } = useSettings();
  const viewModeKey = "customers";
  const settingsViewModeKey = `${viewModeKey}.viewMode`;
  const resolvedViewMode = parseViewMode(settingsByKey.get(settingsViewModeKey)?.resolvedValue);

  const [viewMode, setViewMode] = useState<ViewMode>(tableOnly ? "table" : resolvedViewMode);
  const internalListFilters = useListFilters<CustomerFilters>({
    initialFilters: defaultCustomerFilters,
  });
  const [internalSortKey, setInternalSortKey] = useState<CustomerSortKey>("customerNumber");
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>("asc");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const [internalCustomerScope, setInternalCustomerScope] = useState<CustomerScope>("active");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const filters = controlledFilters ?? internalListFilters.filters;
  const setFilter = onFilterChange ?? internalListFilters.setFilter;
  const page = controlledPage ?? internalListFilters.page;
  const setPage = onPageChange ?? internalListFilters.setPage;
  const customerScope = controlledCustomerScope ?? internalCustomerScope;
  const setCustomerScope = onCustomerScopeChange ?? setInternalCustomerScope;
  const sortKey = controlledSortKey ?? internalSortKey;
  const setSortKey = onSortKeyChange ?? setInternalSortKey;
  const sortDirection = controlledSortDirection ?? internalSortDirection;
  const setSortDirection = onSortDirectionChange ?? setInternalSortDirection;

  useEffect(() => {
    setViewMode(tableOnly ? "table" : resolvedViewMode);
  }, [resolvedViewMode, tableOnly]);

  const effectiveCustomerScope: CustomerScope = isAdmin ? customerScope : "active";

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
    placeholderData: keepPreviousData,
  });
  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("customer"),
    queryFn: () => fetchTagCatalog("customer"),
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
            id: customer.nextAppointmentId,
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
        const leftDate = a.relevantAppointment ? toAppointmentDateTime(a.relevantAppointment) : null;
        const rightDate = b.relevantAppointment ? toAppointmentDateTime(b.relevantAppointment) : null;

        if (leftDate == null && rightDate == null) return 0;
        if (leftDate == null) return 1;
        if (rightDate == null) return -1;

        return leftDate.localeCompare(rightDate, "de") * directionMultiplier;
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
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
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
        header: renderSortHeader("Kund Nr.", "customerNumber"),
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
        header: renderSortHeader("Naechster Termin", "relevantAppointment"),
        accessor: (row) => row.relevantAppointment?.startDate ?? "",
        minWidth: 180,
        cell: ({ row }) => (
          <span>
            {formatListDateTime({
              startDate: row.relevantAppointment?.startDate,
              startTimeHour: row.relevantAppointment?.startTimeHour,
            })}
          </span>
        ),
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

  const CustomersIcon = domainIcons.customers;
  const tableFooter = (
    <ListPagingFooter
      summaryText={`${data?.total ?? 0} Einträge`}
      page={page}
      totalPages={totalPages}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      onPrev={() => canGoPrev && setPage((current) => current - 1)}
      onNext={() => canGoNext && setPage((current) => current + 1)}
      prevTestId="button-customers-page-prev"
      nextTestId="button-customers-page-next"
      stateTestId="text-customers-page-state"
      leadingSlot={onNewCustomer ? (
        <Button
          variant="outline"
          onClick={onNewCustomer}
          className="flex items-center gap-2"
          data-testid="button-new-customer"
        >
          <Plus className="w-4 h-4" />
          Neuer Kunde
        </Button>
      ) : undefined}
      trailingSlot={onCancel ? (
        <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-customers">
          Schliessen
        </Button>
      ) : undefined}
    />
  );
  const layoutFooter = tableFooter;

  return (
    <>
      <ListLayout
        title={resolvedTitle}
        icon={<CustomersIcon className="w-5 h-5" />}
        viewModeKey={viewModeKey}
        helpKey="customers"
        isLoading={customersLoading && data === undefined}
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
        footerSlot={layoutFooter}
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
                  <CustomerEntityCard
                    key={customer.id}
                    customer={customer}
                    onDoubleClick={handleSelect}
                  />
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
              rowPreviewRenderer={(row) => (
                <CustomerTableHoverPreview
                  customer={{
                    ...row.customer,
                    tags: row.customer.tags ?? [],
                  }}
                  onDoubleClick={() => onSelectCustomer?.(row.customer.id)}
                />
              )}
              emptyState={emptyState}
              stickyHeader
            />
          )
        }
      />
    </>
  );
}
