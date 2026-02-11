import { Button } from "@/components/ui/button";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { getProjectStatusColor } from "@/lib/project-status";
import { ListChecks, Pencil, Shield, GripVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectStatus } from "@shared/schema";

interface ProjectStatusListProps {
  onCreateStatus?: () => void;
  onEditStatus?: (status: ProjectStatus) => void;
  onSelectStatus?: (statusId: number) => void;
  isCreatePending?: boolean;
  mode?: "list" | "picker";
  selectedStatusId?: number | null;
  title?: string;
  helpKey?: string;
  onCancel?: () => void;
}

interface ProjectStatusListViewProps extends ProjectStatusListProps {
  statuses: ProjectStatus[];
  isLoading?: boolean;
}

export function ProjectStatusListView({
  statuses,
  isLoading = false,
  onCreateStatus,
  onEditStatus,
  onSelectStatus,
  isCreatePending,
  mode = "list",
  selectedStatusId = null,
  title,
  helpKey = "project-status",
  onCancel,
}: ProjectStatusListViewProps) {
  const isPicker = mode === "picker";
  const resolvedTitle = title ?? (isPicker ? "Projektstatus auswählen" : "Projekt Status");

  return (
    <CardListLayout
      title={resolvedTitle}
      icon={<ListChecks className="w-5 h-5" />}
      helpKey={helpKey}
      isLoading={isLoading}
      onClose={onCancel}
      closeTestId="button-close-project-status"
      gridTestId="list-project-status"
      gridCols="3"
      primaryAction={!isPicker && onCreateStatus ? {
        label: "Neuer Status",
        onClick: onCreateStatus,
        isPending: isCreatePending,
        testId: "button-new-status",
      } : undefined}
      secondaryAction={onCancel ? {
        label: "Schließen",
        onClick: onCancel,
        testId: "button-cancel-project-status",
      } : undefined}
      isEmpty={statuses.length === 0}
      emptyState={
        <p className="text-sm text-slate-400 text-center py-8 col-span-full">
          Keine Projektstatus vorhanden
        </p>
      }
    >
      {statuses.map((status) => {
        const isSelected = selectedStatusId === status.id;
        const handleSelect = () => onSelectStatus?.(status.id);

        return (
          <ColoredEntityCard
            key={status.id}
            testId={`status-card-${status.id}`}
            title={status.title}
            borderColor={getProjectStatusColor(status)}
            icon={status.isDefault ? <Shield className="w-4 h-4 text-amber-600" /> : undefined}
            className={`${!status.isActive ? "opacity-60" : ""} ${isSelected ? "ring-2 ring-primary/40 border-primary/40 bg-primary/5" : ""}`}
            onDoubleClick={!isPicker ? () => onEditStatus?.(status) : undefined}
            onClick={isPicker ? handleSelect : undefined}
            footer={(
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <GripVertical className="w-3 h-3" />
                  <span>Reihenfolge: {status.sortOrder}</span>
                  {status.isDefault && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                      Standard
                    </span>
                  )}
                  {!status.isActive && (
                    <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs">
                      Inaktiv
                    </span>
                  )}
                </div>
                {!isPicker && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStatus?.(status);
                    }}
                    data-testid={`button-edit-status-${status.id}`}
                    title="Bearbeiten"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          >
            {status.description ? (
              <p className="text-sm text-slate-600 line-clamp-2" data-testid={`text-status-description-${status.id}`}>
                {status.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Keine Beschreibung</p>
            )}
          </ColoredEntityCard>
        );
      })}
    </CardListLayout>
  );
}

export function ProjectStatusList(props: ProjectStatusListProps) {
  const { data: statuses = [], isLoading } = useQuery<ProjectStatus[]>({
    queryKey: ["/api/project-status?active=all"],
  });

  return (
    <ProjectStatusListView
      {...props}
      statuses={statuses}
      isLoading={isLoading}
    />
  );
}
