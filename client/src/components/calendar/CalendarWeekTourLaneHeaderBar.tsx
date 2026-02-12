import { useEffect, useRef, useState } from "react";
import { TourInfoBadgePreview } from "@/components/ui/badge-previews/tour-info-badge-preview";

type TourLaneMember = {
  id?: number | string;
  fullName: string;
};

type CalendarWeekTourLaneHeaderBarProps = {
  label: string;
  color?: string | null;
  members?: TourLaneMember[];
  testId?: string;
};

const OPEN_DELAY_MS = 380;
const CURSOR_OFFSET_X = 14;
const CURSOR_OFFSET_Y = 18;
const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 260;

export function CalendarWeekTourLaneHeaderBar({
  label,
  color,
  members = [],
  testId,
}: CalendarWeekTourLaneHeaderBarProps) {
  const [open, setOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
    setCursorPos({ x: event.clientX, y: event.clientY });
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
    }
    openTimeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, OPEN_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    setOpen(false);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setCursorPos({ x: event.clientX, y: event.clientY });
  };

  const previewLeft = (() => {
    if (typeof window === "undefined") return cursorPos.x + CURSOR_OFFSET_X;
    const maxLeft = window.innerWidth - PREVIEW_WIDTH - 8;
    return Math.max(8, Math.min(cursorPos.x + CURSOR_OFFSET_X, maxLeft));
  })();

  const previewTop = (() => {
    if (typeof window === "undefined") return cursorPos.y + CURSOR_OFFSET_Y;
    const maxTop = window.innerHeight - PREVIEW_HEIGHT - 8;
    return Math.max(8, Math.min(cursorPos.y + CURSOR_OFFSET_Y, maxTop));
  })();

  return (
    <>
      <div
        className="h-7 w-full rounded-md px-3 text-xs font-semibold uppercase tracking-wide text-white/95 shadow-sm"
        style={{ backgroundColor: color ?? "#64748b" }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        data-testid={testId}
      >
        <div className="flex h-full items-center justify-between gap-2">
          <span className="truncate">{label}</span>
          <span className="text-[10px] opacity-90">{members.length}</span>
        </div>
      </div>
      {open && (
        <div
          className="pointer-events-none fixed z-50 w-[360px] max-h-[260px] overflow-y-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
          style={{
            left: previewLeft,
            top: previewTop,
          }}
          aria-hidden
        >
          <TourInfoBadgePreview name={label} members={members} />
        </div>
      )}
    </>
  );
}
