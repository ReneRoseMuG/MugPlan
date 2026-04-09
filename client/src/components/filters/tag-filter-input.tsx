import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { TagSelectionMenuContent } from "@/components/tags/tag-selection-menu-content";
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
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
        </div>
        <Popover open={isOpen} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <PlusActionButton
              className="mt-0.5 shrink-0"
              disabled={availableTags.length === 0}
              data-testid={addButtonTestId}
              aria-label="Tag hinzufügen"
            />
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <TagSelectionMenuContent
              tags={availableTags}
              onAddTag={onAddTag}
              emptyText="Alle Tags ausgewählt"
              testIdPrefix={`${testIdPrefix}-add`}
              showVerboseLabels
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
