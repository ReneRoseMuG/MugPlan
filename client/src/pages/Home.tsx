import { useCallback, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useMemo } from "react";
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
import { TourPostalPlanView } from "@/components/TourPostalPlanView";
import { useListFilters } from "@/hooks/useListFilters";
import { useSetting } from "@/hooks/useSettings";
import { defaultProjectFilters, type ProjectFilters, type ProjectScope } from "@/lib/project-filters";
import { defaultCustomerFilters, type CustomerFilters } from "@/lib/customer-filters";
import { defaultEmployeeFilters, type EmployeeFilters } from "@/lib/employee-filters";
import { addMonths, subMonths } from "date-fns";
import { api, type MonitoringListResponse } from "@shared/routes";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { canAccessJournal as canAccessJournalRole, canAccessMonitoring as canAccessMonitoringRole, canAccessReports as canAccessReportsRole, canAccessTourPostalPlan, isReaderRole } from "@/lib/auth";
import { buildMonitoringTriggerSummary, toAlphaColor } from "@/lib/monitoring-ui";
import {
  buildDispatcherLoginConflicts,
  hasDispatcherLoginConflicts,
  type DispatcherLoginConflictWeekGroup,
} from "@/lib/dispatcher-login-conflicts";
import { useToast } from "@/hooks/use-toast";
import { isAbsenceAppointmentSummary } from "@shared/absenceAppointments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatListDate, formatListTime } from "@/lib/list-display-format";
import { HoverPreview } from "@/components/ui/hover-preview";
import {
  AppointmentWeeklyPanelPreview,
  appointmentWeeklyPanelPreviewOptions,
  resolveAppointmentWeeklyPanelPreviewWidthPx,
} from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

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
  | "monitoring"
  | "tourPostalPlan";

export type CalendarNavCommand = {
  id: number;
  direction: "next" | "prev";
};

export type WeekViewRestoreRequest = {
  scrollLeft?: number | null;
  scrollTop?: number | null;
  focusAppointmentId?: number | null;
};

type CalendarWorkspaceView = "week" | "month" | "monthSheet";

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

type DispatcherConflictListKind = "withoutEmployees" | "parked";

