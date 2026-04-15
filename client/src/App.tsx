import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import AdminSetup from "@/pages/AdminSetup";
import StandaloneCalendarWeek from "@/pages/StandaloneCalendarWeek";
import StandaloneCalendarMonth from "@/pages/StandaloneCalendarMonth";
import {
  StandaloneAppointments,
  StandaloneCustomers,
  StandaloneEmployees,
  StandaloneMonitoring,
  StandaloneProjects,
  StandaloneReports,
  StandaloneTeams,
  StandaloneTours,
} from "@/pages/StandaloneDomainViews";
import { getSessionStatus, getSetupStatus, logout } from "@/lib/auth";
import { useEffect, useState } from "react";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { FloatingPreviewKeeperProvider } from "@/contexts/floating-preview-keeper";

type RouterProps = {
  onLogout: () => void;
};

type AuthStage = "loading" | "setup" | "login" | "authed";

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Router onLogout={onLogout} />
    </div>
  );
}

function Router({ onLogout }: RouterProps) {
  return (
    <Switch>
      <Route path="/standalone/calendar/week" component={StandaloneCalendarWeek} />
      <Route path="/standalone/calendar/month" component={StandaloneCalendarMonth} />
      <Route path="/standalone/appointments" component={StandaloneAppointments} />
      <Route path="/standalone/projects" component={StandaloneProjects} />
      <Route path="/standalone/customers" component={StandaloneCustomers} />
      <Route path="/standalone/employees" component={StandaloneEmployees} />
      <Route path="/standalone/tours" component={StandaloneTours} />
      <Route path="/standalone/teams" component={StandaloneTeams} />
      <Route path="/standalone/monitoring" component={StandaloneMonitoring} />
      <Route path="/standalone/reports" component={StandaloneReports} />
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
    if (stage === "authed") return;

    switch (stage) {
      case "loading":
        document.title = "MuG Plan | Laden";
        break;
      case "setup":
        document.title = "MuG Plan | Admin-Setup";
        break;
      case "login":
        document.title = "MuG Plan | Login";
        break;
      default:
        document.title = "MuG Plan";
        break;
    }
  }, [stage]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await getSetupStatus();
        if (cancelled) return;
        if (status.needsAdminSetup) {
          setStage("setup");
          return;
        }
        try {
          await getSessionStatus();
          if (cancelled) return;
          setStage("authed");
        } catch {
          if (cancelled) return;
          setStage("login");
        }
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
          <FloatingPreviewKeeperProvider>
            <Toaster />
            <AuthenticatedApp
              onLogout={() => {
                void logout();
                setStage("login");
              }}
            />
          </FloatingPreviewKeeperProvider>
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
