import { CalendarDays, CalendarRange, Calendar, MapPin, FolderKanban, UserCircle, ListChecks, UsersRound, Layers, FileText, Settings, HelpCircle, Table2, LogOut } from "lucide-react";
import type { ViewType } from "@/pages/Home";

interface SidebarProps {
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  currentView?: ViewType;
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2.5" data-testid={`nav-group-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div 
        className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary bg-secondary"
        data-testid={`nav-header-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {title}
      </div>
      <div className="flex flex-col p-2 gap-1">
        {children}
      </div>
    </div>
  );
}

function CustomerMenuButton({ isActive, onViewChange }: { isActive?: boolean; onViewChange: (view: ViewType) => void }) {
  return (
    <button
      data-testid="nav-kunden"
      onClick={() => onViewChange('customerList')}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 w-full text-left
        ${isActive 
          ? "bg-white text-primary border border-slate-200" 
          : "text-slate-600 hover:bg-white hover:text-slate-900"}
      `}
    >
      <UserCircle className="w-4 h-4 opacity-80" />
      Kunden
    </button>
  );
}

function ProjectMenuButton({ isActive, onViewChange }: { isActive?: boolean; onViewChange: (view: ViewType) => void }) {
  return (
    <button
      onClick={() => onViewChange('projectList')}
      data-testid="nav-projekte"
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 w-full text-left
        ${isActive 
          ? "bg-white text-primary border border-slate-200" 
          : "text-slate-600 hover:bg-white hover:text-slate-900"}
      `}
    >
      <FolderKanban className="w-4 h-4 opacity-80" />
      Projekte
    </button>
  );
}

function NavButton({ icon: Icon, label, isActive, onClick }: { icon: React.ElementType; label: string; isActive?: boolean; onClick?: () => void }) {
  const testId = `nav-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  if (onClick) {
    return (
      <button
        onClick={onClick}
        data-testid={testId}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 w-full text-left
          ${isActive 
            ? "bg-white text-primary border border-slate-200" 
            : "text-slate-600 hover:bg-white hover:text-slate-900"}
        `}
      >
        <Icon className="w-4 h-4 opacity-80" />
        {label}
      </button>
    );
  }

  return (
    <div
      data-testid={testId}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium w-full text-left text-slate-400"
    >
      <Icon className="w-4 h-4 opacity-60" />
      {label}
    </div>
  );
}

export function Sidebar({ onViewChange, onLogout, currentView }: SidebarProps) {
  return (
    <div className="w-full h-full bg-slate-50 border-r border-border flex flex-col p-4 overflow-y-auto" data-testid="sidebar">
      <div className="mb-6">
        <h1 className="text-xl font-bold font-display text-primary tracking-tight" data-testid="text-app-title">
          MuG Plan
        </h1>
      </div>

      <nav className="flex flex-col flex-1">
        <NavGroup title="Terminplanung">
          <NavButton icon={CalendarDays} label="Wochenübersicht" isActive={currentView === 'week'} onClick={() => onViewChange('week')} />
          <NavButton icon={Calendar} label="Monatsübersicht" isActive={currentView === 'month'} onClick={() => onViewChange('month')} />
          <NavButton icon={CalendarRange} label="Jahresübersicht" isActive={currentView === 'year'} onClick={() => onViewChange('year')} />
          <NavButton icon={Table2} label="Terminliste" isActive={currentView === 'appointmentsList'} onClick={() => onViewChange('appointmentsList')} />
        </NavGroup>

        <NavGroup title="Projektplanung">
          <ProjectMenuButton 
            isActive={currentView === 'project' || currentView === 'projectList'} 
            onViewChange={onViewChange} 
          />
          <CustomerMenuButton 
            isActive={currentView === 'customer' || currentView === 'customerList'} 
            onViewChange={onViewChange} 
          />
        </NavGroup>

        <NavGroup title="Mitarbeiter Verwaltung">
          <NavButton icon={UsersRound} label="Mitarbeiter" isActive={currentView === 'employees'} onClick={() => onViewChange('employees')} />
          <NavButton icon={Layers} label="Teams" isActive={currentView === 'teams'} onClick={() => onViewChange('teams')} />
          <NavButton icon={MapPin} label="Touren" isActive={currentView === 'tours'} onClick={() => onViewChange('tours')} />
        </NavGroup>

        <NavGroup title="Administration">
          <NavButton icon={FileText} label="Notiz Vorlagen" isActive={currentView === 'noteTemplates'} onClick={() => onViewChange('noteTemplates')} />
          <NavButton icon={ListChecks} label="Projekt Status" isActive={currentView === 'projectStatus'} onClick={() => onViewChange('projectStatus')} />
          <NavButton icon={HelpCircle} label="Hilfetexte" isActive={currentView === 'helpTexts'} onClick={() => onViewChange('helpTexts')} />
          <NavButton icon={Settings} label="Einstellungen" isActive={currentView === 'settings'} onClick={() => onViewChange('settings')} />
          <NavButton icon={Settings} label="Demo-Daten" isActive={currentView === 'demoData'} onClick={() => onViewChange('demoData')} />
        </NavGroup>

        <div className="mt-auto pt-2">
          <NavButton icon={LogOut} label="Logout" onClick={onLogout} />
        </div>
      </nav>
    </div>
  );
}


