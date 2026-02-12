import { Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getProjectStatusColor } from "@/lib/project-status";
import type { ProjectStatus } from "@shared/schema";

interface ProjectStatusFilterInputProps {
  selectedStatuses: ProjectStatus[];
  availableStatuses: ProjectStatus[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStatus: (statusId: number) => void;
  onRemoveStatus: (statusId: number) => void;
}

export function ProjectStatusFilterInput({
  selectedStatuses,
  availableStatuses,
  isOpen,
  onOpenChange,
  onAddStatus,
  onRemoveStatus,
}: ProjectStatusFilterInputProps) {
  return (
    <div className="flex flex-col gap-2 sm:min-w-[280px]">
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-muted-foreground">Status</span>
        <HelpIcon helpKey="projects.filter.status" size="sm" />
      </div>
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
              onRemove={() => onRemoveStatus(status.id)}
              size="sm"
              testId={`project-filter-status-${status.id}`}
            />
          ))
        )}
        <Popover open={isOpen} onOpenChange={onOpenChange}>
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
                      onAdd={() => onAddStatus(status.id)}
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
  );
}
