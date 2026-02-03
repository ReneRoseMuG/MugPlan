import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Flag, FolderKanban, MapPin, Pencil, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { EntityCard } from "@/components/ui/entity-card";
import { FilteredCardListLayout } from "@/components/ui/filtered-card-list-layout";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { defaultHeaderColor } from "@/lib/colors";
import { getProjectStatusColor } from "@/lib/project-status";
import { applyProjectFilters, buildProjectFilterQueryParams, defaultProjectFilters } from "@/lib/project-filters";
import { useQuery } from "@tanstack/react-query";
import type { Project, Customer, ProjectStatus } from "@shared/schema";
import type { ProjectFilters } from "@/lib/project-filters";

interface ProjectListProps {
  onCancel?: () => void;
  onNewProject?: () => void;
  onSelectProject?: (id: number) => void;
  mode?: "list" | "picker";
  selectedProjectId?: number | null;
  title?: string;
}

interface ProjectWithDetails extends Project {
  customer?: Customer;
  statuses?: ProjectStatus[];
}

interface ProjectListViewProps extends ProjectListProps {
  projects: Project[];
  customers: Customer[];
  projectStatuses: ProjectStatus[];
  filters: ProjectFilters;
  onFiltersChange: Dispatch<SetStateAction<ProjectFilters>>;
  isLoading?: boolean;
}

export function ProjectListView({
  projects,
  customers,
  projectStatuses,
  filters,
  onFiltersChange,
  isLoading = false,
  onCancel,
  onNewProject,
  onSelectProject,
  mode = "list",
  selectedProjectId = null,
  title,
}: ProjectListViewProps) {
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.isActive),
    [projects],
  );
  const filteredProjects = useMemo(
    () => applyProjectFilters(activeProjects, filters),
    [activeProjects, filters],
  );

  const selectedStatusIds = useMemo(
    () => new Set(filters.statusIds),
    [filters.statusIds],
  );
  const selectedStatuses = useMemo(
    () => filters.statusIds
      .map((id) => projectStatuses.find((status) => status.id === id))
      .filter((status): status is ProjectStatus => !!status),
    [filters.statusIds, projectStatuses],
  );
  const availableStatuses = useMemo(
    () => projectStatuses.filter((status) => status.isActive && !selectedStatusIds.has(status.id)),
    [projectStatuses, selectedStatusIds],
  );

  const getCustomer = (customerId: number) =>
    customers.find(c => c.id === customerId);

  const isPicker = mode === "picker";
  const resolvedTitle = title ?? (isPicker ? "Projekt auswählen" : "Projekte");

  return (
    <FilteredCardListLayout
      title={resolvedTitle}
      icon={<FolderKanban className="w-5 h-5" />}
      helpKey="projects"
      isLoading={isLoading}
      onClose={onCancel}
      closeTestId="button-close-projects"
      gridTestId="list-projects"
      gridCols="3"
      primaryAction={onNewProject ? {
        label: "Neues Projekt",
        onClick: onNewProject,
        testId: "button-new-project",
      } : undefined}
      secondaryAction={onCancel ? {
        label: "Schließen",
        onClick: onCancel,
        testId: "button-cancel-projects",
      } : undefined}
      isEmpty={filteredProjects.length === 0}
      emptyState={
        <p className="text-sm text-slate-400 text-center py-8 col-span-3">
          Keine Projekte gefunden.
        </p>
      }
      filters={(
        <>
          <SearchFilterInput
            id="project-filter-title"
            label="Projekttitel"
            value={filters.title}
            onChange={(value) => onFiltersChange((prev) => ({ ...prev, title: value }))}
            onClear={() => onFiltersChange((prev) => ({ ...prev, title: "" }))}
            className="flex-1"
          />
          <div className="flex flex-col gap-2 sm:min-w-[280px]">
            <span className="text-xs font-semibold text-muted-foreground">Status</span>
            <div className="flex flex-wrap items-center gap-2">
              {selectedStatuses.length === 0 ? (
                <span className="text-xs text-slate-400">Kein Statusfilter</span>
              ) : (
                selectedStatuses.map((status) => (
                  <ColoredInfoBadge
                    key={status.id}
                    icon={<Flag className="w-3 h-3" />}
                    label={status.title}
                    color={getProjectStatusColor(status)}
                    action="remove"
                    onRemove={() => onFiltersChange((prev) => ({
                      ...prev,
                      statusIds: prev.statusIds.filter((id) => id !== status.id),
                    }))}
                    size="sm"
                    testId={`project-filter-status-${status.id}`}
                  />
                ))
              )}
              <Popover open={statusPickerOpen} onOpenChange={setStatusPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={availableStatuses.length === 0}
                    data-testid="button-add-project-status-filter"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">Status hinzufügen</h4>
                    {availableStatuses.length === 0 ? (
                      <p className="text-xs text-slate-400">Alle Status ausgewählt</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {availableStatuses.map((status) => (
                          <ColoredInfoBadge
                            key={status.id}
                            icon={<Flag className="w-3 h-3" />}
                            label={status.title}
                            color={getProjectStatusColor(status)}
                            action="add"
                            onAdd={() => onFiltersChange((prev) => ({
                              ...prev,
                              statusIds: [...prev.statusIds, status.id],
                            }))}
                            size="sm"
                            fullWidth
                            testId={`project-filter-status-add-${status.id}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </>
      )}
    >
      {filteredProjects.map(project => {
        const customer = getCustomer(project.customerId);
        const isSelected = selectedProjectId === project.id;
        const handleSelect = () => onSelectProject?.(project.id);
        
        return (
          <EntityCard
            key={project.id}
            title={project.name}
            icon={<FolderKanban className="w-4 h-4" />}
            headerColor={defaultHeaderColor}
            testId={`project-card-${project.id}`}
            onClick={isPicker ? handleSelect : undefined}
            onDoubleClick={!isPicker ? handleSelect : undefined}
            className={isSelected ? "ring-2 ring-primary/40 border-primary/40 bg-primary/5" : ""}
            footer={isPicker ? undefined : (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect();
                }}
                data-testid={`button-edit-project-${project.id}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          >
            <div className="space-y-2">
              {customer && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="font-medium">{customer.fullName}</span>
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
    </FilteredCardListLayout>
  );
}

export default function ProjectList(props: ProjectListProps) {
  const [filters, setFilters] = useState(defaultProjectFilters);
  const projectQueryParams = useMemo(() => buildProjectFilterQueryParams(filters), [filters]);
  const projectQueryKey = useMemo(
    () => (projectQueryParams ? `/api/projects?${projectQueryParams}` : "/api/projects"),
    [projectQueryParams],
  );

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: [projectQueryKey],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: projectStatuses = [] } = useQuery<ProjectStatus[]>({
    queryKey: ['/api/project-status'],
  });

  return (
    <ProjectListView
      {...props}
      projects={projects}
      customers={customers}
      projectStatuses={projectStatuses}
      filters={filters}
      onFiltersChange={setFilters}
      isLoading={projectsLoading}
    />
  );
}
