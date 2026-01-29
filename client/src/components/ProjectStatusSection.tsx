import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { Flag, Plus } from "lucide-react";
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const assignedIds = new Set(assignedStatuses.map(s => s.id));
  const unassignedStatuses = availableStatuses.filter(s => !assignedIds.has(s.id) && s.isActive);

  const handleOpenDialog = () => {
    setSelectedIds([]);
    setDialogOpen(true);
  };

  const handleToggle = (statusId: number) => {
    setSelectedIds(prev => 
      prev.includes(statusId) 
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const handleSave = () => {
    for (const statusId of selectedIds) {
      onAdd(statusId);
    }
    setDialogOpen(false);
    setSelectedIds([]);
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
                color={status.color}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Status hinzufügen
            </DialogTitle>
            <DialogDescription>
              Wählen Sie einen oder mehrere Status für dieses Projekt aus.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-60 overflow-y-auto py-2">
            {availableStatuses.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Es sind noch keine Projektstatus angelegt.
                <br />
                <span className="text-slate-400">
                  Bitte unter Administration → Projekt Status anlegen.
                </span>
              </p>
            ) : unassignedStatuses.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Alle Status bereits zugewiesen
              </p>
            ) : (
              unassignedStatuses.map(status => (
                <div
                  key={status.id}
                  onClick={() => handleToggle(status.id)}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer border ${
                    selectedIds.includes(status.id) 
                      ? "bg-primary/10 border-primary/30" 
                      : "border-transparent hover:bg-slate-50"
                  }`}
                  style={{ borderLeftWidth: '4px', borderLeftColor: status.color }}
                  data-testid={`checkbox-status-${status.id}`}
                >
                  <Checkbox
                    checked={selectedIds.includes(status.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm text-slate-700">{status.title}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={selectedIds.length === 0}
              data-testid="button-save-statuses"
            >
              Hinzufügen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
