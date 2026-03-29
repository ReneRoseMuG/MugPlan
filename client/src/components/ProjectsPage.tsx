import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, LayoutGrid, Table2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProjectFilterPanel } from "@/components/ui/filter-panels/project-filter-panel";
import { ProjectEntityCard } from "@/components/ui/entity-preview-cards";
import { defaultProjectFilters, type ProjectFilters, type ProjectScope } from "@/lib/project-filters";
import { useSettings } from "@/hooks/useSettings";
import { useListFilters } from "@/hooks/useListFilters";
import type { Project, Tag } from "@shared/schema";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import { domainIcons } from "@/lib/domain-icons";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";
import { formatListDateTime } from "@/lib/list-display-format";
import { ProjectTableHoverPreview } from "@/components/ui/table-hover-previews";
import { ListPagingFooter } from "@/components/ui/list-paging-footer";

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
    addressLine1: string | null;
    postalCode: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  };
  attachmentsCount: number;
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
    placeholderData: keepPreviousData,
  });

  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("project"),
    queryFn: () => fetchTagCatalog("project"),
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
  const tableFooter = (
    <ListPagingFooter
      summaryText={`${data?.total ?? 0} Einträge`}
      page={page}
      totalPages={totalPages}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      onPrev={() => canGoPrev && setPage((current) => current - 1)}
      onNext={() => canGoNext && setPage((current) => current + 1)}
      prevTestId="button-projects-page-prev"
      nextTestId="button-projects-page-next"
      stateTestId="text-projects-page-state"
      leadingSlot={onNewProject ? (
        <Button
          variant="outline"
          onClick={onNewProject}
          className="flex items-center gap-2"
          data-testid="button-new-project"
        >
          <Plus className="w-4 h-4" />
          Neues Projekt
        </Button>
      ) : undefined}
      trailingSlot={onCancel ? (
        <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-projects">
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
        footerSlot={layoutFooter}
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

                return (
                  <ProjectEntityCard
                    key={project.id}
                    project={{
                      ...project,
                      orderNumber: project.orderNumber?.trim() || null,
                      tags: [...(project.tags ?? [])],
                    }}
                    onDoubleClick={handleSelect}
                  />
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
                  project={{
                    ...row.project,
                    orderNumber: row.project.orderNumber?.trim() || null,
                    tags: [...(row.project.tags ?? [])],
                  }}
                  onDoubleClick={() => onSelectProject?.(row.project.id)}
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
