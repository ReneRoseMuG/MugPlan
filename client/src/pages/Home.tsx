import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { WeekGrid } from "@/components/WeekGrid";
import { CalendarYearView } from "@/components/calendar/CalendarYearView";
import { CalendarEmployeeFilter } from "@/components/calendar/CalendarEmployeeFilter";
import { CustomerData } from "@/components/CustomerData";
import { CustomersPage } from "@/components/CustomersPage";
import { TourManagement } from "@/components/TourManagement";
import { TeamManagement } from "@/components/TeamManagement";
import { EmployeesPage } from "@/components/EmployeesPage";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectsPage } from "@/components/ProjectsPage";
import { AppointmentForm } from "@/components/AppointmentForm";
import { AppointmentsListPage } from "@/components/AppointmentsListPage";
import { NoteTemplatesPage } from "@/components/NoteTemplatesPage";
import { ProjectStatusPage } from "@/components/ProjectStatusPage";
import { HelpTextsPage } from "@/components/HelpTextsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { DemoDataPage } from "@/components/DemoDataPage";
import { addMonths, subMonths, addWeeks, subWeeks, format } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export type ViewType = 'month' | 'week' | 'year' | 'customer' | 'customerList' | 'tours' | 'teams' | 'employees' | 'project' | 'projectList' | 'appointment' | 'appointmentsList' | 'noteTemplates' | 'projectStatus' | 'helpTexts' | 'settings' | 'demoData';
export type CalendarNavCommand = {
  id: number;
  direction: "next" | "prev";
};

type HomeProps = {
  onLogout: () => void;
};

export default function Home({ onLogout }: HomeProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectReturnView, setProjectReturnView] = useState<ViewType>('projectList');
  const [calendarEmployeeFilterId, setCalendarEmployeeFilterId] = useState<number | null>(null);
  const [appointmentContext, setAppointmentContext] = useState<{
    initialDate?: string;
    initialTourId?: number | null;
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
          onNewAppointment={(date, options) => {
            console.info("[calendar] new appointment", { date, tourId: options?.tourId ?? null, view: "week" });
            setAppointmentContext({ initialDate: date, initialTourId: options?.tourId ?? null, returnView: "week" });
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

  const calendarTitleDate = currentDate;

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
              {view === 'customer' ? 'Kundendaten' : view === 'customerList' ? 'Kundenliste' : view === 'tours' ? 'Touren Übersicht' : view === 'teams' ? 'Teams' : view === 'employees' ? 'Mitarbeiter Übersicht' : view === 'project' ? 'Neues Projekt' : view === 'projectList' ? 'Projektliste' : view === 'appointment' ? 'Neuer Termin' : view === 'appointmentsList' ? 'Terminliste' : view === 'noteTemplates' ? 'Notiz Vorlagen' : view === 'projectStatus' ? 'Projekt Status' : view === 'helpTexts' ? 'Hilfetexte' : view === 'settings' ? 'Einstellungen' : view === 'demoData' ? 'Demo-Daten' : view === 'year' ? format(calendarTitleDate, "yyyy") : format(calendarTitleDate, "MMMM yyyy", { locale: de })}
            </h2>
          </div>

          <div className="flex items-center gap-3">
          {isCalendarView && (
            <div className="flex items-center gap-3">
              <CalendarEmployeeFilter value={calendarEmployeeFilterId} onChange={setCalendarEmployeeFilterId} />
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
            <CustomersPage
              onCancel={() => setView('month')} 
              onNewCustomer={() => { setSelectedCustomerId(null); setView('customer'); }}
              onSelectCustomer={(id) => { setSelectedCustomerId(id); setView('customer'); }}
            />
          ) : view === 'tours' ? (
            <TourManagement onCancel={() => setView('month')} />
          ) : view === 'teams' ? (
            <TeamManagement onCancel={() => setView('month')} />
          ) : view === 'employees' ? (
            <EmployeesPage
              onCancel={() => setView('month')}
              onOpenAppointment={(appointmentId) => {
                setAppointmentContext({ appointmentId, returnView: "employees" });
                setView('appointment');
              }}
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
              initialTourId={appointmentContext?.initialTourId}
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
          ) : view === 'appointmentsList' ? (
            <AppointmentsListPage
              onCancel={() => setView('month')}
              onOpenAppointment={(appointmentId) => {
                setAppointmentContext({ appointmentId, returnView: "appointmentsList" });
                setView('appointment');
              }}
            />
          ) : view === 'projectList' ? (
            <ProjectsPage
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
          ) : view === 'settings' ? (
            <SettingsPage />
          ) : view === 'demoData' ? (
            <DemoDataPage />
          ) : isCalendarView ? (
            <div className="h-full bg-white rounded-lg overflow-hidden border-2 border-foreground grid grid-cols-[28px_minmax(0,1fr)_28px]">
              {/* UI-ONLY:
               * Diese Navigationsfläche triggert ausschließlich die bestehende
               * Vor/Zurück-Navigation.
               * Keine eigene Logik, kein Scroll, keine Zeitfenster-Änderung.
               */}
              <button
                onClick={prev}
                className="h-full w-7 text-sm font-semibold text-primary/70 hover:text-primary"
                data-testid="button-prev"
                aria-label="Zurück"
              >
                {"<"}
              </button>
              {/* Kalenderansicht benötigt gemeinsames Filter/Popup-Verhalten, daher hier zentral gerendert. */}
              <div className="min-w-0 h-full overflow-hidden">{renderCalendarContent()}</div>
              {/* UI-ONLY:
               * Diese Navigationsfläche triggert ausschließlich die bestehende
               * Vor/Zurück-Navigation.
               * Keine eigene Logik, kein Scroll, keine Zeitfenster-Änderung.
               */}
              <button
                onClick={next}
                className="h-full w-7 text-sm font-semibold text-primary/70 hover:text-primary"
                data-testid="button-next"
                aria-label="Vor"
              >
                {">"}
              </button>
            </div>
          ) : null}
        </div>

      </main>
    </div>
  );
}
