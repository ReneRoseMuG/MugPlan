import React from "react";

type CalendarWeekTourLaneHeaderBarProps = {
  label: string;
  color?: string | null;
  isExpanded?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  testId?: string;
  weekNotesIcon?: React.ReactNode;
  weekNotesCount?: React.ReactNode;
  statusSlot?: React.ReactNode;
  menuSlot?: React.ReactNode;
};

export function CalendarWeekTourLaneHeaderBar({
  label,
  color,
  isExpanded = true,
  interactive = false,
  onClick,
  testId,
  weekNotesIcon,
  weekNotesCount,
  statusSlot,
  menuSlot,
}: CalendarWeekTourLaneHeaderBarProps) {
  const resolvedColor = color ?? "#64748b";
  const layoutClassName = menuSlot
    ? "grid-cols-[2.25rem_2.4rem_minmax(0,1fr)]"
    : "grid-cols-[2.4rem_minmax(0,1fr)]";
  const content = (
    <>
      <span
        className="flex h-full items-center justify-center gap-0.5 border-r border-white/20 bg-black/10 px-0.5"
        aria-hidden={weekNotesIcon === undefined && weekNotesCount === undefined}
      >
        {weekNotesIcon ? (
          <span className="relative z-10 flex h-full flex-shrink-0 items-center opacity-85">{weekNotesIcon}</span>
        ) : null}
        {weekNotesCount !== undefined ? (
          <span className="relative z-10 flex h-full flex-shrink-0 items-center tabular-nums opacity-90">
            {weekNotesCount}
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 items-center gap-2 px-2.5">
        <span className="truncate">{label}</span>
        {statusSlot ? <span className="flex shrink-0 items-center">{statusSlot}</span> : null}
      </span>
    </>
  );

  return (
    <div
      className="relative z-10 h-7 w-full rounded-md border text-xs font-semibold tracking-wide shadow-sm"
      style={{
        backgroundColor: resolvedColor,
        color: "#ffffff",
        borderColor: "rgba(255,255,255,0.22)",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.18) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 6px rgba(15,23,42,0.2)",
      }}
    >
      <div className={`grid h-full min-w-0 ${layoutClassName}`}>
        {menuSlot ? (
          <span className="flex items-center justify-center border-r border-white/15 bg-black/5">
            {menuSlot}
          </span>
        ) : null}
        {interactive ? (
          <button
            type="button"
            onClick={onClick}
            className="grid min-w-0 grid-cols-[2.4rem_minmax(0,1fr)] transition hover:-translate-y-[1px] hover:shadow-md"
            data-testid={testId}
            aria-expanded={isExpanded}
          >
            {content}
          </button>
        ) : (
          <div
            className="grid min-w-0 grid-cols-[2.4rem_minmax(0,1fr)]"
            data-testid={testId}
            aria-expanded={isExpanded}
          >
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
