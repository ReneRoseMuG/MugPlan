import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

type HoverPreviewProps = {
  preview: ReactNode | null | undefined;
  children: ReactNode;
  openDelay?: number;
  closeDelay?: number;
  mode?: "anchored" | "cursor";
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  maxWidth?: number;
  maxHeight?: number;
  cursorOffsetX?: number;
  cursorOffsetY?: number;
  viewportPadding?: number;
  className?: string;
  contentClassName?: string;
};

const DEFAULT_OPEN_DELAY = 150;
const DEFAULT_CLOSE_DELAY = 100;

function composeMouseHandler<T extends ReactMouseEvent>(
  original: ((event: T) => void) | undefined,
  next: (event: T) => void,
) {
  return (event: T) => {
    original?.(event);
    next(event);
  };
}

function toMillis(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, value);
}

export function HoverPreview({
  preview,
  children,
  openDelay = DEFAULT_OPEN_DELAY,
  closeDelay = DEFAULT_CLOSE_DELAY,
  mode = "anchored",
  side = "right",
  align = "start",
  sideOffset = 8,
  maxWidth = 360,
  maxHeight = 260,
  cursorOffsetX = 14,
  cursorOffsetY = 18,
  viewportPadding = 8,
  className,
  contentClassName,
}: HoverPreviewProps) {
  const [open, setOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleOpen = () => {
    clearCloseTimer();
    clearOpenTimer();
    const delayMs = toMillis(openDelay, DEFAULT_OPEN_DELAY);
    openTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      openTimeoutRef.current = null;
    }, delayMs);
  };

  const scheduleClose = () => {
    clearOpenTimer();
    clearCloseTimer();
    const delayMs = toMillis(closeDelay, DEFAULT_CLOSE_DELAY);
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, delayMs);
  };

  const handleTriggerMouseEnter = (event: ReactMouseEvent) => {
    if (mode === "cursor") {
      setCursorPos({ x: event.clientX, y: event.clientY });
    }
    scheduleOpen();
  };

  const handleTriggerMouseMove = (event: ReactMouseEvent) => {
    if (mode !== "cursor") return;
    setCursorPos({ x: event.clientX, y: event.clientY });
  };

  const handleTriggerMouseLeave = () => {
    scheduleClose();
  };

  const handlePreviewMouseEnter = () => {
    clearCloseTimer();
  };

  const handlePreviewMouseLeave = () => {
    scheduleClose();
  };

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, []);

  if (!preview) {
    return <>{children}</>;
  }

  const childElement = isValidElement(children)
    ? (children as ReactElement<{
        onMouseEnter?: (event: ReactMouseEvent) => void;
        onMouseMove?: (event: ReactMouseEvent) => void;
        onMouseLeave?: (event: ReactMouseEvent) => void;
      }>)
    : null;

  const triggerNode = childElement
    ? cloneElement(childElement, {
        onMouseEnter: composeMouseHandler(childElement.props.onMouseEnter, handleTriggerMouseEnter),
        onMouseMove: composeMouseHandler(childElement.props.onMouseMove, handleTriggerMouseMove),
        onMouseLeave: composeMouseHandler(childElement.props.onMouseLeave, handleTriggerMouseLeave),
      })
    : (
      <span
        onMouseEnter={handleTriggerMouseEnter}
        onMouseMove={handleTriggerMouseMove}
        onMouseLeave={handleTriggerMouseLeave}
      >
        {children}
      </span>
    );

  if (mode === "anchored") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerNode}</PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          style={{ maxWidth, maxHeight }}
          className={cn(className)}
          onMouseEnter={handlePreviewMouseEnter}
          onMouseLeave={handlePreviewMouseLeave}
        >
          <div className={cn(contentClassName)}>{preview}</div>
        </PopoverContent>
      </Popover>
    );
  }

  const cursorPosition = (() => {
    if (typeof window === "undefined") {
      return {
        left: cursorPos.x + cursorOffsetX,
        top: cursorPos.y + cursorOffsetY,
      };
    }

    const preferredLeft = cursorPos.x + cursorOffsetX;
    const preferredTop = cursorPos.y + cursorOffsetY;
    const maxLeft = window.innerWidth - maxWidth - viewportPadding;
    const maxTop = window.innerHeight - maxHeight - viewportPadding;

    return {
      left: Math.max(viewportPadding, Math.min(preferredLeft, maxLeft)),
      top: Math.max(viewportPadding, Math.min(preferredTop, maxTop)),
    };
  })();

  return (
    <>
      {triggerNode}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className={cn("fixed z-50", className)}
              style={{
                left: cursorPosition.left,
                top: cursorPosition.top,
                maxWidth,
                maxHeight,
              }}
              onMouseEnter={handlePreviewMouseEnter}
              onMouseLeave={handlePreviewMouseLeave}
            >
              <div className={cn(contentClassName)}>{preview}</div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
