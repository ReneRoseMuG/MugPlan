import { Button } from "@/components/ui/button";
import { HoverPreview } from "@/components/ui/hover-preview";
import { Minus, X } from "lucide-react";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import type { MouseEvent, ReactNode } from "react";

export type InfoBadgePreviewOptions = {
  openDelayMs: number;
  mode: "anchored" | "cursor";
  side: "top" | "right" | "bottom" | "left";
  align: "start" | "center" | "end";
  maxWidth: number;
  minWidth?: number;
  maxHeight: number | null;
  scrollY: "auto" | "visible";
  cursorOffsetX?: number;
  cursorOffsetY?: number;
  viewportPadding?: number;
};

export type InfoBadgePreview = {
  content: ReactNode;
  options?: Partial<InfoBadgePreviewOptions>;
};

interface InfoBadgeProps {
  icon: ReactNode;
  label: ReactNode;
  borderColor?: string;
  surfaceColor?: string;
  foregroundColor?: string;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  actionDisabled?: boolean;
  customAction?: ReactNode;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  onDoubleClick?: () => void;
  preview?: InfoBadgePreview;
  visualStyle?: "default" | "footer";
}

const defaultPreviewOptions: InfoBadgePreviewOptions = {
  openDelayMs: 380,
  mode: "anchored",
  side: "right",
  align: "start",
  maxWidth: 360,
  maxHeight: 260,
  scrollY: "auto",
};

export function InfoBadge({
  icon,
  label,
  borderColor,
  surfaceColor,
  foregroundColor,
  action,
  onAdd,
  onRemove,
  actionDisabled = false,
  customAction,
  testId,
  size = "default",
  fullWidth = false,
  onDoubleClick,
  preview,
  visualStyle = "default",
}: InfoBadgeProps) {
  const sizeClasses = visualStyle === "footer"
    ? "h-7 px-2 text-[10px] gap-1 font-semibold"
    : size === "sm"
      ? "px-2 py-0.5 text-xs gap-1"
      : "px-3 py-2 gap-2";
  
  const widthClass = fullWidth ? "w-full" : "inline-flex";
  const resolvedAction = action ?? (onRemove ? "remove" : "none");
  const actionColumnClass = customAction || resolvedAction !== "none"
    ? (resolvedAction === "add" ? "w-7" : (size === "sm" ? "w-5" : "w-6"))
    : "w-0";
  const previewContent = preview?.content ?? null;
  const previewOptions = {
    ...defaultPreviewOptions,
    ...preview?.options,
  };

  const usesSolidSurface = visualStyle === "footer" && Boolean(surfaceColor);
  const isFooterStyle = visualStyle === "footer";

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
      className={`info-badge group flex items-center ${isFooterStyle ? "justify-start" : "justify-between"} border ${isFooterStyle ? "rounded-md" : "rounded"} ${usesSolidSurface ? "" : "border-border bg-muted/50"} ${sizeClasses} ${widthClass}`}
      style={
        usesSolidSurface
          ? {
              backgroundColor: surfaceColor,
              borderColor: surfaceColor,
              color: foregroundColor ?? "#ffffff",
            }
          : borderColor
            ? { borderLeftWidth: '5px', borderLeftColor: borderColor }
            : undefined
      }
      data-testid={testId}
      onDoubleClick={onDoubleClick}
    >
      <div className={`flex items-center min-w-0 ${isFooterStyle ? "gap-1" : size === "sm" ? "gap-1 flex-1" : "gap-2 flex-1"}`}>
        <span className={usesSolidSurface ? "text-current" : "text-muted-foreground"}>{icon}</span>
        <div className={`min-w-0 ${isFooterStyle ? "shrink-0" : "flex-1"} ${usesSolidSurface ? "font-semibold text-current" : `font-medium text-foreground ${size === "sm" ? "text-xs" : ""}`}`}>{label}</div>
      </div>
      <div className={`flex items-center justify-end shrink-0 ${customAction ? "overflow-visible" : "overflow-hidden"} ${actionColumnClass}`}>
        {customAction ?? null}
        {!customAction && resolvedAction === "add" && (
          <PlusActionButton
            onClick={handleActionClick}
            disabled={actionDisabled}
            data-testid={testId ? `${testId}-add` : undefined}
          />
        )}
        {!customAction && resolvedAction === "remove" && (
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

  const previewClassName = previewOptions.scrollY === "auto"
    ? "overflow-y-auto"
    : "overflow-visible p-0 border-0 bg-transparent shadow-none w-auto";

  const previewWrapper = previewContent && previewOptions ? (
    <HoverPreview
      preview={previewContent}
      openDelay={previewOptions.openDelayMs}
      closeDelay={80}
      mode={previewOptions.mode}
      side={previewOptions.side}
      align={previewOptions.align}
      sideOffset={8}
      maxWidth={previewOptions.maxWidth}
      minWidth={previewOptions.minWidth}
      maxHeight={previewOptions.maxHeight}
      cursorOffsetX={previewOptions.cursorOffsetX}
      cursorOffsetY={previewOptions.cursorOffsetY}
      viewportPadding={previewOptions.viewportPadding}
      className={previewClassName}
      contentClassName="space-y-2"
    >
      {badgeBody}
    </HoverPreview>
  ) : badgeBody;

  return previewWrapper;
}
