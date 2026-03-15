import { CalendarDays, Calendar, LogOut } from "lucide-react";
import type { ViewType } from "@/pages/Home";
import { domainIcons } from "@/lib/domain-icons";

interface SidebarProps {
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  currentView?: ViewType;
  userRole?: string;
  backupDisabled?: boolean;
  monitoringCount?: number;
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
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
  count,
}: {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  count?: number;
}) {
  const testId = `nav-${label.toLowerCase().replace(/\s+/g, "-")}`;

  if (onClick) {
    return (
      <button
        onClick={onClick}
        data-testid={testId}
        className={`
          flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-all duration-200
          ${isActive ? "border border-slate-200 bg-white text-primary" : "text-slate-600 hover:bg-white hover:text-slate-900"}
        `}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-80" />
        <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
        {typeof count === "number" ? (
          <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700" data-testid={`${testId}-count`}>
            {count}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      data-testid={testId}
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
  userRole,
  backupDisabled = false,
  monitoringCount,
}: SidebarProps) {
  const isAdmin = userRole?.toUpperCase() === "ADMIN";
  const canAccessReports = isAdmin || userRole?.toUpperCase() === "DISPATCHER";
  const CustomersIcon = domainIcons.customers;
  const ProjectsIcon = domainIcons.projects;
  const AppointmentsIcon = domainIcons.appointmentsList;
  const ReportsIcon = domainIcons.reports;
  const MonitoringIcon = domainIcons.monitoring;
  const EmployeesIcon = domainIcons.employees;
  const EmployeeAbsencesIcon = domainIcons.employeeAbsences;
  const TeamsIcon = domainIcons.teams;
  const ToursIcon = domainIcons.tours;
  const AdminIcon = domainIcons.admin;

  return (
    <div
      className={`h-full w-auto min-w-[260px] max-w-[360px] overflow-y-auto border-r border-border bg-slate-50 p-4 ${
        backupDisabled ? "border-2 border-red-600" : ""
      }`}
      data-testid="sidebar"
    >
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-primary" data-testid="text-app-title">
          MuG Plan
        </h1>
      </div>

      <nav className="flex flex-1 flex-col">
        <NavGroup title="Terminplanung">
          <NavButton icon={CalendarDays} label="Wochenuebersicht" isActive={currentView === "week"} onClick={() => onViewChange("week")} />
          <NavButton icon={Calendar} label="Monatsuebersicht" isActive={currentView === "month"} onClick={() => onViewChange("month")} />
          <NavButton icon={AppointmentsIcon} label="Termine" isActive={currentView === "appointmentsList"} onClick={() => onViewChange("appointmentsList")} />
        </NavGroup>

        <NavGroup title="Projektplanung">
          <NavButton icon={ProjectsIcon} label="Projekte" isActive={currentView === "project" || currentView === "projectList"} onClick={() => onViewChange("projectList")} />
          <NavButton icon={CustomersIcon} label="Kunden" isActive={currentView === "customer" || currentView === "customerList"} onClick={() => onViewChange("customerList")} />
        </NavGroup>

        {canAccessReports ? (
          <NavGroup title="Reports">
            <NavButton icon={ReportsIcon} label="Reports" isActive={currentView === "reports"} onClick={() => onViewChange("reports")} />
            <NavButton
              icon={MonitoringIcon}
              label="Monitoring"
              isActive={currentView === "monitoring"}
              onClick={() => onViewChange("monitoring")}
              count={monitoringCount}
            />
          </NavGroup>
        ) : null}

        <NavGroup title="Mitarbeiter Verwaltung">
          <NavButton icon={EmployeesIcon} label="Mitarbeiter" isActive={currentView === "employees"} onClick={() => onViewChange("employees")} />
          <NavButton icon={EmployeeAbsencesIcon} label="Abwesenheiten" isActive={currentView === "employeeAbsences"} onClick={() => onViewChange("employeeAbsences")} />
          <NavButton icon={TeamsIcon} label="Teams" isActive={currentView === "teams"} onClick={() => onViewChange("teams")} />
          <NavButton icon={ToursIcon} label="Touren" isActive={currentView === "tours"} onClick={() => onViewChange("tours")} />
        </NavGroup>

        {isAdmin ? (
          <NavGroup title="Administration">
            <NavButton icon={AdminIcon} label="Stammdaten" isActive={currentView === "masterData" || currentView === "projectStatus" || currentView === "noteTemplates"} onClick={() => onViewChange("masterData")} />
            <NavButton icon={AdminIcon} label="Hilfetexte" isActive={currentView === "helpTexts"} onClick={() => onViewChange("helpTexts")} />
            <NavButton icon={AdminIcon} label="Benutzerverwaltung" isActive={currentView === "users"} onClick={() => onViewChange("users")} />
            <NavButton icon={AdminIcon} label="Einstellungen" isActive={currentView === "settings"} onClick={() => onViewChange("settings")} />
            <NavButton icon={AdminIcon} label="Demo-Daten" isActive={currentView === "demoData"} onClick={() => onViewChange("demoData")} />
          </NavGroup>
        ) : null}

        <div className="mt-auto pt-2">
          <NavButton icon={LogOut} label="Logout" onClick={onLogout} />
        </div>
      </nav>
    </div>
  );
}
