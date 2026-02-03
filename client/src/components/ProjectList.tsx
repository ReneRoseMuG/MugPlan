import { useMemo, useState } from "react";
import { FolderKanban, MapPin, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { FilteredCardListLayout } from "@/components/ui/filtered-card-list-layout";
import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { defaultHeaderColor } from "@/lib/colors";
import { applyProjectFilters, defaultProjectFilters } from "@/lib/project-filters";
import { useQuery } from "@tanstack/react-query";
import type { Project, Customer, ProjectStatus } from "@shared/schema";

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
  isLoading?: boolean;
}

export function ProjectListView({
  projects,
  customers,
  projectStatuses,
  isLoading = false,
  onCancel,
  onNewProject,
  onSelectProject,
  mode = "list",
  selectedProjectId = null,
  title,
}: ProjectListViewProps) {
  const [filters, setFilters] = useState(defaultProjectFilters);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.isActive),
    [projects],
  );
  const filteredProjects = useMemo(
    () => applyProjectFilters(activeProjects, filters),
    [activeProjects, filters],
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
        <SearchFilterInput
          id="project-filter-title"
          label="Projekttitel"
          value={filters.title}
          onChange={(value) => setFilters((prev) => ({ ...prev, title: value }))}
          onClear={() => setFilters((prev) => ({ ...prev, title: "" }))}
          className="flex-1"
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
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
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
      isLoading={projectsLoading}
    />
  );
}
