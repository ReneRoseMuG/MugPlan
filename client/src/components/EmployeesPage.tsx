import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Upload,
  LayoutGrid,
  Table2,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmployeeFilterPanel } from "@/components/ui/filter-panels/employee-filter-panel";
import { EmployeeEntityCard } from "@/components/ui/entity-preview-cards";
import { EmployeeForm } from "@/components/EmployeeForm";
import { EmployeeImportPanel } from "@/components/ImportExportPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyEmployeeFilters, defaultEmployeeFilters } from "@/lib/employee-filters";
import { getBerlinTodayDateString, PROJECT_APPOINTMENTS_ALL_FROM_DATE } from "@/lib/project-appointments";
import { useSettings } from "@/hooks/useSettings";
import { useListFilters } from "@/hooks/useListFilters";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import type { AppointmentsListContext } from "@/components/AppointmentsListPage";
import { EmployeeTableHoverPreview } from "@/components/ui/table-hover-previews";
import type { Employee, Tag, Team } from "@shared/schema";
import type { EmployeeFilters } from "@/lib/employee-filters";

interface EmployeesPageProps {
  onClose?: () => void;
  onCancel?: () => void;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
  initialEmployeeId?: number | null;
  onEditingChange?: (isEditing: boolean) => void;
  filters?: EmployeeFilters;
  onFilterChange?: <K extends keyof EmployeeFilters>(key: K, value: EmployeeFilters[K]) => void;
  employeeScope?: EmployeeScope;
  onEmployeeScopeChange?: (scope: EmployeeScope) => void;
  sortKey?: EmployeeSortKey;
  onSortKeyChange?: (key: EmployeeSortKey) => void;
  sortDirection?: SortDirection;
  onSortDirectionChange?: (direction: SortDirection) => void;
}

type ViewMode = "board" | "table";
export type SortDirection = "asc" | "desc";
export type EmployeeSortKey = "lastName" | "firstName" | "team";
export type EmployeeScope = "active" | "inactive";
type EmployeeAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };
type EmployeeListItem = Employee & { tags: Tag[]; notesCount: number; attachmentsCount: number };

function parseViewMode(value: unknown): ViewMode {
  return value === "table" ? "table" : "board";
}

