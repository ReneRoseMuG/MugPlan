import { useState } from "react";
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
import { X, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface WeeklyProjectViewProps {
  onCancel?: () => void;
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

function ProjectCard({ project }: { project: Project }) {
  return (
    <div 
      className="p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-xs"
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
  );
}

export function WeeklyProjectView({ onCancel }: WeeklyProjectViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 22));

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
                    const dayProjects = getProjectsForDayAndTour(day, tour.id);
                    return (
                      <div 
                        key={tour.id}
                        className="flex-1 min-h-[80px] rounded-lg p-1 border border-slate-200 dark:border-slate-700"
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
                            <ProjectCard key={project.id} project={project} />
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
