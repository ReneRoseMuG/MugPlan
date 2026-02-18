import { useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/auth";

type LoginProps = {
  onAuthenticated: () => void;
};

export default function Login({ onAuthenticated }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <CardTitle className="text-3xl font-black tracking-tight text-primary uppercase">MuG Plan</CardTitle>
          <CardDescription>Bitte melde dich mit Benutzername oder E-Mail und Passwort an.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
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
