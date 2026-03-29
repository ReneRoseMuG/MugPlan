import { InfoBadge } from "@/components/ui/info-badge";
import type { InfoBadgePreview } from "@/components/ui/info-badge";
import type { ReactNode } from "react";

interface ColoredInfoBadgeProps {
  icon: ReactNode;
  label: ReactNode;
  color?: string | null;
  foregroundColor?: string;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  preview?: InfoBadgePreview;
  visualStyle?: "default" | "footer";
}

export function ColoredInfoBadge({ 
  icon, 
  label, 
  color,
  foregroundColor,
  action,
  onAdd,
  onRemove,
  testId,
  size = "default",
  fullWidth = false,
  preview,
  visualStyle = "default",
}: ColoredInfoBadgeProps) {
  return (
    <InfoBadge
      icon={icon}
      label={label}
      borderColor={visualStyle === "footer" ? undefined : color || undefined}
      surfaceColor={visualStyle === "footer" ? color || undefined : undefined}
      foregroundColor={visualStyle === "footer" ? foregroundColor : undefined}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      preview={preview}
      visualStyle={visualStyle}
    />
  );
}
