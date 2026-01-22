import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isToday,
  getISOWeek,
  addWeeks,
  subWeeks
} from "date-fns";
import { de } from "date-fns/locale";
import { X, ChevronLeft, ChevronRight, CalendarDays, MapPin, Route, FileText, User } from "lucide-react";

interface EmployeeWeeklyViewProps {
  employeeId: string;
  employeeName: string;
  onCancel?: () => void;
  onOpenAppointment?: () => void;
}

interface Tour {
  id: string;
  name: string;
  color: string;
}

interface Appointment {
  id: string;
  customerName: string;
  customerPlz: string;
  customerCity: string;
  projectName: string;
  description: string;
  date: string;
  tourId: string;
}

const tours: Tour[] = [
  { id: "1", name: "Tour 1", color: "#4A90A4" },
  { id: "2", name: "Tour 2", color: "#E8B86D" },
  { id: "3", name: "Tour 3", color: "#7BA05B" },
];

const employeeAppointments: Record<string, Appointment[]> = {
  "e1": [
    {
      id: "a1",
      customerName: "Müller GmbH",
      customerPlz: "80331",
      customerCity: "München",
      projectName: "Renovierung Büro",
      description: "<b>Empfangsbereich</b> komplett neu gestalten.",
      date: "2026-01-20",
      tourId: "1"
    },
    {
      id: "a2",
      customerName: "Weber & Söhne",
      customerPlz: "50667",
      customerCity: "Köln",
      projectName: "Dachsanierung",
      description: "Komplette <b>Dacherneuerung</b> inkl. Dämmung.",
      date: "2026-01-22",
      tourId: "1"
    },
    {
      id: "a3",
      customerName: "Hoffmann AG",
      customerPlz: "40213",
      customerCity: "Düsseldorf",
      projectName: "Fassade streichen",
      description: "Außenfassade <b>3-stöckig</b> mit Gerüst.",
      date: "2026-01-24",
      tourId: "1"
    }
  ],
  "e2": [
    {
      id: "a4",
      customerName: "Müller GmbH",
      customerPlz: "80331",
      customerCity: "München",
      projectName: "Renovierung Büro",
      description: "<b>Empfangsbereich</b> komplett neu gestalten.",
      date: "2026-01-20",
      tourId: "1"
    },
    {
      id: "a5",
      customerName: "Schmidt, Anna",
      customerPlz: "10115",
      customerCity: "Berlin",
      projectName: "Gartenanlage",
      description: "Terrasse mit <b>Naturstein</b> und Bepflanzung.",
      date: "2026-01-21",
      tourId: "2"
    }
  ],
  "e3": [
    {
      id: "a6",
      customerName: "Fischer, Thomas",
      customerPlz: "60313",
      customerCity: "Frankfurt",
      projectName: "Badumbau",
      description: "Barrierefreies Bad mit <b>bodengleicher Dusche</b>.",
      date: "2026-01-22",
      tourId: "2"
    },
    {
      id: "a7",
      customerName: "Klein, Peter",
      customerPlz: "20095",
      customerCity: "Hamburg",
      projectName: "Parkett verlegen",
      description: "Eichenparkett <b>120qm</b> Wohnbereich.",
      date: "2026-01-24",
      tourId: "2"
    }
  ],
  "e4": [
    {
      id: "a8",
      customerName: "Becker, Maria",
      customerPlz: "70173",
      customerCity: "Stuttgart",
      projectName: "Wintergarten",
      description: "Anbau <b>Wintergarten</b> 25qm mit Heizung.",
      date: "2026-01-23",
      tourId: "3"
    }
  ],
  "e5": [
    {
      id: "a9",
      customerName: "Neumann GmbH",
      customerPlz: "30159",
      customerCity: "Hannover",
      projectName: "Elektroinstallation",
      description: "Komplette <b>Neuverkabelung</b> Altbau.",
      date: "2026-01-20",
      tourId: "3"
    },
    {
      id: "a10",
      customerName: "Becker, Maria",
      customerPlz: "70173",
      customerCity: "Stuttgart",
      projectName: "Wintergarten",
      description: "Anbau <b>Wintergarten</b> 25qm mit Heizung.",
      date: "2026-01-23",
      tourId: "3"
    }
  ],
  "e6": [],
  "e7": [
    {
      id: "a11",
      customerName: "Weber & Söhne",
      customerPlz: "50667",
      customerCity: "Köln",
      projectName: "Dachsanierung",
      description: "Komplette <b>Dacherneuerung</b> inkl. Dämmung.",
      date: "2026-01-22",
      tourId: "1"
    }
  ],
  "e8": [
    {
      id: "a12",
      customerName: "Klein, Peter",
      customerPlz: "20095",
      customerCity: "Hamburg",
      projectName: "Parkett verlegen",
      description: "Eichenparkett <b>120qm</b> Wohnbereich.",
      date: "2026-01-24",
      tourId: "2"
    }
  ]
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function AppointmentTooltip({ 
  appointment, 
  position,
  tour
}: { 
  appointment: Appointment; 
  position: { x: number; y: number };
  tour: Tour;
}) {
  return createPortal(
    <div 
      className="fixed z-[9999] w-72 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      style={{ 
        left: position.x,
        top: position.y,
        maxHeight: 'calc(100vh - 40px)'
      }}
      data-testid={`tooltip-appointment-${appointment.id}`}
    >
      <div 
        className="px-3 py-2 border-b border-slate-100 dark:border-slate-800"
        style={{ backgroundColor: hexToRgba(tour.color, 0.15) }}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            {appointment.projectName}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">{appointment.customerName}</p>
            <p className="text-xs text-slate-500">{appointment.customerPlz} {appointment.customerCity}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: tour.color }}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">{tour.name}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div 
            className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: appointment.description }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

