import { Route } from "lucide-react";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { createTourInfoBadgePreview } from "@/components/ui/badge-previews/tour-info-badge-preview";

interface TourInfoBadgeProps {
  id?: number | string | null;
  name: string;
  color?: string | null;
  members?: { id?: number | string; fullName: string }[] | null;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
}

export function TourInfoBadge({
  id,
  name,
  color,
  members,
  action,
  onAdd,
  onRemove,
  testId,
  size = "default",
  fullWidth = false,
}: TourInfoBadgeProps) {
  return (
    <ColoredInfoBadge
      icon={<Route className="w-3 h-3" />}
      label={name}
      color={color}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      preview={createTourInfoBadgePreview({
        name,
        members,
      })}
    />
  );
}
