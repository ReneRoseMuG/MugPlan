import { useMemo, useState } from "react";
import { getISOWeek, getISOWeekYear, getISOWeeksInYear } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DateRangeKwRangePanel } from "@/components/ui/DateRangeKwRangePanel";
import type { ReportConfigPanelMode } from "@/components/reports/ReportConfigPanel";
import type { AppointmentListScope } from "@/components/ui/filter-panels/appointments-filter-panel";
import { countTouchedIsoWeeks, resolveIsoWeekStart } from "@/lib/isoWeekRange";

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoWeekToDateRange(isoYear: number, kwStart: number, weekCount: number): { dateFrom: string; dateTo: string } {
  const monday =
    resolveIsoWeekStart(isoYear, kwStart) ?? resolveIsoWeekStart(isoYear, 1) ?? new Date(isoYear, 0, 4, 12, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + weekCount * 7 - 1);
  return { dateFrom: formatIsoDate(monday), dateTo: formatIsoDate(sunday) };
}

function resolveWeekCount(dateFrom: string, dateTo: string): number {
  const from = parseIsoDate(dateFrom);
  const to = parseIsoDate(dateTo);
  if (!from || !to || to < from) return 1;
  return countTouchedIsoWeeks(from, to);
}

export interface AppointmentListAvailableRange {
  dateFrom: string | null;
  dateTo: string | null;
}

interface AppointmentPeriodPickerProps {
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onDateFromChange: (value: string | undefined) => void;
  onDateToChange: (value: string | undefined) => void;
  availableRange: AppointmentListAvailableRange;
  appointmentScope: AppointmentListScope;
  onAppointmentScopeChange: (scope: AppointmentListScope) => void;
  onResetAll: () => void;
  className?: string;
}

export function AppointmentPeriodPicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  availableRange,
  appointmentScope,
  onAppointmentScopeChange,
  onResetAll,
  className,
}: AppointmentPeriodPickerProps) {
  const today = useMemo(() => new Date(), []);
  const currentIsoYear = useMemo(() => getISOWeekYear(today), [today]);
  const currentKw = useMemo(() => getISOWeek(today), [today]);

  const [mode, setMode] = useState<ReportConfigPanelMode>("date");
  const effectiveDateFrom = dateFrom ?? availableRange.dateFrom ?? "";
  const effectiveDateTo = dateTo ?? availableRange.dateTo ?? "";
  const effectiveFromDate = useMemo(() => parseIsoDate(effectiveDateFrom), [effectiveDateFrom]);
  const effectiveIsoYear = effectiveFromDate ? getISOWeekYear(effectiveFromDate) : currentIsoYear;
  const effectiveKwStartMax = useMemo(() => getISOWeeksInYear(new Date(effectiveIsoYear, 0, 4)), [effectiveIsoYear]);
  const kwStart = effectiveFromDate ? getISOWeek(effectiveFromDate) : currentKw;
  const weekCount = resolveWeekCount(effectiveDateFrom, effectiveDateTo);

  const handleModeChange = (newMode: ReportConfigPanelMode) => {
    setMode(newMode);
    if (newMode === "calendarWeek") {
      const { dateFrom: from, dateTo: to } = isoWeekToDateRange(effectiveIsoYear, kwStart, weekCount);
      onDateFromChange(from);
      onDateToChange(to);
    }
  };

  const handleKwStartChange = (value: number) => {
    if (value < 1 || value > effectiveKwStartMax) return;
    const { dateFrom: from, dateTo: to } = isoWeekToDateRange(effectiveIsoYear, value, weekCount);
    onDateFromChange(from);
    onDateToChange(to);
  };

  const handleWeekCountChange = (value: number) => {
    const { dateFrom: from, dateTo: to } = isoWeekToDateRange(effectiveIsoYear, kwStart, value);
    onDateFromChange(from);
    onDateToChange(to);
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 text-sm"
            data-testid="button-appointment-period-picker"
          >
            <CalendarDays className="h-4 w-4" />
            Zeitraum
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={8} className="w-auto p-0">
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Basis</span>
                <ToggleGroup
                  type="single"
                  value={appointmentScope}
                  onValueChange={(value) => {
                    if (value === "all" || value === "planned") {
                      onAppointmentScopeChange(value);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  data-testid="toggle-appointment-period-scope"
                >
                  <ToggleGroupItem value="all" data-testid="toggle-appointments-scope-all">
                    Alle Termine
                  </ToggleGroupItem>
                  <ToggleGroupItem value="planned" data-testid="toggle-appointments-scope-planned">
                    Geplante Termine
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={onResetAll}
                data-testid="button-appointment-period-reset-all"
              >
                Zurücksetzen
              </Button>
            </div>
          </div>
          <DateRangeKwRangePanel
            mode={mode}
            onModeChange={handleModeChange}
            fromDate={effectiveDateFrom}
            toDate={effectiveDateTo}
            onFromDateChange={(v) => onDateFromChange(v || undefined)}
            onToDateChange={(v) => onDateToChange(v || undefined)}
            kwStart={kwStart}
            kwStartMax={effectiveKwStartMax}
            weekCount={weekCount}
            onKwStartChange={handleKwStartChange}
            onWeekCountChange={handleWeekCountChange}
            togglePrefix="appointment-period"
            fromDateTestId="input-appointment-period-from"
            toDateTestId="input-appointment-period-to"
            kwStartInputTestId="input-appointment-period-kw-start"
            kwStartIncrementTestId="button-appointment-period-kw-start-up"
            kwStartDecrementTestId="button-appointment-period-kw-start-down"
            weekCountInputTestId="input-appointment-period-week-count"
            weekCountIncrementTestId="button-appointment-period-week-count-up"
            weekCountDecrementTestId="button-appointment-period-week-count-down"
            rangeSummaryTestId="appointment-period-summary"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
