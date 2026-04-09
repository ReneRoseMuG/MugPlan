import { Tag as TagIcon } from "lucide-react";
import type { Tag } from "@shared/schema";
import { TagBadge } from "@/components/ui/tag-badge";

interface TagSelectionMenuContentProps {
  tags: Tag[];
  onAddTag: (tagId: number) => void;
  emptyText: string;
  testIdPrefix: string;
  showVerboseLabels?: boolean;
  pendingText?: string | null;
  title?: string;
}

export function TagSelectionMenuContent({
  tags,
  onAddTag,
  emptyText,
  testIdPrefix,
  showVerboseLabels = false,
  pendingText = null,
  title = "Tag hinzufügen",
}: TagSelectionMenuContentProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TagIcon className="h-3.5 w-3.5 text-[#d97706]" />
        <h4 className="text-sm font-semibold text-[#d97706]">{title}</h4>
      </div>
      {tags.length === 0 ? (
        <p className="text-xs text-slate-400">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              action="add"
              onAdd={() => onAddTag(tag.id)}
              fullWidth
              testId={`${testIdPrefix}-${tag.id}`}
              displayMode={showVerboseLabels ? "pickerVerbose" : "default"}
            />
          ))}
        </div>
      )}
      {pendingText ? (
        <p className="text-xs text-muted-foreground">{pendingText}</p>
      ) : null}
    </div>
  );
}
