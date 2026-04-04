import { getISOWeek } from "date-fns";

const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(value: string): string {
  const parsed = parseDate(value);
  if (!parsed) return "—";
  const dayLabel = WEEKDAY_LABELS[parsed.getDay()] ?? "—";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear()).slice(2);
  return `${dayLabel} ${day}.${month}.${year}`;
}

function resolveWeekCount(fromDate: string, toDate: string): number | null {
  const startDate = parseDate(fromDate);
  const endDate = parseDate(toDate);
  if (!startDate || !endDate || endDate < startDate) {
    return null;
  }
  return Math.ceil(((endDate.getTime() - startDate.getTime()) / 86400000 + 1) / 7);
}

function resolveWeekRangeLabel(fromDate: string, toDate: string): string | null {
  const startDate = parseDate(fromDate);
  const endDate = parseDate(toDate);
  if (!startDate || !endDate) {
    return null;
  }

  const startWeek = getISOWeek(startDate);
  const endWeek = getISOWeek(endDate);
  return startWeek === endWeek ? `KW ${startWeek}` : `KW ${startWeek} – ${endWeek}`;
}

type RangeSummaryProps = {
  fromDate: string;
  toDate: string;
  testId?: string;
};

export function RangeSummary({ fromDate, toDate, testId }: RangeSummaryProps) {
  const weekCount = resolveWeekCount(fromDate, toDate);
  const weekRangeLabel = resolveWeekRangeLabel(fromDate, toDate);

  return (
    <div
      className="flex items-center gap-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      data-testid={testId}
    >
      <div className="flex flex-1 items-center justify-start px-3 py-2 text-left">
        <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{formatShortDate(fromDate)}</span>
      </div>

      <div className="flex min-w-[80px] flex-col items-center justify-center border-x border-slate-200 bg-slate-100 px-3 py-1.5">
        {weekCount !== null ? (
          <>
            <span className="text-[11px] font-bold leading-none text-slate-600">{weekCount} KW</span>
            {weekRangeLabel ? <span className="mt-0.5 text-[10px] leading-none text-slate-400">{weekRangeLabel}</span> : null}
          </>
        ) : (
          <span className="text-[11px] text-slate-400">—</span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-start px-3 py-2 text-left">
        <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{formatShortDate(toDate)}</span>
      </div>
    </div>
  );
}
