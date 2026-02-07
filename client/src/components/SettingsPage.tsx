import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unbekannter Wert]";
  }
}

export function SettingsPage() {
  const { settings, isLoading, isError, errorMessage, retry } = useSettings();

  if (isLoading) {
    return (
      <div className="h-full rounded-lg border-2 border-foreground bg-white p-6">
        <h3 className="mb-4 text-xl font-black uppercase tracking-tight text-primary">Einstellungen</h3>
        <p className="text-sm text-slate-500">Einstellungen werden geladen...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full rounded-lg border-2 border-foreground bg-white p-6">
        <h3 className="mb-4 text-xl font-black uppercase tracking-tight text-primary">Einstellungen</h3>
        <p className="mb-4 text-sm text-destructive">
          Einstellungen konnten nicht geladen werden: {errorMessage ?? "Unbekannter Fehler"}
        </p>
        <Button onClick={() => void retry()} data-testid="button-settings-retry">
          Erneut laden
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border-2 border-foreground bg-white p-6" data-testid="settings-landing-page">
      <h3 className="text-xl font-black uppercase tracking-tight text-primary">Einstellungen</h3>
      <p className="mb-4 mt-1 text-sm text-slate-500">Read-only Uebersicht der wirksamen Settings.</p>

      {settings.length === 0 ? (
        <p className="text-sm text-slate-500">Keine Settings vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {settings.map((setting) => (
            <div
              key={setting.key}
              className="rounded-md border border-slate-200 bg-slate-50 p-3"
              data-testid={`setting-row-${setting.key}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{setting.label}</p>
                  <p className="text-xs text-slate-500">{setting.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-600">Quelle: {setting.resolvedScope}</p>
                  <p className="text-xs text-slate-500">Rolle: {setting.roleKey}</p>
                </div>
              </div>
              <div className="mt-2 text-sm text-slate-800">
                <span className="font-medium">Wert:</span> {stringifyValue(setting.resolvedValue)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
