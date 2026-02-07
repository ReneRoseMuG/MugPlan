import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Minus, Plus, X } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (resolvedAction === "add") {
      onAdd?.();
    }
    if (resolvedAction === "remove") {
      onRemove?.();
    }
  };
  
  const handleMouseEnter = () => {
    if (previewContent && previewOptions) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = setTimeout(() => {
        setPreviewOpen(true);
      }, previewOptions.openDelayMs);
    }
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (previewContent) {
      closeTimeoutRef.current = setTimeout(() => {
        setPreviewOpen(false);
      }, 80);
    }
  };

  const badgeBody = (
    <div 
      className={`info-badge group flex items-center justify-between border border-border bg-muted/50 rounded ${sizeClasses} ${widthClass}`}
      style={borderColor ? { borderLeftWidth: '5px', borderLeftColor: borderColor } : undefined}
      data-testid={testId}
      onDoubleClick={onDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
    <Popover open={previewOpen} onOpenChange={setPreviewOpen}>
      <PopoverTrigger asChild>
        {badgeBody}
      </PopoverTrigger>
      <PopoverContent
        side={previewOptions.side}
        align={previewOptions.align}
        sideOffset={8}
        style={{ maxWidth: previewOptions.maxWidth, maxHeight: previewOptions.maxHeight }}
        className="overflow-y-auto"
        onMouseEnter={() => {
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          setPreviewOpen(false);
        }}
      >
        <div className="space-y-2">
          {previewContent}
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    badgeBody
  );

  return previewWrapper;
}
