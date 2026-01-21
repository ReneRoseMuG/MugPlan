import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  getISOWeek
} from "date-fns";
import { de } from "date-fns/locale";

interface CalendarGridProps {
  currentDate: Date;
}

export function CalendarGrid({ currentDate }: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  // Group days into weeks for week number display
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      {/* Weekday Headers with KW column */}
      <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-border/40 bg-muted/30">
        <div className="py-4 text-center text-sm font-semibold text-muted-foreground font-display uppercase tracking-wider border-r border-border/30">
          KW
        </div>
        {weekDays.map((day) => (
          <div 
            key={day} 
            className="py-4 text-center text-sm font-semibold text-muted-foreground font-display uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days with week numbers */}
      <div className="flex-1 flex flex-col">
        {weeks.map((week, weekIdx) => {
          const weekNumber = getISOWeek(week[0]);
          return (
            <div key={weekIdx} className="flex-1 grid grid-cols-[50px_repeat(7,1fr)]">
              {/* Week number cell */}
              <div className="flex items-center justify-center border-r border-b border-border/30 bg-muted/20 text-sm font-bold text-primary">
                {weekNumber}
              </div>
              {/* Days of the week */}
              {week.map((day, dayIdx) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toString()}
                    className={`
                      relative border-r border-b border-border/30 p-2 min-h-[80px]
                      transition-colors duration-200
                      ${!isCurrentMonth ? "bg-muted/10 text-muted-foreground/40" : "bg-white text-foreground hover:bg-slate-50"}
                      ${dayIdx === 6 ? "border-r-0" : ""} 
                    `}
                  >
                    <div className="flex justify-end">
                      <span
                        className={`
                          flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                          ${isTodayDate 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                            : "text-foreground/70"}
                        `}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