function AppointmentCard({ 
  appointment, 
  tour,
  onDoubleClick 
}: { 
  appointment: Appointment; 
  tour: Tour;
  onDoubleClick?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let x = rect.right + 10;
      let y = rect.top;
      
      if (x + 288 > windowWidth) {
        x = rect.left - 298;
      }
      
      if (y + 200 > windowHeight) {
        y = Math.max(20, windowHeight - 220);
      }
      if (y < 20) {
        y = 20;
      }
      
      setTooltipPosition({ x, y });
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  return (
    <>
      <div 
        ref={cardRef}
        className="p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-xs cursor-pointer hover:shadow-md transition-shadow"
        style={{ borderLeftWidth: 3, borderLeftColor: tour.color }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={onDoubleClick}
        data-testid={`appointment-card-${appointment.id}`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
            {appointment.customerName}
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
            {appointment.customerPlz}
          </span>
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate mb-1">
          {appointment.projectName}
        </div>
        <div className="flex items-center gap-1">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: tour.color }}
          />
          <span className="text-[10px] text-slate-400 truncate">
            {tour.name}
          </span>
        </div>
      </div>
      {showTooltip && (
        <AppointmentTooltip 
          appointment={appointment} 
          position={tooltipPosition}
          tour={tour}
        />
      )}
    </>
  );
}

export function EmployeeWeeklyView({ employeeId, employeeName, onCancel, onOpenAppointment }: EmployeeWeeklyViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 22));

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekNumber = getISOWeek(currentDate);

  const next = () => setCurrentDate(addWeeks(currentDate, 1));
  const prev = () => setCurrentDate(subWeeks(currentDate, 1));

  const appointments = employeeAppointments[employeeId] || [];

  const getAppointmentsForDay = (date: Date): Appointment[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter(a => a.date === dateStr);
  };

  const getTourById = (tourId: string): Tour => {
    return tours.find(t => t.id === tourId) || tours[0];
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
                <CalendarDays className="w-6 h-6" />
                Wochenplanung
              </CardTitle>
              <Badge variant="secondary" className="text-sm gap-2 px-3 py-1">
                <User className="w-4 h-4" />
                {employeeName}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={prev} data-testid="button-prev-week">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-lg font-semibold min-w-[180px] text-center" data-testid="text-week-range">
                  KW {weekNumber} · {format(weekStart, "d. MMM", { locale: de })} - {format(weekEnd, "d. MMM yyyy", { locale: de })}
                </span>
                <Button size="icon" variant="ghost" onClick={next} data-testid="button-next-week">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              {onCancel && (
                <Button size="lg" variant="ghost" onClick={onCancel} data-testid="button-close-employee-weekly">
                  <X className="w-6 h-6" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex-1 overflow-auto">
          <div className="grid grid-cols-7 gap-3 h-full">
            {weekDays.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              return (
                <div key={day.toISOString()} className="flex flex-col min-h-0">
                  <div 
                    className={`text-center py-2 mb-2 rounded-t-lg font-semibold text-sm ${
                      isToday(day) 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                    data-testid={`header-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <div>{format(day, "EEEE", { locale: de })}</div>
                    <div className="text-lg">{format(day, "d")}</div>
                  </div>
                  
                  <div className="flex-1 p-2 rounded-b-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 overflow-auto">
                    {dayAppointments.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 py-4">
                        Keine Termine
                      </div>
                    ) : (
                      dayAppointments.map((appointment) => (
                        <AppointmentCard 
                          key={appointment.id} 
                          appointment={appointment} 
                          tour={getTourById(appointment.tourId)}
                          onDoubleClick={onOpenAppointment}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
