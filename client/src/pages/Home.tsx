import { useCallback, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarWorkspace } from "@/components/CalendarWorkspace";
import { CalendarYearView } from "@/components/calendar/CalendarYearView";
import { CalendarFilterPanel } from "@/components/ui/filter-panels/calendar-filter-panel";
import { CustomerData } from "@/components/CustomerData";
import { CustomersPage, type CustomerScope, type CustomerSortKey, type SortDirection as CustomerSortDirection } from "@/components/CustomersPage";
import { TourManagement } from "@/components/TourManagement";
import { TeamManagement } from "@/components/TeamManagement";
import { EmployeesPage, type EmployeeScope, type EmployeeSortKey, type SortDirection as EmployeeSortDirection } from "@/components/EmployeesPage";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectsPage, type ProjectSortKey, type SortDirection as ProjectSortDirection } from "@/components/ProjectsPage";
import { AppointmentForm } from "@/components/AppointmentForm";
import type { AppointmentFormSaveResult } from "@/components/AppointmentForm";
import {
  AppointmentsListPage,
  type AppointmentListFilters,
  type AppointmentListScope,
  type AppointmentListSortDirection,
  type AppointmentListSortKey,
} from "@/components/AppointmentsListPage";
import { HelpTextForm } from "@/components/HelpTextForm";
import { SettingsPage } from "@/components/SettingsPage";
import { UsersPage } from "@/components/UsersPage";
import { MasterDataPage } from "@/components/MasterDataPage";
import { ReportsPage } from "@/components/ReportsPage";
import { MonitoringPage } from "@/components/MonitoringPage";
import { JournalPage } from "@/components/JournalPage";
import { useListFilters } from "@/hooks/useListFilters";
import { useSetting } from "@/hooks/useSettings";
import { defaultProjectFilters, type ProjectFilters, type ProjectScope } from "@/lib/project-filters";
import { defaultCustomerFilters, type CustomerFilters } from "@/lib/customer-filters";
import { defaultEmployeeFilters, type EmployeeFilters } from "@/lib/employee-filters";
import { addMonths, subMonths } from "date-fns";
import { api, type MonitoringListResponse } from "@shared/routes";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { buildMonitoringTriggerSummary } from "@/lib/monitoring-ui";

export type ViewType =
  | "month"
  | "monthSheet"
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
  | "helpTexts"
  | "helpTextForm"
  | "settings"
  | "masterData"
  | "users"
  | "reports"
  | "journal"
  | "monitoring";

export type CalendarNavCommand = {
  id: number;
  direction: "next" | "prev";
};

export type WeekViewRestoreRequest = {
  scrollLeft?: number | null;
  scrollTop?: number | null;
  focusAppointmentId?: number | null;
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
  weekScrollTop?: number | null;
};

type AppointmentOverlayOrigin = "appointmentsList" | "employeeAppointments" | "tourAppointments" | "monitoring";

type AppointmentOverlayState = AppointmentContextState & {
  origin: AppointmentOverlayOrigin;
};

type HomeProps = {
  onLogout: () => void;
};

