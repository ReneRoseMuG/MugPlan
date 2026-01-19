import { CalendarDays, CalendarRange, Calendar } from "lucide-react";

interface SidebarProps {
  onViewChange: (view: 'month' | 'week' | 'year') => void;
  currentView?: 'month' | 'week' | 'year';
}

export function Sidebar({ onViewChange, currentView }: SidebarProps) {
  return (
    <div className="w-full h-full bg-slate-50 border-r border-border flex flex-col p-6 shadow-inner">
      <div className="mb-10">
        <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
          Kalender
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Persönlicher Planer
        </p>
      </div>

      <nav className="flex flex-col gap-3">
        <button
          onClick={() => onViewChange('week')}
          className={`
            flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200
            ${currentView === 'week' 
              ? "bg-white text-primary shadow-md shadow-slate-200 border border-slate-100 translate-x-1" 
              : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"}
          `}
        >
          <CalendarDays className="w-5 h-5 opacity-80" />
          Wochenübersicht
        </button>

        <button
          onClick={() => onViewChange('month')}
          className={`
            flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200
            ${currentView === 'month' 
              ? "bg-white text-primary shadow-md shadow-slate-200 border border-slate-100 translate-x-1" 
              : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"}
          `}
        >
          <Calendar className="w-5 h-5 opacity-80" />
          Monatsübersicht
        </button>

        <button
          onClick={() => onViewChange('year')}
          className={`
            flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200
            ${currentView === 'year' 
              ? "bg-white text-primary shadow-md shadow-slate-200 border border-slate-100 translate-x-1" 
              : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"}
          `}
        >
          <CalendarRange className="w-5 h-5 opacity-80" />
          Jahresübersicht
        </button>
      </nav>

      <div className="mt-auto">
        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-600 font-medium leading-relaxed">
            Wählen Sie eine Ansicht aus, um Ihre Termine zu planen.
          </p>
        </div>
      </div>
    </div>
  );
}
