import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday,
  getISOWeek,
  isSameDay,
  isWithinInterval,
  parseISO,
  differenceInDays
} from "date-fns";
import { de } from "date-fns/locale";
import { MapPin, Phone, Users, Route, FileText, Paperclip, Eye, Calendar, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapOverlay } from "@/components/MapOverlay";

interface WeekGridProps {
  currentDate: Date;
  onNewAppointment?: (date: string) => void;
  onAppointmentDoubleClick?: (appointment: DemoAppointment) => void;
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
    projectDescription: "GESPIEGELT\nPalkkio 'E', Core, R-alu-schw\nFenster rund 90 cm\nBrillenablage 2-fach, 3 Düfte\n2 Yoga Lampen, Lixum farblos",
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
    projectDescription: "GESPIEGELT\nPalkkio 'E', Core; R-alu-schw\nFenster rund 90 cm\nBrillenablage 2-fach, 3 Düfte\n2 Yoga Lampen, Lixum farblos",
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
    projectDescription: "Premium4, Core, Lixum farblos\nR-alu-schw, Yoga\n2er Steckdose",
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
    projectDescription: "Premium 4, Aries\nR-alu-schw, Lixum\nfarblos",
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
    projectDescription: "Palkkio; Drop;\nR-alu-grün; 1 Steckdose\nim Ruheraum unter der\nkurzen Bank",
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

function WeekAppointmentBar({ 
  appointment, 
  dayIndex,
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

  const handleMouseEnter = () => {
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
  const widthPercent = Math.min(spanDays, 7 - dayIndex) * 100;

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
        className="h-8 flex items-center justify-between px-3 text-sm font-medium cursor-grab transition-all hover:brightness-95 active:cursor-grabbing"
        style={{
          backgroundColor: appointment.tourColor,
          color: textColor,
          borderRadius: isFirstDay && isLastDay ? "6px" : isFirstDay ? "6px 0 0 6px" : isLastDay ? "0 6px 6px 0" : "0",
          width: spanDays > 1 ? `calc(${widthPercent}% + ${(spanDays - 1) * 4}px)` : "100%",
          marginRight: spanDays > 1 ? `-${(spanDays - 1) * 100}%` : "0",
          position: spanDays > 1 ? "relative" : "static",
          zIndex: spanDays > 1 ? 10 : 1
        }}
        data-testid={`week-appointment-bar-${appointment.id}`}
      >
        <span className="truncate min-w-0">
          {appointment.startDate !== appointment.endDate
            ? appointment.customer.fullName 
            : appointment.customer.fullName.split(",")[0]}
        </span>
        <span className="font-bold ml-2 flex-shrink-0 whitespace-nowrap">{appointment.customer.plz}</span>
      </div>
      
      {showTooltip && isFirstDay && (
        <AppointmentTooltip appointment={appointment} position={tooltipPosition} />
      )}
    </div>
  );
}

export function WeekGrid({ currentDate, onNewAppointment, onAppointmentDoubleClick }: WeekGridProps) {
  const [appointments, setAppointments] = useState<DemoAppointment[]>(initialAppointments);
  const [showMapOverlay, setShowMapOverlay] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null);
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1, locale: de });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1, locale: de });
  const weekNumber = getISOWeek(weekStart);

  const days = eachDayOfInterval({
    start: weekStart,
    end: weekEnd,
  });

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

  const canDropOnDay = (targetDate: Date, appointmentId: string): boolean => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return false;
    
    const duration = differenceInDays(parseISO(apt.endDate), parseISO(apt.startDate));
    
    for (let i = 0; i <= duration; i++) {
      const checkDate = new Date(targetDate);
      checkDate.setDate(checkDate.getDate() + i);
      
      const existingApt = appointments.find(a => {
        if (a.id === appointmentId) return false;
        if (a.tourId !== apt.tourId) return false;
        const start = parseISO(a.startDate);
        const end = parseISO(a.endDate);
        return isWithinInterval(checkDate, { start, end }) || isSameDay(checkDate, start) || isSameDay(checkDate, end);
      });
      if (existingApt) return false;
    }
    
    return true;
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData("text/plain");
    
    if (!canDropOnDay(targetDate, appointmentId)) {
      setDraggedAppointment(null);
      return;
    }
    
    setAppointments(prev => prev.map(apt => {
      if (apt.id !== appointmentId) return apt;
      
      const duration = differenceInDays(parseISO(apt.endDate), parseISO(apt.startDate));
      const newStartDate = format(targetDate, "yyyy-MM-dd");
      const newEndDate = new Date(targetDate);
      newEndDate.setDate(newEndDate.getDate() + duration);
      
      return {
        ...apt,
        startDate: newStartDate,
        endDate: format(newEndDate, "yyyy-MM-dd"),
      };
    }));
    
    setDraggedAppointment(null);
  };

  const handleDragOver = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedAppointment && canDropOnDay(targetDate, draggedAppointment)) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">KW {weekNumber}</span>
          <span className="text-sm text-muted-foreground">
            {format(weekStart, "d. MMMM", { locale: de })} - {format(weekEnd, "d. MMMM yyyy", { locale: de })}
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => setShowMapOverlay(true)}
          data-testid="button-show-map-week"
        >
          <Map className="w-4 h-4" />
          Auf Karte anzeigen
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-7 divide-x divide-border/30">
        {days.map((day, dayIdx) => {
          const isTodayDate = isToday(day);

          return (
            <div
              key={day.toString()}
              className="flex flex-col min-h-0 overflow-visible"
              onDragOver={(e) => handleDragOver(e, day)}
              onDrop={(e) => handleDrop(e, day)}
              data-testid={`week-day-${format(day, 'yyyy-MM-dd')}`}
            >
              <div className={`
                px-3 py-3 border-b border-border/30 text-center
                ${isTodayDate ? "bg-primary/10" : "bg-muted/20"}
              `}>
                <div className="text-xs font-bold uppercase text-muted-foreground mb-1">
                  {format(day, "EEEE", { locale: de })}
                </div>
                <div className={`
                  inline-flex items-center justify-center w-10 h-10 rounded-full text-xl font-extrabold
                  ${isTodayDate 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "text-foreground"}
                `}>
                  {format(day, "d")}
                </div>
              </div>
              
              <div className="flex-1 p-2 space-y-1.5 overflow-visible">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => onNewAppointment?.(format(day, "yyyy-MM-dd"))}
                    className="w-6 h-6 flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    data-testid={`button-new-appointment-week-${format(day, 'yyyy-MM-dd')}`}
                  >
                    <span className="text-lg font-bold">+</span>
                  </button>
                </div>

                {TOUR_SLOTS.map(tour => {
                  const apt = getAppointmentForDayAndTour(day, tour.id);
                  
                  if (!apt) {
                    return (
                      <div 
                        key={tour.id} 
                        className="h-8"
                        data-testid={`week-slot-empty-${tour.id}-${format(day, 'yyyy-MM-dd')}`}
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
                        className="h-8"
                        data-testid={`week-slot-continued-${tour.id}-${format(day, 'yyyy-MM-dd')}`}
                      />
                    );
                  }
                  
                  return (
                    <WeekAppointmentBar
                      key={`${apt.id}-week`}
                      appointment={apt}
                      dayIndex={dayIdx}
                      isFirstDay={isFirst}
                      isLastDay={isLast}
                      spanDays={spanDays}
                      onDoubleClick={onAppointmentDoubleClick ? () => onAppointmentDoubleClick(apt) : undefined}
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
      <MapOverlay isOpen={showMapOverlay} onClose={() => setShowMapOverlay(false)} />
    </div>
  );
}
