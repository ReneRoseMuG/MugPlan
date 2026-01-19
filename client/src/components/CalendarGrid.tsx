import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday 
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

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30">
        {weekDays.map((day) => (
          <div 
            key={day} 
            className="py-4 text-center text-sm font-semibold text-muted-foreground font-display uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {days.map((day, dayIdx) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);

          return (
            <div
              key={day.toString()}
              className={`
                relative border-r border-b border-border/30 p-2 min-h-[80px]
                transition-colors duration-200
                ${!isCurrentMonth ? "bg-muted/10 text-muted-foreground/40" : "bg-white text-foreground hover:bg-slate-50"}
                ${(dayIdx + 1) % 7 === 0 ? "border-r-0" : ""} 
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
              
              {/* Note: Requirement specifies NO events shown here */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
