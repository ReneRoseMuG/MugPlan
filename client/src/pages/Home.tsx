import { useCallback, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { WeekGrid } from "@/components/WeekGrid";
import { CalendarYearView } from "@/components/calendar/CalendarYearView";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
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
import { UsersPage } from "@/components/UsersPage";
import { ImportExportPage } from "@/components/ImportExportPage";
import { useListFilters } from "@/hooks/useListFilters";
import { useSetting } from "@/hooks/useSettings";
import { addMonths, subMonths, addWeeks, subWeeks } from "date-fns";

export type ViewType = 'month' | 'week' | 'year' | 'customer' | 'customerList' | 'tours' | 'teams' | 'employees' | 'project' | 'projectList' | 'appointment' | 'appointmentsList' | 'noteTemplates' | 'projectStatus' | 'helpTexts' | 'importExport' | 'settings' | 'demoData' | 'users';
export type CalendarNavCommand = {
  id: number;
  direction: "next" | "prev";
};

type HomeProps = {
  onLogout: () => void;
};

export default function Home({ onLogout }: HomeProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectReturnView, setProjectReturnView] = useState<ViewType>('projectList');
  const { filters: calendarFilters, setFilter: setCalendarFilter } = useListFilters({
    initialFilters: { employeeId: null as number | null },
  });
  const [appointmentContext, setAppointmentContext] = useState<{
    initialDate?: string;
    initialTourId?: number | null;
    projectId?: number;
    appointmentId?: number;
    returnView?: ViewType;
    weekScrollLeft?: number | null;
  } | null>(null);
  const [pendingWeekScrollRestore, setPendingWeekScrollRestore] = useState<number | null>(null);
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const backupEnabled = useSetting("backup_enabled");
  const backupDisabled = backupEnabled === false;
  const handleWeekScrollRestoreApplied = useCallback(() => {
    setPendingWeekScrollRestore(null);
  }, []);
  const returnFromAppointment = () => {
    const context = appointmentContext;
    const returnToProject = Boolean(context?.projectId);
    const returnView = context?.returnView ?? "month";
    const weekScrollLeft = context?.weekScrollLeft;
    if (!returnToProject && returnView === "week" && typeof weekScrollLeft === "number" && Number.isFinite(weekScrollLeft) && weekScrollLeft >= 0) {
      setPendingWeekScrollRestore(weekScrollLeft);
    } else {
      setPendingWeekScrollRestore(null);
    }
    setAppointmentContext(null);
    setView(returnToProject ? "project" : returnView);
  };

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
          employeeFilterId={calendarFilters.employeeId}
          onNewAppointment={(date, options) => {
            console.info("[calendar] new appointment", { date, tourId: options?.tourId ?? null, view: "week" });
            setAppointmentContext({
              initialDate: date,
              initialTourId: options?.tourId ?? null,
              returnView: "week",
              weekScrollLeft: options?.scrollLeft ?? null,
            });
            setView('appointment');
          }}
          onOpenAppointment={(appointmentId) => {
            setAppointmentContext({ appointmentId, returnView: "week" });
            setView('appointment');
          }}
          restoreScrollLeft={pendingWeekScrollRestore}
          onScrollRestoreApplied={handleWeekScrollRestoreApplied}
        />
      );
    }

    if (view === 'year') {
      return (
        <CalendarYearView
          currentDate={currentDate}
          employeeFilterId={calendarFilters.employeeId}
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
        employeeFilterId={calendarFilters.employeeId}
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
      {/* Left Sidebar - content width with desktop clamp */}
      <aside className="h-full flex-shrink-0 z-10 relative">
        <Sidebar
          onViewChange={handleViewChange}
          onLogout={onLogout}
          currentView={view}
          userRole={userRole}
          backupDisabled={backupDisabled}
        />
      </aside>

      {/* Main Content - fills remaining width */}
      <main className="flex-1 min-w-0 h-full flex flex-col relative">
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
              onNewCustomer={() => { setSelectedCustomerId(null); setView('customer'); }}
              onSelectCustomer={(id) => { setSelectedCustomerId(id); setView('customer'); }}
            />
          ) : view === 'tours' ? (
            <TourManagement userRole={userRole} />
          ) : view === 'teams' ? (
            <TeamManagement />
          ) : view === 'employees' ? (
            <EmployeesPage
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
              onCancel={returnFromAppointment}
              onSaved={returnFromAppointment}
            />
          ) : view === 'appointmentsList' ? (
            <AppointmentsListPage
              helpKey="appointments.list.mainNavigation"
              context={{ type: "standalone" }}
              onOpenAppointment={(appointmentId) => {
                setAppointmentContext({ appointmentId, returnView: "appointmentsList" });
                setView('appointment');
              }}
            />
          ) : view === 'projectList' ? (
            <ProjectsPage
              onNewProject={() => { setSelectedProjectId(null); setProjectReturnView('projectList'); setView('project'); }}
              onSelectProject={(id) => { setSelectedProjectId(id); setProjectReturnView('projectList'); setView('project'); }}
            />
          ) : view === 'noteTemplates' && isAdmin ? (
            <NoteTemplatesPage />
          ) : view === 'projectStatus' && isAdmin ? (
            <ProjectStatusPage />
          ) : view === 'helpTexts' && isAdmin ? (
            <HelpTextsPage />
          ) : view === 'importExport' && isAdmin ? (
            <ImportExportPage />
          ) : view === 'settings' && isAdmin ? (
            <SettingsPage />
          ) : view === 'demoData' && isAdmin ? (
            <DemoDataPage />
          ) : view === 'users' && isAdmin ? (
            <UsersPage />
          ) : isCalendarView ? (
            <div className="h-full bg-white rounded-lg overflow-hidden border-2 border-foreground flex flex-col">
              <div className="flex-1 min-h-0 grid grid-cols-[28px_minmax(0,1fr)_28px]">
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
              <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-card">
                <CalendarFilterPanel
                  employeeId={calendarFilters.employeeId}
                  onEmployeeIdChange={(employeeId) => setCalendarFilter("employeeId", employeeId)}
                />
              </div>
            </div>
          ) : null}
        </div>

      </main>
    </div>
  );
}
