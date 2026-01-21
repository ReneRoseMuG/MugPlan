import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  getISOWeek,
  isSameDay,
  isWithinInterval,
  parseISO,
  differenceInDays
} from "date-fns";
import { de } from "date-fns/locale";
import { MapPin, Phone, Users, Route, FileText, Paperclip, Eye, Calendar } from "lucide-react";

interface CalendarGridProps {
  currentDate: Date;
  onNewAppointment?: () => void;
  onAppointmentDoubleClick?: () => void;
}

interface DemoAppointment {
  id: string;
  startDate: string;
  endDate: string;
  tourId: string;
  tourName: string;
  tourColor: string;
  customer: {
    fullName: string;
    company?: string;
    plz: string;
    city: string;
    street: string;
    phone: string;
  };
  employees: { id: string; firstName: string; lastName: string; initials: string }[];
  projectDescription: string;
  attachments: { id: string; name: string; type: string }[];
}

const initialAppointments: DemoAppointment[] = [
  {
    id: "a1",
    startDate: "2026-01-20",
    endDate: "2026-01-20",
    tourId: "1",
    tourName: "Tour 1",
    tourColor: "#4A90A4",
    customer: {
      fullName: "Müller, Hans",
      company: "Müller GmbH",
      plz: "80331",
      city: "München",
      street: "Marienplatz 1",
      phone: "+49 89 123456"
    },
    employees: [
      { id: "e1", firstName: "Thomas", lastName: "Müller", initials: "TM" },
      { id: "e2", firstName: "Anna", lastName: "Schmidt", initials: "AS" }
    ],
    projectDescription: "Renovierung des Empfangsbereichs. Neue Bodenbeläge und Wandgestaltung.",
    attachments: [
      { id: "d1", name: "Grundriss.pdf", type: "pdf" },
      { id: "d2", name: "Muster.jpg", type: "image" }
    ]
  },
  {
    id: "a2",
    startDate: "2026-01-21",
    endDate: "2026-01-23",
    tourId: "2",
    tourName: "Tour 2",
    tourColor: "#E8B86D",
    customer: {
      fullName: "Schmidt, Anna",
      plz: "10115",
      city: "Berlin",
      street: "Unter den Linden 5",
      phone: "+49 30 987654"
    },
    employees: [
      { id: "e3", firstName: "Michael", lastName: "Weber", initials: "MW" }
    ],
    projectDescription: "Gartenanlage mit Terrasse und Bepflanzung.",
    attachments: [
      { id: "d3", name: "Skizze.pdf", type: "pdf" }
    ]
  },
  {
    id: "a3",
    startDate: "2026-01-22",
    endDate: "2026-01-22",
    tourId: "1",
    tourName: "Tour 1",
    tourColor: "#4A90A4",
    customer: {
      fullName: "Weber, Michael",
      company: "Weber & Söhne",
      plz: "50667",
      city: "Köln",
      street: "Domplatz 10",
      phone: "+49 221 456789"
    },
    employees: [
      { id: "e1", firstName: "Thomas", lastName: "Müller", initials: "TM" }
    ],
    projectDescription: "Fassadenarbeiten und Fensteraustausch.",
    attachments: []
  },
  {
    id: "a4",
    startDate: "2026-01-24",
    endDate: "2026-01-24",
    tourId: "3",
    tourName: "Tour 3",
    tourColor: "#7BA05B",
    customer: {
      fullName: "Fischer, Sandra",
      plz: "20095",
      city: "Hamburg",
      street: "Jungfernstieg 20",
      phone: "+49 40 112233"
    },
    employees: [
      { id: "e5", firstName: "Klaus", lastName: "Hoffmann", initials: "KH" },
      { id: "e6", firstName: "Maria", lastName: "Becker", initials: "MB" }
    ],
    projectDescription: "Innenausbau Büroetage.",
    attachments: [
      { id: "d4", name: "Raumplan.pdf", type: "pdf" },
      { id: "d5", name: "Foto1.jpg", type: "image" },
      { id: "d6", name: "Foto2.jpg", type: "image" }
    ]
  },
  {
    id: "a5",
    startDate: "2026-01-27",
    endDate: "2026-01-29",
    tourId: "2",
    tourName: "Tour 2",
    tourColor: "#E8B86D",
    customer: {
      fullName: "Braun, Stefan",
      company: "Braun Immobilien",
      plz: "60311",
      city: "Frankfurt",
      street: "Römerberg 8",
      phone: "+49 69 998877"
    },
    employees: [
      { id: "e3", firstName: "Michael", lastName: "Weber", initials: "MW" },
      { id: "e4", firstName: "Sandra", lastName: "Fischer", initials: "SF" }
    ],
    projectDescription: "Komplettsanierung Altbau mit Denkmalschutzauflagen.",
    attachments: [
      { id: "d7", name: "Genehmigung.pdf", type: "pdf" }
    ]
  }
];

