import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { TagSelectionMenuContent } from "@/components/tags/tag-selection-menu-content";
import { TagBadge } from "@/components/ui/tag-badge";
import { cn } from "@/lib/utils";
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
  className?: string;
  disableAddWhenEmpty?: boolean;
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
  className,
  disableAddWhenEmpty = true,
}: TagFilterInputProps) {
  return (
    <div className={cn("flex flex-col gap-1 sm:min-w-[280px]", className)}>
      <div className="flex h-5 items-center gap-1">
        <span className="text-xs text-slate-500">{label}</span>
        {helpKey ? <HelpIcon helpKey={helpKey} size="sm" /> : null}
      </div>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {selectedTags.length > 0 ? (
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
          ) : null}
        </div>
        <Popover open={isOpen} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <PlusActionButton
              className="mt-0.5 shrink-0"
              disabled={disableAddWhenEmpty && availableTags.length === 0}
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
