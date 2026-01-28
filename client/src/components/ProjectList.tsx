import { FolderKanban, MapPin, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityCard } from "@/components/ui/entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { defaultHeaderColor } from "@/lib/colors";
import { useQuery } from "@tanstack/react-query";
import type { Project, Customer, ProjectStatus } from "@shared/schema";

interface ProjectListProps {
  onCancel?: () => void;
  onNewProject?: () => void;
  onSelectProject?: (id: number) => void;
}

interface ProjectWithDetails extends Project {
  customer?: Customer;
  statuses?: ProjectStatus[];
}

export default function ProjectList({ onCancel, onNewProject, onSelectProject }: ProjectListProps) {
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: projectStatuses = [] } = useQuery<ProjectStatus[]>({
    queryKey: ['/api/project-status'],
  });

  const activeProjects = projects.filter(p => p.isActive);

  const getCustomer = (customerId: number) => 
    customers.find(c => c.id === customerId);

  return (
    <CardListLayout
      title="Projekte"
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
      isEmpty={activeProjects.length === 0}
      emptyState={
        <p className="text-sm text-slate-400 text-center py-8 col-span-3">
          Keine Projekte gefunden.
        </p>
      }
    >
      {activeProjects.map(project => {
        const customer = getCustomer(project.customerId);
        
        return (
          <EntityCard
            key={project.id}
            title={project.name}
            icon={<FolderKanban className="w-4 h-4" />}
            headerColor={defaultHeaderColor}
            testId={`project-card-${project.id}`}
            onDoubleClick={() => onSelectProject?.(project.id)}
            footer={
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProject?.(project.id);
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
