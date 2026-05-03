import type { ElementType, ReactNode } from "react";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { Calendar, CalendarDays, ExternalLink, LogOut, RefreshCw } from "lucide-react";

import { canAccessJournal, canAccessMonitoring, canAccessReports, canAccessTourPostalPlan } from "@/lib/auth";
import { domainIcons } from "@/lib/domain-icons";
import type { ViewType } from "@/pages/Home";
import type { MonitoringTriggerSummaryItemResponse } from "@shared/routes";
import { useChangeNotificationsContext } from "@/providers/ChangeNotificationsProvider";

interface SidebarProps {
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  currentView?: ViewType;
  currentDate?: Date;
  userRole?: string;
  backupDisabled?: boolean;
  monitoringSummary?: MonitoringTriggerSummaryItemResponse[];
}

function NavGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="border-b border-border py-4 last:border-b-0"
      data-testid={`nav-group-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div
        className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500"
        data-testid={`nav-header-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </section>
  );
}

function NavButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  testId,
  standaloneUrl,
}: {
  icon: ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  testId?: string;
  standaloneUrl?: string;
}) {
  const resolvedTestId = testId ?? `nav-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const standaloneTestId = `${resolvedTestId}-open-tab`;
  const mainButtonClassName = `
    flex h-9 items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-all duration-200
    ${standaloneUrl ? "min-w-max flex-1" : "w-full"}
    ${isActive ? "bg-white text-primary shadow-sm ring-1 ring-slate-200" : "text-slate-700 hover:bg-white hover:text-slate-900"}
  `;

  if (onClick) {
    return (
      <div className={standaloneUrl ? "flex items-center gap-1" : undefined}>
        <button
          type="button"
          onClick={onClick}
          data-testid={resolvedTestId}
          className={mainButtonClassName}
        >
          <Icon className="h-4 w-4 shrink-0 opacity-80" />
          <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
        </button>
        {standaloneUrl ? (
          <button
            type="button"
            onClick={() => window.open(standaloneUrl, "_blank")}
            data-testid={standaloneTestId}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
            title="In neuem Tab öffnen"
            aria-label={`${label} in neuem Tab öffnen`}
          >
            <ExternalLink className="h-[13px] w-[13px]" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-testid={resolvedTestId}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-400"
    >
      <Icon className="h-4 w-4 shrink-0 opacity-60" />
      <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
    </div>
  );
}

export function Sidebar({
  onViewChange,
  onLogout,
  currentView,
  currentDate = new Date(),
  userRole,
  backupDisabled = false,
  monitoringSummary = [],
}: SidebarProps) {
  const {
    updatesAvailable,
    isReloadDisabled,
    isReloadPending,
    triggerGlobalReload,
  } = useChangeNotificationsContext();
  const isAdmin = userRole?.toUpperCase() === "ADMIN";
  const canOpenReports = canAccessReports(userRole);
  const canOpenJournal = canAccessJournal(userRole);
  const canOpenMonitoring = canAccessMonitoring(userRole);
  const canOpenTourPostalPlan = canAccessTourPostalPlan(userRole);
  const canOpenEmployees = true;
  const CustomersIcon = domainIcons.customers;
  const ProjectsIcon = domainIcons.projects;
  const AppointmentsIcon = domainIcons.appointmentsList;
  const ReportsIcon = domainIcons.reports;
  const MonitoringIcon = domainIcons.monitoring;
  const JournalIcon = domainIcons.journal;
  const EmployeesIcon = domainIcons.employees;
  const TeamsIcon = domainIcons.teams;
  const ToursIcon = domainIcons.tours;
  const AdminIcon = domainIcons.admin;
  const currentWeek = getISOWeek(currentDate);
  const currentWeekYear = getISOWeekYear(currentDate);

  return (
    <div
      className={`flex h-full w-max max-w-[280px] flex-col overflow-hidden border-r border-border bg-slate-50 ${
        backupDisabled ? "border-2 border-red-600" : ""
      }`}
      data-testid="sidebar"
    >
      <button
        type="button"
        onClick={() => void triggerGlobalReload()}
        disabled={isReloadDisabled}
        className={`flex-shrink-0 border-b border-border p-6 pb-4 text-left transition-colors ${
          isReloadDisabled
            ? "cursor-not-allowed bg-slate-50 text-slate-300"
            : updatesAvailable
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
              : "bg-slate-50 text-primary hover:bg-white"
        }`}
        data-testid="sidebar-refresh"
        title={
          isReloadDisabled
            ? "Neu Laden ist gesperrt, solange irgendwo eine Bearbeitung offen ist"
            : updatesAvailable
              ? "Änderungen verfügbar"
              : "Daten neu laden"
        }
        aria-label={isReloadPending ? "Daten werden neu geladen" : "Daten neu laden"}
      >
        <div className="flex h-8 items-center gap-3">
          <RefreshCw className="h-5 w-5 flex-shrink-0" />
          <h1 className="min-w-0 truncate text-lg font-bold tracking-wider" data-testid="text-app-title">
            MuG Plan
          </h1>
        </div>
      </button>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
        <NavGroup title="Termine">
          <NavButton
            icon={CalendarDays}
            label="Woche"
            testId="nav-wochenuebersicht"
            isActive={currentView === "week"}
            onClick={() => onViewChange("week")}
            standaloneUrl={`/standalone/calendar/week?kw=${currentWeek}&year=${currentWeekYear}`}
          />
          <NavButton
            icon={Calendar}
            label="Monat"
            testId="nav-monatsuebersicht"
            isActive={currentView === "month" || currentView === "monthSheet"}
            onClick={() => onViewChange("monthSheet")}
            standaloneUrl="/standalone/calendar/month"
          />
          <NavButton
            icon={AppointmentsIcon}
            label="Tabelle"
            testId="nav-termine"
            isActive={currentView === "appointmentsList"}
            onClick={() => onViewChange("appointmentsList")}
            standaloneUrl="/standalone/appointments"
          />
          {canOpenTourPostalPlan ? (
            <NavButton
              icon={CalendarDays}
              label="PLZ Planung"
              testId="nav-tour-plz-plan"
              isActive={currentView === "tourPostalPlan"}
              onClick={() => onViewChange("tourPostalPlan")}
              standaloneUrl="/standalone/tour-postal-plan"
            />
          ) : null}
        </NavGroup>

        <NavGroup title="Planung">
          <NavButton
            icon={ProjectsIcon}
            label="Projekte"
            testId="nav-projekte"
            isActive={currentView === "project" || currentView === "projectList"}
            onClick={() => onViewChange("projectList")}
            standaloneUrl="/standalone/projects"
          />
          <NavButton
            icon={CustomersIcon}
            label="Kunden"
            testId="nav-kunden"
            isActive={currentView === "customer" || currentView === "customerList"}
            onClick={() => onViewChange("customerList")}
            standaloneUrl="/standalone/customers"
          />
        </NavGroup>

        {canOpenReports || canOpenMonitoring ? (
          <NavGroup title="Auswertung">
            {canOpenReports ? (
              <NavButton
                icon={ReportsIcon}
                label="Reports"
                isActive={currentView === "reports"}
                onClick={() => onViewChange("reports")}
                standaloneUrl="/standalone/reports"
              />
            ) : null}
            {canOpenJournal ? (
              <NavButton
                icon={JournalIcon}
                label="Journal"
                isActive={currentView === "journal"}
                onClick={() => onViewChange("journal")}
              />
            ) : null}
            {canOpenMonitoring ? (
              <div className="flex flex-col gap-2">
                <NavButton
                  icon={MonitoringIcon}
                  label="Monitoring"
                  isActive={currentView === "monitoring"}
                  onClick={() => onViewChange("monitoring")}
                  standaloneUrl="/standalone/monitoring"
                />
                {monitoringSummary.length > 0 ? (
                  <div className="flex flex-wrap gap-2 px-3" data-testid="monitoring-trigger-pills">
                    {monitoringSummary.map((item) => (
                      <span
                        key={item.triggerCode}
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"
                        style={{ backgroundColor: item.color }}
                        data-testid={`monitoring-pill-${item.triggerCode}`}
                      >
                        {item.triggerCode}: {item.count}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </NavGroup>
        ) : null}

        <NavGroup title="Personal">
          {canOpenEmployees ? (
            <NavButton
              icon={EmployeesIcon}
              label="Mitarbeiter"
              testId="nav-mitarbeiter"
              isActive={currentView === "employees"}
              onClick={() => onViewChange("employees")}
              standaloneUrl="/standalone/employees"
            />
          ) : null}
          <NavButton
            icon={TeamsIcon}
            label="Teams"
            testId="nav-teams"
            isActive={currentView === "teams"}
            onClick={() => onViewChange("teams")}
            standaloneUrl="/standalone/teams"
          />
          <NavButton
            icon={ToursIcon}
            label="Touren"
            testId="nav-touren"
            isActive={currentView === "tours"}
            onClick={() => onViewChange("tours")}
            standaloneUrl="/standalone/tours"
          />
        </NavGroup>

        <NavGroup title="Konto">
          <NavButton icon={AdminIcon} label="Einstellungen" testId="nav-einstellungen" isActive={currentView === "settings"} onClick={() => onViewChange("settings")} />
          {isAdmin ? (
            <>
              <NavButton icon={AdminIcon} label="Stammdaten" isActive={currentView === "masterData" || currentView === "noteTemplates" || currentView === "helpTexts"} onClick={() => onViewChange("masterData")} />
              <NavButton icon={AdminIcon} label="Benutzer" isActive={currentView === "users"} onClick={() => onViewChange("users")} />
            </>
          ) : null}
        </NavGroup>

        <div className="mt-auto pt-2">
          <NavButton icon={LogOut} label="Logout" onClick={onLogout} />
        </div>
      </nav>
    </div>
  );
}
