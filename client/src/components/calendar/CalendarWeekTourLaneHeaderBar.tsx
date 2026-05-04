import React from "react";

type CalendarWeekTourLaneHeaderBarProps = {
  label: string;
  color?: string | null;
  isExpanded?: boolean;
  interactive?: boolean;
  reduced?: boolean;
  onClick?: () => void;
  testId?: string;
  statusSlot?: React.ReactNode;
};

export function CalendarWeekTourLaneHeaderBar({
  label,
  color,
  isExpanded = true,
  interactive = false,
  reduced = false,
  onClick,
  testId,
  statusSlot,
}: CalendarWeekTourLaneHeaderBarProps) {
  const resolvedColor = color ?? "#64748b";
  const content = reduced ? (
    <span className="pointer-events-none flex min-w-0 items-center gap-2 px-2">
      <span className="max-w-full truncate">
        {label}
      </span>
      {statusSlot ? <span className="flex shrink-0 items-center">{statusSlot}</span> : null}
    </span>
  ) : (
    <span className="pointer-events-none flex min-w-0 items-center gap-2 px-2">
      <span className="max-w-full truncate">
        {label}
      </span>
      {statusSlot ? <span className="flex shrink-0 items-center">{statusSlot}</span> : null}
    </span>
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
      <div className="h-full min-w-0">
        {interactive ? (
          <button
            type="button"
            onClick={onClick}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] transition hover:-translate-y-[1px] hover:shadow-md"
            data-testid={testId}
            aria-expanded={isExpanded}
          >
            {content}
          </button>
        ) : (
          <div
            className="grid min-w-0 grid-cols-[minmax(0,1fr)]"
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