function DispatcherConflictAppointmentPreview({
  appointmentId,
  startDate,
  widthPx,
}: {
  appointmentId: number;
  startDate: string;
  widthPx: number;
}) {
  const previewQuery = useQuery<CalendarAppointment | null>({
    queryKey: ["dispatcher-login-conflict-preview", appointmentId, startDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate: startDate,
        toDate: startDate,
        detail: "full",
      });
      const response = await fetch(`/api/calendar/appointments?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Termin-Preview konnte nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      const appointments = Array.isArray(payload) ? (payload as CalendarAppointment[]) : [];
      return appointments.find((appointment) => appointment.id === appointmentId) ?? null;
    },
  });

  if (!previewQuery.data) {
    return (
      <div className="rounded-lg bg-white px-4 py-3 text-sm text-slate-500" style={{ width: widthPx }}>
        Termin-Preview wird geladen...
      </div>
    );
  }

  return <AppointmentWeeklyPanelPreview appointment={previewQuery.data} widthPx={widthPx} />;
}

function resolveWeekGroupClassName(urgency: DispatcherLoginConflictWeekGroup["urgency"]): string {
  if (urgency === "current") {
    return "border-red-400 bg-red-50 shadow-[inset_4px_0_0_rgba(220,38,38,0.82)]";
  }
  if (urgency === "next") {
    return "border-orange-300 bg-orange-50/80 shadow-[inset_4px_0_0_rgba(249,115,22,0.62)]";
  }
  if (urgency === "near") {
    return "border-amber-300 bg-amber-50/70 shadow-[inset_4px_0_0_rgba(245,158,11,0.45)]";
  }
  if (urgency === "past") {
    return "border-slate-300 bg-white/90 shadow-[inset_4px_0_0_rgba(100,116,139,0.35)]";
  }
  return "border-slate-200 bg-slate-50/80 shadow-[inset_4px_0_0_rgba(148,163,184,0.35)]";
}

function resolveWeekDotClassName(urgency: DispatcherLoginConflictWeekGroup["urgency"]): string {
  if (urgency === "current") return "bg-red-600 ring-red-200";
  if (urgency === "next") return "bg-orange-500 ring-orange-200";
  if (urgency === "near") return "bg-amber-500 ring-amber-200";
  if (urgency === "past") return "bg-slate-500 ring-slate-200";
  return "bg-slate-400 ring-slate-200";
}

function resolveWeekUrgencyLabel(group: DispatcherLoginConflictWeekGroup): string {
  if (group.urgency === "current") return "Diese KW";
  if (group.urgency === "next") return "Nächste KW";
  if (group.urgency === "past") return "Vergangen";
  return `In ${group.distanceWeeks} KWs`;
}

function resolveConflictRowStyle(
  item: MonitoringListResponse[number],
  listKind: DispatcherConflictListKind,
) {
  if (listKind !== "withoutEmployees" || !item.tourColor) {
    return undefined;
  }

  return {
    backgroundColor: toAlphaColor(item.tourColor, 0.12),
    borderLeftColor: item.tourColor,
  };
}

function formatConflictCustomerName(item: MonitoringListResponse[number]): string {
  return item.customerName
    ?? ([item.customerLastName, item.customerFirstName].filter(Boolean).join(", ") || item.customerNumber)
    ?? "-";
}

function formatConflictTitle(item: MonitoringListResponse[number]): string {
  return item.projectTitle ?? item.projectName ?? item.orderNumber ?? "-";
}

function DispatcherConflictRow({
  item,
  listKind,
}: {
  item: MonitoringListResponse[number];
  listKind: DispatcherConflictListKind;
}) {
  const previewWidthPx = resolveAppointmentWeeklyPanelPreviewWidthPx("sidebarTable");
  const preview = (
    <DispatcherConflictAppointmentPreview
      appointmentId={item.appointmentId}
      startDate={item.startDate}
      widthPx={previewWidthPx}
    />
  );

  return (
    <HoverPreview
      preview={preview}
      mode={appointmentWeeklyPanelPreviewOptions.mode}
      openDelay={appointmentWeeklyPanelPreviewOptions.openDelayMs}
      side={appointmentWeeklyPanelPreviewOptions.side}
      align={appointmentWeeklyPanelPreviewOptions.align}
      maxWidth={previewWidthPx}
      maxHeight={null}
      cursorOffsetX={appointmentWeeklyPanelPreviewOptions.cursorOffsetX}
      cursorOffsetY={appointmentWeeklyPanelPreviewOptions.cursorOffsetY}
      viewportPadding={appointmentWeeklyPanelPreviewOptions.viewportPadding}
    >
      <div
        className="grid min-h-14 grid-cols-[112px_minmax(0,1.25fr)_minmax(0,1fr)_120px] items-center gap-3 rounded-md border border-slate-200 border-l-4 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-white"
        data-testid={`dispatcher-login-conflict-${item.appointmentId}`}
        style={resolveConflictRowStyle(item, listKind)}
      >
        <div className="text-xs font-semibold text-slate-700">
          <div>{formatListDate(item.startDate)}</div>
          <div className="text-slate-500">{formatListTime(item.startTime) || "ohne Uhrzeit"}</div>
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900">{formatConflictTitle(item)}</div>
          {item.orderNumber ? <div className="truncate text-xs text-slate-500">{item.orderNumber}</div> : null}
        </div>
        <div className="min-w-0 truncate text-slate-700">{formatConflictCustomerName(item)}</div>
        <div className="min-w-0 truncate text-xs font-medium text-slate-600">{item.tourName ?? "-"}</div>
      </div>
    </HoverPreview>
  );
}

function DispatcherConflictWeekSection({
  group,
  listKind,
}: {
  group: DispatcherLoginConflictWeekGroup;
  listKind: DispatcherConflictListKind;
}) {
  return (
    <section
      className={`grid grid-cols-[38px_minmax(0,1fr)] overflow-hidden rounded-lg border ${resolveWeekGroupClassName(group.urgency)}`}
      data-testid={`dispatcher-login-conflict-week-${listKind}-${group.key}`}
    >
      <div className="relative flex justify-center bg-white/40 py-4">
        <div className="absolute bottom-3 top-3 w-0.5 rounded-sm bg-slate-300" />
        <div className={`relative z-10 mt-1 h-3 w-3 rounded-full ring-4 ${resolveWeekDotClassName(group.urgency)}`} />
      </div>
      <div className="min-w-0 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-950">{group.label}</h3>
              <span className="rounded-full border border-slate-300 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {resolveWeekUrgencyLabel(group)}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600">{group.dateRangeLabel}</p>
          </div>
          <div className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-black text-slate-800">
            {group.items.length}
          </div>
        </div>
        <div className="space-y-2">
          {group.items.map((item) => (
            <DispatcherConflictRow
              key={`${listKind}-${item.triggerCode}-${item.appointmentId}`}
              item={item}
              listKind={listKind}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DispatcherConflictList({
  groups,
  listKind,
  rangeLabel,
}: {
  groups: DispatcherLoginConflictWeekGroup[];
  listKind: DispatcherConflictListKind;
  rangeLabel: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-600" data-testid={`dispatcher-login-conflict-range-${listKind}`}>
          {rangeLabel}
        </p>
        <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Keine Einträge.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-600" data-testid={`dispatcher-login-conflict-range-${listKind}`}>
        {rangeLabel}
      </p>
      <div className="max-h-[56vh] space-y-3 overflow-auto pr-1">
        {groups.map((group) => (
          <DispatcherConflictWeekSection key={group.key} group={group} listKind={listKind} />
        ))}
      </div>
    </div>
  );
}

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
      return "Einstellungen";
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
    case "tourPostalPlan":
      return "Tour PLZ Planung";
    default:
      return "MuG Plan";
  }
}

export default function Home({ onLogout }: HomeProps) {
  const { toast } = useToast();
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
  const [dispatcherConflictDialogOpen, setDispatcherConflictDialogOpen] = useState(false);
  const [dispatcherConflictDialogShown, setDispatcherConflictDialogShown] = useState(false);
  const isAdmin = userRole === "ADMIN";
  const isReader = isReaderRole(userRole);
  const canAccessReports = canAccessReportsRole(userRole);
  const canAccessJournal = canAccessJournalRole(userRole);
  const canAccessMonitoring = canAccessMonitoringRole(userRole);
  const canOpenTourPostalPlan = canAccessTourPostalPlan(userRole);
  const backupEnabled = useSetting("backup_enabled");
  const backupDisabled = backupEnabled === false;
  const dispatcherLoginConflictLookaheadWeeks = useSetting("dispatcherLogin.conflictLookaheadWeeks");
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

  const dispatcherLoginConflicts = useMemo(
    () => buildDispatcherLoginConflicts(monitoringItems, new Date(), dispatcherLoginConflictLookaheadWeeks),
    [dispatcherLoginConflictLookaheadWeeks, monitoringItems],
  );

  useEffect(() => {
    if (dispatcherConflictDialogShown || userRole !== "DISPATCHER" || !monitoringItems) return;
    setDispatcherConflictDialogShown(true);
    if (hasDispatcherLoginConflicts(dispatcherLoginConflicts)) {
      setDispatcherConflictDialogOpen(true);
    }
  }, [dispatcherConflictDialogShown, dispatcherLoginConflicts, monitoringItems, userRole]);

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

  const openAppointmentOverlayIfAllowed = useCallback(async (params: AppointmentOverlayState) => {
    if (typeof params.appointmentId !== "number") {
      setAppointmentOverlayContext(params);
      return;
    }
    try {
      const response = await fetch(`/api/appointments/${params.appointmentId}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Termindetails konnten nicht geladen werden.");
      }
      const detail = await response.json() as {
        appointmentTags?: Array<{ name?: string | null | undefined }>;
      };
      if (isAbsenceAppointmentSummary({ appointmentTags: detail.appointmentTags })) {
        toast({
          title: "Abwesenheit ist schreibgeschützt",
          description: "Abwesenheiten können nur im Mitarbeiterformular bearbeitet werden.",
          variant: "destructive",
        });
        return;
      }
      setAppointmentOverlayContext(params);
    } catch (error) {
      toast({
        title: "Termin konnte nicht geöffnet werden",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  }, [toast]);

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
        <div
          className="min-h-0 flex-1 overflow-hidden bg-white [&>*]:!h-full [&>*]:!rounded-none [&>*]:!border-0 [&>*]:!shadow-none"
          data-testid="main-view-surface"
        >
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
              onOpenAppointment={(appointmentId, context) => {
                setAppointmentContext({
                  appointmentId,
                  returnContext: {
                    targetView: "customer",
                    customerId: context.type === "customer" ? context.customerId : selectedCustomerId,
                  },
                });
                setView("appointment");
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
              onNewCustomer={isReader ? undefined : () => { setSelectedCustomerId(null); setView("customer"); }}
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
              onNewProject={isReader ? undefined : () => { setSelectedProjectId(null); setProjectReturnView("projectList"); setView("project"); }}
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
          ) : view === "journal" && canAccessJournal ? (
            <JournalPage />
          ) : view === "monitoring" && canAccessMonitoring ? (
            <MonitoringPage
              isAdmin={isAdmin}
              initialItems={monitoringItems}
              isInitialLoading={isMonitoringLoading}
              onOpenAppointment={(appointmentId) => {
                void openAppointmentOverlayIfAllowed({
                  origin: "monitoring",
                  appointmentId,
                  returnContext: { targetView: "monitoring" },
                });
              }}
            />
          ) : view === "tourPostalPlan" && canOpenTourPostalPlan ? (
            <TourPostalPlanView
              onCreateAppointment={({ date, tourId }) => {
                setAppointmentContext({
                  initialDate: date,
                  initialTourId: tourId,
                  returnContext: { targetView: "tourPostalPlan" },
                });
                setView("appointment");
              }}
            />
          ) : view === "tourPostalPlan" ? (
            <div
              className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
              data-testid="tour-postal-plan-unavailable"
            >
              Diese Ansicht ist für diese Rolle nicht verfügbar.
            </div>
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
                    readOnly={isReader}
                    onNewAppointment={isReader ? undefined : (date) => {
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
      <Dialog open={dispatcherConflictDialogOpen} onOpenChange={setDispatcherConflictDialogOpen}>
        <DialogContent className="max-w-5xl" data-testid="dialog-dispatcher-login-conflicts">
          <DialogHeader>
            <DialogTitle>Offene Konflikte</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="without-employees" data-testid="tabs-dispatcher-login-conflicts">
            <TabsList>
              <TabsTrigger value="without-employees" data-testid="tab-dispatcher-conflicts-without-employees">
                Termine ohne Mitarbeiter ({dispatcherLoginConflicts.withoutEmployees.length})
              </TabsTrigger>
              <TabsTrigger value="parked" data-testid="tab-dispatcher-conflicts-parked">
                Termine auf Parkplatz ({dispatcherLoginConflicts.parked.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="without-employees" className="mt-4">
              <DispatcherConflictList
                groups={dispatcherLoginConflicts.withoutEmployeesWeeks}
                listKind="withoutEmployees"
                rangeLabel={`Zeitraum: ${dispatcherLoginConflicts.withoutEmployeesRange.label} (${dispatcherLoginConflicts.withoutEmployeesRange.dateRangeLabel})`}
              />
            </TabsContent>
            <TabsContent value="parked" className="mt-4">
              <DispatcherConflictList
                groups={dispatcherLoginConflicts.parkedWeeks}
                listKind="parked"
                rangeLabel="Zeitraum: alle Parkplatz-Termine"
              />
            </TabsContent>
          </Tabs>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setDispatcherConflictDialogOpen(false)} data-testid="button-close-dispatcher-login-conflicts">
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
