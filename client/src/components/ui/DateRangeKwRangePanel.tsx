import { Calendar, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { getISOWeek } from "date-fns";

import { type ReportConfigPanelMode } from "@/components/reports/ReportConfigPanel";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { parseIsoWeekInput } from "@/lib/isoWeekInput";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
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
  if (!startDate || !endDate || endDate < startDate) return null;
  return Math.ceil(((endDate.getTime() - startDate.getTime()) / 86400000 + 1) / 7);
}

function resolveWeekRangeLabel(fromDate: string, toDate: string): string | null {
  const startDate = parseDate(fromDate);
  const endDate = parseDate(toDate);
  if (!startDate || !endDate) return null;
  const startWeek = getISOWeek(startDate);
  const endWeek = getISOWeek(endDate);
  return startWeek === endWeek ? `KW ${startWeek}` : `KW ${startWeek}–${endWeek}`;
}

type DateRangeKwRangePanelProps = {
  mode: ReportConfigPanelMode;
  onModeChange: (mode: ReportConfigPanelMode) => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  kwStart: number;
  kwStartMax: number;
  weekCount: number;
  onKwStartChange: (value: number) => void;
  onWeekCountChange: (value: number) => void;
  togglePrefix: string;
  fromDateTestId?: string;
  toDateTestId?: string;
  kwStartInputTestId?: string;
  kwStartIncrementTestId?: string;
  kwStartDecrementTestId?: string;
  weekCountInputTestId?: string;
  weekCountIncrementTestId?: string;
  weekCountDecrementTestId?: string;
  rangeSummaryTestId?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const SPIN_CONTAINER_CLASS =
  "flex w-full items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm";

const SPIN_INPUT_CLASS =
  "w-full px-2.5 py-2 text-left text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500";

const LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-wide text-slate-400";

export function DateRangeKwRangePanel({
  mode,
  onModeChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  kwStart,
  kwStartMax,
  weekCount,
  onKwStartChange,
  onWeekCountChange,
  togglePrefix,
  fromDateTestId,
  toDateTestId,
  kwStartInputTestId,
  kwStartIncrementTestId,
  kwStartDecrementTestId,
  weekCountInputTestId,
  weekCountIncrementTestId,
  weekCountDecrementTestId,
  rangeSummaryTestId,
}: DateRangeKwRangePanelProps) {
  const weekCountDisplay = resolveWeekCount(fromDate, toDate);
  const weekRangeLabel = resolveWeekRangeLabel(fromDate, toDate);

  return (
    <div className="flex w-[280px] shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Toggle-Header */}
      <div className="px-3 py-2">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => {
            if (value === "date" || value === "calendarWeek") onModeChange(value);
          }}
          className="flex w-fit items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-1"
          data-testid={`toggle-group-${togglePrefix}`}
        >
          <ToggleGroupItem
            value="date"
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:text-slate-700",
              "data-[state=on]:border-slate-200 data-[state=on]:bg-white data-[state=on]:text-slate-800 data-[state=on]:shadow-sm",
            )}
            data-testid={`toggle-${togglePrefix}-date`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Datum
          </ToggleGroupItem>
          <ToggleGroupItem
            value="calendarWeek"
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:text-slate-700",
              "data-[state=on]:border-slate-200 data-[state=on]:bg-white data-[state=on]:text-slate-800 data-[state=on]:shadow-sm",
            )}
            data-testid={`toggle-${togglePrefix}-calendarWeek`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            KW
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="border-t border-slate-100" />

      {/* Body — Labels + Controls */}
      <div className="px-3 py-3">
        {/* Labels — immer in einer Zeile */}
        <div className="mb-1 grid grid-cols-2 gap-3">
          <span className={LABEL_CLASS}>
            {mode === "date" ? "Von" : "KW Start"}
          </span>
          <span className={LABEL_CLASS}>
            {mode === "date" ? "Bis" : "Anz. Wochen"}
          </span>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          {mode === "date" ? (
            <>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className={INPUT_CLASS}
                data-testid={fromDateTestId}
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                className={INPUT_CLASS}
                data-testid={toDateTestId}
              />
            </>
          ) : (
            <>
              {/* KW Start Spin */}
              <div className={SPIN_CONTAINER_CLASS}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={String(kwStart)}
                  onChange={(e) => {
                    const parsed = parseIsoWeekInput(e.target.value);
                    if (typeof parsed === "number" && parsed <= kwStartMax) {
                      onKwStartChange(parsed);
                    }
                  }}
                  className={SPIN_INPUT_CLASS}
                  data-testid={kwStartInputTestId}
                />
                <div className="flex flex-col border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => onKwStartChange(clamp(kwStart + 1, 1, kwStartMax))}
                    className="flex flex-1 items-center justify-center border-b border-slate-200 px-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                    data-testid={kwStartIncrementTestId}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onKwStartChange(clamp(kwStart - 1, 1, kwStartMax))}
                    className="flex flex-1 items-center justify-center px-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                    data-testid={kwStartDecrementTestId}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Anzahl Wochen Spin */}
              <div className={SPIN_CONTAINER_CLASS}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={String(weekCount)}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
                    if (!Number.isNaN(parsed)) onWeekCountChange(clamp(parsed, 1, 52));
                  }}
                  className={SPIN_INPUT_CLASS}
                  data-testid={weekCountInputTestId}
                />
                <div className="flex flex-col border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => onWeekCountChange(clamp(weekCount + 1, 1, 52))}
                    className="flex flex-1 items-center justify-center border-b border-slate-200 px-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                    data-testid={weekCountIncrementTestId}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onWeekCountChange(clamp(weekCount - 1, 1, 52))}
                    className="flex flex-1 items-center justify-center px-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                    data-testid={weekCountDecrementTestId}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Footer — 3-Spalten-Datumsanzeige */}
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center bg-slate-50 px-3 py-2"
        data-testid={rangeSummaryTestId}
      >
        <span className="whitespace-nowrap text-xs font-semibold text-slate-700">
          {formatShortDate(fromDate)}
        </span>

        <div className="flex flex-col items-center justify-center px-3">
          {weekCountDisplay !== null ? (
            <>
              <span className="text-[11px] font-bold leading-none text-slate-600">{weekCountDisplay} KW</span>
              {weekRangeLabel ? (
                <span className="mt-0.5 text-[10px] leading-none text-slate-400">{weekRangeLabel}</span>
              ) : null}
            </>
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          )}
        </div>

        <span className="whitespace-nowrap text-right text-xs font-semibold text-slate-700">
          {formatShortDate(toDate)}
        </span>
      </div>
    </div>
  );
}
