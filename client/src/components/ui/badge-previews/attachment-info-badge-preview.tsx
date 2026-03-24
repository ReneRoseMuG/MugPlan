import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSetting } from "@/hooks/useSettings";
import { InfoBadge, type InfoBadgePreview } from "@/components/ui/info-badge";
import type { ReactNode } from "react";

export type AttachmentPreviewSize = "small" | "medium" | "large";

type AttachmentPreviewDimensions = {
  popoverMaxWidth: number;
  popoverMaxHeight: number;
  contentMaxHeight: number;
  iframeHeight: number;
};

type AttachmentInfoBadgePreviewProps = {
  originalName: string;
  mimeType?: string | null;
  openUrl: string;
  downloadUrl: string;
  previewSize?: AttachmentPreviewSize;
  onClose?: () => void;
  onDragHandleMouseDown?: (e: React.MouseEvent) => void;
};

const attachmentInfoBadgePreviewBaseOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
};

const mediumAttachmentPreviewDimensions: AttachmentPreviewDimensions = {
  popoverMaxWidth: 988,
  popoverMaxHeight: 923,
  contentMaxHeight: 708,
  iframeHeight: 677,
};

const attachmentPreviewModeFactors: Record<AttachmentPreviewSize, number> = {
  small: 0.85,
  medium: 1,
  large: 1.15,
};

function useOptionalAttachmentPreviewSizeSetting(): unknown {
  try {
    return useSetting("attachmentPreviewSize");
  } catch {
    return undefined;
  }
}

function useOptionalHoverPreviewDelaySetting(): number | undefined {
  try {
    return useSetting("hoverPreviewOpenDelayMs");
  } catch {
    return undefined;
  }
}

export function parseAttachmentPreviewSize(value: unknown): AttachmentPreviewSize {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }
  return "large";
}

export function resolveAttachmentPreviewDimensions(size: AttachmentPreviewSize): AttachmentPreviewDimensions {
  const factor = attachmentPreviewModeFactors[size];
  return {
    popoverMaxWidth: Math.round(mediumAttachmentPreviewDimensions.popoverMaxWidth * factor),
    popoverMaxHeight: Math.round(mediumAttachmentPreviewDimensions.popoverMaxHeight * factor),
    contentMaxHeight: Math.round(mediumAttachmentPreviewDimensions.contentMaxHeight * factor),
    iframeHeight: Math.round(mediumAttachmentPreviewDimensions.iframeHeight * factor),
  };
}