const TOUR_SLOTS = [
  { id: "1", name: "Tour 1", color: "#4A90A4" },
  { id: "2", name: "Tour 2", color: "#E8B86D" },
  { id: "3", name: "Tour 3", color: "#7BA05B" },
];

function AppointmentTooltip({ appointment, position }: { appointment: DemoAppointment; position: { x: number; y: number } }) {
  const tooltipWidth = 320;
  const tooltipHeight = 280;
  
  const fitsRight = position.x + tooltipWidth < window.innerWidth - 10;
  const fitsBottom = position.y + tooltipHeight < window.innerHeight - 10;
  
  const left = fitsRight ? position.x : Math.max(10, position.x - tooltipWidth - 20);
  const top = fitsBottom ? position.y : Math.max(10, position.y - tooltipHeight);
  
  return createPortal(
    <div 
      className="fixed z-[9999] w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-0 overflow-hidden pointer-events-none"
      style={{ 
        top,
        left,
      }}
    >
      <div className="flex">
        <div className="flex-1 p-3 border-r border-slate-100">
          <div className="flex items-start gap-2 mb-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-slate-800">{appointment.customer.fullName}</p>
              {appointment.customer.company && (
                <p className="text-xs text-slate-500">{appointment.customer.company}</p>
              )}
              <p className="text-xs text-slate-500">{appointment.customer.street}</p>
              <p className="text-xs text-slate-500">{appointment.customer.plz} {appointment.customer.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Phone className="w-3 h-3" />
            <span>{appointment.customer.phone}</span>
          </div>
        </div>

        <div className="w-28 p-3 bg-slate-50">
          <div className="flex items-center gap-1 mb-2 text-xs text-slate-500">
            <Users className="w-3 h-3" />
            <span>Mitarbeiter</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {appointment.employees.map(emp => (
              <div 
                key={emp.id}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: appointment.tourColor }}
                title={`${emp.firstName} ${emp.lastName}`}
              >
                {emp.initials}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div 
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: `${appointment.tourColor}20` }}
      >
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4" style={{ color: appointment.tourColor }} />
          <div 
            className="w-4 h-4 rounded"
            style={{ backgroundColor: appointment.tourColor }}
          />
          <span className="text-sm font-medium">{appointment.tourName}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <Calendar className="w-3 h-3" />
          <span>
            {format(parseISO(appointment.startDate), "dd.MM.yyyy")}
            {appointment.startDate !== appointment.endDate && (
              <> - {format(parseISO(appointment.endDate), "dd.MM.yyyy")}</>
            )}
          </span>
        </div>
      </div>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-start gap-2 mb-2">
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            {appointment.projectDescription}
          </p>
        </div>
      </div>

      {appointment.attachments.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1 mb-2 text-xs text-slate-500">
            <Paperclip className="w-3 h-3" />
            <span>Anhänge ({appointment.attachments.length})</span>
          </div>
          <div className="flex gap-2">
            {appointment.attachments.slice(0, 3).map(att => (
              <div 
                key={att.id}
                className="w-12 h-12 rounded border border-slate-200 bg-slate-50 flex items-center justify-center"
              >
                {att.type === "pdf" ? (
                  <FileText className="w-5 h-5 text-red-400" />
                ) : (
                  <Eye className="w-5 h-5 text-blue-400" />
                )}
              </div>
            ))}
            {appointment.attachments.length > 3 && (
              <div className="w-12 h-12 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                +{appointment.attachments.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function AppointmentBar({ 
  appointment, 
  dayIndex,
  totalDaysInRow,
  isFirstDay,
  isLastDay,
  spanDays,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  isDragging
}: { 
  appointment: DemoAppointment;
  dayIndex: number;
  totalDaysInRow: number;
  isFirstDay: boolean;
  isLastDay: boolean;
  spanDays: number;
  onDoubleClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.right + 10,
        y: rect.top
      });
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
  };

  const textColor = getContrastColor(appointment.tourColor);
  
  const widthPercent = Math.min(spanDays, totalDaysInRow - dayIndex) * 100;

  return (
    <div 
      ref={barRef}
      className={`relative ${isDragging ? 'opacity-50' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={onDoubleClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className="h-6 flex items-center justify-between px-2 text-xs font-medium cursor-grab transition-all hover:brightness-95 active:cursor-grabbing"
        style={{
          backgroundColor: appointment.tourColor,
          color: textColor,
          borderRadius: isFirstDay && isLastDay ? "4px" : isFirstDay ? "4px 0 0 4px" : isLastDay ? "0 4px 4px 0" : "0",
          width: spanDays > 1 ? `calc(${widthPercent}% + ${(spanDays - 1) * 2}px)` : "100%",
          marginRight: spanDays > 1 ? `-${(spanDays - 1) * 100}%` : "0",
          position: spanDays > 1 ? "relative" : "static",
          zIndex: spanDays > 1 ? 10 : 1
        }}
        data-testid={`appointment-bar-${appointment.id}`}
      >
        <>
          <span className="truncate min-w-0">
            {appointment.startDate !== appointment.endDate
              ? appointment.customer.fullName 
              : appointment.customer.fullName.split(",")[0]}
          </span>
          <span className="font-bold ml-2 flex-shrink-0 whitespace-nowrap">{appointment.customer.plz}</span>
        </>
      </div>
      
      {showTooltip && isFirstDay && (
        <AppointmentTooltip appointment={appointment} position={tooltipPosition} />
      )}
    </div>
  );
}

export function CalendarGrid({ currentDate, onNewAppointment, onAppointmentDoubleClick }: CalendarGridProps) {
  const [appointments, setAppointments] = useState<DemoAppointment[]>(initialAppointments);
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getAppointmentForDayAndTour = (day: Date, tourId: string): DemoAppointment | null => {
    return appointments.find(apt => {
      if (apt.tourId !== tourId) return false;
      const start = parseISO(apt.startDate);
      const end = parseISO(apt.endDate);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    }) || null;
  };

  const isFirstDayOfAppointment = (day: Date, appointment: DemoAppointment) => {
    return isSameDay(day, parseISO(appointment.startDate));
  };

  const isLastDayOfAppointment = (day: Date, appointment: DemoAppointment) => {
    return isSameDay(day, parseISO(appointment.endDate));
  };

  const getSpanDays = (day: Date, appointment: DemoAppointment, dayIndexInWeek: number) => {
    const endDate = parseISO(appointment.endDate);
    const daysUntilEnd = differenceInDays(endDate, day) + 1;
    const daysUntilWeekEnd = 7 - dayIndexInWeek;
    return Math.min(daysUntilEnd, daysUntilWeekEnd);
  };

  const handleDragStart = (e: React.DragEvent, appointmentId: string) => {
    setDraggedAppointment(appointmentId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", appointmentId);
  };

  const handleDragEnd = () => {
    setDraggedAppointment(null);
  };

  const canDropOnSlot = (targetDate: Date, targetTourId: string, appointmentId?: string): boolean => {
    const aptId = appointmentId || draggedAppointment;
    if (!aptId) return false;
    
    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return false;
    
    const duration = differenceInDays(parseISO(apt.endDate), parseISO(apt.startDate));
    
    for (let i = 0; i <= duration; i++) {
      const checkDate = new Date(targetDate);
      checkDate.setDate(checkDate.getDate() + i);
      
      const existingApt = appointments.find(a => {
        if (a.id === aptId) return false;
        if (a.tourId !== targetTourId) return false;
        const start = parseISO(a.startDate);
        const end = parseISO(a.endDate);
        return isWithinInterval(checkDate, { start, end }) || isSameDay(checkDate, start) || isSameDay(checkDate, end);
      });
      if (existingApt) return false;
    }
    
    return true;
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, targetTourId: string) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData("text/plain");
    
    if (!canDropOnSlot(targetDate, targetTourId, appointmentId)) {
      setDraggedAppointment(null);
      return;
    }
    
    setAppointments(prev => prev.map(apt => {
      if (apt.id !== appointmentId) return apt;
      
      const duration = differenceInDays(parseISO(apt.endDate), parseISO(apt.startDate));
      const newStartDate = format(targetDate, "yyyy-MM-dd");
      const newEndDate = new Date(targetDate);
      newEndDate.setDate(newEndDate.getDate() + duration);
      
      const targetTour = TOUR_SLOTS.find(t => t.id === targetTourId);
      
      return {
        ...apt,
        startDate: newStartDate,
        endDate: format(newEndDate, "yyyy-MM-dd"),
        tourId: targetTourId,
        tourName: targetTour?.name || apt.tourName,
        tourColor: targetTour?.color || apt.tourColor,
      };
    }));
    
    setDraggedAppointment(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
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

      <div className="flex-1 flex flex-col">
        {weeks.map((week, weekIdx) => {
          const weekNumber = getISOWeek(week[0]);
          return (
            <div key={weekIdx} className="flex-1 grid grid-cols-[50px_repeat(7,1fr)]">
              <div className="flex items-center justify-center border-r border-b border-border/30 bg-muted/20 text-sm font-bold text-primary">
                {weekNumber}
              </div>
              {week.map((day, dayIdx) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toString()}
                    className={`
                      relative border-r border-b border-border/30 p-1 min-h-[80px]
                      transition-colors duration-200
                      ${!isCurrentMonth ? "bg-muted/10 text-muted-foreground/40" : "bg-white text-foreground hover:bg-slate-50"}
                      ${dayIdx === 6 ? "border-r-0" : ""} 
                    `}
                    data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <button
                        onClick={onNewAppointment}
                        className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        data-testid={`button-new-appointment-${format(day, 'yyyy-MM-dd')}`}
                      >
                        <span className="text-sm font-bold">+</span>
                      </button>
                      <span
                        className={`
                          flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                          ${isTodayDate 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                            : "text-foreground/70"}
                        `}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    
                    <div className="space-y-0.5">
                      {TOUR_SLOTS.map(tour => {
                        const apt = getAppointmentForDayAndTour(day, tour.id);
                        const canDrop = draggedAppointment && canDropOnSlot(day, tour.id);
                        
                        if (!apt) {
                          return (
                            <div 
                              key={tour.id} 
                              className={`h-6 rounded transition-colors ${canDrop ? 'bg-primary/20 border-2 border-dashed border-primary' : ''}`}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, day, tour.id)}
                              data-testid={`slot-empty-${tour.id}-${format(day, 'yyyy-MM-dd')}`}
                            />
                          );
                        }
                        
                        const isFirst = isFirstDayOfAppointment(day, apt);
                        const isLast = isLastDayOfAppointment(day, apt);
                        const spanDays = getSpanDays(day, apt, dayIdx);
                        const isWeekStart = dayIdx === 0;
                        const shouldRenderBar = isFirst || isWeekStart;
                        
                        if (!shouldRenderBar) {
                          return (
                            <div 
                              key={tour.id} 
                              className="h-6"
                              data-testid={`slot-continued-${tour.id}-${format(day, 'yyyy-MM-dd')}`}
                            />
                          );
                        }
                        
                        return (
                          <AppointmentBar
                            key={`${apt.id}-${weekIdx}`}
                            appointment={apt}
                            dayIndex={dayIdx}
                            totalDaysInRow={7}
                            isFirstDay={isFirst}
                            isLastDay={isLast}
                            spanDays={spanDays}
                            onDoubleClick={onAppointmentDoubleClick}
                            onDragStart={(e) => handleDragStart(e, apt.id)}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedAppointment === apt.id}
                          />
                        );
                      })}
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
