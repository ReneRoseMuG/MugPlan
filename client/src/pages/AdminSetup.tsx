import { useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { setupAdmin } from "@/lib/auth";

type AdminSetupProps = {
  onCompleted: () => void;
  onSwitchToLogin: () => void;
};

export default function AdminSetup({ onCompleted, onSwitchToLogin }: AdminSetupProps) {
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
      await setupAdmin(normalizedUsername, password);
      onCompleted();
    } catch (submitError) {
      const code = submitError instanceof Error ? submitError.message : "SETUP_FAILED";
      if (code === "SETUP_ALREADY_COMPLETED") {
        onSwitchToLogin();
        return;
      }
      if (code === "VALIDATION_ERROR") {
        setError("Eingaben sind ungueltig (Passwort mind. 10 Zeichen).");
      } else {
        setError("Admin-Setup fehlgeschlagen.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center px-6">
      <Card className="w-full max-w-md border-2 border-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-3xl font-black tracking-tight text-primary uppercase">Ersteinrichtung</CardTitle>
          <CardDescription>Es wurde noch kein Admin angelegt. Bitte initialen Admin erstellen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="setup-username">Admin Benutzername</Label>
              <Input
                id="setup-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password">Admin Passwort</Label>
              <Input
                id="setup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              Admin anlegen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
