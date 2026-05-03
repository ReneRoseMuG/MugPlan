import { createContext, useContext, useEffect, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { useStandaloneMode } from "@/hooks/useStandaloneMode";
import { useChangeNotificationsContext } from "@/providers/ChangeNotificationsProvider";

type StandaloneLayoutProps = {
  title: string;
  children: ReactNode;
  headerTone?: "navigation" | "default";
};

const StandaloneLayoutContentContext = createContext(false);

export function useIsStandaloneLayoutContent() {
  return useContext(StandaloneLayoutContentContext);
}

export default function StandaloneLayout({ title, children, headerTone = "navigation" }: StandaloneLayoutProps) {
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

  const usesNavigationHeaderTone = headerTone === "navigation";
  const headerClassName = usesNavigationHeaderTone
    ? "flex h-10 flex-shrink-0 items-center justify-between border-b border-border bg-slate-50 px-4"
    : "flex h-10 flex-shrink-0 items-center justify-between border-b border-border bg-white px-4";
  const refreshIdleClassName = usesNavigationHeaderTone
    ? "text-slate-500 hover:bg-white hover:text-slate-900"
    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900";

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-white"
      data-standalone-mode={isStandaloneMode ? "true" : "false"}
    >
      <header
        className={headerClassName}
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
                : refreshIdleClassName
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

      <StandaloneLayoutContentContext.Provider value>
        <div className="min-h-0 flex-1 overflow-hidden bg-white [&>*]:!h-full [&>*]:!rounded-none [&>*]:!border-0 [&>*]:!shadow-none">
          {children}
        </div>
      </StandaloneLayoutContentContext.Provider>
    </div>
  );
}
