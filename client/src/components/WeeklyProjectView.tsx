import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { X, ChevronLeft, ChevronRight, CalendarDays, FolderKanban, MapPin, Route, FileText } from "lucide-react";

interface WeeklyProjectViewProps {
  onCancel?: () => void;
  onOpenProject?: () => void;
}

interface Tour {
  id: string;
  name: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  customerId: string;
  customerName: string;
  customerPlz: string;
  customerCity: string;
  description: string;
  appointmentDate: string;
  tourId: string;
}

const tours: Tour[] = [
  { id: "1", name: "Tour 1", color: "#4A90A4" },
  { id: "2", name: "Tour 2", color: "#E8B86D" },
  { id: "3", name: "Tour 3", color: "#7BA05B" },
];

const projects: Project[] = [
  {
    id: "p1",
    name: "Renovierung Büro",
    status: "In Bearbeitung",
    statusColor: "#f59e0b",
    customerId: "c1",
    customerName: "Müller GmbH",
    customerPlz: "80331",
    customerCity: "München",
    description: "<b>Empfangsbereich</b> komplett neu gestalten. Boden, Wände, Beleuchtung.",
    appointmentDate: "2026-01-20",
    tourId: "1"
  },
  {
    id: "p2",
    name: "Gartenanlage",
    status: "Neu",
    statusColor: "#3b82f6",
    customerId: "c2",
    customerName: "Schmidt, Anna",
    customerPlz: "10115",
    customerCity: "Berlin",
    description: "Terrasse mit <b>Naturstein</b> und Bepflanzung.",
    appointmentDate: "2026-01-21",
    tourId: "2"
  },
  {
    id: "p3",
    name: "Dachsanierung",
    status: "Warten auf Kunde",
    statusColor: "#8b5cf6",
    customerId: "c3",
    customerName: "Weber & Söhne",
    customerPlz: "50667",
    customerCity: "Köln",
    description: "Komplette <b>Dacherneuerung</b> inkl. Dämmung.",
    appointmentDate: "2026-01-22",
    tourId: "1"
  },
  {
    id: "p4",
    name: "Badumbau",
    status: "In Bearbeitung",
    statusColor: "#f59e0b",
    customerId: "c4",
    customerName: "Fischer, Thomas",
    customerPlz: "60313",
    customerCity: "Frankfurt",
    description: "Barrierefreies Bad mit <b>bodengleicher Dusche</b>.",
    appointmentDate: "2026-01-22",
    tourId: "2"
  },
  {
    id: "p5",
    name: "Wintergarten",
    status: "Abgeschlossen",
    statusColor: "#22c55e",
    customerId: "c5",
    customerName: "Becker, Maria",
    customerPlz: "70173",
    customerCity: "Stuttgart",
    description: "Anbau <b>Wintergarten</b> 25qm mit Heizung.",
    appointmentDate: "2026-01-23",
    tourId: "3"
  },
  {
    id: "p6",
    name: "Fassade streichen",
    status: "Neu",
    statusColor: "#3b82f6",
    customerId: "c6",
    customerName: "Hoffmann AG",
    customerPlz: "40213",
    customerCity: "Düsseldorf",
    description: "Außenfassade <b>3-stöckig</b> mit Gerüst.",
    appointmentDate: "2026-01-24",
    tourId: "1"
  },
  {
    id: "p7",
    name: "Parkett verlegen",
    status: "In Bearbeitung",
    statusColor: "#f59e0b",
    customerId: "c7",
    customerName: "Klein, Peter",
    customerPlz: "20095",
    customerCity: "Hamburg",
    description: "Eichenparkett <b>120qm</b> Wohnbereich.",
    appointmentDate: "2026-01-24",
    tourId: "2"
  },
  {
    id: "p8",
    name: "Elektroinstallation",
    status: "Neu",
    statusColor: "#3b82f6",
    customerId: "c8",
    customerName: "Neumann GmbH",
    customerPlz: "30159",
    customerCity: "Hannover",
    description: "Komplette <b>Neuverkabelung</b> Altbau.",
    appointmentDate: "2026-01-20",
    tourId: "3"
  }
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ProjectTooltip({ 
  project, 
  position,
  tour
}: { 
  project: Project; 
  position: { x: number; y: number };
  tour: Tour;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedY, setAdjustedY] = useState(position.y);

  useState(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      if (position.y + rect.height > windowHeight - 20) {
        setAdjustedY(windowHeight - rect.height - 20);
      }
      if (position.y < 20) {
        setAdjustedY(20);
      }
    }
  });

  return createPortal(
    <div 
      ref={tooltipRef}
      className="fixed z-[9999] w-72 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      style={{ 
        left: position.x,
        top: adjustedY,
        maxHeight: 'calc(100vh - 40px)'
      }}
      data-testid={`tooltip-project-${project.id}`}
    >
      <div 
        className="px-3 py-2 border-b border-slate-100 dark:border-slate-800"
        style={{ backgroundColor: hexToRgba(tour.color, 0.15) }}
      >
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            {project.name}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">{project.customerName}</p>
            <p className="text-xs text-slate-500">{project.customerPlz} {project.customerCity}</p>
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
            dangerouslySetInnerHTML={{ __html: project.description }}
          />
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: project.statusColor }}
          />
          <span className="text-sm font-medium" style={{ color: project.statusColor }}>
            {project.status}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ProjectCard({ 
  project, 
  tour,
  onDoubleClick 
}: { 
  project: Project; 
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
      
      if (y + 250 > windowHeight) {
        y = Math.max(20, windowHeight - 270);
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={onDoubleClick}
        data-testid={`project-card-${project.id}`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" data-testid={`text-project-customer-${project.id}`}>
            {project.customerName}
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]" data-testid={`text-project-plz-${project.id}`}>
            {project.customerPlz}
          </span>
        </div>
        <div 
          className="text-slate-600 dark:text-slate-300 text-[11px] leading-tight mb-1 line-clamp-2"
          dangerouslySetInnerHTML={{ __html: project.description }}
          data-testid={`text-project-description-${project.id}`}
        />
        <div className="flex items-center gap-1">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: project.statusColor }}
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate" data-testid={`text-project-status-${project.id}`}>
            {project.status}
          </span>
        </div>
      </div>
      {showTooltip && (
        <ProjectTooltip 
          project={project} 
          position={tooltipPosition}
          tour={tour}
        />
      )}
    </>
  );
}

