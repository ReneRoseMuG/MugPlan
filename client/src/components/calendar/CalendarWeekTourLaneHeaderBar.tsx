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
}: CalendarWeekTourLaneHeaderBarProps) {
  const resolvedColor = color ?? "#64748b";

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      className={`h-7 w-full rounded-md border text-xs font-semibold tracking-wide shadow-sm transition ${
        interactive ? "cursor-pointer hover:-translate-y-[1px] hover:shadow-md" : "cursor-default"
      }`}
      style={{
        backgroundColor: resolvedColor,
        color: "#ffffff",
        borderColor: "rgba(255,255,255,0.22)",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.18) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 6px rgba(15,23,42,0.2)",
      }}
      data-testid={testId}
      aria-expanded={isExpanded}
    >
      <div className="grid h-full min-w-0 grid-cols-[2.4rem_minmax(0,1fr)]">
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
        <span className="flex min-w-0 items-center px-2.5">
          <span className="truncate">{label}</span>
        </span>
      </div>
    </button>
  );
}
