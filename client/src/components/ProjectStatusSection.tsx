import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { ProjectStatusListView } from "@/components/ProjectStatusList";
import { EntityEditDialog } from "@/components/ui/entity-edit-dialog";
import { getProjectStatusColor } from "@/lib/project-status";
import { Flag, Plus, ListChecks } from "lucide-react";
import type { ProjectStatus } from "@shared/schema";

interface ProjectStatusSectionProps {
  assignedStatuses: ProjectStatus[];
  availableStatuses: ProjectStatus[];
  isLoading?: boolean;
  onAdd: (statusId: number) => void;
  onRemove: (statusId: number) => void;
  title?: string;
}

export function ProjectStatusSection({ 
  assignedStatuses, 
  availableStatuses,
  isLoading = false, 
  onAdd, 
  onRemove,
  title = "Status" 
}: ProjectStatusSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const assignedIds = new Set(assignedStatuses.map(s => s.id));
  const unassignedStatuses = availableStatuses.filter(s => !assignedIds.has(s.id) && s.isActive);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleSelectStatus = (statusId: number) => {
    onAdd(statusId);
    setDialogOpen(false);
  };

  const handleCancelDialog = () => {
    setDialogOpen(false);
  };

  return (
    <div className="sub-panel space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <Flag className="w-4 h-4" />
          {title} ({assignedStatuses.length})
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleOpenDialog}
              data-testid="button-add-status"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {availableStatuses.length === 0 
              ? "Bitte erst Status unter Administration → Projekt Status anlegen"
              : unassignedStatuses.length === 0 
                ? "Alle Status bereits zugewiesen"
                : "Status hinzufügen"
            }
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-2" data-testid="list-project-statuses">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-slate-200 rounded-md" />
            <div className="h-10 bg-slate-200 rounded-md" />
          </div>
        ) : (
          <>
            {assignedStatuses.map(status => (
              <ColoredInfoBadge 
                key={status.id}
                icon={<Flag className="w-4 h-4" />}
                label={status.title}
                color={getProjectStatusColor(status)}
                action="remove"
                onRemove={() => onRemove(status.id)}
                fullWidth
                testId={`status-badge-${status.id}`}
              />
            ))}
            {assignedStatuses.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-2">
                Kein Status zugewiesen
              </p>
            )}
          </>
        )}
      </div>

      <EntityEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCancel={handleCancelDialog}
        title="Status hinzufügen"
        icon={ListChecks}
        maxWidth="max-w-6xl"
        hideActions
      >
        <ProjectStatusListView
          statuses={unassignedStatuses}
          isLoading={isLoading}
          mode="picker"
          onSelectStatus={handleSelectStatus}
          title="Status auswählen"
          helpKey="project-status"
          onCancel={handleCancelDialog}
        />
      </EntityEditDialog>
    </div>
  );
}
