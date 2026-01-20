import { CalendarDays, CalendarRange, Calendar, BarChart3, MapPin, Users, FolderKanban, UserCircle, ListChecks, UsersRound, Layers, Route, CalendarOff, Activity, CloudUpload } from "lucide-react";
import type { ViewType } from "@/pages/Home";

interface SidebarProps {
  onViewChange: (view: ViewType) => void;
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

export function Sidebar({ onViewChange, currentView }: SidebarProps) {
  return (
    <div className="w-full h-full bg-slate-50 border-r border-border flex flex-col p-4 overflow-y-auto" data-testid="sidebar">
      <div className="mb-6">
        <h1 className="text-xl font-bold font-display text-primary tracking-tight" data-testid="text-app-title">
          Kalender
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium" data-testid="text-app-subtitle">
          Persönlicher Planer
        </p>
      </div>

      <nav className="flex flex-col">
        <NavGroup title="Terminplanung">
          <NavButton icon={CalendarDays} label="Wochenübersicht" isActive={currentView === 'week'} onClick={() => onViewChange('week')} />
          <NavButton icon={Calendar} label="Monatsübersicht" isActive={currentView === 'month'} onClick={() => onViewChange('month')} />
          <NavButton icon={CalendarRange} label="Jahresübersicht" isActive={currentView === 'year'} onClick={() => onViewChange('year')} />
          <NavButton icon={BarChart3} label="Auslastungsübersicht" />
          <NavButton icon={Route} label="Touren Übersicht" />
          <NavButton icon={Users} label="Mitarbeiter Übersicht" />
        </NavGroup>

        <NavGroup title="Projektplanung">
          <NavButton icon={FolderKanban} label="Projekte" />
          <NavButton icon={UserCircle} label="Kunden" isActive={currentView === 'customer'} onClick={() => onViewChange('customer')} />
          <NavButton icon={ListChecks} label="Projektstatus" />
        </NavGroup>

        <NavGroup title="Mitarbeiter Verwaltung">
          <NavButton icon={UsersRound} label="Mitarbeiter" />
          <NavButton icon={Layers} label="Team Vorlagen" />
          <NavButton icon={MapPin} label="Touren" />
          <NavButton icon={CalendarOff} label="Abwesenheiten" />
        </NavGroup>

        <NavGroup title="Monitoring & Backup">
          <NavButton icon={Activity} label="Termin Monitoring" />
          <NavButton icon={CloudUpload} label="Backup & Sync" />
        </NavGroup>
      </nav>
    </div>
  );
}
