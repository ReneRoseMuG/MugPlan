import { InfoBadge } from "@/components/ui/info-badge";
import type { InfoBadgePreview } from "@/components/ui/info-badge";
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
  preview?: InfoBadgePreview;
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
  preview,
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
      preview={preview}
    />
  );
}
