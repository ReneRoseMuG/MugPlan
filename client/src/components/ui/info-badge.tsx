import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface InfoBadgeProps {
  icon: ReactNode;
  label: string;
  borderColor?: string;
  onRemove?: () => void;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
}

export function InfoBadge({ 
  icon, 
  label, 
  borderColor, 
  onRemove,
  testId,
  size = "default",
  fullWidth = false
}: InfoBadgeProps) {
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs gap-1" 
    : "px-3 py-2 gap-2";
  
  const widthClass = fullWidth ? "w-full" : "inline-flex";
  
  return (
    <div 
      className={`flex items-center justify-between border border-border bg-muted/50 rounded ${sizeClasses} ${widthClass}`}
      style={borderColor ? { borderLeftWidth: '5px', borderLeftColor: borderColor } : undefined}
      data-testid={testId}
    >
      <div className={`flex items-center ${size === "sm" ? "gap-1" : "gap-2"}`}>
        <span className="text-muted-foreground">{icon}</span>
        <span className={`font-medium text-foreground ${size === "sm" ? "text-xs" : ""}`}>{label}</span>
      </div>
      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className={size === "sm" ? "h-4 w-4" : "h-5 w-5"}
          data-testid={testId ? `${testId}-remove` : undefined}
        >
          <X className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
        </Button>
      )}
    </div>
  );
}