function toAppointmentDateTime(appointment: EmployeeAppointmentSummary): Date {
  const hour = appointment.startTimeHour ?? 23;
  const date = new Date(`${appointment.startDate}T00:00:00`);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function resolveRelevantAppointment(
  appointments: EmployeeAppointmentSummary[],
  berlinToday: string,
): EmployeeAppointmentSummary | null {
  if (appointments.length === 0) return null;

  const futureAppointments = appointments.filter((appointment) => appointment.startDate >= berlinToday);
  return [...futureAppointments]
    .sort((a, b) => toAppointmentDateTime(a).getTime() - toAppointmentDateTime(b).getTime())[0] ?? null;
}

function formatAppointmentLabel(appointment: EmployeeAppointmentSummary | null): string {
  if (!appointment) return "---";

  const date = new Date(`${appointment.startDate}T00:00:00`);
  const dateLabel = `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
  if (appointment.startTimeHour == null) return dateLabel;
  return `${dateLabel}, ${String(appointment.startTimeHour).padStart(2, "0")}:00`;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5" />;
  if (direction === "desc") return <ArrowDown className="w-3.5 h-3.5" />;
  return <ArrowUpDown className="w-3.5 h-3.5" />;
}

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
  return match?.[1] ?? null;
}

export function EmployeesPage({
  onClose,
  onCancel,
  onOpenAppointment,
  initialEmployeeId = null,
  onEditingChange,
  filters: controlledFilters,
  onFilterChange,
  employeeScope: controlledEmployeeScope,
  onEmployeeScopeChange,
  sortKey: controlledSortKey,
  onSortKeyChange,
  sortDirection: controlledSortDirection,
  onSortDirectionChange,
}: EmployeesPageProps) {
  const handleClose = onClose || onCancel;
  const { toast } = useToast();
  const { settingsByKey, setSetting } = useSettings();
  const viewModeKey = "employees";
  const settingsViewModeKey = `${viewModeKey}.viewMode`;
  const resolvedViewMode = parseViewMode(settingsByKey.get(settingsViewModeKey)?.resolvedValue);

  const [viewMode, setViewMode] = useState<ViewMode>(resolvedViewMode);
  const [internalEmployeeScope, setInternalEmployeeScope] = useState<EmployeeScope>("active");
  const internalListFilters = useListFilters<EmployeeFilters>({
    initialFilters: defaultEmployeeFilters,
  });
  const [internalSortKey, setInternalSortKey] = useState<EmployeeSortKey>("lastName");
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>("asc");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const berlinToday = getBerlinTodayDateString();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importResetSignal, setImportResetSignal] = useState(0);
  const filters = controlledFilters ?? internalListFilters.filters;
  const setFilter = onFilterChange ?? internalListFilters.setFilter;
  const employeeScope = controlledEmployeeScope ?? internalEmployeeScope;
  const setEmployeeScope = onEmployeeScopeChange ?? setInternalEmployeeScope;
  const sortKey = controlledSortKey ?? internalSortKey;
  const setSortKey = onSortKeyChange ?? setInternalSortKey;
  const sortDirection = controlledSortDirection ?? internalSortDirection;
  const setSortDirection = onSortDirectionChange ?? setInternalSortDirection;

  useEffect(() => {
    if (typeof initialEmployeeId !== "number") return;
    setSelectedEmployeeId(initialEmployeeId);
    setIsCreating(false);
  }, [initialEmployeeId]);

  useEffect(() => {
    onEditingChange?.(isCreating || selectedEmployeeId !== null);
  }, [isCreating, selectedEmployeeId, onEditingChange]);

  useEffect(() => {
    setViewMode(resolvedViewMode);
  }, [resolvedViewMode]);

  const effectiveEmployeeScope = isAdmin ? employeeScope : "active";

  const { data: employees = [], isLoading } = useQuery<EmployeeListItem[]>({
    queryKey: ["/api/employees", { scope: effectiveEmployeeScope }],
    queryFn: () => fetch(`/api/employees?scope=${effectiveEmployeeScope}`).then((response) => response.json()),
  });

  const { data: activeEmployees = [] } = useQuery<EmployeeListItem[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetch("/api/employees?scope=active").then((response) => response.json()),
    enabled: isAdmin,
  });

  const { data: inactiveEmployees = [] } = useQuery<EmployeeListItem[]>({
    queryKey: ["/api/employees", { scope: "inactive" }],
    queryFn: () => fetch("/api/employees?scope=inactive").then((response) => response.json()),
    enabled: isAdmin,
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const filteredEmployees = useMemo(
    () => applyEmployeeFilters(employees, filters),
    [employees, filters],
  );

  const filteredEmployeeIds = useMemo(
    () => filteredEmployees.map((employee) => employee.id),
    [filteredEmployees],
  );

  const filteredEmployeeIdsKey = useMemo(
    () => filteredEmployeeIds.join("-"),
    [filteredEmployeeIds],
  );

  const { data: appointmentsByEmployeeId = new Map<number, EmployeeAppointmentSummary[]>() } = useQuery({
    queryKey: ["employees-page-appointments", filteredEmployeeIdsKey, PROJECT_APPOINTMENTS_ALL_FROM_DATE, userRole],
    queryFn: async () => {
      const responses = await Promise.all(
        filteredEmployeeIds.map(async (employeeId) => {
          const response = await fetch(
            `/api/employees/${employeeId}/current-appointments?fromDate=${PROJECT_APPOINTMENTS_ALL_FROM_DATE}`,
            {
              credentials: "include",
              headers: {},
            },
          );
          if (!response.ok) throw new Error("Termine konnten nicht geladen werden");
          const payload = (await response.json()) as EmployeeAppointmentSummary[];
          return [employeeId, payload] as const;
        }),
      );

      return new Map<number, EmployeeAppointmentSummary[]>(responses);
    },
    enabled: filteredEmployeeIds.length > 0,
  });

  const allEmployees = useMemo(() => {
    if (!isAdmin) return employees;
    const byId = new Map<number, EmployeeListItem>();
    for (const employee of activeEmployees) byId.set(employee.id, employee);
    for (const employee of inactiveEmployees) byId.set(employee.id, employee);
    return Array.from(byId.values());
  }, [isAdmin, employees, activeEmployees, inactiveEmployees]);

  const teamMembersById = useMemo(() => {
    const result = new Map<number, { id: number; fullName: string }[]>();
    for (const employee of allEmployees) {
      if (!employee.teamId) continue;
      const current = result.get(employee.teamId) ?? [];
      current.push({ id: employee.id, fullName: employee.fullName });
      result.set(employee.teamId, current);
    }
    return result;
  }, [allEmployees]);

  const getTeamName = (teamId: number | null) => {
    if (!teamId) return null;
    const team = teams.find((entry) => entry.id === teamId);
    return team ? { id: team.id, name: team.name, color: team.color } : null;
  };

  const employeeRows = useMemo(() => {
    return filteredEmployees.map((employee) => {
      const appointments = appointmentsByEmployeeId.get(employee.id) ?? [];
      const appointmentsCount = appointments.length;
      return {
        employee,
        team: getTeamName(employee.teamId),
        relevantAppointment: resolveRelevantAppointment(appointments, berlinToday),
        appointmentsCount,
      };
    });
  }, [filteredEmployees, appointmentsByEmployeeId, berlinToday, teams]);

  const sortedEmployeeRows = useMemo(() => {
    const rows = [...employeeRows];
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      if (sortKey === "firstName") {
        return a.employee.firstName.localeCompare(b.employee.firstName, "de") * directionMultiplier;
      }

      if (sortKey === "team") {
        const left = a.team?.name ?? "";
        const right = b.team?.name ?? "";
        return left.localeCompare(right, "de") * directionMultiplier;
      }

      return a.employee.lastName.localeCompare(b.employee.lastName, "de") * directionMultiplier;
    });

    return rows;
  }, [employeeRows, sortDirection, sortKey]);

  const handleViewModeChange = (next: string) => {
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

  const handleSortToggle = (key: EmployeeSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortHeader = (label: string, key: EmployeeSortKey) => {
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

  const tableColumns = useMemo<TableViewColumnDef<(typeof sortedEmployeeRows)[number]>[]>(
    () => [
      {
        id: "lastName",
        header: renderSortHeader("Name", "lastName"),
        accessor: (row) => row.employee.lastName,
        minWidth: 140,
      },
      {
        id: "firstName",
        header: renderSortHeader("Vorname", "firstName"),
        accessor: (row) => row.employee.firstName,
        minWidth: 140,
      },
      {
        id: "phone",
        header: "Telefon",
        accessor: (row) => row.employee.phone ?? "",
        minWidth: 150,
      },
      {
        id: "team",
        header: renderSortHeader("Team", "team"),
        accessor: (row) => row.team?.name ?? "",
        minWidth: 140,
      },
      {
        id: "relevantAppointment",
        header: "Nächster Termin",
        accessor: (row) => row.relevantAppointment?.startDate ?? "",
        minWidth: 210,
        cell: ({ row }) => <span>{formatAppointmentLabel(row.relevantAppointment)}</span>,
      },
      {
        id: "appointmentsCount",
        header: "Alle Termine",
        accessor: (row) => row.appointmentsCount,
        align: "center",
        width: 140,
      },
    ],
    [sortDirection, sortKey],
  );

  const invalidateEmployees = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      },
    });
  };

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive, version }: { id: number; isActive: boolean; version: number }) => {
      return apiRequest("PATCH", `/api/employees/${id}/active`, { isActive, version });
    },
    onSuccess: () => {
      invalidateEmployees();
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({ title: "Aktiv-Status nicht möglich", description: "Mitarbeiter wurde zwischenzeitlich geändert. Bitte neu laden.", variant: "destructive" });
        return;
      }
      if (code === "FORBIDDEN") {
        toast({ title: "Aktiv-Status nicht möglich", description: "Nur Admin darf den Aktiv-Status ändern.", variant: "destructive" });
        return;
      }
      toast({ title: "Aktiv-Status konnte nicht geändert werden", variant: "destructive" });
    },
  });

  const handleToggleActive = (employee: Employee) => {
    if (!isAdmin) return;
    toggleActiveMutation.mutate({ id: employee.id, isActive: !employee.isActive, version: employee.version });
  };

  const handleOpenCreate = () => {
    setSelectedEmployeeId(null);
    setIsCreating(true);
  };

  const handleOpenDetail = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setIsCreating(false);
  };

  const openImportDialog = () => {
    setImportResetSignal((current) => current + 1);
    setIsImportDialogOpen(true);
  };

  const handleImportDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setImportResetSignal((current) => current + 1);
      setIsImportDialogOpen(true);
      return;
    }

    setIsImportDialogOpen(false);
    setImportResetSignal((current) => current + 1);
  };

  if (isCreating || selectedEmployeeId !== null) {
    return (
      <EmployeeForm
        employeeId={isCreating ? undefined : (selectedEmployeeId ?? undefined)}
        onCancel={() => {
          setSelectedEmployeeId(null);
          setIsCreating(false);
        }}
        onSaved={() => {
          setSelectedEmployeeId(null);
          setIsCreating(false);
        }}
        onOpenAppointment={onOpenAppointment}
      />
    );
  }

  const hasActiveFilters = filters.lastName.trim().length > 0 || (isAdmin && employeeScope !== "active");
  const emptyState = hasActiveFilters ? (
    <ListEmptyState
      helpKey="employees.emptyFiltered"
      fallbackTitle="Keine Treffer gefunden."
      fallbackBody="Für die gewählte Filtereinstellung konnten keine Treffer ermittelt werden."
    />
  ) : (
    <ListEmptyState
      helpKey="employees.empty"
      fallbackTitle="Keine Mitarbeiter vorhanden."
      fallbackBody="Es sind aktuell keine Mitarbeiter in dieser Liste vorhanden."
    />
  );
  const tableFooter = (
    <div className="flex flex-wrap items-center gap-2">
      {isAdmin && (
        <Button
          variant="outline"
          onClick={openImportDialog}
          className="flex items-center gap-2"
          data-testid="button-open-employee-import-dialog"
        >
          <Upload className="w-4 h-4" />
          Import
        </Button>
      )}
      <Button
        variant="outline"
        onClick={handleOpenCreate}
        className="flex items-center gap-2"
        data-testid="button-new-employee"
      >
        <Plus className="w-4 h-4" />
        Neuer Mitarbeiter
      </Button>
    </div>
  );
  const layoutFooter = viewMode === "board" ? tableFooter : undefined;

  return (
    <>
      <ListLayout
        title="Mitarbeiter"
        icon={<Users className="w-5 h-5" />}
        viewModeKey={viewModeKey}
        helpKey="employees"
        isLoading={isLoading}
        onClose={handleClose}
        closeTestId="button-close-employees"
        filterSlot={
          <EmployeeFilterPanel
            title="Mitarbeiterfilter"
            employeeLastName={filters.lastName}
            onEmployeeLastNameChange={(value) => setFilter("lastName", value)}
            onEmployeeLastNameClear={() => setFilter("lastName", "")}
            employeeFirstName={filters.firstName}
            onEmployeeFirstNameChange={(value) => setFilter("firstName", value)}
            onEmployeeFirstNameClear={() => setFilter("firstName", "")}
            employeeScope={isAdmin ? employeeScope : undefined}
            onEmployeeScopeChange={isAdmin ? setEmployeeScope : undefined}
          />
        }
        viewModeToggle={
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewModeChange}
            variant="outline"
            size="sm"
            data-testid="toggle-employees-view-mode"
          >
            <ToggleGroupItem value="board" aria-label="Board-Ansicht" data-testid="toggle-employees-board">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Tabellen-Ansicht" data-testid="toggle-employees-table">
              <Table2 className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        }
        footerSlot={layoutFooter}
        contentSlot={
          viewMode === "board" ? (
          <BoardView
            gridTestId="list-employees"
            gridCols="3"
            isEmpty={filteredEmployees.length === 0}
            emptyState={emptyState}
          >
            {filteredEmployees.map((employee) => {
              const teamInfo = getTeamName(employee.teamId);
              const appointments = appointmentsByEmployeeId.get(employee.id) ?? [];
              const currentAppointmentsCount = appointments.length;

              return (
                <EmployeeEntityCard
                  key={employee.id}
                  employee={{
                    id: employee.id,
                    fullName: employee.fullName,
                    phone: employee.phone,
                    email: employee.email,
                    isActive: employee.isActive,
                    notesCount: employee.notesCount ?? 0,
                    attachmentsCount: employee.attachmentsCount ?? 0,
                    tags: employee.tags ?? [],
                    appointmentsCount: currentAppointmentsCount,
                  }}
                  team={teamInfo ? { ...teamInfo, members: teamMembersById.get(teamInfo.id) ?? [] } : null}
                  tour={null}
                  onDoubleClick={() => handleOpenDetail(employee)}
                  actions={
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleActive(employee);
                      }}
                      disabled={!isAdmin}
                      data-testid={`button-toggle-employee-${employee.id}`}
                      title={isAdmin ? "Aktiv-Status umschalten" : "Aktivierung nur durch Administrator"}
                    >
                      {employee.isActive ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </Button>
                  }
                />
              );
            })}
          </BoardView>
          ) : (
            <TableView
              testId="table-employees"
              columns={tableColumns}
              rows={sortedEmployeeRows}
              rowKey={(row) => row.employee.id}
              onRowDoubleClick={(row) => handleOpenDetail(row.employee)}
              rowPreviewRenderer={(row) => (
                <EmployeeTableHoverPreview
                  employee={{
                    id: row.employee.id,
                    fullName: row.employee.fullName,
                    phone: row.employee.phone,
                    email: row.employee.email,
                    isActive: row.employee.isActive,
                    notesCount: row.employee.notesCount ?? 0,
                    attachmentsCount: row.employee.attachmentsCount ?? 0,
                    tags: row.employee.tags ?? [],
                    appointmentsCount: row.appointmentsCount,
                  }}
                  team={row.team ? { ...row.team, members: teamMembersById.get(row.team.id) ?? [] } : null}
                  tour={null}
                  onDoubleClick={() => handleOpenDetail(row.employee)}
                />
              )}
              emptyState={emptyState}
              footerSlot={tableFooter}
              stickyHeader
            />
          )
        }
      />

      <Dialog open={isImportDialogOpen} onOpenChange={handleImportDialogOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="employee-import-dialog">
          <DialogHeader>
            <DialogTitle>Mitarbeiter importieren</DialogTitle>
          </DialogHeader>
          <EmployeeImportPanel resetSignal={importResetSignal} />
        </DialogContent>
      </Dialog>
    </>
  );
}
