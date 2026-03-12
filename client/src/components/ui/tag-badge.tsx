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
}

export function TagBadge({
  tag,
  action = "none",
  onAdd,
  onRemove,
  size = "default",
  fullWidth = false,
  testId,
}: TagBadgeProps) {
  const iconClassName = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <ColoredInfoBadge
      icon={<TagIcon className={iconClassName} />}
      label={trimTagLabel(tag.name)}
      color={tag.color}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      size={size}
      fullWidth={fullWidth}
      testId={testId}
      preview={createTagBadgePreview(tag.name)}
    />
  );
}
