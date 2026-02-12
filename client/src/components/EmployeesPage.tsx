import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  Route,
  Phone,
  Mail,
  X,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmployeeFilterPanel } from "@/components/ui/filter-panels/employee-filter-panel";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";
import { EntityCard } from "@/components/ui/entity-card";
import { EntityEditDialog } from "@/components/ui/entity-edit-dialog";
import { EmployeeAppointmentsPanel } from "@/components/EmployeeAppointmentsPanel";
import { EmployeeAppointmentsTableDialog } from "@/components/EmployeeAppointmentsTableDialog";
import { EmployeeAttachmentsPanel } from "@/components/EmployeeAttachmentsPanel";
import { applyEmployeeFilters, defaultEmployeeFilters } from "@/lib/employee-filters";
import { getBerlinTodayDateString, PROJECT_APPOINTMENTS_ALL_FROM_DATE } from "@/lib/project-appointments";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { useSettings } from "@/hooks/useSettings";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import type { Employee, Team, Tour } from "@shared/schema";

interface EmployeeWithRelations {
  employee: Employee;
  team: Team | null;
  tour: Tour | null;
}

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

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

  if (futureAppointments.length > 0) {
    return [...futureAppointments]
      .sort((a, b) => toAppointmentDateTime(a).getTime() - toAppointmentDateTime(b).getTime())[0] ?? null;
  }

  return [...appointments]
    .sort((a, b) => toAppointmentDateTime(b).getTime() - toAppointmentDateTime(a).getTime())[0] ?? null;
}

