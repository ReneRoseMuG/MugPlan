import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import { TagBadge } from "@/components/ui/tag-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Tags } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TagSelectionMenuContent } from "@/components/tags/tag-selection-menu-content";
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
  canEdit = false,
  className,
  testIdPrefix = "tag-picker",
}: TagPickerPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const assignedIds = useMemo(() => new Set(assignedTags.map((item) => item.tag.id)), [assignedTags]);
  const unassignedTags = useMemo(
    () => availableTags.filter((tag) => !assignedIds.has(tag.id)),
    [assignedIds, availableTags],
  );
  const handleAddTag = (tagId: number) => {
    setPickerOpen(false);
    onAdd(tagId);
  };

  return (
    <SidebarChildPanel
      title={`${title} (${assignedTags.length})`}
      icon={<Tags className="h-4 w-4" />}
      className={className}
      headerActions={canEdit ? (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`${testIdPrefix}-button-add`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              {availableTags.length === 0
                ? (loadErrorMessage ? "Tags konnten nicht geladen werden" : "Keine weiteren Tags verfügbar")
                : unassignedTags.length === 0
                  ? "Alle Tags bereits zugewiesen"
                  : "Tag hinzufügen"}
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-72 p-3" align="end">
            <TagSelectionMenuContent
              tags={unassignedTags}
              onAddTag={handleAddTag}
              emptyText="Alle Tags sind bereits zugewiesen."
              testIdPrefix={`${testIdPrefix}-add-tag`}
              showVerboseLabels
              title="Tag hinzufügen"
            />
          </PopoverContent>
        </Popover>
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
  );
}
