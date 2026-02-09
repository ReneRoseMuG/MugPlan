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
const defaultWeekendColumnPercent = 33;
const defaultWeekScrollRange = 4;
const defaultMonthScrollRange = 3;

export function SettingsPage() {
  const { settingsByKey, isLoading, isError, errorMessage, retry, setSetting, isSaving } = useSettings();

  const previewSetting = settingsByKey.get("attachmentPreviewSize");
  const storagePathSetting = settingsByKey.get("attachmentStoragePath");
  const weekendWidthSetting = settingsByKey.get("calendarWeekendColumnPercent");
  const weekScrollRangeSetting = settingsByKey.get("calendarWeekScrollRange");
  const monthScrollRangeSetting = settingsByKey.get("calendarMonthScrollRange");

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

  const resolvedWeekendColumnPercent = useMemo(() => {
    const value = weekendWidthSetting?.resolvedValue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) {
      return value;
    }
    return defaultWeekendColumnPercent;
  }, [weekendWidthSetting?.resolvedValue]);

  const resolvedWeekScrollRange = useMemo(() => {
    const value = weekScrollRangeSetting?.resolvedValue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 12) {
      return value;
    }
    return defaultWeekScrollRange;
  }, [weekScrollRangeSetting?.resolvedValue]);

  const resolvedMonthScrollRange = useMemo(() => {
    const value = monthScrollRangeSetting?.resolvedValue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 12) {
      return value;
    }
    return defaultMonthScrollRange;
  }, [monthScrollRangeSetting?.resolvedValue]);

  const [previewValue, setPreviewValue] = useState<PreviewSize>(resolvedPreviewValue);
  const [storagePathValue, setStoragePathValue] = useState<string>(resolvedStoragePath);
  const [weekendColumnPercentValue, setWeekendColumnPercentValue] = useState<string>(String(resolvedWeekendColumnPercent));
  const [weekScrollRangeValue, setWeekScrollRangeValue] = useState<string>(String(resolvedWeekScrollRange));
  const [monthScrollRangeValue, setMonthScrollRangeValue] = useState<string>(String(resolvedMonthScrollRange));
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [weekendError, setWeekendError] = useState<string | null>(null);
  const [weekScrollRangeError, setWeekScrollRangeError] = useState<string | null>(null);
  const [monthScrollRangeError, setMonthScrollRangeError] = useState<string | null>(null);
  const [previewSaved, setPreviewSaved] = useState(false);
  const [storageSaved, setStorageSaved] = useState(false);
  const [weekendSaved, setWeekendSaved] = useState(false);
  const [weekScrollRangeSaved, setWeekScrollRangeSaved] = useState(false);
  const [monthScrollRangeSaved, setMonthScrollRangeSaved] = useState(false);

  useEffect(() => {
    setPreviewValue(resolvedPreviewValue);
  }, [resolvedPreviewValue]);

  useEffect(() => {
    setStoragePathValue(resolvedStoragePath);
  }, [resolvedStoragePath]);

  useEffect(() => {
    setWeekendColumnPercentValue(String(resolvedWeekendColumnPercent));
  }, [resolvedWeekendColumnPercent]);

  useEffect(() => {
    setWeekScrollRangeValue(String(resolvedWeekScrollRange));
  }, [resolvedWeekScrollRange]);

  useEffect(() => {
    setMonthScrollRangeValue(String(resolvedMonthScrollRange));
  }, [resolvedMonthScrollRange]);

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

  const handleSaveWeekendColumnPercent = async () => {
    setWeekendError(null);
    setWeekendSaved(false);
    const parsed = Number(weekendColumnPercentValue);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      setWeekendError("Bitte eine ganze Zahl von 1 bis 100 eingeben.");
      return;
    }

    try {
      await setSetting({
        key: "calendarWeekendColumnPercent",
        scopeType: "GLOBAL",
        value: parsed,
      });
      setWeekendSaved(true);
    } catch (error) {
      setWeekendError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const handleSaveWeekScrollRange = async () => {
    setWeekScrollRangeError(null);
    setWeekScrollRangeSaved(false);
    const parsed = Number(weekScrollRangeValue);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 12) {
      setWeekScrollRangeError("Bitte eine ganze Zahl von 0 bis 12 eingeben.");
      return;
    }

    try {
      await setSetting({
        key: "calendarWeekScrollRange",
        scopeType: "GLOBAL",
        value: parsed,
      });
      setWeekScrollRangeSaved(true);
    } catch (error) {
      setWeekScrollRangeError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const handleSaveMonthScrollRange = async () => {
    setMonthScrollRangeError(null);
    setMonthScrollRangeSaved(false);
    const parsed = Number(monthScrollRangeValue);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 12) {
      setMonthScrollRangeError("Bitte eine ganze Zahl von 0 bis 12 eingeben.");
      return;
    }

    try {
      await setSetting({
        key: "calendarMonthScrollRange",
        scopeType: "GLOBAL",
        value: parsed,
      });
      setMonthScrollRangeSaved(true);
    } catch (error) {
      setMonthScrollRangeError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  return (
    <div className="h-full rounded-lg border-2 border-foreground bg-white p-6" data-testid="settings-landing-page">
      <h3 className="text-xl font-black uppercase tracking-tight text-primary">Einstellungen</h3>
      <p className="mb-5 mt-1 text-sm text-slate-500">Direkte Bearbeitung globaler und benutzerspezifischer Settings.</p>

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

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-calendarWeekendColumnPercent">
          <p className="font-semibold text-slate-900">{weekendWidthSetting?.label ?? "Kalender Wochenende Breite (%)"}</p>
          <p className="mb-3 text-xs text-slate-500">{weekendWidthSetting?.description ?? "Breite von Samstag/Sonntag relativ zu Werktagen."}</p>

          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={100}
              step={1}
              value={weekendColumnPercentValue}
              onChange={(event) => setWeekendColumnPercentValue(event.target.value)}
              data-testid="input-setting-calendarWeekendColumnPercent"
            />
            <Button onClick={() => void handleSaveWeekendColumnPercent()} disabled={isSaving} data-testid="button-save-calendarWeekendColumnPercent">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(weekendWidthSetting?.resolvedValue ?? defaultWeekendColumnPercent)} ({weekendWidthSetting?.resolvedScope ?? "-"})</p>
          {weekendSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {weekendError && <p className="mt-1 text-xs text-destructive">{weekendError}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-calendarWeekScrollRange">
          <p className="font-semibold text-slate-900">{weekScrollRangeSetting?.label ?? "Scrollbereich Wochen"}</p>
          <p className="mb-3 text-xs text-slate-500">{weekScrollRangeSetting?.description ?? "Anzahl zusaetzlicher Wochen im horizontalen Kalender-Scrollbereich."}</p>

          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={12}
              step={1}
              value={weekScrollRangeValue}
              onChange={(event) => setWeekScrollRangeValue(event.target.value)}
              data-testid="input-setting-calendarWeekScrollRange"
            />
            <Button onClick={() => void handleSaveWeekScrollRange()} disabled={isSaving} data-testid="button-save-calendarWeekScrollRange">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(weekScrollRangeSetting?.resolvedValue ?? defaultWeekScrollRange)} ({weekScrollRangeSetting?.resolvedScope ?? "-"})</p>
          {weekScrollRangeSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {weekScrollRangeError && <p className="mt-1 text-xs text-destructive">{weekScrollRangeError}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-calendarMonthScrollRange">
          <p className="font-semibold text-slate-900">{monthScrollRangeSetting?.label ?? "Scrollbereich Monate"}</p>
          <p className="mb-3 text-xs text-slate-500">{monthScrollRangeSetting?.description ?? "Anzahl zusaetzlicher Monate im horizontalen Kalender-Scrollbereich."}</p>

          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={12}
              step={1}
              value={monthScrollRangeValue}
              onChange={(event) => setMonthScrollRangeValue(event.target.value)}
              data-testid="input-setting-calendarMonthScrollRange"
            />
            <Button onClick={() => void handleSaveMonthScrollRange()} disabled={isSaving} data-testid="button-save-calendarMonthScrollRange">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(monthScrollRangeSetting?.resolvedValue ?? defaultMonthScrollRange)} ({monthScrollRangeSetting?.resolvedScope ?? "-"})</p>
          {monthScrollRangeSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {monthScrollRangeError && <p className="mt-1 text-xs text-destructive">{monthScrollRangeError}</p>}
        </div>
      </div>
    </div>
  );
}
