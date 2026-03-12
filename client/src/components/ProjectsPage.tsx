import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProjectFilterPanel } from "@/components/ui/filter-panels/project-filter-panel";
import { HoverPreview } from "@/components/ui/hover-preview";
import { ProjectArticleDescriptionRenderer } from "@/components/ui/project-article-description-renderer";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { defaultHeaderColor } from "@/lib/colors";
import { defaultProjectFilters, type ProjectFilters, type ProjectScope } from "@/lib/project-filters";
import { useSettings } from "@/hooks/useSettings";
import { useListFilters } from "@/hooks/useListFilters";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import { AppointmentCountBadge } from "@/components/ui/appointment-count-badge";
import type { Project, Tag } from "@shared/schema";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import { domainIcons } from "@/lib/domain-icons";
import { formatListDateTime } from "@/lib/list-display-format";
import { ProjectTableHoverPreview } from "@/components/ui/table-hover-previews";

type ViewMode = "board" | "table";
type SortDirection = "asc" | "desc";
type ProjectSortKey = "title" | "customer" | "customerNumber" | "orderNumber";

type ProjectListItem = Project & {
  notesCount: number;
  plannedAppointmentsCount: number;
  nextAppointmentStartDate: string | null;
  nextAppointmentStartTimeHour: number | null;
  projectArticleItems: ProjectArticleItem[];
  tags: Tag[];
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
    lastName: string | null;
  };
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
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
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
    if (filters.tagIds.length > 0) params.set("tagIds", filters.tagIds.join(","));

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

  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const projects = data?.items ?? [];
  const selectedTagIds = useMemo(() => new Set(filters.tagIds), [filters.tagIds]);
  const selectedTags = useMemo(
    () => filters.tagIds
      .map((id) => availableTags.find((tag) => tag.id === id))
      .filter((tag): tag is Tag => Boolean(tag)),
    [availableTags, filters.tagIds],
  );
  const unselectedTags = useMemo(
    () => availableTags.filter((tag) => !selectedTagIds.has(tag.id)),
    [availableTags, selectedTagIds],
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
      if (sortKey === "customerNumber") {
        return a.customer.customerNumber.localeCompare(b.customer.customerNumber, "de", { numeric: true }) * directionMultiplier;
      }
      if (sortKey === "orderNumber") {
        return (a.project.orderNumber ?? "").localeCompare(b.project.orderNumber ?? "", "de", { numeric: true }) * directionMultiplier;
      }

      return a.project.name.localeCompare(b.project.name, "de") * directionMultiplier;
    });

    return rows;
  }, [projectRows, sortDirection, sortKey]);

  const tableColumns = useMemo<TableViewColumnDef<(typeof sortedProjectRows)[number]>[]>(
    () => [
      {
        id: "orderNumber",
        header: renderSortHeader("Auftrag Nr.", "orderNumber"),
        accessor: (row) => row.project.orderNumber ?? "",
        minWidth: 130,
        cell: ({ row }) => <span>{row.project.orderNumber?.trim() || "-"}</span>,
      },
      {
        id: "title",
        header: renderSortHeader("Projektname", "title"),
        accessor: (row) => row.project.name,
        minWidth: 220,
        cell: ({ row }) => <span className="font-medium">{row.project.name}</span>,
      },
      {
        id: "customerNumber",
        header: renderSortHeader("Kund Nr.", "customerNumber"),
        accessor: (row) => row.customer.customerNumber,
        minWidth: 110,
      },
      {
        id: "customer",
        header: renderSortHeader("Kunde", "customer"),
        accessor: (row) => row.customer.fullName ?? "",
        minWidth: 220,
        cell: ({ row }) => <span>{row.customer.fullName ?? "-"}</span>,
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
        header: "Naechster Termin",
        accessor: (row) => row.project.nextAppointmentStartDate ?? "",
        minWidth: 180,
        cell: ({ row }) => (
          <span>
            {formatListDateTime({
              startDate: row.project.nextAppointmentStartDate,
              startTimeHour: row.project.nextAppointmentStartTimeHour,
            })}
          </span>
        ),
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
    || filters.tagIds.length > 0
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

  const ProjectsIcon = domainIcons.projects;
  const CustomersIcon = domainIcons.customers;

  return (
    <>
      <ListLayout
        title={resolvedTitle}
        icon={<ProjectsIcon className="w-5 h-5" />}
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
            selectedTags={selectedTags}
            availableTags={unselectedTags}
            tagPickerOpen={tagPickerOpen}
            onTagPickerOpenChange={setTagPickerOpen}
            onAddTag={(tagId) => setFilter("tagIds", [...filters.tagIds, tagId])}
            onRemoveTag={(tagId) => setFilter("tagIds", filters.tagIds.filter((id) => id !== tagId))}
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
                    icon={<ProjectsIcon className="w-4 h-4" />}
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
                        <EntityTagFooterRow tags={project.tags} testId={`project-card-tags-${project.id}`} />
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
                          <CustomersIcon className="w-3 h-3 text-slate-400" />
                          <span className="font-medium">{project.customer.fullName ?? "-"}</span>
                        </span>
                      </div>

                      {!project.isActive ? (
                        <Badge variant="secondary" className="text-xs">
                          Inaktiv
                        </Badge>
                      ) : null}
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
              rowPreviewRenderer={(row) => (
                <ProjectTableHoverPreview
                  header={{
                    orderNumber: row.project.orderNumber?.trim() || "-",
                    name: row.project.name,
                  }}
                  customer={{
                    number: row.customer.customerNumber,
                    name: row.customer.fullName ?? "-",
                  }}
                  project={{
                    description: row.project.descriptionMd?.replace(/<[^>]+>/g, " ").trim() || "-",
                    amount: formatProjectAmount(row.project.amount),
                  }}
                  nextAppointmentLabel={formatListDateTime({
                    startDate: row.project.nextAppointmentStartDate,
                    startTimeHour: row.project.nextAppointmentStartTimeHour,
                  })}
                  notes={[
                    { type: "customer", id: row.customer.id, count: 0 },
                    { type: "project", id: row.project.id, count: row.project.notesCount },
                  ]}
                  tags={[...(row.project.tags ?? [])]}
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
