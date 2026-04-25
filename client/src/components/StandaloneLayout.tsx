import { useEffect, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { useStandaloneMode } from "@/hooks/useStandaloneMode";
import { useChangeNotificationsContext } from "@/providers/ChangeNotificationsProvider";

type StandaloneLayoutProps = {
  title: string;
  children: ReactNode;
};

export default function StandaloneLayout({ title, children }: StandaloneLayoutProps) {
  const isStandaloneMode = useStandaloneMode();
  const {
    updatesAvailable,
    isReloadDisabled,
    isReloadPending,
    triggerGlobalReload,
  } = useChangeNotificationsContext();

  useEffect(() => {
    document.title = `MuG Plan | ${title}`;
  }, [title]);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100"
      data-standalone-mode={isStandaloneMode ? "true" : "false"}
    >
      <header
        className="flex h-10 flex-shrink-0 items-center justify-between border-b border-border bg-white px-4"
        data-testid="standalone-header"
      >
        <div className="min-w-0 text-sm font-semibold tracking-tight text-primary">MuG Plan</div>
        <div className="min-w-0 truncate px-4 text-sm font-medium text-slate-700">{title}</div>
        <button
          type="button"
          onClick={() => void triggerGlobalReload()}
          disabled={isReloadDisabled}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            isReloadDisabled
              ? "cursor-not-allowed text-slate-300"
              : updatesAvailable
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
          data-testid="standalone-refresh"
          title={
            isReloadDisabled
              ? "Neu Laden ist gesperrt, solange irgendwo eine Bearbeitung offen ist"
              : updatesAvailable
                ? "Änderungen verfügbar"
                : "Daten neu laden"
          }
          aria-label={isReloadPending ? "Daten werden neu geladen" : "Daten neu laden"}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden p-4">{children}</div>
    </div>
  );
}
