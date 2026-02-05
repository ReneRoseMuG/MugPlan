import { InfoBadge } from "@/components/ui/info-badge";
import type { BadgeData, BadgeType } from "@/components/ui/badge-preview-registry";
import type { ReactNode } from "react";

interface ColoredInfoBadgeProps {
  icon: ReactNode;
  label: ReactNode;
  color?: string | null;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  badgeType?: BadgeType;
  badgeData?: BadgeData;
}

export function ColoredInfoBadge({ 
  icon, 
  label, 
  color,
  action,
  onAdd,
  onRemove,
  testId,
  size = "default",
  fullWidth = false,
  badgeType,
  badgeData,
}: ColoredInfoBadgeProps) {
  return (
    <InfoBadge
      icon={icon}
      label={label}
      borderColor={color || undefined}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      badgeType={badgeType}
      badgeData={badgeData}
    />
  );
}
