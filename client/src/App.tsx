import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import { isAuthenticated, logout } from "@/lib/auth";
import { useState } from "react";

type RouterProps = {
  onLogout: () => void;
};

function Router({ onLogout }: RouterProps) {
  return (
    <Switch>
      <Route path="/">
        {() => <Home onLogout={onLogout} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAuthed, setIsAuthed] = useState(() => isAuthenticated());

  if (!isAuthed) {
    return (
      <Login
        onAuthenticated={() => {
          setIsAuthed(true);
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router
          onLogout={() => {
            logout();
            setIsAuthed(false);
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
