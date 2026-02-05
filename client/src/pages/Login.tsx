import { useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAsAdmin } from "@/lib/auth";

type LoginProps = {
  onAuthenticated: () => void;
};

export default function Login({ onAuthenticated }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const configuredPassword = useMemo(() => "mugDemo2026", []);
  const configuredUsername = useMemo(() => "admin", []);

  const hasConfiguredPassword = configuredPassword.length > 0;
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPassword = password.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!hasConfiguredPassword) {
      setError("Passwort ist nicht gesetzt.");
      return;
    }

    if (normalizedUsername !== configuredUsername) {
      setError("Benutzer oder Passwort falsch.");
      return;
    }

    if (normalizedPassword !== configuredPassword) {
      setError("Benutzer oder Passwort falsch.");
      return;
    }

    loginAsAdmin();
    onAuthenticated();
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center px-6">
      <Card className="w-full max-w-md border-2 border-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-3xl font-black tracking-tight text-primary uppercase">
            MuG Plan
          </CardTitle>
          <CardDescription>
            Bitte melde dich mit dem Admin-Konto an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-username">Benutzer</Label>
              <Input
                id="login-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="off"
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

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Debug: User ok = {normalizedUsername === configuredUsername ? "ja" : "nein"} · Passwort ok = {normalizedPassword === configuredPassword ? "ja" : "nein"} · Länge = {password.length}
            </div>

            {!hasConfiguredPassword && !error && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Passwort ist nicht gesetzt.
              </div>
            )}

            <Button className="w-full" type="submit" disabled={!hasConfiguredPassword}>
              Anmelden
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
