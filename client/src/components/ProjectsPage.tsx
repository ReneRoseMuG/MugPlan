import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, MapPin, Pencil, User, Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProjectFilterPanel } from "@/components/ui/filter-panels/project-filter-panel";
import { defaultHeaderColor } from "@/lib/colors";
import { applyProjectFilters, buildProjectFilterQueryParams, defaultProjectFilters } from "@/lib/project-filters";
import { getBerlinTodayDateString, PROJECT_APPOINTMENTS_ALL_FROM_DATE } from "@/lib/project-appointments";
import { useSettings } from "@/hooks/useSettings";
import type { Project, Customer, ProjectStatus } from "@shared/schema";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import type { ProjectFilters, ProjectScope } from "@/lib/project-filters";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type ViewMode = "board" | "table";
type SortDirection = "asc" | "desc";
type ProjectSortKey = "title" | "customer";

type ProjectAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

interface ProjectsPageProps {
  onCancel?: () => void;
  onNewProject?: () => void;
  onSelectProject?: (id: number) => void;
  title?: string;
  showCloseButton?: boolean;
  tableOnly?: boolean;
}

function parseViewMode(value: unknown): ViewMode {
  return value === "table" ? "table" : "board";
}

function toAppointmentDateTime(appointment: ProjectAppointmentSummary): Date {
  const hour = appointment.startTimeHour ?? 23;
  const date = new Date(`${appointment.startDate}T00:00:00`);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function resolveRelevantAppointment(
  appointments: ProjectAppointmentSummary[],
  berlinToday: string,
): ProjectAppointmentSummary | null {
  if (appointments.length === 0) return null;

  const futureAppointments = appointments.filter((appointment) => appointment.startDate >= berlinToday);

  if (futureAppointments.length > 0) {
    return [...futureAppointments].sort((a, b) => toAppointmentDateTime(a).getTime() - toAppointmentDateTime(b).getTime())[0] ?? null;
  }

  return [...appointments].sort((a, b) => toAppointmentDateTime(b).getTime() - toAppointmentDateTime(a).getTime())[0] ?? null;
}

function formatAppointmentLabel(appointment: ProjectAppointmentSummary | null): string {
  if (!appointment) return "—";

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

export function ProjectsPage({
  onCancel,
  onNewProject,
  onSelectProject,
  title,
  showCloseButton = true,
  tableOnly = false,
}: ProjectsPageProps) {
  const { settingsByKey, setSetting } = useSettings();
  const viewModeKey = "projects";
  const settingsViewModeKey = `${viewModeKey}.viewMode`;
  const resolvedViewMode = parseViewMode(settingsByKey.get(settingsViewModeKey)?.resolvedValue);

  const [viewMode, setViewMode] = useState<ViewMode>(tableOnly ? "table" : resolvedViewMode);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>(defaultProjectFilters);
  const [projectScope, setProjectScope] = useState<ProjectScope>("upcoming");
  const [sortKey, setSortKey] = useState<ProjectSortKey>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const berlinToday = getBerlinTodayDateString();

  useEffect(() => {
    setViewMode(tableOnly ? "table" : resolvedViewMode);
  }, [resolvedViewMode, tableOnly]);

  const projectQueryParams = useMemo(
    () => buildProjectFilterQueryParams(filters, projectScope),
    [filters, projectScope],
  );
  const projectQueryKey = useMemo(
    () => (projectQueryParams ? `/api/projects?${projectQueryParams}` : "/api/projects"),
    [projectQueryParams],
  );

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: [projectQueryKey],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: projectStatuses = [] } = useQuery<ProjectStatus[]>({
    queryKey: ["/api/project-status"],
  });

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer] as const)),
    [customers],
  );

  const activeProjects = useMemo(
    () => projects.filter((project) => project.isActive),
    [projects],
  );

  const filteredProjects = useMemo(
    () => applyProjectFilters(activeProjects, filters, customersById),
    [activeProjects, filters, customersById],
  );

  const filteredProjectIds = useMemo(
    () => filteredProjects.map((project) => project.id),
    [filteredProjects],
  );
  const filteredProjectIdsKey = useMemo(
    () => filteredProjectIds.join("-"),
    [filteredProjectIds],
  );

  const { data: appointmentsByProjectId = new Map<number, ProjectAppointmentSummary[]>() } = useQuery({
    queryKey: ["projects-page-appointments", filteredProjectIdsKey, PROJECT_APPOINTMENTS_ALL_FROM_DATE, userRole],
    queryFn: async () => {
      const responses = await Promise.all(
        filteredProjectIds.map(async (projectId) => {
          const response = await fetch(
            `/api/projects/${projectId}/appointments?fromDate=${PROJECT_APPOINTMENTS_ALL_FROM_DATE}`,
            {
              credentials: "include",
              headers: {
                "x-user-role": userRole,
              },
            },
          );
          if (!response.ok) throw new Error("Termine konnten nicht geladen werden");
          const payload = (await response.json()) as ProjectAppointmentSummary[];
          return [projectId, payload] as const;
        }),
      );

      return new Map<number, ProjectAppointmentSummary[]>(responses);
    },
    enabled: filteredProjectIds.length > 0,
  });

  const selectedStatusIds = useMemo(
    () => new Set(filters.statusIds),
    [filters.statusIds],
  );

  const selectedStatuses = useMemo(
    () => filters.statusIds
      .map((id) => projectStatuses.find((status) => status.id === id))
      .filter((status): status is ProjectStatus => Boolean(status)),
    [filters.statusIds, projectStatuses],
  );

  const availableStatuses = useMemo(
    () => projectStatuses.filter((status) => status.isActive && !selectedStatusIds.has(status.id)),
    [projectStatuses, selectedStatusIds],
  );

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

  const handleSortToggle = (key: ProjectSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const renderSortHeader = (label: string, key: ProjectSortKey) => {
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

  const projectRows = useMemo(() => {
    return filteredProjects.map((project) => {
      const customer = customersById.get(project.customerId);
      const relevantAppointment = resolveRelevantAppointment(
        appointmentsByProjectId.get(project.id) ?? [],
        berlinToday,
      );

      return {
        project,
        customer,
        relevantAppointment,
      };
    });
  }, [filteredProjects, customersById, appointmentsByProjectId, berlinToday]);

  const sortedProjectRows = useMemo(() => {
    const rows = [...projectRows];
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      if (sortKey === "customer") {
        const left = a.customer?.fullName ?? "";
        const right = b.customer?.fullName ?? "";
        return left.localeCompare(right, "de") * directionMultiplier;
      }

      return a.project.name.localeCompare(b.project.name, "de") * directionMultiplier;
    });

    return rows;
  }, [projectRows, sortDirection, sortKey]);

  const tableColumns = useMemo<TableViewColumnDef<(typeof sortedProjectRows)[number]>[]>(
    () => [
      {
        id: "title",
        header: renderSortHeader("Titel", "title"),
        accessor: (row) => row.project.name,
        minWidth: 220,
        cell: ({ row }) => <span className="font-medium">{row.project.name}</span>,
      },
      {
        id: "customer",
        header: renderSortHeader("Kunde", "customer"),
        accessor: (row) => row.customer?.fullName ?? "",
        minWidth: 220,
        cell: ({ row }) => (
          <span>
            {row.customer ? `${row.customer.fullName} (K: ${row.customer.customerNumber})` : "—"}
          </span>
        ),
      },
      {
        id: "relevantAppointment",
        header: "Relevanter Termin",
        accessor: (row) => row.relevantAppointment?.startDate ?? "",
        minWidth: 220,
        cell: ({ row }) => <span>{formatAppointmentLabel(row.relevantAppointment)}</span>,
      },
    ],
    [sortDirection, sortKey],
  );

  const resolvedTitle = title ?? "Projekte";

  return (
    <ListLayout
      title={resolvedTitle}
      icon={<FolderKanban className="w-5 h-5" />}
      viewModeKey={viewModeKey}
      helpKey="projects"
      isLoading={projectsLoading}
      onClose={onCancel}
      showCloseButton={showCloseButton}
      closeTestId="button-close-projects"
      filterSlot={
        <ProjectFilterPanel
          title="Projektfilter"
          projectTitle={filters.title}
          onProjectTitleChange={(value) => setFilters((prev) => ({ ...prev, title: value }))}
          onProjectTitleClear={() => setFilters((prev) => ({ ...prev, title: "" }))}
          customerLastName={filters.customerLastName}
          onCustomerLastNameChange={(value) => setFilters((prev) => ({ ...prev, customerLastName: value }))}
          onCustomerLastNameClear={() => setFilters((prev) => ({ ...prev, customerLastName: "" }))}
          customerNumber={filters.customerNumber}
          onCustomerNumberChange={(value) => setFilters((prev) => ({ ...prev, customerNumber: value }))}
          onCustomerNumberClear={() => setFilters((prev) => ({ ...prev, customerNumber: "" }))}
          selectedStatuses={selectedStatuses}
          availableStatuses={availableStatuses}
          statusPickerOpen={statusPickerOpen}
          onStatusPickerOpenChange={setStatusPickerOpen}
          onAddStatus={(statusId) => setFilters((prev) => ({
            ...prev,
            statusIds: [...prev.statusIds, statusId],
          }))}
          onRemoveStatus={(statusId) => setFilters((prev) => ({
            ...prev,
            statusIds: prev.statusIds.filter((id) => id !== statusId),
          }))}
          projectScope={projectScope}
          onProjectScopeChange={setProjectScope}
        />
      }
      viewModeToggle={tableOnly ? undefined : (
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          variant="outline"
          size="sm"
          data-testid="toggle-projects-view-mode"
        >
          <ToggleGroupItem value="board" aria-label="Board-Ansicht" data-testid="toggle-projects-board">
            <LayoutGrid className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Tabellen-Ansicht" data-testid="toggle-projects-table">
            <Table2 className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      )}
      footerSlot={
        <div className="flex justify-between items-center">
          {onNewProject ? (
            <Button
              variant="outline"
              onClick={onNewProject}
              className="flex items-center gap-2"
              data-testid="button-new-project"
            >
              <Plus className="w-4 h-4" />
              Neues Projekt
            </Button>
          ) : <span />}

          {onCancel ? (
            <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-projects">
              Schliessen
            </Button>
          ) : null}
        </div>
      }
      contentSlot={
        !tableOnly && viewMode === "board" ? (
          <BoardView
            gridTestId="list-projects"
            gridCols="3"
            isEmpty={filteredProjects.length === 0}
            emptyState={
              <p className="text-sm text-slate-400 text-center py-8 col-span-full">
                Keine Projekte gefunden.
              </p>
            }
          >
            {filteredProjects.map((project) => {
              const customer = customersById.get(project.customerId);
              const handleSelect = () => onSelectProject?.(project.id);

              return (
                <EntityCard
                  key={project.id}
                  title={project.name}
                  icon={<FolderKanban className="w-4 h-4" />}
                  headerColor={defaultHeaderColor}
                  testId={`project-card-${project.id}`}
                  onDoubleClick={handleSelect}
                  footer={
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelect();
                      }}
                      data-testid={`button-edit-project-${project.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  }
                >
                  <div className="space-y-2">
                    {customer && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-medium">{customer.fullName} (K: {customer.customerNumber})</span>
                      </div>
                    )}

                    {customer?.postalCode && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{customer.postalCode} {customer.city}</span>
                      </div>
                    )}

                    {project.descriptionMd && (
                      <div className="text-xs text-slate-500 line-clamp-2 pt-1">
                        {project.descriptionMd}
                      </div>
                    )}

                    {!project.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                </EntityCard>
              );
            })}
          </BoardView>
        ) : (
          <TableView
            testId="table-projects"
            columns={tableColumns}
            rows={sortedProjectRows}
            rowKey={(row) => row.project.id}
            onRowDoubleClick={(row) => onSelectProject?.(row.project.id)}
            rowPreviewRenderer={(row) => {
              if (!row.relevantAppointment) {
                return (
                  <div className="rounded-md border border-border bg-card p-3">
                    Keine Termine vorhanden.
                  </div>
                );
              }

              const relevantDate = formatAppointmentLabel(row.relevantAppointment);

              return (
                <div className="rounded-md border border-border bg-card p-3 space-y-2 max-w-[420px]">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="w-4 h-4" />
                    Relevanter Termin
                  </div>
                  <p className="text-sm">{relevantDate}</p>
                  <p className="text-xs text-muted-foreground">
                    Projekt: {row.project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kunde: {row.relevantAppointment.customer.fullName}
                  </p>
                </div>
              );
            }}
            emptyState={<p className="text-sm text-slate-400 py-4">Keine Projekte gefunden.</p>}
            stickyHeader
          />
        )
      }
    />
  );
}