function resolveAbsoluteUrl(value: string): string {
  if (typeof window === "undefined") return value;
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

function isTxtLikeFile(mimeType: string, lowerName: string) {
  return mimeType === "text/plain" || lowerName.endsWith(".txt");
}

export function AttachmentInfoBadgePreview({
  originalName,
  mimeType,
  openUrl,
  downloadUrl,
  previewSize,
  onClose,
  onDragHandleMouseDown,
}: AttachmentInfoBadgePreviewProps) {
  const attachmentPreviewSizeSetting = useOptionalAttachmentPreviewSizeSetting();
  const effectivePreviewSize = parseAttachmentPreviewSize(previewSize ?? attachmentPreviewSizeSetting);
  const dimensions = resolveAttachmentPreviewDimensions(effectivePreviewSize);
  const resolvedMimeType = mimeType ?? "";
  const lowerName = originalName.toLowerCase();
  const isPdf = resolvedMimeType === "application/pdf" || lowerName.endsWith(".pdf");
  const isImage = resolvedMimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(lowerName);
  const isWord = resolvedMimeType.includes("word") || /\.(doc|docx)$/i.test(lowerName);
  const isTxt = isTxtLikeFile(resolvedMimeType, lowerName);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  const officeEmbedUrl = useMemo(() => {
    if (!isWord) return null;
    const absoluteUrl = resolveAbsoluteUrl(openUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
  }, [isWord, openUrl]);

  useEffect(() => {
    if (!isTxt) return;

    const controller = new AbortController();
    setIsLoadingText(true);
    setTextError(null);
    setTextContent(null);

    fetch(openUrl, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        setTextContent(text);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Textvorschau konnte nicht geladen werden.";
        setTextError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingText(false);
        }
      });

    return () => controller.abort();
  }, [isTxt, openUrl]);

  return (
    <div className="space-y-3">
      <div
        className="flex items-center justify-between gap-3"
        style={{ cursor: onDragHandleMouseDown ? "grab" : undefined }}
        onMouseDown={onDragHandleMouseDown}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate">{originalName}</span>
        </div>
        <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" asChild>
            <a href={openUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" />
              Öffnen
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={downloadUrl} target="_blank" rel="noreferrer" download>
              Download
            </a>
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} aria-label="Vorschau schließen">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isImage ? (
        <div
          className="overflow-auto rounded-md border border-border bg-background p-2"
          style={{ maxHeight: dimensions.contentMaxHeight }}
        >
          <img
            src={openUrl}
            alt={originalName}
            className="h-auto max-w-full"
          />
        </div>
      ) : (
        <div
          className="overflow-auto rounded-md border border-border bg-background p-2"
          style={{ maxHeight: dimensions.contentMaxHeight }}
        >
          {isPdf ? (
            <iframe
              title={`Vorschau ${originalName}`}
              src={openUrl}
              className="w-full border-0"
              style={{ height: dimensions.iframeHeight }}
            />
          ) : isWord && officeEmbedUrl ? (
            <iframe
              title={`Word-Vorschau ${originalName}`}
              src={officeEmbedUrl}
              className="w-full border-0"
              style={{ height: dimensions.iframeHeight }}
            />
          ) : isTxt ? (
            <div className="text-sm text-muted-foreground">
              {isLoadingText && <p>Textvorschau wird geladen...</p>}
              {textError && <p>Textvorschau nicht verfügbar: {textError}</p>}
              {textContent && (
                <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                  {textContent}
                </pre>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Keine Inline-Vorschau verfügbar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function createAttachmentInfoBadgePreview(
  props: Omit<AttachmentInfoBadgePreviewProps, "onClose">,
): InfoBadgePreview {
  const previewSize = parseAttachmentPreviewSize(props.previewSize);
  const dimensions = resolveAttachmentPreviewDimensions(previewSize);
  return {
    content: <AttachmentInfoBadgePreview {...props} />,
    options: {
      ...attachmentInfoBadgePreviewBaseOptions,
      maxWidth: dimensions.popoverMaxWidth,
      minWidth: dimensions.popoverMaxWidth,
      maxHeight: dimensions.popoverMaxHeight,
    },
  };
}

// ---------------------------------------------------------------------------
// Draggable attachment preview
// ---------------------------------------------------------------------------

const DRAG_THRESHOLD = 4;
const VIEWPORT_PADDING = 8;

type DragPhase = "idle" | "intent" | "dragging" | "pinned";

function resolveAttachmentPreviewIcon(
  mimeType: string | null | undefined,
  originalName: string,
): ReactNode {
  const resolved = mimeType ?? "";
  const lower = originalName.toLowerCase();
  const isPdf = resolved === "application/pdf" || lower.endsWith(".pdf");
  const isImage = resolved.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(lower);
  if (isImage) return <ImageIcon className="h-4 w-4" />;
  if (isPdf) return <FileText className="h-4 w-4" />;
  return <Paperclip className="h-4 w-4" />;
}

export interface DraggableAttachmentBadgeProps {
  originalName: string;
  mimeType: string | null;
  openUrl: string;
  downloadUrl: string;
  previewSize?: AttachmentPreviewSize;
  onRemove?: () => void;
  actionDisabled?: boolean;
  actionSlot?: ReactNode;
  testId?: string;
}

export function DraggableAttachmentBadge({
  originalName,
  mimeType,
  openUrl,
  downloadUrl,
  previewSize: previewSizeProp,
  onRemove,
  actionDisabled,
  actionSlot,
  testId,
}: DraggableAttachmentBadgeProps) {
  const globalOpenDelayMs = useOptionalHoverPreviewDelaySetting();
  const dimensions = resolveAttachmentPreviewDimensions(
    parseAttachmentPreviewSize(previewSizeProp),
  );

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [dragPhase, setDragPhase] = useState<DragPhase>("idle");
  const [portalPos, setPortalPos] = useState({ x: 0, y: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const portalPosRef = useRef({ x: 0, y: 0 });
  const dragPhaseRef = useRef<DragPhase>("idle");

  // Keep ref in sync with state for use in stale closures
  useEffect(() => {
    dragPhaseRef.current = dragPhase;
  }, [dragPhase]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Document-level mouse listeners during drag
  useEffect(() => {
    if (dragPhase !== "intent" && dragPhase !== "dragging") return;

    const onMove = (e: MouseEvent) => {
      if (dragPhaseRef.current === "intent") {
        const dx = e.clientX - intentStartRef.current.x;
        const dy = e.clientY - intentStartRef.current.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          dragOffsetRef.current = {
            x: portalPosRef.current.x - e.clientX,
            y: portalPosRef.current.y - e.clientY,
          };
          setDragPhase("dragging");
        }
      } else if (dragPhaseRef.current === "dragging") {
        const w = typeof window !== "undefined" ? window.innerWidth : 1024;
        const h = typeof window !== "undefined" ? window.innerHeight : 768;
        const portalW = portalRef.current?.offsetWidth ?? dimensions.popoverMaxWidth;
        const portalH = portalRef.current?.offsetHeight ?? dimensions.popoverMaxHeight;
        const clampedX = Math.max(
          VIEWPORT_PADDING,
          Math.min(e.clientX + dragOffsetRef.current.x, w - portalW - VIEWPORT_PADDING),
        );
        const clampedY = Math.max(
          VIEWPORT_PADDING,
          Math.min(e.clientY + dragOffsetRef.current.y, h - portalH - VIEWPORT_PADDING),
        );
        portalPosRef.current = { x: clampedX, y: clampedY };
        setPortalPos({ x: clampedX, y: clampedY });
      }
    };

    const onUp = () => {
      if (dragPhaseRef.current === "dragging") {
        setDragPhase("pinned");
      } else {
        setDragPhase("idle");
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragPhase, dimensions.popoverMaxWidth, dimensions.popoverMaxHeight]);

  const clearOpenTimer = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleOpen = () => {
    if (dragPhaseRef.current !== "idle") return;
    clearCloseTimer();
    clearOpenTimer();
    const delay =
      typeof globalOpenDelayMs === "number" && Number.isFinite(globalOpenDelayMs)
        ? Math.max(0, globalOpenDelayMs)
        : 380;
    openTimerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const h = typeof window !== "undefined" ? window.innerHeight : 768;
        const x = Math.max(
          VIEWPORT_PADDING,
          rect.left - dimensions.popoverMaxWidth - 8,
        );
        const y = Math.max(
          VIEWPORT_PADDING,
          Math.min(rect.top, h - dimensions.popoverMaxHeight - VIEWPORT_PADDING),
        );
        portalPosRef.current = { x, y };
        setPortalPos({ x, y });
      }
      setIsPreviewOpen(true);
    }, delay);
  };

  const scheduleClose = () => {
    const phase = dragPhaseRef.current;
    if (phase === "dragging" || phase === "pinned") return;
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsPreviewOpen(false);
    }, 80);
  };

  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    intentStartRef.current = { x: e.clientX, y: e.clientY };
    setDragPhase("intent");
  };

  const handleClose = () => {
    clearOpenTimer();
    clearCloseTimer();
    setIsPreviewOpen(false);
    setDragPhase("idle");
  };

  const isPinned = dragPhase === "pinned";
  const isDragging = dragPhase === "dragging";
  const showPreview = isPreviewOpen || isDragging || isPinned;

  return (
    <>
      <div
        ref={triggerRef}
        data-testid={testId ? `${testId}-trigger` : undefined}
        onMouseEnter={scheduleOpen}
        onMouseLeave={() => {
          if (dragPhaseRef.current === "idle") scheduleClose();
        }}
      >
        <InfoBadge
          icon={resolveAttachmentPreviewIcon(mimeType, originalName)}
          label={<span className="block max-w-full truncate">{originalName}</span>}
          action={onRemove ? "remove" : "none"}
          onRemove={onRemove}
          actionDisabled={actionDisabled}
          customAction={actionSlot}
          fullWidth
          testId={testId}
        />
      </div>
      {showPreview && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={portalRef}
              className="fixed z-50 overflow-auto rounded-lg border bg-popover p-4 shadow-md"
              style={{
                left: portalPos.x,
                top: portalPos.y,
                width: dimensions.popoverMaxWidth,
                maxHeight: dimensions.popoverMaxHeight,
                cursor: isDragging ? "grabbing" : undefined,
              }}
              data-testid={testId ? `${testId}-preview` : "attachment-preview-portal"}
              data-drag-phase={dragPhase}
              onMouseEnter={() => {
                if (dragPhaseRef.current === "idle") clearCloseTimer();
              }}
              onMouseLeave={() => {
                if (dragPhaseRef.current === "idle") scheduleClose();
              }}
            >
              <AttachmentInfoBadgePreview
                originalName={originalName}
                mimeType={mimeType}
                openUrl={openUrl}
                downloadUrl={downloadUrl}
                previewSize={previewSizeProp}
                onClose={isPinned ? handleClose : undefined}
                onDragHandleMouseDown={handlePreviewMouseDown}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
