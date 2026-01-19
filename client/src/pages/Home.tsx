import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { addMonths, subMonths, format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'year' | null>(null);

  // Handlers for month navigation
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Handler for sidebar buttons (currently just visual feedback/placeholder logic as per "simple view" request)
  const handleViewChange = (newView: 'week' | 'year') => {
    setView(newView);
    // In a full app, this would switch the component displayed below
    // For this specific request, the main requirement is the month view grid structure
    console.log(`Switched to ${newView} view`); 
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-body">
      {/* Left Sidebar - 20% Width */}
      <aside className="w-[20%] h-full flex-shrink-0 z-10 relative">
        <Sidebar onViewChange={handleViewChange} currentView={view || undefined} />
      </aside>

      {/* Main Content - 80% Width */}
      <main className="w-[80%] h-full flex flex-col relative">
        
        {/* Header / Navigation Bar */}
        <header className="px-8 py-6 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-border/40 z-20">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-bold font-display text-slate-800 tracking-tight capitalize">
              {format(currentDate, "MMMM yyyy", { locale: de })}
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-slate-100">
            <button
              onClick={prevMonth}
              className="p-2.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors duration-200 group"
              aria-label="Vorheriger Monat"
            >
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm font-semibold pr-1 hidden sm:inline-block">Vorheriger</span>
              </div>
            </button>
            
            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button
              onClick={nextMonth}
              className="p-2.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors duration-200 group"
              aria-label="Nächster Monat"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold pl-1 hidden sm:inline-block">Nächster</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-hidden bg-slate-50/30">
          {view === 'week' ? (
             <div className="h-full flex items-center justify-center bg-white rounded-2xl border border-border/60 shadow-sm">
               <div className="text-center p-8 max-w-md">
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">Wochenübersicht</h3>
                 <p className="text-muted-foreground">Diese Ansicht ist derzeit ein Platzhalter für die Wochenplanung.</p>
                 <button onClick={() => setView(null)} className="mt-6 text-primary font-medium hover:underline">Zurück zum Monat</button>
               </div>
             </div>
          ) : view === 'year' ? (
            <div className="h-full flex items-center justify-center bg-white rounded-2xl border border-border/60 shadow-sm">
               <div className="text-center p-8 max-w-md">
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">Jahresübersicht</h3>
                 <p className="text-muted-foreground">Diese Ansicht ist derzeit ein Platzhalter für die Jahresplanung.</p>
                 <button onClick={() => setView(null)} className="mt-6 text-primary font-medium hover:underline">Zurück zum Monat</button>
               </div>
             </div>
          ) : (
            /* Month View (Default) */
            <div className="h-full animate-in fade-in duration-500 slide-in-from-bottom-2">
              <CalendarGrid currentDate={currentDate} />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
