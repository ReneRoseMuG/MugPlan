import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Phone, MapPin, Building2, Pencil, Mail, Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityCard } from "@/components/ui/entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CustomerFilterPanel } from "@/components/ui/filter-panels/customer-filter-panel";
import { defaultHeaderColor } from "@/lib/colors";
import { applyCustomerFilters, defaultCustomerFilters } from "@/lib/customer-filters";
import { getBerlinTodayDateString, PROJECT_APPOINTMENTS_ALL_FROM_DATE } from "@/lib/project-appointments";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { useSettings } from "@/hooks/useSettings";
import { useListFilters } from "@/hooks/useListFilters";
import type { Customer, Project } from "@shared/schema";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type ViewMode = "board" | "table";
type SortDirection = "asc" | "desc";
type CustomerSortKey = "customerNumber" | "lastName" | "firstName" | "relevantAppointment";

type CustomerAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

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

function toAppointmentDateTime(appointment: CustomerAppointmentSummary): Date {
  const hour = appointment.startTimeHour ?? 23;
  const date = new Date(`${appointment.startDate}T00:00:00`);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function resolveRelevantAppointment(
  appointments: CustomerAppointmentSummary[],
  berlinToday: string,
): CustomerAppointmentSummary | null {
  if (appointments.length === 0) return null;

  const futureAppointments = appointments.filter((appointment) => appointment.startDate >= berlinToday);

  return [...futureAppointments]
    .sort((a, b) => toAppointmentDateTime(a).getTime() - toAppointmentDateTime(b).getTime())[0] ?? null;
}

function formatAppointmentLabel(appointment: CustomerAppointmentSummary | null): string {
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
  const { filters, setFilter } = useListFilters({
    initialFilters: defaultCustomerFilters,
  });
  const [sortKey, setSortKey] = useState<CustomerSortKey>("customerNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const berlinToday = getBerlinTodayDateString();

  useEffect(() => {
    setViewMode(tableOnly ? "table" : resolvedViewMode);
  }, [resolvedViewMode, tableOnly]);

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects?filter=all&scope=all"],
  });

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.isActive),
    [customers],
  );

  const filteredCustomers = useMemo(
    () => applyCustomerFilters(activeCustomers, filters),
    [activeCustomers, filters],
  );

  const filteredCustomerIds = useMemo(
    () => new Set(filteredCustomers.map((customer) => customer.id)),
    [filteredCustomers],
  );

  const relevantProjects = useMemo(
    () => projects.filter((project) => filteredCustomerIds.has(project.customerId)),
    [projects, filteredCustomerIds],
  );

  const relevantProjectIds = useMemo(
    () => relevantProjects.map((project) => project.id),
    [relevantProjects],
  );

  const relevantProjectIdsKey = useMemo(
    () => relevantProjectIds.join("-"),
    [relevantProjectIds],
  );

  const { data: appointmentsByCustomerId = new Map<number, CustomerAppointmentSummary[]>() } = useQuery({
    queryKey: ["customers-page-appointments", relevantProjectIdsKey, PROJECT_APPOINTMENTS_ALL_FROM_DATE, userRole],
    queryFn: async () => {
      const responses = await Promise.all(
        relevantProjects.map(async (project) => {
          const response = await fetch(
            `/api/projects/${project.id}/appointments?fromDate=${PROJECT_APPOINTMENTS_ALL_FROM_DATE}`,
            {
              credentials: "include",
              headers: {
              },
            },
          );
          if (!response.ok) throw new Error("Termine konnten nicht geladen werden");
          const payload = (await response.json()) as CustomerAppointmentSummary[];
          return { customerId: project.customerId, appointments: payload };
        }),
      );

      const byCustomer = new Map<number, CustomerAppointmentSummary[]>();
      for (const entry of responses) {
        const current = byCustomer.get(entry.customerId) ?? [];
        current.push(...entry.appointments);
        byCustomer.set(entry.customerId, current);
      }

      return byCustomer;
    },
    enabled: relevantProjects.length > 0,
  });

  const customerRows = useMemo(() => {
    return filteredCustomers.map((customer) => ({
      customer,
      relevantAppointment: resolveRelevantAppointment(appointmentsByCustomerId.get(customer.id) ?? [], berlinToday),
    }));
  }, [filteredCustomers, appointmentsByCustomerId, berlinToday]);

  const sortedCustomerRows = useMemo(() => {
    const rows = [...customerRows];
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      if (sortKey === "lastName") {
        return a.customer.lastName.localeCompare(b.customer.lastName, "de") * directionMultiplier;
      }

      if (sortKey === "firstName") {
        return a.customer.firstName.localeCompare(b.customer.firstName, "de") * directionMultiplier;
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
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wide"
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
        cell: ({ row }) => <span className="font-mono">{row.customer.customerNumber}</span>,
      },
      {
        id: "lastName",
        header: renderSortHeader("Name", "lastName"),
        accessor: (row) => row.customer.lastName,
        minWidth: 150,
      },
      {
        id: "firstName",
        header: renderSortHeader("Vorname", "firstName"),
        accessor: (row) => row.customer.firstName,
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

  return (
    <ListLayout
      title={resolvedTitle}
      icon={<User className="w-5 h-5" />}
      viewModeKey={viewModeKey}
      helpKey="customers"
      isLoading={customersLoading}
      onClose={onCancel}
      showCloseButton={showCloseButton}
      closeTestId="button-close-customers"
      filterSlot={
        <CustomerFilterPanel
          title="Kundenfilter"
          customerLastName={filters.lastName}
          onCustomerLastNameChange={(value) => setFilter("lastName", value)}
          onCustomerLastNameClear={() => setFilter("lastName", "")}
          customerNumber={filters.customerNumber}
          onCustomerNumberChange={(value) => setFilter("customerNumber", value)}
          onCustomerNumberClear={() => setFilter("customerNumber", "")}
        />
      }
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
      footerSlot={
        <div className="flex justify-between items-center">
          {onNewCustomer ? (
            <Button
              variant="outline"
              onClick={onNewCustomer}
              className="flex items-center gap-2"
              data-testid="button-new-customer"
            >
              <Plus className="w-4 h-4" />
              Neuer Kunde
            </Button>
          ) : <span />}

          {onCancel ? (
            <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-customers">
              Schliessen
            </Button>
          ) : null}
        </div>
      }
      contentSlot={
        !tableOnly && viewMode === "board" ? (
          <BoardView
            gridTestId="list-customers"
            gridCols="3"
            isEmpty={filteredCustomers.length === 0}
            emptyState={
              <p className="text-sm text-slate-400 text-center py-8 col-span-full">
                Keine Kunden gefunden.
              </p>
            }
          >
            {filteredCustomers.map((customer) => {
              const handleSelect = () => onSelectCustomer?.(customer.id);

              return (
                <EntityCard
                  key={customer.id}
                  title={customer.fullName}
                  icon={<User className="w-4 h-4" />}
                  headerColor={defaultHeaderColor}
                  testId={`customer-card-${customer.id}`}
                  onDoubleClick={handleSelect}
                  footer={
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect();
                      }}
                      data-testid={`button-edit-customer-${customer.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  }
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

              return createAppointmentWeeklyPanelPreview(row.relevantAppointment).content;
            }}
            emptyState={<p className="text-sm text-slate-400 py-4">Keine Kunden gefunden.</p>}
            stickyHeader
          />
        )
      }
    />
  );
}
