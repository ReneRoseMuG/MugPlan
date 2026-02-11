import { useEffect, useRef, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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

export function CalendarWeekTourLaneHeaderBar({
  label,
  color,
  members = [],
  testId,
}: CalendarWeekTourLaneHeaderBarProps) {
  const [open, setOpen] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
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

  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <div
          className="h-7 w-full rounded-md px-3 text-xs font-semibold uppercase tracking-wide text-white/95 shadow-sm"
          style={{ backgroundColor: color ?? "#64748b" }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-testid={testId}
        >
          <div className="flex h-full items-center justify-between gap-2">
            <span className="truncate">{label}</span>
            <span className="text-[10px] opacity-90">{members.length}</span>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="max-h-[260px] max-w-[360px] overflow-y-auto"
        onMouseEnter={() => {
          if (openTimeoutRef.current) {
            clearTimeout(openTimeoutRef.current);
            openTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => setOpen(false)}
      >
        <TourInfoBadgePreview name={label} members={members} />
      </HoverCardContent>
    </HoverCard>
  );
}
