import { useMemo, useState } from "react";
import { addWeeks, format, getISOWeek, parseISO, startOfISOWeek } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

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
} from "@/lib/tour-postal-plan";

type TourPostalPlanViewProps = {
  onCreateAppointment: (params: { date: string; tourId: number }) => void;
};

const VISIBLE_WEEK_COUNT = 4;

function formatWeekRangeLabel(currentWeekStart: Date): string {
  const lastVisibleWeek = addWeeks(currentWeekStart, VISIBLE_WEEK_COUNT - 1);
  return `KW ${getISOWeek(currentWeekStart)} - KW ${getISOWeek(lastVisibleWeek)}`;
}

export function TourPostalPlanView({ onCreateAppointment }: TourPostalPlanViewProps) {
  const todayDateString = useMemo(() => getBerlinTodayDateString(), []);
  const todayWeekStart = useMemo(() => startOfISOWeek(parseISO(todayDateString)), [todayDateString]);
  const [postalCodeInput, setPostalCodeInput] = useState("");
  const [submittedPostalCode, setSubmittedPostalCode] = useState("");
  const [maxWeekInput, setMaxWeekInput] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = addWeeks(todayWeekStart, weekOffset);
  const maxWeekStartDate = useMemo(
    () => resolveTourPostalPlanMaxWeekStartDate(maxWeekInput, todayDateString),
    [maxWeekInput, todayDateString],
  );
  const { fromDate, toDate } = useMemo(
    () => buildTourPostalPlanWindow({
      currentWeekStart,
      visibleWeekCount: VISIBLE_WEEK_COUNT,
      maxWeekStartDate,
    }),
    [currentWeekStart, maxWeekStartDate],
  );
  const normalizedPostalCode = normalizeTourPostalPlanPostalCode(submittedPostalCode);
  const queryEnabled = normalizedPostalCode.length > 0 && toDate >= fromDate;
  const canNavigateLater = maxWeekStartDate === null || addWeeks(currentWeekStart, 1) <= maxWeekStartDate;

  const {
    data: weeks = [],
    isLoading,
    error,
  } = useCalendarTourPostalPlan({
    postalCode: normalizedPostalCode,
    fromDate: format(fromDate, "yyyy-MM-dd"),
    toDate: format(toDate, "yyyy-MM-dd"),
    enabled: queryEnabled,
  });

  const submitSearch = () => {
    setSubmittedPostalCode(normalizeTourPostalPlanPostalCode(postalCodeInput));
    setWeekOffset(0);
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
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => setWeekOffset((previous) => previous - 1)}
          data-testid="button-tour-postal-plan-earlier"
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
          Früher
        </Button>

        <div className="text-center">
          <div className="text-sm font-semibold text-slate-900" data-testid="tour-postal-plan-range-label">
            {formatWeekRangeLabel(currentWeekStart)}
          </div>
          <div className="text-xs text-slate-500">
            {format(fromDate, "dd.MM.yyyy", { locale: de })} bis {format(toDate, "dd.MM.yyyy", { locale: de })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset(0)}
            data-testid="button-tour-postal-plan-today"
          >
            Heute
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1"
            disabled={!canNavigateLater}
            onClick={() => setWeekOffset((previous) => previous + 1)}
            data-testid="button-tour-postal-plan-later"
          >
            Später
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
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
            {weeks.map((week) => (
              <section
                key={`${week.isoYear}-${week.isoWeek}`}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                data-testid={`tour-postal-plan-week-${week.weekStartDate}`}
              >
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        KW {week.isoWeek} · {week.isoYear}
                      </div>
                      <div className="text-xs text-slate-500">
                        {format(parseISO(week.weekStartDate), "dd.MM.yyyy", { locale: de })} bis {format(parseISO(week.weekEndDate), "dd.MM.yyyy", { locale: de })}
                      </div>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {week.suggestions.length === 1 ? "1 Tour-Vorschlag" : `${week.suggestions.length} Tour-Vorschläge`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4">
                  {week.suggestions.map((suggestion) => (
                    <section
                      key={`${week.weekStartDate}-${suggestion.tourId}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/70"
                      data-testid={`tour-postal-plan-suggestion-${week.weekStartDate}-${suggestion.tourId}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full border border-slate-300"
                            style={{ backgroundColor: suggestion.tourColor ?? "#64748b" }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{suggestion.tourName}</div>
                            <div className="truncate text-xs text-slate-500">
                              Nahe PLZ: {suggestion.matchedPostalCodes.join(", ")}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                            {suggestion.scoreLabel}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                            Score {suggestion.score}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                            {suggestion.matchedAppointmentCount} passende Termine
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-3 p-3">
                        {suggestion.days.map((day) => (
                          <button
                            key={`${suggestion.tourId}-${day.date}`}
                            type="button"
                            className="flex min-h-[12rem] flex-col rounded-lg border border-slate-200 bg-white text-left transition hover:border-slate-300 hover:bg-slate-50"
                            data-testid={`button-tour-postal-plan-create-${day.date}-tour-${suggestion.tourId}`}
                            onClick={() => onCreateAppointment({ date: day.date, tourId: suggestion.tourId })}
                          >
                            <div className="border-b border-slate-100 px-3 py-2">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {format(parseISO(day.date), "EEE", { locale: de })}
                              </div>
                              <div className="text-sm font-semibold text-slate-900">
                                {format(parseISO(day.date), "dd.MM.", { locale: de })}
                              </div>
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
                              {day.appointments.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-2 text-center text-[11px] text-slate-400">
                                  Keine passenden Termine
                                </div>
                              ) : (
                                day.appointments.slice(0, 4).map((appointment) => (
                                  <div
                                    key={`${appointment.id}-${day.date}`}
                                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2"
                                    data-testid={`tour-postal-plan-appointment-${appointment.id}-${day.date}`}
                                  >
                                    <div className="truncate text-[11px] font-semibold text-slate-700">
                                      {appointment.startTime ?? "Ganztägig"} · {appointment.postalCode ?? "-"}
                                    </div>
                                    <div className="line-clamp-2 text-xs font-medium text-slate-900">
                                      {appointment.customerName ?? appointment.projectName ?? "Termin"}
                                    </div>
                                  </div>
                                ))
                              )}
                              {day.appointments.length > 4 ? (
                                <div className="text-[11px] font-medium text-slate-500">
                                  +{day.appointments.length - 4} weitere Termine
                                </div>
                              ) : null}
                            </div>

                            <div className="border-t border-slate-100 px-3 py-2 text-[11px] font-medium text-slate-500">
                              Neuen Termin für diese Tour anlegen
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
