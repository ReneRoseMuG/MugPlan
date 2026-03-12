import { Tag as TagIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { TagBadge } from "@/components/ui/tag-badge";
import type { Tag } from "@shared/schema";

interface TagFilterInputProps {
  label?: string;
  helpKey?: string;
  selectedTags: Tag[];
  availableTags: Tag[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTag: (tagId: number) => void;
  onRemoveTag: (tagId: number) => void;
  addButtonTestId?: string;
  testIdPrefix?: string;
}

export function TagFilterInput({
  label = "Tags",
  helpKey,
  selectedTags,
  availableTags,
  isOpen,
  onOpenChange,
  onAddTag,
  onRemoveTag,
  addButtonTestId,
  testIdPrefix = "tag-filter",
}: TagFilterInputProps) {
  return (
    <div className="flex flex-col gap-2 sm:min-w-[280px]">
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {helpKey ? <HelpIcon helpKey={helpKey} size="sm" /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.length === 0 ? (
          <span className="text-xs text-slate-400">Kein Tagfilter</span>
        ) : (
          selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              action="remove"
              onRemove={() => onRemoveTag(tag.id)}
              size="sm"
              testId={`${testIdPrefix}-${tag.id}`}
            />
          ))
        )}
        <Popover open={isOpen} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <PlusActionButton
              disabled={availableTags.length === 0}
              data-testid={addButtonTestId}
              aria-label="Tag hinzufügen"
            />
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground">Tag hinzufügen</h4>
              </div>
              {availableTags.length === 0 ? (
                <p className="text-xs text-slate-400">Alle Tags ausgewählt</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {availableTags.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      tag={tag}
                      action="add"
                      onAdd={() => onAddTag(tag.id)}
                      size="sm"
                      fullWidth
                      testId={`${testIdPrefix}-add-${tag.id}`}
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
