import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const previewOptions = ["small", "medium", "large"] as const;
type PreviewSize = (typeof previewOptions)[number];

export function SettingsPage() {
  const { settingsByKey, isLoading, isError, errorMessage, retry, setSetting, isSaving } = useSettings();

  const previewSetting = settingsByKey.get("attachmentPreviewSize");
  const storagePathSetting = settingsByKey.get("attachmentStoragePath");

  const resolvedPreviewValue = useMemo(() => {
    const value = previewSetting?.resolvedValue;
    if (value === "small" || value === "medium" || value === "large") {
      return value;
    }
    return "medium" as PreviewSize;
  }, [previewSetting?.resolvedValue]);

  const resolvedStoragePath = useMemo(() => {
    return typeof storagePathSetting?.resolvedValue === "string" ? storagePathSetting.resolvedValue : "server/uploads";
  }, [storagePathSetting?.resolvedValue]);

  const [previewValue, setPreviewValue] = useState<PreviewSize>(resolvedPreviewValue);
  const [storagePathValue, setStoragePathValue] = useState<string>(resolvedStoragePath);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [previewSaved, setPreviewSaved] = useState(false);
  const [storageSaved, setStorageSaved] = useState(false);

  useEffect(() => {
    setPreviewValue(resolvedPreviewValue);
  }, [resolvedPreviewValue]);

  useEffect(() => {
    setStoragePathValue(resolvedStoragePath);
  }, [resolvedStoragePath]);

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

  const handleSavePreview = async () => {
    setPreviewError(null);
    setPreviewSaved(false);
    try {
      await setSetting({
        key: "attachmentPreviewSize",
        scopeType: "USER",
        value: previewValue,
      });
      setPreviewSaved(true);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const handleSaveStoragePath = async () => {
    setStorageError(null);
    setStorageSaved(false);
    try {
      await setSetting({
        key: "attachmentStoragePath",
        scopeType: "GLOBAL",
        value: storagePathValue,
      });
      setStorageSaved(true);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  return (
    <div className="h-full rounded-lg border-2 border-foreground bg-white p-6" data-testid="settings-landing-page">
      <h3 className="text-xl font-black uppercase tracking-tight text-primary">Einstellungen</h3>
      <p className="mb-5 mt-1 text-sm text-slate-500">Direkte Bearbeitung von Attachment-Settings.</p>

      <div className="space-y-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-attachmentPreviewSize">
          <p className="font-semibold text-slate-900">{previewSetting?.label ?? "Datei Vorschau Groesse"}</p>
          <p className="mb-3 text-xs text-slate-500">{previewSetting?.description ?? "Steuert die Groesse der Dateivorschau."}</p>

          <div className="flex items-center gap-3">
            <select
              value={previewValue}
              onChange={(event) => setPreviewValue(event.target.value as PreviewSize)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              data-testid="select-setting-attachmentPreviewSize"
            >
              {previewOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button onClick={() => void handleSavePreview()} disabled={isSaving} data-testid="button-save-attachmentPreviewSize">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(previewSetting?.resolvedValue)} ({previewSetting?.resolvedScope ?? "-"})</p>
          {previewSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {previewError && <p className="mt-1 text-xs text-destructive">{previewError}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-attachmentStoragePath">
          <p className="font-semibold text-slate-900">{storagePathSetting?.label ?? "Attachment Speicherpfad"}</p>
          <p className="mb-3 text-xs text-slate-500">{storagePathSetting?.description ?? "Basis-Verzeichnis fuer Uploads."}</p>

          <div className="flex items-center gap-3">
            <Input
              value={storagePathValue}
              onChange={(event) => setStoragePathValue(event.target.value)}
              placeholder="server/uploads"
              data-testid="input-setting-attachmentStoragePath"
            />
            <Button onClick={() => void handleSaveStoragePath()} disabled={isSaving} data-testid="button-save-attachmentStoragePath">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(storagePathSetting?.resolvedValue)} ({storagePathSetting?.resolvedScope ?? "-"})</p>
          {storageSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {storageError && <p className="mt-1 text-xs text-destructive">{storageError}</p>}
        </div>
      </div>
    </div>
  );
}
