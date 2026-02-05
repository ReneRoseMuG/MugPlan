import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getPreviewOptions, renderPreview } from "@/components/ui/badge-preview-registry";
import type { BadgeData, BadgeType } from "@/components/ui/badge-preview-registry";
import { useBadgeInteractions } from "@/components/ui/badge-interaction-provider";
import { Minus, Plus, X } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  badgeType?: BadgeType;
  badgeData?: BadgeData;
}

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
  badgeType,
  badgeData,
}: InfoBadgeProps) {
  const interactions = useBadgeInteractions();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs gap-1" 
    : "px-3 py-2 gap-2";
  
  const widthClass = fullWidth ? "w-full" : "inline-flex";
  const actionColumnClass = size === "sm" ? "w-5" : "w-6";
  const resolvedAction = action ?? (onRemove ? "remove" : "none");
  const previewContent = useMemo(
    () => (badgeType && badgeData ? renderPreview(badgeType, badgeData) : null),
    [badgeType, badgeData],
  );
  const previewOptions = useMemo(
    () => (badgeType ? getPreviewOptions(badgeType) : null),
    [badgeType],
  );

  const editHandler = useMemo(() => {
    if (!badgeType || !interactions) return null;
    if (badgeType === "team") return interactions.openTeamEdit ?? null;
    if (badgeType === "tour") return interactions.openTourEdit ?? null;
    if (badgeType === "appointment") return interactions.openAppointmentEdit ?? null;
    if (badgeType === "employee") return interactions.openEmployeeEdit ?? null;
    if (badgeType === "customer") return interactions.openCustomerEdit ?? null;
    if (badgeType === "project") return interactions.openProjectEdit ?? null;
    return null;
  }, [badgeType, interactions]);

  const canEdit = Boolean(editHandler && badgeData?.id != null);
  const isCompact = size === "sm";
  const overlayEnabled = canEdit && !isCompact && Boolean(previewContent);

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
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
    if (contextMenuOpen) return;
    if (previewContent && previewOptions) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = setTimeout(() => {
        setPreviewOpen(true);
      }, previewOptions.openDelayMs);
    }
    if (overlayEnabled) {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => {
        setOverlayVisible(true);
      }, 2000);
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
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
    setOverlayVisible(false);
  };

  const badgeBody = (
    <div 
      className={`info-badge group flex items-center justify-between border border-border bg-muted/50 rounded ${sizeClasses} ${widthClass}`}
      style={borderColor ? { borderLeftWidth: '5px', borderLeftColor: borderColor } : undefined}
      data-testid={testId}
      onDoubleClick={onDoubleClick}
      onContextMenu={() => {
        setPreviewOpen(false);
        setOverlayVisible(false);
        if (overlayTimeoutRef.current) {
          clearTimeout(overlayTimeoutRef.current);
          overlayTimeoutRef.current = null;
        }
        if (openTimeoutRef.current) {
          clearTimeout(openTimeoutRef.current);
          openTimeoutRef.current = null;
        }
      }}
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
      {overlayEnabled && (
        <div className={`info-badge__overlay ${overlayVisible ? "info-badge__overlay--visible" : ""}`}>
          <span className="info-badge__overlay-text">Rechtsklick zum Bearbeiten</span>
        </div>
      )}
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
          {canEdit && (
            <div className="text-[11px] text-muted-foreground">
              Rechtsklick: Bearbeiten
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    badgeBody
  );

  if (!canEdit) {
    return previewWrapper;
  }

  const wrapperClass = fullWidth ? "w-full" : "inline-flex";

  return (
    <ContextMenu
      open={contextMenuOpen}
      onOpenChange={(nextOpen) => {
        setContextMenuOpen(nextOpen);
        if (nextOpen) {
          setPreviewOpen(false);
          if (openTimeoutRef.current) {
            clearTimeout(openTimeoutRef.current);
            openTimeoutRef.current = null;
          }
        }
      }}
    >
      <ContextMenuTrigger asChild>
        <div className={wrapperClass}>
          {previewWrapper}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={() => {
            if (editHandler && badgeData?.id != null) {
              editHandler(badgeData.id);
            }
          }}
        >
          Bearbeiten
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
