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
  const wrapperClassName = menuSlot
    ? "grid h-full min-w-0 grid-cols-[2.25rem_minmax(0,1fr)]"
    : "h-full min-w-0";
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
      <span className="relative z-30 flex min-w-0 items-center gap-2 px-2.5">
        <span className="inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-sm bg-black/35 px-1.5 py-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.14)]">
          {label}
        </span>
        {statusSlot ? <span className="flex shrink-0 items-center">{statusSlot}</span> : null}
      </span>
    </>
  );

  return (
    <div
      className="h-7 w-full rounded-md border text-xs font-semibold tracking-wide shadow-sm"
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
      <div className={wrapperClassName}>
        {menuSlot ? (
          <span className="relative z-20 flex items-center justify-center border-r border-white/15 bg-black/5">
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
