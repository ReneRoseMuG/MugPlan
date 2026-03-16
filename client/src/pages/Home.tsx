import { useCallback, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarWorkspace } from "@/components/CalendarWorkspace";
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
import { HelpTextsPage } from "@/components/HelpTextsPage";
import { HelpTextForm } from "@/components/HelpTextForm";
import { SettingsPage } from "@/components/SettingsPage";
import { DemoDataPage } from "@/components/DemoDataPage";
import { UsersPage } from "@/components/UsersPage";
import { MasterDataPage } from "@/components/MasterDataPage";
import { ReportsPage } from "@/components/ReportsPage";
import { MonitoringPage } from "@/components/MonitoringPage";
import { useListFilters } from "@/hooks/useListFilters";
import { useSetting } from "@/hooks/useSettings";
import { addMonths, subMonths } from "date-fns";
import { api, type MonitoringListResponse } from "@shared/routes";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export type ViewType =
  | "month"
  | "week"
  | "year"
  | "calendarContextual"
  | "customer"
  | "customerList"
  | "tours"
  | "teams"
  | "employees"
  | "project"
  | "projectList"
  | "appointment"
  | "appointmentsList"
  | "noteTemplates"
  | "projectStatus"
  | "helpTexts"
  | "helpTextForm"
  | "settings"
  | "demoData"
  | "masterData"
  | "users"
  | "reports"
  | "monitoring";

export type CalendarNavCommand = {
  id: number;
  direction: "next" | "prev";
};

type CalendarWorkspaceView = "week" | "month";

type ReturnContext = {
  targetView: ViewType;
  projectId?: number | null;
  customerId?: number | null;
  employeeId?: number | null;
  tourId?: number | null;
};

type AppointmentContextState = {
  initialDate?: string;
  initialTourId?: number | null;
  projectId?: number;
  appointmentId?: number;
  returnView?: ViewType;
  returnContext?: ReturnContext;
  readOnlyFields?: Array<"project" | "customer">;
  weekScrollLeft?: number | null;
};

type AppointmentOverlayOrigin = "appointmentsList" | "employeeAppointments" | "tourAppointments";

type AppointmentOverlayState = AppointmentContextState & {
  origin: AppointmentOverlayOrigin;
};

type HomeProps = {
  onLogout: () => void;
};

