import { TourInfoBadgePreview } from "@/components/ui/badge-previews/tour-info-badge-preview";
import { HoverPreview } from "@/components/ui/hover-preview";

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
const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 260;

export function CalendarWeekTourLaneHeaderBar({
  label,
  color,
  members = [],
  testId,
}: CalendarWeekTourLaneHeaderBarProps) {
  return (
    <HoverPreview
      preview={<TourInfoBadgePreview name={label} members={members} />}
      mode="cursor"
      openDelay={OPEN_DELAY_MS}
      closeDelay={0}
      maxWidth={PREVIEW_WIDTH}
      maxHeight={PREVIEW_HEIGHT}
      cursorOffsetX={14}
      cursorOffsetY={18}
      className="w-[360px] max-h-[260px] overflow-y-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
      contentClassName="pointer-events-none"
    >
      <div
        className="h-7 w-full rounded-md px-3 text-xs font-semibold uppercase tracking-wide text-white/95 shadow-sm"
        style={{ backgroundColor: color ?? "#64748b" }}
        data-testid={testId}
      >
        <div className="flex h-full items-center justify-between gap-2">
          <span className="truncate">{label}</span>
          <span className="text-[10px] opacity-90">{members.length}</span>
        </div>
      </div>
    </HoverPreview>
  );
}
