import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useCalendarAppointments } from "@/lib/calendar-appointments";
import { buildEmployeeAppointmentsUtilizationBoardModel } from "@/lib/employee-appointments-utilization";
import { CALENDAR_NEUTRAL_COLOR } from "@/lib/calendar-utils";
import { formatListDateRange } from "@/lib/list-display-format";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { cn } from "@/lib/utils";

type EmployeeAppointmentsUtilizationBoardProps = {
  employeeId: number;
  userRole: string;
  className?: string;
  onOpenAppointment?: (appointmentId: number) => void;
};

export function EmployeeAppointmentsUtilizationBoard({
  employeeId,
  userRole,
  className,
  onOpenAppointment,
}: EmployeeAppointmentsUtilizationBoardProps) {
  const todayDate = useMemo(() => getBerlinTodayDateString(), []);
  const boardModel = useMemo(
    () => buildEmployeeAppointmentsUtilizationBoardModel({ appointments: [], todayDate }),
    [todayDate],
  );

  const {
    data: appointments = [],
    isLoading,
    error,
  } = useCalendarAppointments({
    fromDate: boardModel.fromDate,
    toDate: boardModel.toDate,
    employeeId,
    detail: "full",
    userRole,
    enabled: employeeId > 0,
  });

  const resolvedBoardModel = useMemo(
    () => buildEmployeeAppointmentsUtilizationBoardModel({ appointments, todayDate }),
    [appointments, todayDate],
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm",
        className,
      )}
      data-testid="employee-appointments-utilization-board"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">Auslastung der nächsten 6 Wochen</h3>
          <p className="text-xs text-slate-500">
            Fester Überblick ab aktueller ISO-Woche, gruppiert nach Monatsblöcken.
          </p>
        </div>
        <div
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
          data-testid="employee-appointments-utilization-range"
        >
          {formatListDateRange(resolvedBoardModel.fromDate, resolvedBoardModel.toDate)}
        </div>
      </div>

      {isLoading ? (
        <p className="py-6 text-sm text-slate-400">Auslastung wird geladen...</p>
      ) : error instanceof Error ? (
        <p
          className="py-6 text-sm text-destructive"
          data-testid="employee-appointments-utilization-error"
        >
          Auslastung konnte nicht geladen werden.
        </p>
      ) : resolvedBoardModel.totalAppointmentCount === 0 ? (
        <div
          className="flex min-h-[14rem] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center text-sm text-slate-500"
          data-testid="employee-appointments-utilization-empty"
        >
          In den nächsten 6 Wochen sind aktuell keine Termine für diesen Mitarbeiter verplant.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto pb-2 pt-4">
          <div className="flex min-w-max gap-5" data-testid="employee-appointments-utilization-scroll">
            {resolvedBoardModel.monthGroups.map((monthGroup) => (
              <section
                key={monthGroup.key}
                className="flex min-w-max flex-col gap-3"
                data-testid={`employee-appointments-utilization-month-${monthGroup.key}`}
              >
                <div className="px-1 text-sm font-semibold tracking-wide text-slate-700">
                  {monthGroup.label}
                </div>
                <div className="flex gap-4">
                  {monthGroup.weeks.map((week) => (
                    <section
                      key={week.weekStartDate}
                      className="flex w-[32rem] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70"
                      data-testid={`employee-appointments-utilization-week-${week.weekStartDate}`}
                    >
                      <div className="border-b border-slate-200 bg-white/90 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">{week.title}</div>
                        <div className="text-xs text-slate-500">
                          {formatListDateRange(week.weekStartDate, week.weekEndDate)}
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-2 p-3">
                        {week.days.map((day) => (
                          <div
                            key={day.date}
                            className="flex min-h-[14rem] flex-col rounded-lg border border-slate-200 bg-white"
                            data-testid={`employee-appointments-utilization-day-${day.date}`}
                          >
                            <div className="border-b border-slate-100 px-2 py-2">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {day.weekdayLabel}
                              </div>
                              <div className="text-sm font-semibold text-slate-900">{day.dateLabel}</div>
                              <div className="text-[11px] text-slate-500">
                                {day.appointmentCount === 1 ? "1 Termin" : `${day.appointmentCount} Termine`}
                              </div>
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                              {day.segments.length > 0 ? (
                                day.segments.map((segment) => (
                                  <Button
                                    key={`${segment.appointmentId}-${segment.date}`}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="relative h-auto items-start justify-start whitespace-normal px-2 py-2 text-left shadow-none"
                                    data-testid={`button-employee-utilization-appointment-${segment.appointmentId}-${segment.date}`}
                                    onClick={() => onOpenAppointment?.(segment.appointmentId)}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="absolute inset-y-0 left-0 w-1 rounded-l-[inherit]"
                                      style={{ backgroundColor: segment.tourColor ?? CALENDAR_NEUTRAL_COLOR }}
                                    />
                                    <span className="flex min-w-0 flex-1 flex-col gap-1 pl-2">
                                      <span className="flex flex-wrap items-center gap-1">
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                          {segment.label}
                                        </span>
                                      </span>
                                      <span className="line-clamp-2 text-xs font-semibold text-slate-900">
                                        {segment.primaryLabel}
                                      </span>
                                      {segment.secondaryLabel ? (
                                        <span className="line-clamp-2 text-[11px] text-slate-500">
                                          {segment.secondaryLabel}
                                        </span>
                                      ) : null}
                                    </span>
                                  </Button>
                                ))
                              ) : (
                                <div
                                  className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-2 text-center text-[11px] text-slate-400"
                                  data-testid={`employee-appointments-utilization-day-empty-${day.date}`}
                                >
                                  Keine Termine
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
