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
  isExpanded?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  testId?: string;
};

const OPEN_DELAY_MS = 380;
const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 260;

export function CalendarWeekTourLaneHeaderBar({
  label,
  color,
  members = [],
  isExpanded = true,
  interactive = false,
  onClick,
  testId,
}: CalendarWeekTourLaneHeaderBarProps) {
  const resolvedColor = color ?? "#64748b";
  const textColor = (() => {
    if (!resolvedColor.startsWith("#")) return "#1a1a1a";
    const r = parseInt(resolvedColor.slice(1, 3), 16);
    const g = parseInt(resolvedColor.slice(3, 5), 16);
    const b = parseInt(resolvedColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#1a1a1a" : "#ffffff";
  })();

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
      <button
        type="button"
        onClick={interactive ? onClick : undefined}
        className={`h-7 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-wide shadow-sm transition ${
          interactive ? "cursor-pointer hover:-translate-y-[1px] hover:shadow-md" : "cursor-default"
        }`}
        style={{
          backgroundColor: resolvedColor,
          color: textColor,
          borderColor: "rgba(255,255,255,0.22)",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.18) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 6px rgba(15,23,42,0.2)",
        }}
        data-testid={testId}
        aria-expanded={isExpanded}
      >
        <div className="flex h-full items-center justify-between gap-2">
          <span className="truncate">{label}</span>
        </div>
      </button>
    </HoverPreview>
  );
}