function formatAppointmentLabel(appointment: EmployeeAppointmentSummary | null): string {
  if (!appointment) return "—";

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

export function EmployeesPage({ onClose, onCancel, onOpenAppointment }: EmployeesPageProps) {
  const handleClose = onClose || onCancel;
  const { settingsByKey, setSetting } = useSettings();
  const viewModeKey = "employees";
  const settingsViewModeKey = `${viewModeKey}.viewMode`;
  const resolvedViewMode = parseViewMode(settingsByKey.get(settingsViewModeKey)?.resolvedValue);

  const [viewMode, setViewMode] = useState<ViewMode>(resolvedViewMode);
  const [employeeScope, setEmployeeScope] = useState<"active" | "all">("active");
  const [filters, setFilters] = useState(defaultEmployeeFilters);
  const [sortKey, setSortKey] = useState<EmployeeSortKey>("lastName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const berlinToday = getBerlinTodayDateString();

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [employeeAppointmentsTableOpen, setEmployeeAppointmentsTableOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    setViewMode(resolvedViewMode);
  }, [resolvedViewMode]);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: employeeScope }],
    queryFn: () => fetch(`/api/employees?scope=${employeeScope}`).then((response) => response.json()),
  });

  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { scope: "all" }],
    queryFn: () => fetch("/api/employees?scope=all").then((response) => response.json()),
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: employeeDetails } = useQuery<EmployeeWithRelations>({
    queryKey: ["/api/employees", selectedEmployeeId],
    queryFn: () => fetch(`/api/employees/${selectedEmployeeId}`).then((response) => response.json()),
    enabled: !!selectedEmployeeId,
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
              headers: {
                "x-user-role": userRole,
              },
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
        header: "Relevanter Termin",
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
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      },
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone?: string; email?: string }) => {
      return apiRequest("POST", "/api/employees", data);
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { firstName?: string; lastName?: string; phone?: string | null; email?: string | null } }) => {
      return apiRequest("PUT", `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/employees/${id}/active`, { isActive });
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", phone: "", email: "" });
  };

  const handleOpenCreate = () => {
    setSelectedEmployeeId(null);
    setIsCreating(true);
    setEmployeeAppointmentsTableOpen(false);
    resetForm();
    setDetailDialogOpen(true);
  };

  const handleOpenDetail = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setIsCreating(false);
    setEmployeeAppointmentsTableOpen(false);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone || "",
      email: employee.email || "",
    });
    setDetailDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      throw new Error("validation");
    }

    if (isCreating) {
      await createMutation.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
    } else if (selectedEmployeeId) {
      await updateMutation.mutateAsync({
        id: selectedEmployeeId,
        data: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
        },
      });
    }
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setIsCreating(false);
    setEmployeeAppointmentsTableOpen(false);
    resetForm();
  };

  const handleToggleActive = (employee: Employee) => {
    toggleActiveMutation.mutate({ id: employee.id, isActive: !employee.isActive });
  };

  const displayEmployee = isCreating ? null : employeeDetails;

  const teamMembers = useMemo(() => {
    if (!displayEmployee?.team?.id) return [];
    return allEmployees
      .filter((employee) => employee.teamId === displayEmployee.team?.id)
      .map((employee) => ({ id: employee.id, fullName: employee.fullName }));
  }, [allEmployees, displayEmployee?.team?.id]);

  const tourMembers = useMemo(() => {
    if (!displayEmployee?.tour?.id) return [];
    return allEmployees
      .filter((employee) => employee.tourId === displayEmployee.tour?.id)
      .map((employee) => ({ id: employee.id, fullName: employee.fullName }));
  }, [allEmployees, displayEmployee?.tour?.id]);

  const dialogTitle = isCreating
    ? "Neuer Mitarbeiter"
    : (displayEmployee ? `${displayEmployee.employee.lastName}, ${displayEmployee.employee.firstName}` : "Mitarbeiter Details");

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
            onEmployeeLastNameChange={(value) => setFilters((prev) => ({ ...prev, lastName: value }))}
            onEmployeeLastNameClear={() => setFilters((prev) => ({ ...prev, lastName: "" }))}
            employeeScope={employeeScope}
            onEmployeeScopeChange={setEmployeeScope}
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
            disabled={createMutation.isPending}
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
                        disabled={true}
                        data-testid={`button-toggle-employee-${employee.id}`}
                        title="Aktivierung nur durch Administrator"
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

                return createAppointmentWeeklyPanelPreview(row.relevantAppointment).content;
              }}
              emptyState={<p className="text-sm text-slate-400 py-4">Keine Mitarbeiter vorhanden</p>}
              stickyHeader
            />
          )
        }
      />

      <EntityEditDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        title={dialogTitle}
        icon={Users}
        onSubmit={handleSubmit}
        onCancel={handleCloseDialog}
        isSaving={createMutation.isPending || updateMutation.isPending}
        saveDisabled={!formData.firstName.trim() || !formData.lastName.trim()}
        maxWidth="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col [&>button]:hidden"
        headerExtra={
          <Button
            size="lg"
            variant="ghost"
            onClick={handleCloseDialog}
            className="ml-auto"
            data-testid="button-close-employee-detail"
          >
            <X className="w-5 h-5" />
          </Button>
        }
        saveTestId="button-save-employee"
        cancelTestId="button-cancel-employee"
      >
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, firstName: event.target.value }))}
                    placeholder="Vorname..."
                    data-testid="input-employee-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, lastName: event.target.value }))}
                    placeholder="Nachname..."
                    data-testid="input-employee-lastname"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Telefon
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Telefonnummer..."
                    data-testid="input-employee-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    E-Mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="E-Mail-Adresse..."
                    data-testid="input-employee-email"
                  />
                </div>
              </div>

              {!isCreating && displayEmployee && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <input type="checkbox" checked={displayEmployee.employee.isActive} disabled={true} className="w-4 h-4 cursor-not-allowed" />
                  <Label className="text-muted-foreground text-sm">
                    Aktiv <span className="text-xs">(nur durch Administrator aenderbar)</span>
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <EmployeeAppointmentsPanel
                employeeId={selectedEmployeeId}
                employeeName={displayEmployee?.employee.fullName ?? null}
                onOpenEmployeeAppointmentsView={() => setEmployeeAppointmentsTableOpen(true)}
              />
              {!isCreating && <EmployeeAttachmentsPanel employeeId={selectedEmployeeId} />}

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                  <Route className="w-4 h-4" />
                  Tour
                </h4>
                {!isCreating && displayEmployee?.tour ? (
                  <TourInfoBadge
                    id={displayEmployee.tour.id}
                    name={displayEmployee.tour.name}
                    color={displayEmployee.tour.color}
                    members={tourMembers}
                    fullWidth
                    testId="badge-employee-tour"
                  />
                ) : (
                  <div className="px-3 py-2 border border-border bg-slate-50 rounded-md">
                    <p className="text-sm text-slate-400 italic">Keiner Tour zugewiesen</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4" />
                  Team
                </h4>
                {!isCreating && displayEmployee?.team ? (
                  <TeamInfoBadge
                    id={displayEmployee.team.id}
                    name={displayEmployee.team.name}
                    color={displayEmployee.team.color}
                    members={teamMembers}
                    fullWidth
                    testId="badge-employee-team"
                  />
                ) : (
                  <div className="px-3 py-2 border border-border bg-slate-50 rounded-md">
                    <p className="text-sm text-slate-400 italic">Keinem Team zugewiesen</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </EntityEditDialog>

      {employeeAppointmentsTableOpen && selectedEmployeeId ? (
        <EmployeeAppointmentsTableDialog
          open={employeeAppointmentsTableOpen}
          onOpenChange={setEmployeeAppointmentsTableOpen}
          employeeId={selectedEmployeeId}
          employeeName={displayEmployee?.employee.fullName ?? null}
          onOpenAppointment={onOpenAppointment}
        />
      ) : null}
    </>
  );
}
