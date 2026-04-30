import { useEffect, useState } from "react";
import { addWeeks, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarMonthSheetView } from "@/components/calendar/CalendarMonthSheetView";
import { getBerlinTodayDateString } from "@/lib/project-appointments";

type EmployeeUtilizationViewProps = {
  employeeId: number;
  userRole: string;
  onOpenAppointment?: (appointmentId: number) => void;
};

type UtilizationNavBarProps = {
  weekOffset: number;
  currentDate: Date;
  onEarlier: () => void;
  onLater: () => void;
  onToday: () => void;
  testIdNavBar: string;
};

function UtilizationNavBar({
  weekOffset,
  currentDate,
  onEarlier,
  onLater,
  onToday,
  testIdNavBar,
}: UtilizationNavBarProps) {
  const firstKw = getISOWeek(currentDate);
  const lastKw = getISOWeek(addWeeks(currentDate, 3));
  const year = getISOWeekYear(currentDate);

  return (
    <div
      className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-4 py-2"
      data-testid={testIdNavBar}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEarlier}
        className="gap-1"
        data-testid="button-utilization-earlier"
      >
        <ChevronUp className="h-4 w-4" aria-hidden />
        Früher
      </Button>

      <span
        className="text-sm font-semibold text-primary"
        data-testid="employee-utilization-kw-label"
      >
        KW {firstKw} – KW {lastKw} · {year}
      </span>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={weekOffset === 0}
          onClick={onToday}
          data-testid="button-utilization-today"
        >
          Heute
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLater}
          className="gap-1"
          data-testid="button-utilization-later"
        >
          Später
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function EmployeeUtilizationView({
  employeeId,
  onOpenAppointment,
}: EmployeeUtilizationViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    setWeekOffset(0);
  }, [employeeId]);

  const currentDate = addWeeks(startOfISOWeek(parseISO(getBerlinTodayDateString())), weekOffset);

  const navBarProps = {
    weekOffset,
    currentDate,
    onEarlier: () => setWeekOffset((prev) => prev - 1),
    onLater: () => setWeekOffset((prev) => prev + 1),
    onToday: () => setWeekOffset(0),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="employee-utilization-view">
      <UtilizationNavBar
        {...navBarProps}
        testIdNavBar="employee-utilization-nav-top"
      />

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-hidden">
          <CalendarMonthSheetView
            currentDate={currentDate}
            employeeFilterId={employeeId}
            readOnly={true}
            absenceVisibility="include"
            visibleWeekCount={4}
            onOpenAppointment={
              onOpenAppointment
                ? (appointmentId) => onOpenAppointment(appointmentId)
                : undefined
            }
          />
        </div>
      </div>

      <UtilizationNavBar
        {...navBarProps}
        testIdNavBar="employee-utilization-nav-bottom"
      />
    </div>
  );
}
