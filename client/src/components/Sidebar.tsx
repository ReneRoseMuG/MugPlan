import { CalendarDays, CalendarRange, Calendar, BarChart3, MapPin, Users, FolderKanban, UserCircle, ListChecks, UsersRound, Layers, Route, Activity, CloudUpload, ChevronDown, Plus, List } from "lucide-react";
import type { ViewType } from "@/pages/Home";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="nav-projekte"
          className={`
            flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 w-full text-left
            ${isActive 
              ? "bg-white text-primary border border-slate-200" 
              : "text-slate-600 hover:bg-white hover:text-slate-900"}
          `}
        >
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 opacity-80" />
            Projekte
          </div>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => { onViewChange('project'); setOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 w-full text-left"
            data-testid="menu-new-project"
          >
            <Plus className="w-4 h-4" />
            Neues Projekt
          </button>
          <button
            onClick={() => { onViewChange('projectList'); setOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 w-full text-left"
            data-testid="menu-project-list"
          >
            <List className="w-4 h-4" />
            Projektliste
          </button>
          <button
            onClick={() => { onViewChange('weeklyProjects'); setOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 w-full text-left"
            data-testid="menu-weekly-projects"
          >
            <CalendarDays className="w-4 h-4" />
            Wochenplanung
          </button>
        </div>
      </PopoverContent>
    </Popover>
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
          <ProjectMenuButton 
            isActive={currentView === 'project' || currentView === 'projectList' || currentView === 'weeklyProjects'} 
            onViewChange={onViewChange} 
          />
          <CustomerMenuButton 
            isActive={currentView === 'customer' || currentView === 'customerList'} 
            onViewChange={onViewChange} 
          />
          <NavButton icon={ListChecks} label="Projektstatus" />
        </NavGroup>

        <NavGroup title="Mitarbeiter Verwaltung">
          <NavButton icon={UsersRound} label="Mitarbeiter" isActive={currentView === 'employees'} onClick={() => onViewChange('employees')} />
          <NavButton icon={Layers} label="Teams" isActive={currentView === 'teams'} onClick={() => onViewChange('teams')} />
          <NavButton icon={MapPin} label="Touren" isActive={currentView === 'tours'} onClick={() => onViewChange('tours')} />
        </NavGroup>

        <NavGroup title="Monitoring & Backup">
          <NavButton icon={Activity} label="Termin Monitoring" />
          <NavButton icon={CloudUpload} label="Backup & Sync" />
        </NavGroup>
      </nav>
    </div>
  );
}
