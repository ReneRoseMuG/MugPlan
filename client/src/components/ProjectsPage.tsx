import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, User, Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { ProjectStatusInfoBadge } from "@/components/ui/project-status-info-badge";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProjectFilterPanel } from "@/components/ui/filter-panels/project-filter-panel";
import { HoverPreview } from "@/components/ui/hover-preview";
import { ProjectArticleDescriptionRenderer } from "@/components/ui/project-article-description-renderer";
import { defaultHeaderColor } from "@/lib/colors";
import { defaultProjectFilters, type ProjectFilters, type ProjectScope } from "@/lib/project-filters";
import { useSettings } from "@/hooks/useSettings";
import { useListFilters } from "@/hooks/useListFilters";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import { AppointmentCountBadge } from "@/components/ui/appointment-count-badge";
import type { Project, ProjectStatus } from "@shared/schema";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type ViewMode = "board" | "table";
type SortDirection = "asc" | "desc";
type ProjectSortKey = "title" | "customer";

type ProjectListItem = Project & {
  notesCount: number;
  plannedAppointmentsCount: number;
  nextAppointmentStartDate: string | null;
  nextAppointmentStartTimeHour: number | null;
  projectArticleItems: ProjectArticleItem[];
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
    lastName: string | null;
  };
  statuses: Array<{
    id: number;
    title: string;
    color: string;
  }>;
};

type ProjectListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: ProjectListItem[];
};

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

function formatAppointmentLabel(appointment: { startDate: string; startTimeHour: number | null } | null): string {
  if (!appointment) return "---";

  const date = new Date(`${appointment.startDate}T00:00:00`);
  const dateLabel = format(date, "dd.MM.yyyy", { locale: de });
  if (appointment.startTimeHour == null) return dateLabel;
  return `${dateLabel}, ${String(appointment.startTimeHour).padStart(2, "0")}:00`;
}

