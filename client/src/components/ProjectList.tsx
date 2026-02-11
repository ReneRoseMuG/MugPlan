import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { FolderKanban, MapPin, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { FilteredCardListLayout } from "@/components/ui/filtered-card-list-layout";
import { ProjectFilterPanel } from "@/components/ui/filter-panels/project-filter-panel";
import { defaultHeaderColor } from "@/lib/colors";
import { applyProjectFilters, buildProjectFilterQueryParams, defaultProjectFilters } from "@/lib/project-filters";
import { useQuery } from "@tanstack/react-query";
import type { Project, Customer, ProjectStatus } from "@shared/schema";
import type { ProjectFilters, ProjectScope } from "@/lib/project-filters";

interface ProjectListProps {
  onCancel?: () => void;
  onNewProject?: () => void;
  onSelectProject?: (id: number) => void;
  mode?: "list" | "picker";
  selectedProjectId?: number | null;
  title?: string;
  showCloseButton?: boolean;
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
  projectScope: ProjectScope;
  onProjectScopeChange: (scope: ProjectScope) => void;
  onFiltersChange: Dispatch<SetStateAction<ProjectFilters>>;
  isLoading?: boolean;
}

export function ProjectListView({
  projects,
  customers,
  projectStatuses,
  filters,
  projectScope,
  onProjectScopeChange,
  onFiltersChange,
  isLoading = false,
  onCancel,
  onNewProject,
  onSelectProject,
  mode = "list",
  selectedProjectId = null,
  title,
  showCloseButton = true,
}: ProjectListViewProps) {
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
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
      showCloseButton={showCloseButton}
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
        <p className="text-sm text-slate-400 text-center py-8 col-span-full">
          Keine Projekte gefunden.
        </p>
      }
      filters={(
        <ProjectFilterPanel
          title="Projektfilter"
          projectTitle={filters.title}
          onProjectTitleChange={(value) => onFiltersChange((prev) => ({ ...prev, title: value }))}
          onProjectTitleClear={() => onFiltersChange((prev) => ({ ...prev, title: "" }))}
          customerLastName={filters.customerLastName}
          onCustomerLastNameChange={(value) => onFiltersChange((prev) => ({ ...prev, customerLastName: value }))}
          onCustomerLastNameClear={() => onFiltersChange((prev) => ({ ...prev, customerLastName: "" }))}
          customerNumber={filters.customerNumber}
          onCustomerNumberChange={(value) => onFiltersChange((prev) => ({ ...prev, customerNumber: value }))}
          onCustomerNumberClear={() => onFiltersChange((prev) => ({ ...prev, customerNumber: "" }))}
          selectedStatuses={selectedStatuses}
          availableStatuses={availableStatuses}
          statusPickerOpen={statusPickerOpen}
          onStatusPickerOpenChange={setStatusPickerOpen}
          onAddStatus={(statusId) => onFiltersChange((prev) => ({
            ...prev,
            statusIds: [...prev.statusIds, statusId],
          }))}
          onRemoveStatus={(statusId) => onFiltersChange((prev) => ({
            ...prev,
            statusIds: prev.statusIds.filter((id) => id !== statusId),
          }))}
          projectScope={projectScope}
          onProjectScopeChange={onProjectScopeChange}
        />
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
    </FilteredCardListLayout>
  );
}

export default function ProjectList(props: ProjectListProps) {
  const [filters, setFilters] = useState(defaultProjectFilters);
  const [projectScope, setProjectScope] = useState<ProjectScope>("upcoming");
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
      projectScope={projectScope}
      onProjectScopeChange={setProjectScope}
      onFiltersChange={setFilters}
      isLoading={projectsLoading}
    />
  );
}
