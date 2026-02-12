import { Button } from "@/components/ui/button";
import { HoverPreview } from "@/components/ui/hover-preview";
import { Minus, Plus, X } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

export type InfoBadgePreviewOptions = {
  openDelayMs: number;
  side: "top" | "right" | "bottom" | "left";
  align: "start" | "center" | "end";
  maxWidth: number;
  maxHeight: number;
};

export type InfoBadgePreview = {
  content: ReactNode;
  options?: Partial<InfoBadgePreviewOptions>;
};

interface InfoBadgeProps {
  icon: ReactNode;
  label: ReactNode;
  borderColor?: string;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  actionDisabled?: boolean;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  onDoubleClick?: () => void;
  preview?: InfoBadgePreview;
}

const defaultPreviewOptions: InfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right",
  align: "start",
  maxWidth: 360,
  maxHeight: 260,
};

export function InfoBadge({ 
  icon, 
  label, 
  borderColor, 
  action,
  onAdd,
  onRemove,
  actionDisabled = false,
  testId,
  size = "default",
  fullWidth = false,
  onDoubleClick,
  preview,
}: InfoBadgeProps) {
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs gap-1" 
    : "px-3 py-2 gap-2";
  
  const widthClass = fullWidth ? "w-full" : "inline-flex";
  const actionColumnClass = size === "sm" ? "w-5" : "w-6";
  const resolvedAction = action ?? (onRemove ? "remove" : "none");
  const previewContent = preview?.content ?? null;
  const previewOptions = {
    ...defaultPreviewOptions,
    ...preview?.options,
  };

  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (resolvedAction === "add") {
      onAdd?.();
    }
    if (resolvedAction === "remove") {
      onRemove?.();
    }
  };
  
  const badgeBody = (
    <div 
      className={`info-badge group flex items-center justify-between border border-border bg-muted/50 rounded ${sizeClasses} ${widthClass}`}
      style={borderColor ? { borderLeftWidth: '5px', borderLeftColor: borderColor } : undefined}
      data-testid={testId}
      onDoubleClick={onDoubleClick}
    >
      <div className={`flex items-center flex-1 min-w-0 ${size === "sm" ? "gap-1" : "gap-2"}`}>
        <span className="text-muted-foreground">{icon}</span>
        <div className={`font-medium text-foreground ${size === "sm" ? "text-xs" : ""}`}>{label}</div>
      </div>
      <div className={`flex items-center justify-end shrink-0 ${actionColumnClass}`}>
        {resolvedAction === "add" && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleActionClick}
            disabled={actionDisabled}
            className={size === "sm" ? "h-4 w-4" : "h-5 w-5"}
            data-testid={testId ? `${testId}-add` : undefined}
          >
            <Plus className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
          </Button>
        )}
        {resolvedAction === "remove" && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleActionClick}
            disabled={actionDisabled}
            className={size === "sm" ? "h-4 w-4" : "h-5 w-5"}
            data-testid={testId ? `${testId}-remove` : undefined}
          >
            {action === "remove" ? (
              <Minus className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
            ) : (
              <X className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  const previewWrapper = previewContent && previewOptions ? (
    <HoverPreview
      preview={previewContent}
      openDelay={previewOptions.openDelayMs}
      closeDelay={80}
      mode="anchored"
      side={previewOptions.side}
      align={previewOptions.align}
      sideOffset={8}
      maxWidth={previewOptions.maxWidth}
      maxHeight={previewOptions.maxHeight}
      className="overflow-y-auto"
      contentClassName="space-y-2"
    >
      {badgeBody}
    </HoverPreview>
  ) : badgeBody;

  return previewWrapper;
}