function formatProjectAmount(amount: unknown): string {
  if (amount == null) return "-";
  const normalized = typeof amount === "string" ? Number(amount) : amount;
  if (typeof normalized !== "number" || !Number.isFinite(normalized)) return "-";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

function hasVisibleProjectCardContent(
  articleItems: ProjectArticleItem[] | null | undefined,
  descriptionHtml: string | null | undefined,
): boolean {
  if ((articleItems ?? []).length > 0) return true;
  if (!descriptionHtml) return false;

  const normalized = descriptionHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > 0;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5" />;
  if (direction === "desc") return <ArrowDown className="w-3.5 h-3.5" />;
  return <ArrowUpDown className="w-3.5 h-3.5" />;
}

const DEFAULT_PROJECTS_PAGE_SIZE = 50;

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
  const {
    filters,
    setFilter,
    page,
    setPage,
  } = useListFilters<ProjectFilters>({
    initialFilters: defaultProjectFilters,
  });
  const [projectScope, setProjectScope] = useState<ProjectScope>("upcoming");
  const [sortKey, setSortKey] = useState<ProjectSortKey>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    setViewMode(tableOnly ? "table" : resolvedViewMode);
  }, [resolvedViewMode, tableOnly]);

  const projectQueryParams = useMemo(() => {
    const params = new URLSearchParams({
      scope: projectScope,
      page: String(page),
      pageSize: String(DEFAULT_PROJECTS_PAGE_SIZE),
    });

    if (filters.title.trim().length > 0) params.set("title", filters.title.trim());
    if (filters.customerLastName.trim().length > 0) params.set("customerLastName", filters.customerLastName.trim());
    if (filters.customerNumber.trim().length > 0) params.set("customerNumber", filters.customerNumber.trim());
    if (filters.orderNumber.trim().length > 0) params.set("orderNumber", filters.orderNumber.trim());
    if (filters.statusIds.length > 0) params.set("statusIds", filters.statusIds.join(","));

    return params.toString();
  }, [filters, page, projectScope]);

  const { data, isLoading: projectsLoading } = useQuery<ProjectListResponse>({
    queryKey: ["/api/projects/list", projectQueryParams],
    queryFn: async () => {
      const response = await fetch(`/api/projects/list?${projectQueryParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Projekte konnten nicht geladen werden");
      return (await response.json()) as ProjectListResponse;
    },
  });

  const { data: projectStatuses = [] } = useQuery<ProjectStatus[]>({
    queryKey: ["/api/project-status"],
  });

  const projects = data?.items ?? [];

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
        className="inline-flex items-center gap-1 text-xs tracking-wide"
        onClick={() => handleSortToggle(key)}
      >
        <span>{label}</span>
        <SortIcon direction={isActive ? sortDirection : null} />
      </button>
    );
  };

  const projectRows = useMemo(() => {
    return projects.map((project) => ({
      project,
      customer: project.customer,
      relevantAppointment: project.nextAppointmentStartDate
        ? {
            startDate: project.nextAppointmentStartDate,
            startTimeHour: project.nextAppointmentStartTimeHour,
          }
        : null,
    }));
  }, [projects]);

  const sortedProjectRows = useMemo(() => {
    const rows = [...projectRows];
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      if (sortKey === "customer") {
        const left = a.customer.fullName ?? "";
        const right = b.customer.fullName ?? "";
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
        accessor: (row) => row.customer.fullName ?? "",
        minWidth: 220,
        cell: ({ row }) => (
          <span>
            {row.customer.fullName ? `${row.customer.fullName} (K: ${row.customer.customerNumber})` : "-"}
          </span>
        ),
      },
      {
        id: "orderNumber",
        header: "Auftragsnummer",
        accessor: (row) => row.project.orderNumber ?? "",
        minWidth: 160,
        cell: ({ row }) => <span>{row.project.orderNumber?.trim() || "-"}</span>,
      },
      {
        id: "amount",
        header: "Betrag",
        accessor: (row) => (row.project.amount == null ? "" : String(row.project.amount)),
        minWidth: 150,
        cell: ({ row }) => <span>{formatProjectAmount(row.project.amount)}</span>,
      },
      {
        id: "relevantAppointment",
        header: "Nächster Termin",
        accessor: (row) => row.relevantAppointment?.startDate ?? "",
        minWidth: 220,
        cell: ({ row }) => <span>{formatAppointmentLabel(row.relevantAppointment)}</span>,
      },
    ],
    [sortDirection, sortKey],
  );

  const resolvedTitle = title ?? "Projekte";
  const totalPages = data?.totalPages ?? 0;
  const canGoPrev = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;
  const hasActiveFilters =
    filters.title.trim().length > 0
    || filters.customerLastName.trim().length > 0
    || filters.customerNumber.trim().length > 0
    || filters.orderNumber.trim().length > 0
    || filters.statusIds.length > 0
    || projectScope !== "upcoming";
  const emptyState = hasActiveFilters ? (
    <ListEmptyState
      helpKey="projects.emptyFiltered"
      fallbackTitle="Keine Treffer gefunden."
      fallbackBody="Fuer die gewaehlte Filtereinstellung konnten keine Treffer ermittelt werden."
    />
  ) : (
    <ListEmptyState
      helpKey="projects.empty"
      fallbackTitle="Keine Projekte vorhanden."
      fallbackBody="Es sind aktuell keine Projekte in dieser Liste vorhanden."
    />
  );

  return (
    <>
      <ListLayout
        title={resolvedTitle}
        icon={<FolderKanban className="w-5 h-5" />}
        viewModeKey={viewModeKey}
        helpKey="projects"
        isLoading={projectsLoading}
        onClose={onCancel}
        showCloseButton={showCloseButton}
        closeTestId="button-close-projects"
        filterSlot={(
          <ProjectFilterPanel
            title="Projektfilter"
            projectTitle={filters.title}
            onProjectTitleChange={(value) => setFilter("title", value)}
            onProjectTitleClear={() => setFilter("title", "")}
            customerLastName={filters.customerLastName}
            onCustomerLastNameChange={(value) => setFilter("customerLastName", value)}
            onCustomerLastNameClear={() => setFilter("customerLastName", "")}
            customerNumber={filters.customerNumber}
            onCustomerNumberChange={(value) => setFilter("customerNumber", value)}
            onCustomerNumberClear={() => setFilter("customerNumber", "")}
            orderNumber={filters.orderNumber}
            onOrderNumberChange={(value) => setFilter("orderNumber", value)}
            onOrderNumberClear={() => setFilter("orderNumber", "")}
            selectedStatuses={selectedStatuses}
            availableStatuses={availableStatuses}
            statusPickerOpen={statusPickerOpen}
            onStatusPickerOpenChange={setStatusPickerOpen}
            onAddStatus={(statusId) => setFilter("statusIds", [...filters.statusIds, statusId])}
            onRemoveStatus={(statusId) => setFilter("statusIds", filters.statusIds.filter((id) => id !== statusId))}
            projectScope={projectScope}
            onProjectScopeChange={setProjectScope}
          />
        )}
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
        footerSlot={(
          <div className="flex justify-between items-center gap-4">
            {onNewProject ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={onNewProject}
                  className="flex items-center gap-2"
                  data-testid="button-new-project"
                >
                  <Plus className="w-4 h-4" />
                  Neues Projekt
                </Button>
              </div>
            ) : <span />}

            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground" data-testid="text-projects-page-state">
                {data?.total ?? 0} Eintraege - Seite {totalPages === 0 ? 0 : page} von {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => canGoPrev && setPage((current) => current - 1)}
                  disabled={!canGoPrev}
                  data-testid="button-projects-page-prev"
                >
                  Zurueck
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => canGoNext && setPage((current) => current + 1)}
                  disabled={!canGoNext}
                  data-testid="button-projects-page-next"
                >
                  Weiter
                </Button>
              </div>
              {onCancel ? (
                <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-projects">
                  Schliessen
                </Button>
              ) : null}
            </div>
          </div>
        )}
        contentSlot={
          !tableOnly && viewMode === "board" ? (
            <BoardView
              gridTestId="list-projects"
              gridCols="3"
              isEmpty={projects.length === 0}
              emptyState={emptyState}
            >
              {projects.map((project) => {
                const handleSelect = () => onSelectProject?.(project.id);
                const hasProjectCardContent = hasVisibleProjectCardContent(project.projectArticleItems, project.descriptionMd);
                const resolvedProjectPreviewHeader = [`A-Nr. ${project.orderNumber?.trim() || "-"}`, project.name].join(" - ");

                return (
                  <EntityCard
                    key={project.id}
                    title={project.name}
                    icon={<FolderKanban className="w-4 h-4" />}
                    headerMeta={<span>{`A-Nr. ${project.orderNumber?.trim() || "-"}`}</span>}
                    headerColor={defaultHeaderColor}
                    testId={`project-card-${project.id}`}
                    onDoubleClick={handleSelect}
                    footer={(
                      <div className="flex w-full flex-col gap-2">
                        <div className="grid w-full grid-cols-[max-content_1fr] gap-2">
                          <AppointmentCountBadge
                            count={project.plannedAppointmentsCount}
                            testId={`text-project-planned-appointments-${project.id}`}
                          />
                          {project.notesCount > 0 ? (
                            <div
                              className="flex min-h-[32px] items-center justify-end px-1 text-[10px] font-semibold text-slate-700"
                              data-testid={`text-project-notes-count-${project.id}`}
                            >
                              <EntityNotesHoverPreview
                                sourceMode="single-parent"
                                sources={{ type: "project", id: project.id, count: project.notesCount ?? 0 }}
                                triggerTestId={`text-project-notes-count-${project.id}`}
                              />
                            </div>
                          ) : null}
                        </div>
                        {project.statuses.length > 0 ? (
                          <div
                            className="grid w-full grid-cols-2 gap-1 justify-items-start [&>*:nth-child(even)]:justify-self-end"
                            data-testid={`project-status-footer-${project.id}`}
                          >
                            {project.statuses.map((status) => (
                              <ProjectStatusInfoBadge
                                key={status.id}
                                status={status}
                                action="none"
                                size="sm"
                                testId={`badge-project-status-${project.id}-${status.id}`}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                    footerVisibility="visible"
                  >
                    <div className="flex h-full flex-col gap-2">
                      {hasProjectCardContent ? (
                        <HoverPreview
                          preview={(
                            <div className="rounded-lg bg-white p-2">
                              <div className="mb-2 text-xs font-semibold text-slate-800">{resolvedProjectPreviewHeader}</div>
                              <ProjectArticleDescriptionRenderer
                                articleItems={project.projectArticleItems}
                                descriptionHtml={project.descriptionMd}
                                showSectionTitles
                                testIdPrefix={`project-card-preview-renderer-${project.id}`}
                              />
                            </div>
                          )}
                          closeDelay={80}
                          side="right"
                          align="start"
                          maxWidth={420}
                          maxHeight={320}
                          className="z-[9999] w-[420px]"
                        >
                          <div
                            className="max-h-[6.5rem] overflow-hidden pt-1"
                            data-testid={`project-card-description-hover-trigger-${project.id}`}
                          >
                            <ProjectArticleDescriptionRenderer
                              articleItems={project.projectArticleItems}
                              descriptionHtml={project.descriptionMd}
                              showSectionTitles={false}
                              testIdPrefix={`project-card-renderer-${project.id}`}
                            />
                          </div>
                        </HoverPreview>
                      ) : null}

                      <div className="mt-auto flex items-center gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-medium">{project.customer.fullName ?? "-"}</span>
                        </span>
                      </div>

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
                return createAppointmentWeeklyPanelPreview({
                  id: row.project.id,
                  startDate: row.relevantAppointment.startDate,
                  endDate: null,
                  startTime: row.relevantAppointment.startTimeHour == null ? null : `${String(row.relevantAppointment.startTimeHour).padStart(2, "0")}:00:00`,
                  projectId: row.project.id,
                  projectName: row.project.name,
                  projectVersion: row.project.version,
                  projectOrderNumber: row.project.orderNumber ?? null,
                  projectArticleItems: row.project.projectArticleItems,
                  projectDescription: row.project.descriptionMd ?? null,
                  projectStatuses: row.project.statuses,
                  tourId: null,
                  tourName: null,
                  tourColor: null,
                  customer: {
                    id: row.customer.id,
                    customerNumber: row.customer.customerNumber,
                    fullName: row.customer.fullName,
                    addressLine1: null,
                    addressLine2: null,
                    postalCode: null,
                    city: null,
                  },
                  employees: [],
                  customerNotesCount: 0,
                  projectNotesCount: row.project.notesCount,
                  appointmentNotesCount: 0,
                  displayMode: "compact",
                  isLocked: false,
                  version: row.project.version,
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