export function WeeklyProjectView({ onCancel, onOpenProject }: WeeklyProjectViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 22));
  const [expandedTourId, setExpandedTourId] = useState<string>(tours[0]?.id || "1");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekNumber = getISOWeek(currentDate);

  const next = () => setCurrentDate(addWeeks(currentDate, 1));
  const prev = () => setCurrentDate(subWeeks(currentDate, 1));

  const getProjectsForDayAndTour = (date: Date, tourId: string): Project[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return projects.filter(p => p.appointmentDate === dateStr && p.tourId === tourId);
  };

  const getTourById = (tourId: string): Tour => {
    return tours.find(t => t.id === tourId) || tours[0];
  };

  const handleTourClick = (tourId: string) => {
    setExpandedTourId(tourId);
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
              <CalendarDays className="w-6 h-6" />
              Wochenplanung
            </CardTitle>
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
                <Button size="lg" variant="ghost" onClick={onCancel} data-testid="button-close-weekly">
                  <X className="w-6 h-6" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex-1 overflow-auto">
          <div className="grid grid-cols-7 gap-2 h-full">
            {weekDays.map((day) => (
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
                
                <div className="flex-1 flex flex-col gap-1">
                  {tours.map((tour) => {
                    const isExpanded = tour.id === expandedTourId;
                    const dayProjects = getProjectsForDayAndTour(day, tour.id);
                    const projectCount = dayProjects.length;
                    
                    if (!isExpanded) {
                      return (
                        <div 
                          key={tour.id}
                          className="h-6 rounded-lg flex items-center gap-1.5 px-2 cursor-pointer transition-all hover-elevate overflow-visible"
                          style={{ backgroundColor: hexToRgba(tour.color, 0.4) }}
                          onClick={() => handleTourClick(tour.id)}
                          data-testid={`slot-collapsed-${format(day, "yyyy-MM-dd")}-tour-${tour.id}`}
                        >
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tour.color }}
                          />
                          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate">
                            {tour.name}
                          </span>
                          {projectCount > 0 && (
                            <span 
                              className="ml-auto text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: tour.color }}
                            >
                              {projectCount}
                            </span>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div 
                        key={tour.id}
                        className="flex-1 min-h-[160px] rounded-lg p-1 border border-slate-200 dark:border-slate-700 transition-all overflow-auto"
                        style={{ backgroundColor: hexToRgba(tour.color, 0.15) }}
                        data-testid={`slot-${format(day, "yyyy-MM-dd")}-tour-${tour.id}`}
                      >
                        <div className="flex items-center gap-1 mb-1 px-1">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tour.color }}
                          />
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            {tour.name}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dayProjects.map((project) => (
                            <ProjectCard 
                              key={project.id} 
                              project={project} 
                              tour={getTourById(project.tourId)}
                              onDoubleClick={onOpenProject}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
