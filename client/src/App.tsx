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
import { useDataVersionPoller } from "@/hooks/useDataVersionPoller";
import { StaleDataBanner } from "@/components/StaleDataBanner";
import { registerMutationSuccessCallback } from "@/lib/queryClient";

type RouterProps = {
  onLogout: () => void;
};

type AuthStage = "loading" | "setup" | "login" | "authed";

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const { isStale, markAsSeen, refreshBaseline } = useDataVersionPoller();

  useEffect(() => {
    registerMutationSuccessCallback(refreshBaseline);
  }, [refreshBaseline]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {isStale && <StaleDataBanner onRefresh={markAsSeen} />}
      <div className="flex-1 min-h-0">
        <Router onLogout={onLogout} />
      </div>
    </div>
  );
}

function Router({ onLogout }: RouterProps) {
  return (
    <Switch>
      <Route
        path="/calendar"
      >
        {() => (
          <Home
            onLogout={onLogout}
          />
        )}
      </Route>
      <Route
        path="/"
      >
        {() => (
          <Home
            onLogout={onLogout}
          />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [stage, setStage] = useState<AuthStage>("loading");

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
        onCompleted={() => setStage("authed")}
        onSwitchToLogin={() => setStage("login")}
      />
    );
  }

  if (stage === "login") {
    return (
      <Login
        onAuthenticated={() => setStage("authed")}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <Toaster />
          <AuthenticatedApp
            onLogout={() => {
              void logout();
              setStage("login");
            }}
          />
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
