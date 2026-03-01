import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Users,
  Phone,
  Mail,
  Plus,
  LayoutGrid,
  Table2,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmployeeFilterPanel } from "@/components/ui/filter-panels/employee-filter-panel";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";
import { EntityCard } from "@/components/ui/entity-card";
import { EmployeeForm } from "@/components/EmployeeForm";
import { applyEmployeeFilters, defaultEmployeeFilters } from "@/lib/employee-filters";
import { getBerlinTodayDateString, PROJECT_APPOINTMENTS_ALL_FROM_DATE } from "@/lib/project-appointments";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { useSettings } from "@/hooks/useSettings";
import { useListFilters } from "@/hooks/useListFilters";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import type { Employee, Team, Tour } from "@shared/schema";

interface EmployeesPageProps {
  onClose?: () => void;
  onCancel?: () => void;
  onOpenAppointment?: (appointmentId: number) => void;
}

type ViewMode = "board" | "table";
type SortDirection = "asc" | "desc";
type EmployeeSortKey = "lastName" | "firstName" | "tour" | "team";
type EmployeeAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

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

export function EmployeesPage({ onClose, onCancel, onOpenAppointment }: EmployeesPageProps) {
  const handleClose = onClose || onCancel;
  const { toast } = useToast();
  const { settingsByKey, setSetting } = useSettings();
  const viewModeKey = "employees";
  const settingsViewModeKey = `${viewModeKey}.viewMode`;
  const resolvedViewMode = parseViewMode(settingsByKey.get(settingsViewModeKey)?.resolvedValue);

  const [viewMode, setViewMode] = useState<ViewMode>(resolvedViewMode);
  const [employeeScope, setEmployeeScope] = useState<"active" | "inactive">("active");
  const { filters, setFilter } = useListFilters({
    initialFilters: defaultEmployeeFilters,
  });
  const [sortKey, setSortKey] = useState<EmployeeSortKey>("lastName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const berlinToday = getBerlinTodayDateString();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setViewMode(resolvedViewMode);
  }, [resolvedViewMode]);

  const effectiveEmployeeScope = isAdmin ? employeeScope : "active";

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: effectiveEmployeeScope }],
    queryFn: () => fetch(`/api/employees?scope=${effectiveEmployeeScope}`).then((response) => response.json()),
  });

  const { data: activeEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "active" }],
    queryFn: () => fetch("/api/employees?scope=active").then((response) => response.json()),
    enabled: isAdmin,
  });

  const { data: inactiveEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "inactive" }],
    queryFn: () => fetch("/api/employees?scope=inactive").then((response) => response.json()),
    enabled: isAdmin,
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
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
    const byId = new Map<number, Employee>();
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

  const tourMembersById = useMemo(() => {
    const result = new Map<number, { id: number; fullName: string }[]>();
    for (const employee of allEmployees) {
      if (!employee.tourId) continue;
      const current = result.get(employee.tourId) ?? [];
      current.push({ id: employee.id, fullName: employee.fullName });
      result.set(employee.tourId, current);
    }
    return result;
  }, [allEmployees]);

  const getTourName = (tourId: number | null) => {
    if (!tourId) return null;
    const tour = tours.find((entry) => entry.id === tourId);
    return tour ? { id: tour.id, name: tour.name, color: tour.color } : null;
  };

  const getTeamName = (teamId: number | null) => {
    if (!teamId) return null;
    const team = teams.find((entry) => entry.id === teamId);
    return team ? { id: team.id, name: team.name, color: team.color } : null;
  };

  const employeeRows = useMemo(() => {
    return filteredEmployees.map((employee) => {
      const appointments = appointmentsByEmployeeId.get(employee.id) ?? [];
      const plannedAppointmentsCount = appointments.filter((appointment) => appointment.startDate >= berlinToday).length;
      return {
        employee,
        tour: getTourName(employee.tourId),
        team: getTeamName(employee.teamId),
        relevantAppointment: resolveRelevantAppointment(appointments, berlinToday),
        plannedAppointmentsCount,
      };
    });
  }, [filteredEmployees, appointmentsByEmployeeId, berlinToday, tours, teams]);

  const sortedEmployeeRows = useMemo(() => {
    const rows = [...employeeRows];
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      if (sortKey === "firstName") {
        return a.employee.firstName.localeCompare(b.employee.firstName, "de") * directionMultiplier;
      }

      if (sortKey === "tour") {
        const left = a.tour?.name ?? "";
        const right = b.tour?.name ?? "";
        return left.localeCompare(right, "de") * directionMultiplier;
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
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
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
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wide"
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
        id: "tour",
        header: renderSortHeader("Tour", "tour"),
        accessor: (row) => row.tour?.name ?? "",
        minWidth: 140,
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
        id: "plannedAppointmentsCount",
        header: "Geplante Termine",
        accessor: (row) => row.plannedAppointmentsCount,
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
        toast({ title: "Aktiv-Status nicht moeglich", description: "Mitarbeiter wurde zwischenzeitlich geaendert. Bitte neu laden.", variant: "destructive" });
        return;
      }
      if (code === "FORBIDDEN") {
        toast({ title: "Aktiv-Status nicht moeglich", description: "Nur Admin darf den Aktiv-Status aendern.", variant: "destructive" });
        return;
      }
      toast({ title: "Aktiv-Status konnte nicht geaendert werden", variant: "destructive" });
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

  return (
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
      footerSlot={
        <Button
          variant="outline"
          onClick={handleOpenCreate}
          className="flex items-center gap-2"
          data-testid="button-new-employee"
        >
          <Plus className="w-4 h-4" />
          Neuer Mitarbeiter
        </Button>
      }
      contentSlot={
        viewMode === "board" ? (
          <BoardView
            gridTestId="list-employees"
            gridCols="3"
            isEmpty={filteredEmployees.length === 0}
            emptyState={
              <p className="text-sm text-slate-400 text-center py-8 col-span-full">
                Keine Mitarbeiter vorhanden
              </p>
            }
          >
            {filteredEmployees.map((employee) => {
              const tourInfo = getTourName(employee.tourId);
              const teamInfo = getTeamName(employee.teamId);

              return (
                <EntityCard
                  key={employee.id}
                  testId={`employee-card-${employee.id}`}
                  title={employee.fullName}
                  icon={<Users className="w-4 h-4" />}
                  className={!employee.isActive ? "opacity-60" : ""}
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
                  footer={
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenDetail(employee);
                      }}
                      data-testid={`button-edit-employee-${employee.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  }
                >
                  <div className="space-y-2 text-sm">
                    {employee.phone && (
                      <div className="flex items-center gap-1 text-slate-600" data-testid={`text-employee-phone-${employee.id}`}>
                        <Phone className="w-3 h-3" />
                        {employee.phone}
                      </div>
                    )}
                    {employee.email && (
                      <div className="flex items-center gap-1 text-slate-600" data-testid={`text-employee-email-${employee.id}`}>
                        <Mail className="w-3 h-3" />
                        {employee.email}
                      </div>
                    )}
                    {(tourInfo || teamInfo || !employee.isActive) && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {tourInfo && (
                          <TourInfoBadge
                            id={tourInfo.id}
                            name={tourInfo.name}
                            color={tourInfo.color}
                            members={tourMembersById.get(tourInfo.id) ?? []}
                            size="sm"
                            testId={`badge-employee-tour-${employee.id}`}
                          />
                        )}
                        {teamInfo && (
                          <TeamInfoBadge
                            id={teamInfo.id}
                            name={teamInfo.name}
                            color={teamInfo.color}
                            members={teamMembersById.get(teamInfo.id) ?? []}
                            size="sm"
                            testId={`badge-employee-team-${employee.id}`}
                          />
                        )}
                        {!employee.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inaktiv
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </EntityCard>
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
            rowPreviewRenderer={(row) => {
              if (!row.relevantAppointment) {
                return (
                  <div className="rounded-md border border-border bg-card p-3">
                    Keine Termine geplant
                  </div>
                );
              }

              return createAppointmentWeeklyPanelPreview(row.relevantAppointment, { sizeProfile: "sidebarTable" });
            }}
            emptyState={<p className="text-sm text-slate-400 py-4">Keine Mitarbeiter vorhanden</p>}
            stickyHeader
          />
        )
      }
    />
  );
}
