import { InfoBadge } from "@/components/ui/info-badge";
import type { ReactNode } from "react";

interface ColoredInfoBadgeProps {
  icon: ReactNode;
  label: string;
  color?: string | null;
  onRemove?: () => void;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
}

export function ColoredInfoBadge({ 
  icon, 
  label, 
  color,
  onRemove,
  testId,
  size = "default",
  fullWidth = false
}: ColoredInfoBadgeProps) {
  return (
    <InfoBadge
      icon={icon}
      label={label}
      borderColor={color || undefined}
      onRemove={onRemove}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
    />
  );
}
