import { Users } from "lucide-react";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { createTeamInfoBadgePreview } from "@/components/ui/badge-previews/team-info-badge-preview";

interface TeamInfoBadgeProps {
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

export function TeamInfoBadge({
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
}: TeamInfoBadgeProps) {
  return (
    <ColoredInfoBadge
      icon={<Users className="w-3 h-3" />}
      label={name}
      color={color}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      preview={createTeamInfoBadgePreview({
        name,
        members,
      })}
    />
  );
}
