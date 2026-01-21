import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { CustomerDetail } from "@/components/CustomerDetail";
import { CustomerData } from "@/components/CustomerData";
import { TourManagement } from "@/components/TourManagement";
import { TeamManagement } from "@/components/TeamManagement";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { ProjectForm } from "@/components/ProjectForm";
import { AppointmentForm } from "@/components/AppointmentForm";
import { addMonths, subMonths, format, startOfWeek, endOfWeek, eachDayOfInterval, startOfYear, endOfYear, eachMonthOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ViewType = 'month' | 'week' | 'year' | 'customer' | 'customerData' | 'tours' | 'teams' | 'employees' | 'project' | 'projectList' | 'appointment';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');

  // Handlers for navigation
  const next = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(addMonths(currentDate, 1 / 4)); // Simplistic week jump
    if (view === 'year') setCurrentDate(addMonths(currentDate, 12));
  };
  
  const prev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(subMonths(currentDate, 1 / 4));
    if (view === 'year') setCurrentDate(subMonths(currentDate, 12));
  };

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { locale: de });
    const end = endOfWeek(currentDate, { locale: de });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="week-grid h-full bg-white rounded-lg overflow-hidden">
        {days.map((day) => (
          <div key={day.toString()} className="week-cell bg-white">
            <div className="text-sm font-bold uppercase text-slate-500 mb-2">
              {format(day, "EEEE", { locale: de })}
            </div>
            <div className="text-3xl font-extrabold text-foreground">
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderYearView = () => {
    const start = startOfYear(currentDate);
    const end = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start, end });

    return (
      <div className="year-grid h-full overflow-y-auto">
        {months.map((month) => (
          <div key={month.toString()} className="mini-month rounded-lg p-3 bg-white hover:border-primary transition-colors cursor-pointer" onClick={() => { setCurrentDate(month); setView('month'); }}>
            <h4 className="font-bold text-center mb-2 uppercase text-xs tracking-widest text-primary">
              {format(month, "MMMM", { locale: de })}
            </h4>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(31)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-slate-200 rounded-full mx-auto" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-body">
      {/* Left Sidebar - 20% Width */}
      <aside className="w-[20%] h-full flex-shrink-0 z-10 relative">
        <Sidebar onViewChange={handleViewChange} currentView={view} />
      </aside>

      {/* Main Content - 80% Width */}
      <main className="w-[80%] h-full flex flex-col relative">
        
        {/* Header / Navigation Bar */}
        <header className="px-8 py-6 flex items-center justify-between bg-white border-b-2 border-border z-20">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-black font-display text-primary tracking-tighter uppercase">
              {view === 'customer' ? 'Kunden - Stammdaten' : view === 'customerData' ? 'Kunden - Kundendaten' : view === 'tours' ? 'Touren Übersicht' : view === 'teams' ? 'Team Vorlagen' : view === 'employees' ? 'Mitarbeiter Übersicht' : view === 'project' ? 'Neues Projekt' : view === 'projectList' ? 'Projektliste' : view === 'appointment' ? 'Neuer Termin' : view === 'year' ? format(currentDate, "yyyy") : format(currentDate, "MMMM yyyy", { locale: de })}
            </h2>
          </div>

          {view !== 'customer' && view !== 'customerData' && view !== 'tours' && view !== 'teams' && view !== 'employees' && view !== 'project' && view !== 'projectList' && view !== 'appointment' && (
            <div className="flex items-center gap-2 bg-border rounded-md p-1">
              <button
                onClick={prev}
                className="px-4 py-2 rounded bg-background text-primary font-black hover:bg-primary hover:text-white transition-all active:scale-95"
                data-testid="button-prev"
              >
                <div className="flex items-center gap-2">
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-tighter">Zurück</span>
                </div>
              </button>
              
              <button
                onClick={next}
                className="px-4 py-2 rounded bg-background text-primary font-black hover:bg-primary hover:text-white transition-all active:scale-95"
                data-testid="button-next"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-tighter">Vor</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-hidden bg-slate-100">
          {view === 'customer' ? (
            <CustomerDetail onCancel={() => setView('month')} />
          ) : view === 'customerData' ? (
            <CustomerData onCancel={() => setView('month')} />
          ) : view === 'tours' ? (
            <TourManagement onCancel={() => setView('month')} />
          ) : view === 'teams' ? (
            <TeamManagement onCancel={() => setView('month')} />
          ) : view === 'employees' ? (
            <EmployeeManagement onCancel={() => setView('month')} />
          ) : view === 'project' ? (
            <ProjectForm onCancel={() => setView('month')} />
          ) : view === 'appointment' ? (
            <AppointmentForm onCancel={() => setView('month')} />
          ) : view === 'projectList' ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>Projektliste - Demo Platzhalter</p>
            </div>
          ) : view === 'week' ? renderWeekView() : 
           view === 'year' ? renderYearView() : (
            <div className="h-full bg-white rounded-lg overflow-hidden border-2 border-foreground">
              <CalendarGrid 
                currentDate={currentDate} 
                onNewAppointment={() => setView('appointment')}
                onAppointmentDoubleClick={() => setView('project')}
              />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
