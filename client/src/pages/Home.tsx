import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { WeekGrid } from "@/components/WeekGrid";
import { CalendarYearView } from "@/components/calendar/CalendarYearView";
import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { CustomerData } from "@/components/CustomerData";
import { CustomerList } from "@/components/CustomerList";
import { TourManagement } from "@/components/TourManagement";
import { TeamManagement } from "@/components/TeamManagement";
import { EmployeePage } from "@/components/EmployeePage";
import { ProjectForm } from "@/components/ProjectForm";
import ProjectList from "@/components/ProjectList";
import { EmployeeWeeklyView } from "@/components/EmployeeWeeklyView";
import { AppointmentForm } from "@/components/AppointmentForm";
import { NoteTemplatesPage } from "@/components/NoteTemplatesPage";
import { ProjectStatusPage } from "@/components/ProjectStatusPage";
import { HelpTextsPage } from "@/components/HelpTextsPage";
import { addMonths, subMonths, addWeeks, subWeeks, format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ViewType = 'month' | 'week' | 'year' | 'customer' | 'customerList' | 'tours' | 'teams' | 'employees' | 'employeeWeekly' | 'project' | 'projectList' | 'appointment' | 'noteTemplates' | 'projectStatus' | 'helpTexts';

type HomeProps = {
  onLogout: () => void;
};

export default function Home({ onLogout }: HomeProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectReturnView, setProjectReturnView] = useState<ViewType>('projectList');
  const [calendarEmployeeFilterId, setCalendarEmployeeFilterId] = useState<number | null>(null);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [appointmentContext, setAppointmentContext] = useState<{
    initialDate?: string;
    projectId?: number;
    appointmentId?: number;
    returnView?: ViewType;
  } | null>(null);

  // Handlers for navigation
  const next = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (view === 'year') setCurrentDate(addMonths(currentDate, 12));
  };
  
  const prev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    if (view === 'year') setCurrentDate(subMonths(currentDate, 12));
  };

  const handleViewChange = (newView: ViewType) => {
    console.info("[navigation] view change", { from: view, to: newView });
    setView(newView);
  };


  const isCalendarView = view === 'month' || view === 'week' || view === 'year';

  const renderCalendarContent = () => {
    if (view === 'week') {
      return (
        <WeekGrid
          currentDate={currentDate}
          employeeFilterId={calendarEmployeeFilterId}
          onNewAppointment={(date) => {
            console.info("[calendar] new appointment", { date, view: "week" });
            setAppointmentContext({ initialDate: date });
            setView('appointment');
          }}
          onOpenAppointment={(appointmentId) => {
            setAppointmentContext({ appointmentId, returnView: "week" });
            setView('appointment');
          }}
        />
      );
    }

    if (view === 'year') {
      return (
        <CalendarYearView
          currentDate={currentDate}
          employeeFilterId={calendarEmployeeFilterId}
          onNewAppointment={(date) => {
            console.info("[calendar] new appointment", { date, view: "year" });
            setAppointmentContext({ initialDate: date });
            setView('appointment');
          }}
          onOpenAppointment={(appointmentId) => {
            setAppointmentContext({ appointmentId, returnView: "year" });
            setView('appointment');
          }}
        />
      );
    }

    return (
      <CalendarGrid
        currentDate={currentDate}
        employeeFilterId={calendarEmployeeFilterId}
        onNewAppointment={(date) => {
          console.info("[calendar] new appointment", { date, view: "month" });
          setAppointmentContext({ initialDate: date });
          setView('appointment');
        }}
        onOpenAppointment={(appointmentId) => {
          setAppointmentContext({ appointmentId, returnView: "month" });
          setView('appointment');
        }}
      />
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
              {view === 'customer' ? 'Kundendaten' : view === 'customerList' ? 'Kundenliste' : view === 'tours' ? 'Touren Übersicht' : view === 'teams' ? 'Teams' : view === 'employees' ? 'Mitarbeiter Übersicht' : view === 'employeeWeekly' ? 'Mitarbeiter Wochenplan' : view === 'project' ? 'Neues Projekt' : view === 'projectList' ? 'Projektliste' : view === 'appointment' ? 'Neuer Termin' : view === 'noteTemplates' ? 'Notiz Vorlagen' : view === 'projectStatus' ? 'Projekt Status' : view === 'helpTexts' ? 'Hilfetexte' : view === 'year' ? format(currentDate, "yyyy") : format(currentDate, "MMMM yyyy", { locale: de })}
            </h2>
          </div>

          <div className="flex items-center gap-3">
          {view !== 'customer' && view !== 'customerList' && view !== 'tours' && view !== 'teams' && view !== 'employees' && view !== 'employeeWeekly' && view !== 'project' && view !== 'projectList' && view !== 'appointment' && view !== 'noteTemplates' && view !== 'projectStatus' && view !== 'helpTexts' && (
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

          {isCalendarView && (
            <div className="flex items-center gap-3">
              <CalendarEmployeeFilter value={calendarEmployeeFilterId} onChange={setCalendarEmployeeFilterId} />
              <button
                onClick={() => setCalendarDialogOpen(true)}
                className="px-4 py-2 rounded bg-background text-primary font-black hover:bg-primary hover:text-white transition-all active:scale-95"
                data-testid="button-calendar-dialog"
              >
                Dialog öffnen
              </button>
            </div>
          )}
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-hidden bg-slate-100">
          {view === 'customer' ? (
            <CustomerData 
              customerId={selectedCustomerId}
              onCancel={() => { setSelectedCustomerId(null); setView('customerList'); }} 
              onSave={() => { setSelectedCustomerId(null); setView('customerList'); }}
              onOpenProject={(id) => {
                setSelectedProjectId(id);
                setProjectReturnView('customer');
                setView('project');
              }}
            />
          ) : view === 'customerList' ? (
            <CustomerList 
              onCancel={() => setView('month')} 
              onNewCustomer={() => { setSelectedCustomerId(null); setView('customer'); }}
              onSelectCustomer={(id) => { setSelectedCustomerId(id); setView('customer'); }}
            />
          ) : view === 'tours' ? (
            <TourManagement onCancel={() => setView('month')} />
          ) : view === 'teams' ? (
            <TeamManagement onCancel={() => setView('month')} />
          ) : view === 'employees' ? (
            <EmployeePage 
              onCancel={() => setView('month')} 
            />
          ) : view === 'employeeWeekly' && selectedEmployee ? (
            <EmployeeWeeklyView 
              employeeId={selectedEmployee.id}
              employeeName={selectedEmployee.name}
              onCancel={() => setView('employees')} 
              onOpenAppointment={() => setView('appointment')}
            />
          ) : view === 'project' ? (
            <ProjectForm 
              projectId={selectedProjectId || undefined}
              onCancel={() => { setSelectedProjectId(null); setView(projectReturnView); }}
              onSaved={() => { setSelectedProjectId(null); setView(projectReturnView); }}
              onOpenAppointment={(context) => {
                setAppointmentContext({
                  projectId: context.projectId,
                  appointmentId: context.appointmentId,
                });
                setView('appointment');
              }}
            />
          ) : view === 'appointment' ? (
            <AppointmentForm
              appointmentId={appointmentContext?.appointmentId}
              initialDate={appointmentContext?.initialDate}
              projectId={appointmentContext?.projectId}
              onCancel={() => {
                const returnToProject = Boolean(appointmentContext?.projectId);
                const returnView = appointmentContext?.returnView ?? 'month';
                setAppointmentContext(null);
                setView(returnToProject ? 'project' : returnView);
              }}
              onSaved={() => {
                const returnToProject = Boolean(appointmentContext?.projectId);
                const returnView = appointmentContext?.returnView ?? 'month';
                setAppointmentContext(null);
                setView(returnToProject ? 'project' : returnView);
              }}
            />
          ) : view === 'projectList' ? (
            <ProjectList 
              onCancel={() => setView('month')} 
              onNewProject={() => { setSelectedProjectId(null); setProjectReturnView('projectList'); setView('project'); }}
              onSelectProject={(id) => { setSelectedProjectId(id); setProjectReturnView('projectList'); setView('project'); }}
            />
          ) : view === 'noteTemplates' ? (
            <NoteTemplatesPage />
          ) : view === 'projectStatus' ? (
            <ProjectStatusPage />
          ) : view === 'helpTexts' ? (
            <HelpTextsPage />
          ) : isCalendarView ? (
            <div className="h-full bg-white rounded-lg overflow-hidden border-2 border-foreground">
              {/* Kalenderansicht benötigt gemeinsames Filter/Popup-Verhalten, daher hier zentral gerendert. */}
              {renderCalendarContent()}
            </div>
          ) : null}
        </div>

      </main>

      {isCalendarView && (
        <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
          <DialogContent className="max-w-[1200px] h-[80vh]">
            <DialogHeader>
              <DialogTitle>Kalenderansicht</DialogTitle>
            </DialogHeader>
            <div className="h-full">{renderCalendarContent()}</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
