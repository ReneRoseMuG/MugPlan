import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  getSetupStatus,
  getQuickLoginTargets,
  login,
  quickLogin,
  verifyTwoFactorLogin,
  verifyTwoFactorSetup,
} from "@/lib/auth";

type LoginProps = {
  onAuthenticated: (monitoringSummary?: { count: number; triggerNames: string[] }) => void;
};

type RoleCode = "READER" | "DISPATCHER" | "ADMIN";

type QuickLoginTarget = {
  roleCode: RoleCode;
  available: boolean;
  username?: string;
};

type LoginStep =
  | { kind: "password" }
  | {
      kind: "setup";
      username: string;
      manualEntryKey: string;
      qrCodeDataUrl: string;
    }
  | {
      kind: "verify";
      username: string;
    };

const quickLoginEnabled = import.meta.env.VITE_AUTH_QUICK_LOGIN_ENABLED === "true";

export default function Login({ onAuthenticated }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickTargets, setQuickTargets] = useState<QuickLoginTarget[]>([]);
  const [quickTargetsLoading, setQuickTargetsLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSubmittingRole, setQuickSubmittingRole] = useState<RoleCode | null>(null);
  const [isQuickLoginVisible, setIsQuickLoginVisible] = useState(quickLoginEnabled);
  const [step, setStep] = useState<LoginStep>({ kind: "password" });

  useEffect(() => {
    if (!quickLoginEnabled) return;

    let cancelled = false;
    setQuickTargetsLoading(true);
    setQuickError(null);

    void getSetupStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.isTwoFactorEnabled) {
          setIsQuickLoginVisible(false);
          setQuickTargets([]);
          return null;
        }
        setIsQuickLoginVisible(true);
        return getQuickLoginTargets();
      })
      .then((payload) => {
        if (cancelled || !payload) return;
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
      const payload = await quickLogin(roleCode);
      onAuthenticated(payload.monitoringSummary);
    } catch (submitError) {
      const code = submitError instanceof Error ? submitError.message : "QUICK_LOGIN_FAILED";
      if (code === "USER_NOT_FOUND_FOR_ROLE") {
        setQuickError("Fuer diese Rolle existiert kein aktiver Benutzer.");
      } else if (code === "QUICK_LOGIN_DISABLED") {
        setQuickError("Schnelllogin ist deaktiviert.");
      } else if (code === "SETUP_REQUIRED") {
        setQuickError("Admin-Setup ist noch nicht abgeschlossen.");
      } else if (code === "TWO_FACTOR_REQUIRED") {
        setQuickError("Schnelllogin ist bei aktivierter 2FA deaktiviert.");
      } else {
        setQuickError("Schnelllogin fehlgeschlagen.");
      }
    } finally {
      setQuickSubmittingRole(null);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setError("Benutzer und Passwort sind erforderlich.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(normalizedUsername, password);
      if (result.status === "authenticated") {
        onAuthenticated(result.monitoringSummary);
        return;
      }
      setTwoFactorCode("");
      if (result.status === "2fa_setup_required") {
        setStep({
          kind: "setup",
          username: result.username,
          manualEntryKey: result.manualEntryKey,
          qrCodeDataUrl: result.qrCodeDataUrl,
        });
        return;
      }
      setStep({
        kind: "verify",
        username: result.username,
      });
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

  const handleTwoFactorSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(twoFactorCode.trim())) {
      setError("Bitte einen 6-stelligen Code eingeben.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (step.kind === "setup") {
        const payload = await verifyTwoFactorSetup(twoFactorCode);
        onAuthenticated(payload.monitoringSummary);
      } else if (step.kind === "verify") {
        const payload = await verifyTwoFactorLogin(twoFactorCode);
        onAuthenticated(payload.monitoringSummary);
      } else {
        throw new Error("INVALID_STEP");
      }
    } catch (submitError) {
      const code = submitError instanceof Error ? submitError.message : "TWO_FACTOR_FAILED";
      if (code === "INVALID_TWO_FACTOR_CODE") {
        setError("Der 2FA-Code ist ungueltig.");
      } else if (code === "TWO_FACTOR_CHALLENGE_MISSING") {
        setStep({ kind: "password" });
        setPassword("");
        setTwoFactorCode("");
        setError("Die 2FA-Pruefung ist abgelaufen. Bitte erneut anmelden.");
      } else {
        setError("2FA-Pruefung fehlgeschlagen.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPasswordStep = () => (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void handlePasswordSubmit(event);
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
  );

  const renderTwoFactorStep = () => (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void handleTwoFactorSubmit(event);
      }}
    >
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        {step.kind === "setup"
          ? "2FA ist global aktiviert. Sie muessen jetzt Ihre Authenticator-App einrichten."
          : "2FA ist global aktiviert. Bitte bestaetigen Sie die Anmeldung mit Ihrem 6-stelligen Code."}
      </div>

      {step.kind === "setup" ? (
        <div className="space-y-3">
          <div className="flex justify-center rounded-md border border-slate-200 bg-white p-4">
            <img src={step.qrCodeDataUrl} alt="2FA QR-Code" className="h-52 w-52" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="manual-entry-key">Manueller Einrichtungscode</Label>
            <Input id="manual-entry-key" value={step.manualEntryKey} readOnly />
          </div>
          <p className="text-xs text-slate-500">
            Benutzer: {step.username}. Falls der QR-Scan nicht funktioniert, verwenden Sie den manuellen Code.
          </p>
        </div>
      ) : step.kind === "verify" ? (
        <p className="text-sm text-slate-600">Benutzer: {step.username}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="two-factor-code">6-stelliger Code</Label>
        <Input
          id="two-factor-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={twoFactorCode}
          onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isSubmitting}
          onClick={() => {
            setStep({ kind: "password" });
            setPassword("");
            setTwoFactorCode("");
            setError(null);
          }}
        >
          Zurueck
        </Button>
        <Button className="flex-1" type="submit" disabled={isSubmitting}>
          Bestaetigen
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center px-6">
      <Card className="w-full max-w-md border-2 border-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-3xl font-black tracking-tight text-primary ">MuG Plan</CardTitle>
          <CardDescription>
            {step.kind === "password"
              ? "Bitte melde dich mit Benutzername oder E-Mail und Passwort an."
              : "Bitte schliesse die Zwei-Faktor-Anmeldung ab."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quickLoginEnabled && isQuickLoginVisible && step.kind === "password" && (
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

          {step.kind === "password" ? renderPasswordStep() : renderTwoFactorStep()}
        </CardContent>
      </Card>
    </div>
  );
}
