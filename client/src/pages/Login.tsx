import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getQuickLoginTargets, login, quickLogin } from "@/lib/auth";

type LoginProps = {
  onAuthenticated: () => void;
};

type RoleCode = "READER" | "DISPATCHER" | "ADMIN";

type QuickLoginTarget = {
  roleCode: RoleCode;
  available: boolean;
  username?: string;
};

const quickLoginEnabled = import.meta.env.VITE_AUTH_QUICK_LOGIN_ENABLED === "true";

export default function Login({ onAuthenticated }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickTargets, setQuickTargets] = useState<QuickLoginTarget[]>([]);
  const [quickTargetsLoading, setQuickTargetsLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSubmittingRole, setQuickSubmittingRole] = useState<RoleCode | null>(null);

  useEffect(() => {
    if (!quickLoginEnabled) return;

    let cancelled = false;
    setQuickTargetsLoading(true);
    setQuickError(null);

    void getQuickLoginTargets()
      .then((payload) => {
        if (cancelled) return;
        setQuickTargets(payload.roles);
      })
      .catch((loadError) => {
        if (cancelled) return;
        const code = loadError instanceof Error ? loadError.message : "QUICK_LOGIN_TARGETS_FAILED";
        if (code === "QUICK_LOGIN_DISABLED") {
          setQuickError("Schnelllogin ist deaktiviert.");
        } else if (code === "SETUP_REQUIRED") {
          setQuickError("Admin-Setup ist noch nicht abgeschlossen.");
        } else {
          setQuickError("Schnelllogin-Ziele konnten nicht geladen werden.");
        }
      })
      .finally(() => {
        if (cancelled) return;
        setQuickTargetsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const quickTargetsByRole = useMemo(
    () =>
      new Map<RoleCode, QuickLoginTarget>(
        quickTargets.map((target) => [target.roleCode, target]),
      ),
    [quickTargets],
  );

  const quickRoleButtons: Array<{ roleCode: RoleCode; label: string }> = [
    { roleCode: "ADMIN", label: "Log In als Admin" },
    { roleCode: "DISPATCHER", label: "Log In als Disponent" },
    { roleCode: "READER", label: "Log In als Monteur" },
  ];

  const handleQuickLogin = async (roleCode: RoleCode) => {
    setQuickError(null);
    setError(null);
    setQuickSubmittingRole(roleCode);

    try {
      await quickLogin(roleCode);
      onAuthenticated();
    } catch (submitError) {
      const code = submitError instanceof Error ? submitError.message : "QUICK_LOGIN_FAILED";
      if (code === "USER_NOT_FOUND_FOR_ROLE") {
        setQuickError("Fuer diese Rolle existiert kein aktiver Benutzer.");
      } else if (code === "QUICK_LOGIN_DISABLED") {
        setQuickError("Schnelllogin ist deaktiviert.");
      } else if (code === "SETUP_REQUIRED") {
        setQuickError("Admin-Setup ist noch nicht abgeschlossen.");
      } else {
        setQuickError("Schnelllogin fehlgeschlagen.");
      }
    } finally {
      setQuickSubmittingRole(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setError("Benutzer und Passwort sind erforderlich.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(normalizedUsername, password);
      onAuthenticated();
    } catch (submitError) {
      const code = submitError instanceof Error ? submitError.message : "LOGIN_FAILED";
      if (code === "INVALID_CREDENTIALS") {
        setError("Benutzer oder Passwort falsch.");
      } else if (code === "USER_INACTIVE") {
        setError("Benutzer ist deaktiviert.");
      } else if (code === "SETUP_REQUIRED") {
        setError("Es ist noch kein Admin eingerichtet. Bitte zuerst Admin-Setup ausfuehren.");
      } else {
        setError("Anmeldung fehlgeschlagen.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center px-6">
      <Card className="w-full max-w-md border-2 border-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-3xl font-black tracking-tight text-primary ">MuG Plan</CardTitle>
          <CardDescription>Bitte melde dich mit Benutzername oder E-Mail und Passwort an.</CardDescription>
        </CardHeader>
        <CardContent>
          {quickLoginEnabled && (
            <div className="space-y-3 pb-6">
              <div className="text-xs font-semibold tracking-wide text-slate-500">Schnelllogin (Test)</div>
              <div className="grid grid-cols-1 gap-2">
                {quickRoleButtons.map((entry) => {
                  const target = quickTargetsByRole.get(entry.roleCode);
                  const unavailable = !quickTargetsLoading && (!target || !target.available);
                  const isBusy = quickSubmittingRole !== null;
                  return (
                    <Button
                      key={entry.roleCode}
                      type="button"
                      variant="outline"
                      className="w-full min-h-16 justify-start px-4 py-3 text-left"
                      disabled={quickTargetsLoading || unavailable || isBusy}
                      onClick={() => {
                        void handleQuickLogin(entry.roleCode);
                      }}
                    >
                      <span className="flex w-full flex-col">
                        <span className="text-base font-black">{entry.label}</span>
                        <span className="text-xs text-slate-500">
                          {quickTargetsLoading
                            ? "Pruefe Benutzer..."
                            : target?.available
                              ? `Benutzer: ${target.username ?? "-"}`
                              : "Kein aktiver Benutzer fuer diese Rolle"}
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>

              {quickError && (
                <div className="rounded-md border border-destructive-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {quickError}
                </div>
              )}
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="login-username">Benutzername oder E-Mail</Label>
              <Input
                id="login-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Passwort</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              Anmelden
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
