import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EntityEditDialog } from "@/components/ui/entity-edit-dialog";
import { ProjectStatusListView } from "@/components/ProjectStatusList";
import { ProjectStatusInfoBadge } from "@/components/ui/project-status-info-badge";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flag, ListChecks, Plus } from "lucide-react";
import type { ProjectStatus } from "@shared/schema";
import type { ProjectStatusRelationItem } from "@shared/routes";

interface ProjectStatusPanelProps {
  assignedStatuses: ProjectStatusRelationItem[];
  availableStatuses: ProjectStatus[];
  isLoading?: boolean;
  onAdd: (statusId: number) => void;
  onRemove: (item: ProjectStatusRelationItem) => void;
  title?: string;
}

export function ProjectStatusPanel({
  assignedStatuses,
  availableStatuses,
  isLoading = false,
  onAdd,
  onRemove,
  title = "Status",
}: ProjectStatusPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const assignedIds = new Set(assignedStatuses.map((item) => item.status.id));
  const unassignedStatuses = availableStatuses.filter((status) => !assignedIds.has(status.id) && status.isActive);

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
    <>
      <SidebarChildPanel
        title={`${title} (${assignedStatuses.length})`}
        icon={<Flag className="w-4 h-4" />}
        headerActions={(
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
                  : "Status hinzufügen"}
            </TooltipContent>
          </Tooltip>
        )}
      >
        <div className="space-y-2" data-testid="list-project-statuses">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-slate-200 rounded-md" />
              <div className="h-10 bg-slate-200 rounded-md" />
            </div>
          ) : (
            <>
              {assignedStatuses.map((item) => (
                <ProjectStatusInfoBadge
                  key={item.status.id}
                  status={item.status}
                  action="remove"
                  onRemove={() => onRemove(item)}
                  fullWidth
                  testId={`status-badge-${item.status.id}`}
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
      </SidebarChildPanel>

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
    </>
  );
}
