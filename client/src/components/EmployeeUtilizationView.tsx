import { useEffect, useState } from "react";
import { addWeeks, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek, subWeeks } from "date-fns";
import { CalendarMonthSheetView } from "@/components/calendar/CalendarMonthSheetView";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
import { parseIsoWeekInput, sanitizeIsoWeekInput } from "@/lib/isoWeekInput";
import { resolveKwJumpTarget } from "@/lib/kwJump";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import {
  getNextMonthWindowStart,
  getPreviousMonthWindowStart,
  normalizeMonthWindowStart,
} from "@/components/calendar/monthSheetModel";

type EmployeeUtilizationViewProps = {
  employeeId: number;
  userRole: string;
  onOpenAppointment?: (appointmentId: number) => void;
};

function getTodayUtilizationDate(): Date {
  return startOfISOWeek(parseISO(getBerlinTodayDateString()));
}

export function EmployeeUtilizationView({
  employeeId,
  onOpenAppointment,
}: EmployeeUtilizationViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => getTodayUtilizationDate());
  const [jumpBackDate, setJumpBackDate] = useState<Date | null>(null);
  const [kwInputValue, setKwInputValue] = useState(() => String(getISOWeek(getTodayUtilizationDate())));
  const [kwJumpError, setKwJumpError] = useState(false);

  useEffect(() => {
    const nextToday = getTodayUtilizationDate();
    setCurrentDate(nextToday);
    setJumpBackDate(null);
    setKwInputValue(String(getISOWeek(nextToday)));
    setKwJumpError(false);
  }, [employeeId]);

  useEffect(() => {
    setKwInputValue(String(getISOWeek(currentDate)));
  }, [currentDate]);

  const submitKwJump = (valueOverride?: string) => {
    const trimmedValue = sanitizeIsoWeekInput(valueOverride ?? kwInputValue);
    if (trimmedValue.length === 0) {
      setKwJumpError(false);
      return;
    }

    const parsedKw = parseIsoWeekInput(trimmedValue);
    if (!parsedKw) {
      setKwJumpError(true);
      return;
    }

    const targetDate = resolveKwJumpTarget(getISOWeekYear(currentDate), parsedKw);
    if (!targetDate) {
      setKwJumpError(true);
      return;
    }

    if (targetDate.getTime() === startOfISOWeek(currentDate).getTime()) {
      setKwInputValue(String(parsedKw));
      setKwJumpError(false);
      return;
    }

    setJumpBackDate(normalizeMonthWindowStart(currentDate));
    setCurrentDate(normalizeMonthWindowStart(targetDate));
    setKwInputValue(String(parsedKw));
    setKwJumpError(false);
  };

  const prev = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    setCurrentDate((value) => getPreviousMonthWindowStart(value));
  };

  const next = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    setCurrentDate((value) => getNextMonthWindowStart(value));
  };

  const prevWeek = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    setCurrentDate((value) => subWeeks(normalizeMonthWindowStart(value), 1));
  };

  const nextWeek = () => {
    setJumpBackDate(null);
    setKwJumpError(false);
    setCurrentDate((value) => addWeeks(normalizeMonthWindowStart(value), 1));
  };

  return (
    <div
      className="h-full rounded-lg border-2 border-foreground bg-white overflow-hidden flex flex-col"
      data-testid="employee-utilization-view"
    >
      <div className="flex-1 min-h-0 grid grid-cols-[28px_minmax(0,1fr)_28px]">
        <button
          type="button"
          onClick={prev}
          className="h-full w-7 text-sm font-semibold text-primary/70 hover:text-primary"
          data-testid="button-prev"
          aria-label="Zurück"
        >
          {"<"}
        </button>
        <div className="min-w-0 h-full overflow-hidden">
          <CalendarMonthSheetView
            currentDate={currentDate}
            employeeFilterId={employeeId}
            readOnly={true}
            absenceVisibility="include"
            visibleWeekCount={4}
            onPreviousWeek={prevWeek}
            onNextWeek={nextWeek}
            onOpenAppointment={
              onOpenAppointment
                ? (appointmentId) => onOpenAppointment(appointmentId)
                : undefined
            }
          />
        </div>
        <button
          type="button"
          onClick={next}
          className="h-full w-7 text-sm font-semibold text-primary/70 hover:text-primary"
          data-testid="button-next"
          aria-label="Vor"
        >
          {">"}
        </button>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-card px-6 py-2">
        <CalendarFilterPanel
          employeeId={employeeId}
          onEmployeeIdChange={() => undefined}
          showEmployeeFilter={false}
          showKwJump
          kwJumpValue={kwInputValue}
          kwJumpError={kwJumpError}
          onKwJumpChange={(value) => {
            setKwInputValue(sanitizeIsoWeekInput(value));
            setKwJumpError(false);
          }}
          onKwJumpSubmit={() => submitKwJump()}
          onKwJumpValueCommit={(value) => {
            setKwInputValue(value);
            setKwJumpError(false);
            submitKwJump(value);
          }}
          showKwJumpBack={jumpBackDate !== null}
          onKwJumpBack={() => {
            if (!jumpBackDate) return;
            setKwInputValue(String(getISOWeek(jumpBackDate)));
            setCurrentDate(normalizeMonthWindowStart(jumpBackDate));
            setJumpBackDate(null);
            setKwJumpError(false);
          }}
        />
      </div>
    </div>
  );
}
