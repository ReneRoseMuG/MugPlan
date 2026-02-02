import { useMemo, useState } from "react";
import { FolderKanban, MapPin, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { FilterInput } from "@/components/ui/filter-input";
import { defaultHeaderColor } from "@/lib/colors";
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

export default function ProjectList({
  onCancel,
  onNewProject,
  onSelectProject,
  mode = "list",
  selectedProjectId = null,
  title,
}: ProjectListProps) {
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: projectStatuses = [] } = useQuery<ProjectStatus[]>({
    queryKey: ['/api/project-status'],
  });

  const [titleFilter, setTitleFilter] = useState("");

  const activeProjects = projects.filter(p => p.isActive);
  const filteredProjects = useMemo(() => {
    const normalizedTitle = titleFilter.trim().toLowerCase();

    if (!normalizedTitle) {
      return activeProjects;
    }

    return activeProjects.filter((project) =>
      (project.name ?? "").toLowerCase().includes(normalizedTitle),
    );
  }, [activeProjects, titleFilter]);

  const getCustomer = (customerId: number) => 
    customers.find(c => c.id === customerId);

  const isPicker = mode === "picker";
  const resolvedTitle = title ?? (isPicker ? "Projekt auswählen" : "Projekte");

  return (
    <CardListLayout
      title={resolvedTitle}
      icon={<FolderKanban className="w-5 h-5" />}
      helpKey="projects"
      isLoading={projectsLoading}
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
      bottomBar={(
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <FilterInput
            id="project-filter-title"
            label="Projekttitel"
            value={titleFilter}
            placeholder="Suche Projekttitel"
            onChange={setTitleFilter}
            onClear={() => setTitleFilter("")}
            className="flex-1"
          />
        </div>
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
    </CardListLayout>
  );
}
