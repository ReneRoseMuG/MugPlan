import type { ElementType, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { Calendar, CalendarDays, ExternalLink, LogOut, RefreshCw } from "lucide-react";

import { domainIcons } from "@/lib/domain-icons";
import type { ViewType } from "@/pages/Home";
import type { MonitoringTriggerSummaryItemResponse } from "@shared/routes";

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
    <div className="mb-2.5 overflow-hidden rounded-lg border border-border" data-testid={`nav-group-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div
        className="bg-secondary px-3 py-2 text-xs font-bold tracking-wider text-primary"
        data-testid={`nav-header-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {title}
      </div>
      <div className="flex flex-col gap-1 p-2">
        {children}
      </div>
    </div>
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
    flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-all duration-200
    ${standaloneUrl ? "min-w-0 flex-1" : "w-full"}
    ${isActive ? "border border-slate-200 bg-white text-primary" : "text-slate-600 hover:bg-white hover:text-slate-900"}
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
  const queryClient = useQueryClient();
  const isAdmin = userRole?.toUpperCase() === "ADMIN";
  const canAccessReports = isAdmin || userRole?.toUpperCase() === "DISPATCHER";
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
      className={`h-full w-auto min-w-[260px] max-w-[360px] overflow-y-auto border-r border-border bg-slate-50 p-4 ${
        backupDisabled ? "border-2 border-red-600" : ""
      }`}
      data-testid="sidebar"
    >
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-primary" data-testid="text-app-title">
          MuG Plan
        </h1>
        <button
          type="button"
          onClick={() => void queryClient.invalidateQueries()}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 hover:bg-white hover:text-slate-600"
          data-testid="sidebar-refresh"
          title="Daten neu laden"
        >
          <RefreshCw className="h-3 w-3" />
          Neu Laden
        </button>
      </div>

      <nav className="flex flex-1 flex-col">
        <NavGroup title="Terminplanung">
          <NavButton
            icon={CalendarDays}
            label="Wochenübersicht"
            testId="nav-wochenuebersicht"
            isActive={currentView === "week"}
            onClick={() => onViewChange("week")}
            standaloneUrl={`/standalone/calendar/week?kw=${currentWeek}&year=${currentWeekYear}`}
          />
          <NavButton
            icon={Calendar}
            label="Monatsübersicht"
            testId="nav-monatsuebersicht"
            isActive={currentView === "month" || currentView === "monthSheet"}
            onClick={() => onViewChange("monthSheet")}
            standaloneUrl="/standalone/calendar/month"
          />
          <NavButton
            icon={AppointmentsIcon}
            label="Termine"
            testId="nav-termine"
            isActive={currentView === "appointmentsList"}
            onClick={() => onViewChange("appointmentsList")}
            standaloneUrl="/standalone/appointments"
          />
          <NavButton
            icon={CalendarDays}
            label="Tour PLZ Plan"
            testId="nav-tour-plz-plan"
            isActive={currentView === "tourPostalPlan"}
            onClick={() => onViewChange("tourPostalPlan")}
            standaloneUrl="/standalone/tour-postal-plan"
          />
        </NavGroup>

        <NavGroup title="Projektplanung">
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

        {canAccessReports ? (
          <NavGroup title="Reports">
          <NavButton icon={ReportsIcon} label="Reports" isActive={currentView === "reports"} onClick={() => onViewChange("reports")} />
          <NavButton icon={JournalIcon} label="Journal" isActive={currentView === "journal"} onClick={() => onViewChange("journal")} />
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
          </NavGroup>
        ) : null}

        <NavGroup title="Mitarbeiter Verwaltung">
          <NavButton
            icon={EmployeesIcon}
            label="Mitarbeiter"
            testId="nav-mitarbeiter"
            isActive={currentView === "employees"}
            onClick={() => onViewChange("employees")}
            standaloneUrl="/standalone/employees"
          />
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
          <NavButton icon={AdminIcon} label="Meine Einstellungen" testId="nav-einstellungen" isActive={currentView === "settings"} onClick={() => onViewChange("settings")} />
        </NavGroup>

        {isAdmin ? (
          <NavGroup title="Administration">
            <NavButton icon={AdminIcon} label="Stammdaten" isActive={currentView === "masterData" || currentView === "noteTemplates" || currentView === "helpTexts"} onClick={() => onViewChange("masterData")} />
            <NavButton icon={AdminIcon} label="Benutzerverwaltung" isActive={currentView === "users"} onClick={() => onViewChange("users")} />
          </NavGroup>
        ) : null}

        <div className="mt-auto pt-2">
          <NavButton icon={LogOut} label="Logout" onClick={onLogout} />
        </div>
      </nav>
    </div>
  );
}
