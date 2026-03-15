import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import AdminSetup from "@/pages/AdminSetup";
import { getSetupStatus, logout } from "@/lib/auth";
import { useEffect, useState } from "react";
import { SettingsProvider } from "@/providers/SettingsProvider";

type RouterProps = {
  onLogout: () => void;
  initialMonitoringSummary?: { count: number; triggerNames: string[] } | null;
  onInitialMonitoringSummaryConsumed: () => void;
};

type AuthStage = "loading" | "setup" | "login" | "authed";

function Router({ onLogout, initialMonitoringSummary, onInitialMonitoringSummaryConsumed }: RouterProps) {
  return (
    <Switch>
      <Route
        path="/calendar"
      >
        {() => (
          <Home
            onLogout={onLogout}
            initialMonitoringSummary={initialMonitoringSummary ?? undefined}
            onInitialMonitoringSummaryConsumed={onInitialMonitoringSummaryConsumed}
          />
        )}
      </Route>
      <Route
        path="/"
      >
        {() => (
          <Home
            onLogout={onLogout}
            initialMonitoringSummary={initialMonitoringSummary ?? undefined}
            onInitialMonitoringSummaryConsumed={onInitialMonitoringSummaryConsumed}
          />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [stage, setStage] = useState<AuthStage>("loading");
  const [initialMonitoringSummary, setInitialMonitoringSummary] = useState<{
    count: number;
    triggerNames: string[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await getSetupStatus();
        if (cancelled) return;
        setStage(status.needsAdminSetup ? "setup" : "login");
      } catch {
        if (cancelled) return;
        setStage("login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (stage === "loading") {
    return <div className="min-h-screen w-full bg-slate-100" />;
  }

  if (stage === "setup") {
    return (
      <AdminSetup
        onCompleted={(monitoringSummary) => {
          setInitialMonitoringSummary(monitoringSummary ?? null);
          setStage("authed");
        }}
        onSwitchToLogin={() => setStage("login")}
      />
    );
  }

  if (stage === "login") {
    return (
      <Login
        onAuthenticated={(monitoringSummary) => {
          setInitialMonitoringSummary(monitoringSummary ?? null);
          setStage("authed");
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <Toaster />
          <Router
            onLogout={() => {
              void logout();
              setInitialMonitoringSummary(null);
              setStage("login");
            }}
            initialMonitoringSummary={initialMonitoringSummary}
            onInitialMonitoringSummaryConsumed={() => setInitialMonitoringSummary(null)}
          />
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
