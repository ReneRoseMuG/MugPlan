import { Flag } from "lucide-react";
import { ColoredInfoBadge } from "@/components/ui/colored-info-badge";
import { getProjectStatusColor } from "@/lib/project-status";
import type { ProjectStatus } from "@shared/schema";

type ProjectStatusLike = Pick<ProjectStatus, "id" | "title" | "color">;

interface ProjectStatusInfoBadgeProps {
  status: ProjectStatusLike;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  size?: "default" | "sm";
  fullWidth?: boolean;
  testId?: string;
}

export function ProjectStatusInfoBadge({
  status,
  action,
  onAdd,
  onRemove,
  size = "default",
  fullWidth = false,
  testId,
}: ProjectStatusInfoBadgeProps) {
  const iconClassName = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <ColoredInfoBadge
      icon={<Flag className={iconClassName} />}
      label={status.title}
      color={getProjectStatusColor(status)}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      size={size}
      fullWidth={fullWidth}
      testId={testId}
    />
  );
}
