import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";

import { TourPostalPlanWeekPreview } from "./calendar/TourPostalPlanWeekPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCalendarTourPostalPlan } from "@/lib/calendar-appointments";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import {
  buildTourPostalPlanWindow,
  normalizeTourPostalPlanPostalCode,
  normalizeTourPostalPlanWeekInput,
  resolveTourPostalPlanMaxWeekStartDate,
  resolveTourPostalPlanMinimumWeekStartDate,
} from "@/lib/tour-postal-plan";

type TourPostalPlanViewProps = {
  onCreateAppointment: (params: { date: string; tourId: number }) => void;
};

const VISIBLE_WEEK_COUNT = 4;

export function TourPostalPlanView({ onCreateAppointment }: TourPostalPlanViewProps) {
  const todayDateString = useMemo(() => getBerlinTodayDateString(), []);
  const minimumWeekStart = useMemo(() => resolveTourPostalPlanMinimumWeekStartDate(todayDateString), [todayDateString]);
  const [postalCodeInput, setPostalCodeInput] = useState("");
  const [submittedPostalCode, setSubmittedPostalCode] = useState("");
  const [maxWeekInput, setMaxWeekInput] = useState("");
  const [hasFreeAppointments, setHasFreeAppointments] = useState(false);
  const maxWeekStartDate = useMemo(
    () => resolveTourPostalPlanMaxWeekStartDate(maxWeekInput, todayDateString),
    [maxWeekInput, todayDateString],
  );
  const { fromDate, toDate } = useMemo(
    () => buildTourPostalPlanWindow({
      currentWeekStart: minimumWeekStart,
      visibleWeekCount: VISIBLE_WEEK_COUNT,
      maxWeekStartDate,
    }),
    [maxWeekStartDate, minimumWeekStart],
  );
  const normalizedPostalCode = normalizeTourPostalPlanPostalCode(submittedPostalCode);
  const queryEnabled = normalizedPostalCode.length > 0 && toDate >= fromDate;

  const {
    data: weeks = [],
    isLoading,
    error,
  } = useCalendarTourPostalPlan({
    postalCode: normalizedPostalCode,
    fromDate: format(fromDate, "yyyy-MM-dd"),
    toDate: format(toDate, "yyyy-MM-dd"),
    hasFreeAppointments,
    enabled: queryEnabled,
  });

  const submitSearch = () => {
    setSubmittedPostalCode(normalizeTourPostalPlanPostalCode(postalCodeInput));
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border-2 border-foreground bg-white" data-testid="tour-postal-plan-view">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Tour PLZ Plan</h2>
            <p className="text-sm text-slate-500">
              Vorschlagsansicht für passende Wochen und Touren auf Basis bereits geplanter Postleitzahlen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,8rem)_auto]">
            <div className="space-y-2">
              <Label htmlFor="input-tour-postal-plan-postal-code">PLZ</Label>
              <Input
                id="input-tour-postal-plan-postal-code"
                value={postalCodeInput}
                inputMode="numeric"
                placeholder="z. B. 26135"
                data-testid="input-tour-postal-plan-postal-code"
                onChange={(event) => setPostalCodeInput(normalizeTourPostalPlanPostalCode(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-tour-postal-plan-max-week">max. KW</Label>
              <Input
                id="input-tour-postal-plan-max-week"
                value={maxWeekInput}
                inputMode="numeric"
                placeholder="optional"
                data-testid="input-tour-postal-plan-max-week"
                onChange={(event) => setMaxWeekInput(normalizeTourPostalPlanWeekInput(event.target.value))}
              />
            </div>
            <Button
              type="button"
              className="gap-2 self-end"
              data-testid="button-tour-postal-plan-search"
              onClick={submitSearch}
            >
              <Search className="h-4 w-4" aria-hidden />
              Vorschläge laden
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700" data-testid="tour-postal-plan-free-appointments-option">
            <input
              id="input-tour-postal-plan-has-free-appointments"
              type="checkbox"
              checked={hasFreeAppointments}
              onChange={(event) => setHasFreeAppointments(event.target.checked)}
              className="h-4 w-4 rounded accent-slate-700"
              data-testid="checkbox-tour-postal-plan-has-free-appointments"
            />
            <span>Hat freie Termine</span>
          </label>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-6">
        {submittedPostalCode.length === 0 ? (
          <div
            className="flex min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 text-center text-sm text-slate-500"
            data-testid="tour-postal-plan-empty-search"
          >
            Eine Postleitzahl eingeben und die Vorschläge laden, um passende Wochen und Touren zu sehen.
          </div>
        ) : isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500" data-testid="tour-postal-plan-loading">
            Vorschläge werden geladen...
          </div>
        ) : error instanceof Error ? (
          <div className="rounded-xl border border-destructive/30 bg-white px-6 py-10 text-sm text-destructive" data-testid="tour-postal-plan-error">
            PLZ-Plan-Vorschläge konnten nicht geladen werden.
          </div>
        ) : weeks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500" data-testid="tour-postal-plan-no-results">
            Für die PLZ {normalizedPostalCode} wurden im gewählten Zeitraum keine passenden Tour-Vorschläge gefunden.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {weeks.flatMap((week) => week.suggestions.map((suggestion) => (
              <TourPostalPlanWeekPreview
                key={`${week.weekStartDate}-${suggestion.tourId}`}
                weekStartDate={week.weekStartDate}
                weekEndDate={week.weekEndDate}
                isoWeek={week.isoWeek}
                isoYear={week.isoYear}
                tourId={suggestion.tourId}
                tourName={suggestion.tourName}
                tourColor={suggestion.tourColor}
                appointments={suggestion.appointments}
                onCreateAppointment={onCreateAppointment}
              />
            )))}
          </div>
        )}
      </div>
    </div>
  );
}
