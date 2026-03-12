import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EntityEditDialog } from "@/components/ui/entity-edit-dialog";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import { TagBadge } from "@/components/ui/tag-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ListChecks, Plus, Tags } from "lucide-react";
import type { Tag } from "@shared/schema";

export type TagRelationItem = {
  tag: Tag;
  relationVersion: number;
};

interface TagPickerPanelProps {
  assignedTags: TagRelationItem[];
  availableTags: Tag[];
  isLoading?: boolean;
  loadErrorMessage?: string | null;
  onAdd: (tagId: number) => void;
  onRemove: (item: TagRelationItem) => void;
  title?: string;
  emptyText?: string;
  addDialogTitle?: string;
  canEdit?: boolean;
  className?: string;
  testIdPrefix?: string;
}

export function TagPickerPanel({
  assignedTags,
  availableTags,
  isLoading = false,
  loadErrorMessage = null,
  onAdd,
  onRemove,
  title = "Tags",
  emptyText = "Keine Tags zugewiesen",
  addDialogTitle = "Tag hinzufügen",
  canEdit = false,
  className,
  testIdPrefix = "tag-picker",
}: TagPickerPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const assignedIds = useMemo(() => new Set(assignedTags.map((item) => item.tag.id)), [assignedTags]);
  const unassignedTags = useMemo(
    () => availableTags.filter((tag) => !assignedIds.has(tag.id)),
    [assignedIds, availableTags],
  );

  const handleOpenDialog = () => {
    if (!canEdit) return;
    setDialogOpen(true);
  };

  const handleSelectTag = (tagId: number) => {
    if (!canEdit) return;
    onAdd(tagId);
    setDialogOpen(false);
  };

  return (
    <>
      <SidebarChildPanel
        title={`${title} (${assignedTags.length})`}
        icon={<Tags className="h-4 w-4" />}
        className={className}
        headerActions={canEdit ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleOpenDialog}
                data-testid={`${testIdPrefix}-button-add`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {availableTags.length === 0
                ? (loadErrorMessage ? "Tags konnten nicht geladen werden" : "Keine weiteren Tags verfügbar")
                : unassignedTags.length === 0
                  ? "Alle Tags bereits zugewiesen"
                  : "Tag hinzufügen"}
            </TooltipContent>
          </Tooltip>
        ) : null}
      >
        <div className="space-y-2" data-testid={`${testIdPrefix}-assigned-list`}>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 rounded-md bg-slate-200" />
              <div className="h-10 rounded-md bg-slate-200" />
            </div>
          ) : (
            <>
              {loadErrorMessage ? (
                <p className="py-2 text-center text-sm text-destructive" data-testid={`${testIdPrefix}-load-error`}>
                  {loadErrorMessage}
                </p>
              ) : null}
              {assignedTags.map((item) => (
                <TagBadge
                  key={item.tag.id}
                  tag={item.tag}
                  action={canEdit ? "remove" : "none"}
                  onRemove={canEdit ? () => onRemove(item) : undefined}
                  fullWidth
                  testId={`${testIdPrefix}-tag-${item.tag.id}`}
                />
              ))}
              {assignedTags.length === 0 ? (
                <p className="py-2 text-center text-sm text-slate-400">{emptyText}</p>
              ) : null}
            </>
          )}
        </div>
      </SidebarChildPanel>

      <EntityEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCancel={() => setDialogOpen(false)}
        title={addDialogTitle}
        icon={ListChecks}
        maxWidth="max-w-4xl"
        hideActions
      >
        <div className="space-y-3" data-testid={`${testIdPrefix}-available-list`}>
          {unassignedTags.length === 0 ? (
            <p className="text-sm text-slate-400">Alle Tags sind bereits zugewiesen.</p>
          ) : (
            unassignedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                action="add"
                onAdd={() => handleSelectTag(tag.id)}
                fullWidth
                testId={`${testIdPrefix}-add-tag-${tag.id}`}
              />
            ))
          )}
        </div>
      </EntityEditDialog>
    </>
  );
}
