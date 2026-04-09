import { Tag as TagIcon } from "lucide-react";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { createTagBadgePreview } from "@/components/ui/badge-previews/tag-badge-preview";
import { trimTagLabel } from "@/lib/tag-utils";
import type { Tag } from "@shared/schema";

interface TagBadgeProps {
  tag: Tag;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  size?: "default" | "sm";
  fullWidth?: boolean;
  testId?: string;
  displayMode?: "default" | "pickerVerbose";
}

export function TagBadge({
  tag,
  action = "none",
  onAdd,
  onRemove,
  size = "default",
  fullWidth = false,
  testId,
  displayMode = "default",
}: TagBadgeProps) {
  const iconClassName = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const visualStyle = size === "sm" ? "footer" : "default";
  const trimmedLabel = trimTagLabel(tag.name);
  const fullName = tag.name.trim();
  const label = displayMode === "pickerVerbose"
    ? (
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="shrink-0 font-semibold text-foreground">{trimmedLabel}</span>
        <span className="min-w-0 truncate text-[11px] text-muted-foreground">({fullName})</span>
      </span>
    )
    : trimmedLabel;

  return (
    <ColoredInfoBadge
      icon={<TagIcon className={iconClassName} />}
      label={label}
      color={tag.color}
      foregroundColor="#ffffff"
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      size={size}
      fullWidth={fullWidth}
      testId={testId}
      preview={createTagBadgePreview(tag.name)}
      visualStyle={visualStyle}
    />
  );
}