export default function Home({ onLogout }: HomeProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("week");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [selectedHelpTextId, setSelectedHelpTextId] = useState<number | null>(null);
  const [projectReturnView, setProjectReturnView] = useState<ViewType>("projectList");
  const [calendarContext, setCalendarContext] = useState<{
    projectId: number;
    activeView: CalendarWorkspaceView;
    currentDate: Date;
    returnContext: ReturnContext;
  } | null>(null);
  const { filters: calendarFilters, setFilter: setCalendarFilter } = useListFilters({
    initialFilters: { employeeId: null as number | null },
  });
  const [appointmentContext, setAppointmentContext] = useState<{
    initialDate?: string;
    initialTourId?: number | null;
    projectId?: number;
    appointmentId?: number;
    returnView?: ViewType;
    returnContext?: ReturnContext;
    readOnlyFields?: Array<"project" | "customer">;
    weekScrollLeft?: number | null;
  } | null>(null);
  const [appointmentOverlayContext, setAppointmentOverlayContext] = useState<AppointmentOverlayState | null>(null);
  const [pendingWeekScrollRestore, setPendingWeekScrollRestore] = useState<number | null>(null);
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";
  const canAccessReports = isAdmin || userRole === "DISPATCHER";
  const canAccessMonitoring = canAccessReports;
  const backupEnabled = useSetting("backup_enabled");
  const backupDisabled = backupEnabled === false;
  const {
    data: monitoringItems,
    isLoading: isMonitoringLoading,
    refetch: refetchMonitoring,
  } = useQuery<MonitoringListResponse>({
    queryKey: [api.monitoring.list.path],
    enabled: canAccessMonitoring,
    queryFn: async () => {
      const response = await fetch(api.monitoring.list.path, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Monitoring konnte nicht geladen werden");
      }
      return (await response.json()) as MonitoringListResponse;
    },
  });

  useEffect(() => {
    if (view !== "monitoring" || !canAccessMonitoring) return;
    void refetchMonitoring();
  }, [canAccessMonitoring, refetchMonitoring, view]);

  const handleWeekScrollRestoreApplied = useCallback(() => {
    setPendingWeekScrollRestore(null);
  }, []);

  const applyReturnContext = useCallback((context: ReturnContext) => {
    if (typeof context.projectId === "number") {
      setSelectedProjectId(context.projectId);
    }
    if (typeof context.customerId === "number") {
      setSelectedCustomerId(context.customerId);
    }
    setSelectedEmployeeId(typeof context.employeeId === "number" ? context.employeeId : null);
    setSelectedTourId(typeof context.tourId === "number" ? context.tourId : null);

    if (context.targetView !== "calendarContextual") {
      setCalendarContext(null);
    }

    setView(context.targetView);
  }, []);

  const returnFromAppointment = () => {
    const context = appointmentContext;

    if (context?.returnContext) {
      if (
        context.returnContext.targetView === "week"
        && typeof context.weekScrollLeft === "number"
        && Number.isFinite(context.weekScrollLeft)
        && context.weekScrollLeft >= 0
      ) {
        setPendingWeekScrollRestore(context.weekScrollLeft);
      } else {
        setPendingWeekScrollRestore(null);
      }
      setAppointmentContext(null);
      applyReturnContext(context.returnContext);
      return;
    }

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

  const nextYear = () => {
    setCurrentDate(addMonths(currentDate, 12));
  };

  const prevYear = () => {
    setCurrentDate(subMonths(currentDate, 12));
  };

  const handleViewChange = (newView: ViewType) => {
    console.info("[navigation] view change", { from: view, to: newView });
    setAppointmentOverlayContext(null);
    if (newView !== "employees") {
      setSelectedEmployeeId(null);
    }
    if (newView !== "tours") {
      setSelectedTourId(null);
    }
    if (newView !== "calendarContextual") {
      setCalendarContext(null);
    }
    setView(newView);
  };

  const isGlobalCalendarView = view === "month" || view === "week" || view === "year";
  const isContextualCalendarView = view === "calendarContextual" && calendarContext !== null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-body">
      {isContextualCalendarView ? null : (
        <aside className="h-full flex-shrink-0 z-10 relative">
          <Sidebar
            onViewChange={handleViewChange}
            onLogout={onLogout}
            currentView={view}
            userRole={userRole}
            backupDisabled={backupDisabled}
            monitoringCount={canAccessMonitoring ? monitoringItems?.length ?? 0 : undefined}
          />
        </aside>
      )}

      <main className="flex-1 min-w-0 h-full flex flex-col relative">
        <div className="flex-1 p-8 overflow-hidden bg-slate-100">
          {view === "customer" ? (
            <CustomerData
              customerId={selectedCustomerId}
              onCancel={() => { setSelectedCustomerId(null); setView("customerList"); }}
              onSave={() => { setSelectedCustomerId(null); setView("customerList"); }}
              onOpenProject={(id) => {
                setSelectedProjectId(id);
                setProjectReturnView("customer");
                setView("project");
              }}
            />
          ) : view === "customerList" ? (
            <CustomersPage
              onNewCustomer={() => { setSelectedCustomerId(null); setView("customer"); }}
              onSelectCustomer={(id) => { setSelectedCustomerId(id); setView("customer"); }}
            />
          ) : view === "tours" ? (
            <TourManagement
              userRole={userRole}
              initialTourId={selectedTourId}
              onOpenAppointment={(appointmentId, context) => {
                setAppointmentOverlayContext({
                  origin: "tourAppointments",
                  appointmentId,
                  returnContext: {
                    targetView: "tours",
                    tourId: context.type === "tour" && typeof context.tourId === "number" ? context.tourId : null,
                  },
                });
              }}
            />
          ) : view === "teams" ? (
            <TeamManagement />
          ) : view === "employees" ? (
            <EmployeesPage
              initialEmployeeId={selectedEmployeeId}
              onOpenAppointment={(appointmentId, context) => {
                setAppointmentOverlayContext({
                  origin: "employeeAppointments",
                  appointmentId,
                  returnContext: {
                    targetView: "employees",
                    employeeId: context.type === "employee" ? context.employeeId : selectedEmployeeId,
                  },
                });
              }}
            />
          ) : view === "project" ? (
            <ProjectForm
              projectId={selectedProjectId || undefined}
              onCancel={() => { setSelectedProjectId(null); setView(projectReturnView); }}
              onSaved={() => { setSelectedProjectId(null); setView(projectReturnView); }}
              onOpenAppointment={(context) => {
                setAppointmentContext({
                  projectId: context.projectId,
                  appointmentId: context.appointmentId,
                  returnContext: { targetView: "project", projectId: context.projectId ?? selectedProjectId },
                });
                setView("appointment");
              }}
              onOpenCalendarWorkspace={(context) => {
                setCalendarContext({
                  projectId: context.projectId,
                  activeView: "week",
                  currentDate,
                  returnContext: { targetView: "project", projectId: context.projectId },
                });
                setView("calendarContextual");
              }}
            />
          ) : view === "appointment" ? (
            <AppointmentForm
              appointmentId={appointmentContext?.appointmentId}
              initialDate={appointmentContext?.initialDate}
              initialTourId={appointmentContext?.initialTourId}
              projectId={appointmentContext?.projectId}
              readOnlyFields={appointmentContext?.readOnlyFields}
              onCancel={returnFromAppointment}
              onSaved={returnFromAppointment}
            />
          ) : view === "appointmentsList" ? (
            <AppointmentsListPage
              helpKey="appointments.list.mainNavigation"
              context={{ type: "standalone" }}
              onOpenAppointment={(appointmentId) => {
                setAppointmentOverlayContext({
                  origin: "appointmentsList",
                  appointmentId,
                  returnContext: { targetView: "appointmentsList" },
                });
              }}
            />
          ) : view === "projectList" ? (
            <ProjectsPage
              onNewProject={() => { setSelectedProjectId(null); setProjectReturnView("projectList"); setView("project"); }}
              onSelectProject={(id) => { setSelectedProjectId(id); setProjectReturnView("projectList"); setView("project"); }}
            />
          ) : view === "noteTemplates" && isAdmin ? (
            <MasterDataPage initialTabId="note-templates" />
          ) : view === "projectStatus" && isAdmin ? (
            <MasterDataPage initialTabId="project-status" />
          ) : view === "helpTexts" && isAdmin ? (
            <HelpTextsPage
              onCreateHelpText={() => {
                setSelectedHelpTextId(null);
                setView("helpTextForm");
              }}
              onEditHelpText={(id) => {
                setSelectedHelpTextId(id);
                setView("helpTextForm");
              }}
            />
          ) : view === "helpTextForm" && isAdmin ? (
            <HelpTextForm
              helpTextId={selectedHelpTextId ?? undefined}
              onCancel={() => {
                setSelectedHelpTextId(null);
                setView("helpTexts");
              }}
              onSaved={() => {
                setSelectedHelpTextId(null);
                setView("helpTexts");
              }}
            />
          ) : view === "settings" && isAdmin ? (
            <SettingsPage />
          ) : view === "demoData" && isAdmin ? (
            <DemoDataPage />
          ) : view === "masterData" && isAdmin ? (
            <MasterDataPage initialTabId="products" />
          ) : view === "users" && isAdmin ? (
            <UsersPage />
          ) : view === "reports" && canAccessReports ? (
            <ReportsPage />
          ) : view === "monitoring" && canAccessMonitoring ? (
            <MonitoringPage
              isAdmin={isAdmin}
              initialItems={monitoringItems}
              isInitialLoading={isMonitoringLoading}
            />
          ) : isContextualCalendarView ? (
            <CalendarWorkspace
              mode="contextual"
              activeView={calendarContext.activeView}
              currentDate={calendarContext.currentDate}
              employeeFilterId={calendarFilters.employeeId}
              onEmployeeFilterChange={(employeeId) => setCalendarFilter("employeeId", employeeId)}
              onViewChange={(activeView) => {
                setCalendarContext((prev) => (prev ? { ...prev, activeView } : prev));
              }}
              onDateChange={(date) => {
                setCalendarContext((prev) => (prev ? { ...prev, currentDate: date } : prev));
              }}
              onOpenAppointmentForm={(ctx) => {
                const isNewAppointment = !ctx.appointmentId;
                setAppointmentContext({
                  initialDate: ctx.initialDate,
                  initialTourId: ctx.initialTourId,
                  appointmentId: ctx.appointmentId,
                  projectId: isNewAppointment ? calendarContext.projectId : undefined,
                  readOnlyFields: isNewAppointment ? ["project", "customer"] : undefined,
                  returnContext: { targetView: "calendarContextual", projectId: calendarContext.projectId },
                  returnView: ctx.returnView,
                  weekScrollLeft: ctx.weekScrollLeft,
                });
                setView("appointment");
              }}
              onBack={() => {
                applyReturnContext(calendarContext.returnContext);
              }}
              projectId={calendarContext.projectId}
              hideMainNavigation
            />
          ) : isGlobalCalendarView && (view === "week" || view === "month") ? (
            <CalendarWorkspace
              mode="global"
              activeView={view}
              currentDate={currentDate}
              employeeFilterId={calendarFilters.employeeId}
              onEmployeeFilterChange={(employeeId) => setCalendarFilter("employeeId", employeeId)}
              onViewChange={(activeView) => {
                setView(activeView);
              }}
              onDateChange={setCurrentDate}
              onOpenAppointmentForm={(ctx) => {
                setAppointmentContext({
                  initialDate: ctx.initialDate,
                  initialTourId: ctx.initialTourId,
                  appointmentId: ctx.appointmentId,
                  projectId: ctx.projectId,
                  returnContext: { targetView: ctx.returnView ?? "month" },
                  returnView: ctx.returnView,
                  weekScrollLeft: ctx.weekScrollLeft,
                });
                setView("appointment");
              }}
              restoreScrollLeft={pendingWeekScrollRestore}
              onScrollRestoreApplied={handleWeekScrollRestoreApplied}
            />
          ) : isGlobalCalendarView && view === "year" ? (
            <div className="h-full bg-white rounded-lg overflow-hidden border-2 border-foreground flex flex-col">
              <div className="flex-1 min-h-0 grid grid-cols-[28px_minmax(0,1fr)_28px]">
                <button
                  onClick={prevYear}
                  className="h-full w-7 text-sm font-semibold text-primary/70 hover:text-primary"
                  data-testid="button-prev"
                  aria-label="Zurueck"
                >
                  {"<"}
                </button>
                <div className="min-w-0 h-full overflow-hidden">
                  <CalendarYearView
                    currentDate={currentDate}
                    employeeFilterId={calendarFilters.employeeId}
                    onNewAppointment={(date) => {
                      setAppointmentContext({
                        initialDate: date,
                        returnContext: { targetView: "year" },
                      });
                      setView("appointment");
                    }}
                    onOpenAppointment={(appointmentId) => {
                      setAppointmentContext({
                        appointmentId,
                        returnContext: { targetView: "year" },
                      });
                      setView("appointment");
                    }}
                  />
                </div>
                <button
                  onClick={nextYear}
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
        {appointmentOverlayContext ? (
          <div
            className="absolute inset-0 z-20 bg-slate-100 p-8"
            data-testid="appointment-form-overlay"
          >
            <AppointmentForm
              appointmentId={appointmentOverlayContext.appointmentId}
              initialDate={appointmentOverlayContext.initialDate}
              initialTourId={appointmentOverlayContext.initialTourId}
              projectId={appointmentOverlayContext.projectId}
              readOnlyFields={appointmentOverlayContext.readOnlyFields}
              showBackButton
              onBack={() => {
                setAppointmentOverlayContext(null);
              }}
              onCancel={() => {
                setAppointmentOverlayContext(null);
              }}
              onSaved={() => {
                setAppointmentOverlayContext(null);
              }}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