function resolveViewTitle(view: ViewType): string {
  switch (view) {
    case "week":
      return "Wochenübersicht";
    case "month":
    case "monthSheet":
      return "Monatsübersicht";
    case "year":
      return "Jahresübersicht";
    case "calendarContextual":
      return "Projektkalender";
    case "customer":
    case "customerList":
      return "Kunden";
    case "tours":
      return "Touren";
    case "teams":
      return "Teams";
    case "employees":
      return "Mitarbeiter";
    case "project":
    case "projectList":
      return "Projekte";
    case "appointment":
    case "appointmentsList":
      return "Termine";
    case "noteTemplates":
      return "Notizvorlagen";
    case "helpTexts":
    case "helpTextForm":
      return "Hilfetexte";
    case "settings":
      return "Meine Einstellungen";
    case "masterData":
      return "Stammdaten";
    case "users":
      return "Benutzerverwaltung";
    case "reports":
      return "Reports";
    case "journal":
      return "Journal";
    case "monitoring":
      return "Monitoring";
    default:
      return "MuG Plan";
  }
}

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
  const {
    filters: projectFilters,
    setFilter: setProjectFilter,
    page: projectPage,
    setPage: setProjectPage,
  } = useListFilters<ProjectFilters>({
    initialFilters: defaultProjectFilters,
  });
  const [projectScope, setProjectScope] = useState<ProjectScope>("all");
  const [projectSortKey, setProjectSortKey] = useState<ProjectSortKey>("title");
  const [projectSortDirection, setProjectSortDirection] = useState<ProjectSortDirection>("asc");
  const {
    filters: customerFilters,
    setFilter: setCustomerFilter,
    page: customerPage,
    setPage: setCustomerPage,
  } = useListFilters<CustomerFilters>({
    initialFilters: defaultCustomerFilters,
  });
  const [customerScope, setCustomerScope] = useState<CustomerScope>("active");
  const [customerSortKey, setCustomerSortKey] = useState<CustomerSortKey>("customerNumber");
  const [customerSortDirection, setCustomerSortDirection] = useState<CustomerSortDirection>("asc");
  const [appointmentListFilters, setAppointmentListFilters] = useState<AppointmentListFilters>({
    employeeId: undefined,
    projectTitle: "",
    customerLastName: "",
    customerNumber: "",
    orderNumber: "",
    tagIds: [],
    tourId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });
  const [appointmentListPage, setAppointmentListPage] = useState(1);
  const [appointmentListSortKey, setAppointmentListSortKey] = useState<AppointmentListSortKey>("date");
  const [appointmentListSortDirection, setAppointmentListSortDirection] = useState<AppointmentListSortDirection>("asc");
  const [appointmentListScope, setAppointmentListScope] = useState<AppointmentListScope>("all");
  const {
    filters: employeeFilters,
    setFilter: setEmployeeFilter,
  } = useListFilters<EmployeeFilters>({
    initialFilters: defaultEmployeeFilters,
  });
  const [employeeScope, setEmployeeScope] = useState<EmployeeScope>("active");
  const [employeeSortKey, setEmployeeSortKey] = useState<EmployeeSortKey>("lastName");
  const [employeeSortDirection, setEmployeeSortDirection] = useState<EmployeeSortDirection>("asc");
  const [appointmentContext, setAppointmentContext] = useState<{
    initialDate?: string;
    initialTourId?: number | null;
    projectId?: number;
    appointmentId?: number;
    returnView?: ViewType;
    returnContext?: ReturnContext;
    readOnlyFields?: Array<"project" | "customer">;
    weekScrollLeft?: number | null;
    weekScrollTop?: number | null;
  } | null>(null);
  const [appointmentOverlayContext, setAppointmentOverlayContext] = useState<AppointmentOverlayState | null>(null);
  const [pendingWeekRestore, setPendingWeekRestore] = useState<WeekViewRestoreRequest | null>(null);
  const [employeeFormVisible, setEmployeeFormVisible] = useState(false);
  const [tourFormVisible, setTourFormVisible] = useState(false);
  const [teamFormVisible, setTeamFormVisible] = useState(false);
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

  useEffect(() => {
    document.title = `MuG Plan | ${resolveViewTitle(view)}`;
  }, [view]);

  const handleWeekRestoreApplied = useCallback(() => {
    setPendingWeekRestore(null);
  }, []);

  const parseIsoDateOnlyToDate = useCallback((value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) {
      return new Date();
    }
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }, []);

  const followAppointmentToNewPosition = useCallback((params: {
    appointmentId: number;
    startDate: string;
    targetView: "week" | "calendarContextual";
  }) => {
    const targetDate = parseIsoDateOnlyToDate(params.startDate);
    if (params.targetView === "calendarContextual") {
      setCalendarContext((prev) => (
        prev
          ? {
              ...prev,
              activeView: "week",
              currentDate: targetDate,
            }
          : prev
      ));
    } else {
      setCurrentDate(targetDate);
    }
    setPendingWeekRestore({
      focusAppointmentId: params.appointmentId,
    });
  }, [parseIsoDateOnlyToDate]);

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

  const returnFromAppointment = (saveResult?: AppointmentFormSaveResult) => {
    const context = appointmentContext;
    const weekRestoreFromContext: WeekViewRestoreRequest | null =
      typeof context?.weekScrollLeft === "number" || typeof context?.weekScrollTop === "number"
        ? {
            scrollLeft: context?.weekScrollLeft ?? null,
            scrollTop: context?.weekScrollTop ?? null,
          }
        : null;

    const followTargetView =
      context?.returnView === "week"
        ? (context.returnContext?.targetView === "calendarContextual" ? "calendarContextual" : "week")
        : null;

    const shouldOfferFollow = Boolean(
      saveResult?.shouldOfferFollow
      && followTargetView
      && typeof saveResult.appointmentId === "number"
      && saveResult.startDate,
    );

    if (context?.returnContext) {
      setAppointmentContext(null);
      applyReturnContext(context.returnContext);
      if (shouldOfferFollow) {
        followAppointmentToNewPosition({
          appointmentId: saveResult!.appointmentId!,
          startDate: saveResult!.startDate,
          targetView: followTargetView!,
        });
      } else {
        setPendingWeekRestore(weekRestoreFromContext);
      }
      return;
    }

    const returnToProject = Boolean(context?.projectId);
    const returnView = context?.returnView ?? "month";
    setAppointmentContext(null);
    setView(returnToProject ? "project" : returnView);
    if (shouldOfferFollow) {
      followAppointmentToNewPosition({
        appointmentId: saveResult!.appointmentId!,
        startDate: saveResult!.startDate,
        targetView: followTargetView!,
      });
    } else {
      setPendingWeekRestore(!returnToProject && returnView === "week" ? weekRestoreFromContext : null);
    }
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
      setEmployeeFormVisible(false);
    }
    if (newView !== "tours") {
      setSelectedTourId(null);
      setTourFormVisible(false);
    }
    if (newView !== "teams") {
      setTeamFormVisible(false);
    }
    if (newView !== "calendarContextual") {
      setCalendarContext(null);
    }
    setView(newView);
  };

  const isGlobalCalendarView = view === "month" || view === "monthSheet" || view === "week" || view === "year";
  const isContextualCalendarView = view === "calendarContextual" && calendarContext !== null;
  const isSidebarHidden =
    view === "customer" ||
    (view === "employees" && employeeFormVisible) ||
    (view === "tours" && tourFormVisible) ||
    (view === "teams" && teamFormVisible);
  const monitoringSummary = canAccessMonitoring ? buildMonitoringTriggerSummary(monitoringItems) : [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-body">
      {isContextualCalendarView || isSidebarHidden ? null : (
        <aside className="h-full flex-shrink-0 z-10 relative">
          <Sidebar
            onViewChange={handleViewChange}
            onLogout={onLogout}
            currentView={view}
            currentDate={currentDate}
            userRole={userRole}
            backupDisabled={backupDisabled}
            monitoringSummary={monitoringSummary}
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
              filters={customerFilters}
              onFilterChange={setCustomerFilter}
              page={customerPage}
              onPageChange={setCustomerPage}
              customerScope={customerScope}
              onCustomerScopeChange={setCustomerScope}
              sortKey={customerSortKey}
              onSortKeyChange={setCustomerSortKey}
              sortDirection={customerSortDirection}
              onSortDirectionChange={setCustomerSortDirection}
              onNewCustomer={() => { setSelectedCustomerId(null); setView("customer"); }}
              onSelectCustomer={(id) => { setSelectedCustomerId(id); setView("customer"); }}
            />
          ) : view === "tours" ? (
            <TourManagement
              userRole={userRole}
              initialTourId={selectedTourId}
              onEditingChange={setTourFormVisible}
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
            <TeamManagement onEditingChange={setTeamFormVisible} />
          ) : view === "employees" ? (
            <EmployeesPage
              initialEmployeeId={selectedEmployeeId}
              onEditingChange={setEmployeeFormVisible}
              filters={employeeFilters}
              onFilterChange={setEmployeeFilter}
              employeeScope={employeeScope}
              onEmployeeScopeChange={setEmployeeScope}
              sortKey={employeeSortKey}
              onSortKeyChange={setEmployeeSortKey}
              sortDirection={employeeSortDirection}
              onSortDirectionChange={setEmployeeSortDirection}
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
          ) : view === "appointmentsList" ? (
            <AppointmentsListPage
              helpKey="appointments.list.mainNavigation"
              context={{ type: "standalone" }}
              filters={appointmentListFilters}
              onFiltersChange={(patch) => setAppointmentListFilters((current: AppointmentListFilters) => ({ ...current, ...patch }))}
              page={appointmentListPage}
              onPageChange={setAppointmentListPage}
              sortKey={appointmentListSortKey}
              onSortKeyChange={setAppointmentListSortKey}
              sortDirection={appointmentListSortDirection}
              onSortDirectionChange={setAppointmentListSortDirection}
              appointmentScope={appointmentListScope}
              onAppointmentScopeChange={setAppointmentListScope}
              onOpenAppointment={(appointmentId) => {
                setAppointmentContext({
                  appointmentId,
                  returnContext: { targetView: "appointmentsList" },
                });
                setView("appointment");
              }}
            />
          ) : view === "projectList" ? (
            <ProjectsPage
              filters={projectFilters}
              onFilterChange={setProjectFilter}
              page={projectPage}
              onPageChange={setProjectPage}
              projectScope={projectScope}
              onProjectScopeChange={setProjectScope}
              sortKey={projectSortKey}
              onSortKeyChange={setProjectSortKey}
              sortDirection={projectSortDirection}
              onSortDirectionChange={setProjectSortDirection}
              onNewProject={() => { setSelectedProjectId(null); setProjectReturnView("projectList"); setView("project"); }}
              onSelectProject={(id) => { setSelectedProjectId(id); setProjectReturnView("projectList"); setView("project"); }}
            />
          ) : view === "noteTemplates" && isAdmin ? (
            <MasterDataPage
              initialTabId="note-templates"
              onCreateHelpText={() => {
                setSelectedHelpTextId(null);
                setView("helpTextForm");
              }}
              onEditHelpText={(id) => {
                setSelectedHelpTextId(id);
                setView("helpTextForm");
              }}
            />
          ) : view === "helpTexts" && isAdmin ? (
            <MasterDataPage
              initialTabId="help-texts"
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
          ) : view === "settings" ? (
            <SettingsPage />
          ) : view === "masterData" && isAdmin ? (
            <MasterDataPage
              initialTabId="products"
              onCreateHelpText={() => {
                setSelectedHelpTextId(null);
                setView("helpTextForm");
              }}
              onEditHelpText={(id) => {
                setSelectedHelpTextId(id);
                setView("helpTextForm");
              }}
            />
          ) : view === "users" && isAdmin ? (
            <UsersPage />
          ) : view === "reports" && canAccessReports ? (
            <ReportsPage />
          ) : view === "journal" && canAccessReports ? (
            <JournalPage />
          ) : view === "monitoring" && canAccessMonitoring ? (
            <MonitoringPage
              isAdmin={isAdmin}
              initialItems={monitoringItems}
              isInitialLoading={isMonitoringLoading}
              onOpenAppointment={(appointmentId) => {
                setAppointmentOverlayContext({
                  origin: "monitoring",
                  appointmentId,
                  returnContext: { targetView: "monitoring" },
                });
              }}
            />
          ) : isContextualCalendarView ? (
            <CalendarWorkspace
              mode="contextual"
              activeView={calendarContext.activeView}
              currentDate={calendarContext.currentDate}
              monitoringItems={monitoringItems}
              employeeFilterId={calendarFilters.employeeId}
              onEmployeeFilterChange={(employeeId) => setCalendarFilter("employeeId", employeeId)}
              onViewChange={(activeView) => {
                if (activeView === "monthSheet") {
                  return;
                }
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
                  weekScrollTop: ctx.weekScrollTop,
                });
                setView("appointment");
              }}
              onBack={() => {
                applyReturnContext(calendarContext.returnContext);
              }}
              projectId={calendarContext.projectId}
              hideMainNavigation
              restoreRequest={calendarContext.activeView === "week" ? pendingWeekRestore : null}
              onRestoreApplied={handleWeekRestoreApplied}
            />
          ) : isGlobalCalendarView && (view === "week" || view === "month" || view === "monthSheet") ? (
            <CalendarWorkspace
              mode="global"
              activeView={view}
              currentDate={currentDate}
              monitoringItems={monitoringItems}
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
                  weekScrollTop: ctx.weekScrollTop,
                });
                setView("appointment");
              }}
              restoreRequest={view === "week" ? pendingWeekRestore : null}
              onRestoreApplied={handleWeekRestoreApplied}
            />
          ) : isGlobalCalendarView && view === "year" ? (
            <div className="h-full bg-white rounded-lg overflow-hidden border-2 border-foreground flex flex-col">
              <div className="flex-1 min-h-0 grid grid-cols-[28px_minmax(0,1fr)_28px]">
                <button
                  onClick={prevYear}
                  className="h-full w-7 text-sm font-semibold text-primary/70 hover:text-primary"
                  data-testid="button-prev"
                  aria-label="Zurück"
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
      {view === "appointment" && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <AppointmentForm
            appointmentId={appointmentContext?.appointmentId}
            initialDate={appointmentContext?.initialDate}
            initialTourId={appointmentContext?.initialTourId}
            projectId={appointmentContext?.projectId}
            readOnlyFields={appointmentContext?.readOnlyFields}
            onCancel={returnFromAppointment}
            onSaved={returnFromAppointment}
          />
        </div>
      )}
      {view === "project" && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}

