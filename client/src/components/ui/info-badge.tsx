import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface InfoBadgeProps {
  icon: ReactNode;
  label: string;
  borderColor?: string;
  onRemove?: () => void;
  testId?: string;
}

export function InfoBadge({ 
  icon, 
  label, 
  borderColor, 
  onRemove,
  testId 
}: InfoBadgeProps) {
  return (
    <div 
      className="flex items-center justify-between gap-2 px-3 py-2 border border-border bg-muted/50 rounded-md"
      style={borderColor ? { borderLeftWidth: '5px', borderLeftColor: borderColor } : undefined}
      data-testid={testId}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      {onRemove && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="h-5 w-5"
          data-testid={testId ? `${testId}-remove` : undefined}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
