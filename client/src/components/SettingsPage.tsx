import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { SaunaTourImportPreviewPanel } from "@/components/settings/SaunaTourImportPreviewPanel";

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
const helpTextPreviewOptions = ["small", "medium", "large"] as const;
type HelpTextPreviewSize = (typeof helpTextPreviewOptions)[number];
const toastDesktopPositionOptions = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
type ToastDesktopPosition = (typeof toastDesktopPositionOptions)[number];
const defaultWeekendColumnPercent = 33;
const defaultWeekScrollRange = 4;
const defaultMonthScrollRange = 3;
const defaultHoverPreviewOpenDelayMs = 380;
const defaultCardListColumns = 4;
const defaultToastDesktopPosition: ToastDesktopPosition = "bottom-right";

type BackupLogRow = {
  id: number;
  createdAt: string;
  status: "success" | "error" | "skipped";
  errorMessage: string | null;
  exportedRecordCount: number;
  filePath: string | null;
};

function parseBackupFileRefs(filePathRaw: string | null): { excelPath?: string; pdfPath?: string } {
  if (!filePathRaw) return {};
  try {
    const parsed = JSON.parse(filePathRaw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const candidate = parsed as { excelPath?: unknown; pdfPath?: unknown };
    return {
      excelPath: typeof candidate.excelPath === "string" ? candidate.excelPath : undefined,
      pdfPath: typeof candidate.pdfPath === "string" ? candidate.pdfPath : undefined,
    };
  } catch {
    return {};
  }
}

export function SettingsPage() {
  const { settingsByKey, isLoading, isError, errorMessage, retry, setSetting, isSaving } = useSettings();
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";

  const previewSetting = settingsByKey.get("attachmentPreviewSize");
  const helpTextPreviewSetting = settingsByKey.get("helpTextPreviewSize");
  const toastDesktopPositionSetting = settingsByKey.get("toastDesktopPosition");
  const weekendWidthSetting = settingsByKey.get("calendarWeekendColumnPercent");
  const weekScrollRangeSetting = settingsByKey.get("calendarWeekScrollRange");
  const monthScrollRangeSetting = settingsByKey.get("calendarMonthScrollRange");
  const hoverPreviewOpenDelaySetting = settingsByKey.get("hoverPreviewOpenDelayMs");
  const cardListColumnsSetting = settingsByKey.get("cardListColumns");
  const backupEnabledSetting = settingsByKey.get("backup_enabled");
  const authTwoFactorEnabledSetting = settingsByKey.get("auth_two_factor_enabled");

  const backupsQuery = useQuery<BackupLogRow[]>({
    queryKey: [api.backups.listLogs.path],
    queryFn: async () => {
      const response = await fetch(api.backups.listLogs.path, {
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Backups konnten nicht geladen werden");
      }
      return response.json();
    },
  });

  const resolvedPreviewValue = useMemo(() => {
    const value = previewSetting?.resolvedValue;
    if (value === "small" || value === "medium" || value === "large") {
      return value;
    }
    return "medium" as PreviewSize;
  }, [previewSetting?.resolvedValue]);

  const resolvedHelpTextPreviewValue = useMemo(() => {
    const value = helpTextPreviewSetting?.resolvedValue;
    if (value === "small" || value === "medium" || value === "large") {
      return value;
    }
    return "medium" as HelpTextPreviewSize;
  }, [helpTextPreviewSetting?.resolvedValue]);

  const resolvedToastDesktopPosition = useMemo(() => {
    const value = toastDesktopPositionSetting?.resolvedValue;
    if (value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right") {
      return value;
    }
    return defaultToastDesktopPosition;
  }, [toastDesktopPositionSetting?.resolvedValue]);

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

  const resolvedHoverPreviewOpenDelay = useMemo(() => {
    const value = hoverPreviewOpenDelaySetting?.resolvedValue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2000) {
      return value;
    }
    return defaultHoverPreviewOpenDelayMs;
  }, [hoverPreviewOpenDelaySetting?.resolvedValue]);

  const resolvedCardListColumns = useMemo(() => {
    const value = cardListColumnsSetting?.resolvedValue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 2 && value <= 6) {
      return value;
    }
    return defaultCardListColumns;
  }, [cardListColumnsSetting?.resolvedValue]);

  const resolvedBackupEnabled = useMemo(() => {
    const value = backupEnabledSetting?.resolvedValue;
    return typeof value === "boolean" ? value : true;
  }, [backupEnabledSetting?.resolvedValue]);
  const resolvedAuthTwoFactorEnabled = useMemo(() => {
    const value = authTwoFactorEnabledSetting?.resolvedValue;
    return typeof value === "boolean" ? value : false;
  }, [authTwoFactorEnabledSetting?.resolvedValue]);

  const [previewValue, setPreviewValue] = useState<PreviewSize>(resolvedPreviewValue);
  const [helpTextPreviewValue, setHelpTextPreviewValue] = useState<HelpTextPreviewSize>(resolvedHelpTextPreviewValue);
  const [toastDesktopPositionValue, setToastDesktopPositionValue] = useState<ToastDesktopPosition>(resolvedToastDesktopPosition);
  const [weekendColumnPercentValue, setWeekendColumnPercentValue] = useState<string>(String(resolvedWeekendColumnPercent));
  const [weekScrollRangeValue, setWeekScrollRangeValue] = useState<string>(String(resolvedWeekScrollRange));
  const [monthScrollRangeValue, setMonthScrollRangeValue] = useState<string>(String(resolvedMonthScrollRange));
  const [hoverPreviewOpenDelayValue, setHoverPreviewOpenDelayValue] = useState<string>(String(resolvedHoverPreviewOpenDelay));
  const [cardListColumnsValue, setCardListColumnsValue] = useState<string>(String(resolvedCardListColumns));
  const [backupEnabledValue, setBackupEnabledValue] = useState<boolean>(resolvedBackupEnabled);
  const [authTwoFactorEnabledValue, setAuthTwoFactorEnabledValue] = useState<boolean>(resolvedAuthTwoFactorEnabled);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [helpTextPreviewError, setHelpTextPreviewError] = useState<string | null>(null);
  const [toastDesktopPositionError, setToastDesktopPositionError] = useState<string | null>(null);
  const [weekendError, setWeekendError] = useState<string | null>(null);
  const [weekScrollRangeError, setWeekScrollRangeError] = useState<string | null>(null);
  const [monthScrollRangeError, setMonthScrollRangeError] = useState<string | null>(null);
  const [hoverPreviewOpenDelayError, setHoverPreviewOpenDelayError] = useState<string | null>(null);
  const [cardListColumnsError, setCardListColumnsError] = useState<string | null>(null);
  const [backupEnabledError, setBackupEnabledError] = useState<string | null>(null);
  const [authTwoFactorEnabledError, setAuthTwoFactorEnabledError] = useState<string | null>(null);
  const [previewSaved, setPreviewSaved] = useState(false);
  const [helpTextPreviewSaved, setHelpTextPreviewSaved] = useState(false);
  const [toastDesktopPositionSaved, setToastDesktopPositionSaved] = useState(false);
  const [weekendSaved, setWeekendSaved] = useState(false);
  const [weekScrollRangeSaved, setWeekScrollRangeSaved] = useState(false);
  const [monthScrollRangeSaved, setMonthScrollRangeSaved] = useState(false);
  const [hoverPreviewOpenDelaySaved, setHoverPreviewOpenDelaySaved] = useState(false);
  const [cardListColumnsSaved, setCardListColumnsSaved] = useState(false);
  const [backupEnabledSaved, setBackupEnabledSaved] = useState(false);
  const [authTwoFactorEnabledSaved, setAuthTwoFactorEnabledSaved] = useState(false);
  const [isRunningBackupNow, setIsRunningBackupNow] = useState(false);
  const [backupRunInfo, setBackupRunInfo] = useState<string | null>(null);
  const [backupRunError, setBackupRunError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewValue(resolvedPreviewValue);
  }, [resolvedPreviewValue]);

  useEffect(() => {
    setHelpTextPreviewValue(resolvedHelpTextPreviewValue);
  }, [resolvedHelpTextPreviewValue]);

  useEffect(() => {
    setToastDesktopPositionValue(resolvedToastDesktopPosition);
  }, [resolvedToastDesktopPosition]);

  useEffect(() => {
    setWeekendColumnPercentValue(String(resolvedWeekendColumnPercent));
  }, [resolvedWeekendColumnPercent]);

  useEffect(() => {
    setWeekScrollRangeValue(String(resolvedWeekScrollRange));
  }, [resolvedWeekScrollRange]);

  useEffect(() => {
    setMonthScrollRangeValue(String(resolvedMonthScrollRange));
  }, [resolvedMonthScrollRange]);

  useEffect(() => {
    setHoverPreviewOpenDelayValue(String(resolvedHoverPreviewOpenDelay));
  }, [resolvedHoverPreviewOpenDelay]);

  useEffect(() => {
    setCardListColumnsValue(String(resolvedCardListColumns));
  }, [resolvedCardListColumns]);

  useEffect(() => {
    setBackupEnabledValue(resolvedBackupEnabled);
  }, [resolvedBackupEnabled]);

  useEffect(() => {
    setAuthTwoFactorEnabledValue(resolvedAuthTwoFactorEnabled);
  }, [resolvedAuthTwoFactorEnabled]);

  if (isLoading) {
    return (
      <div className="h-full rounded-lg border-2 border-foreground bg-white p-6">
        <h3 className="mb-4 text-xl font-black tracking-tight text-primary">Einstellungen</h3>
        <p className="text-sm text-slate-500">Einstellungen werden geladen...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full rounded-lg border-2 border-foreground bg-white p-6">
        <h3 className="mb-4 text-xl font-black tracking-tight text-primary">Einstellungen</h3>
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

  const handleSaveHelpTextPreview = async () => {
    setHelpTextPreviewError(null);
    setHelpTextPreviewSaved(false);
    try {
      await setSetting({
        key: "helpTextPreviewSize",
        scopeType: "USER",
        value: helpTextPreviewValue,
      });
      setHelpTextPreviewSaved(true);
    } catch (error) {
      setHelpTextPreviewError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const handleSaveToastDesktopPosition = async () => {
    setToastDesktopPositionError(null);
    setToastDesktopPositionSaved(false);
    try {
      await setSetting({
        key: "toastDesktopPosition",
        scopeType: "GLOBAL",
        value: toastDesktopPositionValue,
      });
      setToastDesktopPositionSaved(true);
    } catch (error) {
      setToastDesktopPositionError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
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

  const handleSaveHoverPreviewOpenDelay = async () => {
    setHoverPreviewOpenDelayError(null);
    setHoverPreviewOpenDelaySaved(false);
    const parsed = Number(hoverPreviewOpenDelayValue);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2000) {
      setHoverPreviewOpenDelayError("Bitte eine ganze Zahl von 0 bis 2000 eingeben.");
      return;
    }

    try {
      await setSetting({
        key: "hoverPreviewOpenDelayMs",
        scopeType: "GLOBAL",
        value: parsed,
      });
      setHoverPreviewOpenDelaySaved(true);
    } catch (error) {
      setHoverPreviewOpenDelayError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const handleSaveCardListColumns = async () => {
    setCardListColumnsError(null);
    setCardListColumnsSaved(false);
    const parsed = Number(cardListColumnsValue);
    if (!Number.isInteger(parsed) || parsed < 2 || parsed > 6) {
      setCardListColumnsError("Bitte eine ganze Zahl von 2 bis 6 eingeben.");
      return;
    }

    try {
      await setSetting({
        key: "cardListColumns",
        scopeType: "USER",
        value: parsed,
      });
      setCardListColumnsSaved(true);
    } catch (error) {
      setCardListColumnsError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const handleSaveBackupEnabled = async () => {
    setBackupEnabledError(null);
    setBackupEnabledSaved(false);
    try {
      await setSetting({
        key: "backup_enabled",
        scopeType: "GLOBAL",
        value: backupEnabledValue,
      });
      setBackupEnabledSaved(true);
      void backupsQuery.refetch();
    } catch (error) {
      setBackupEnabledError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const handleSaveAuthTwoFactorEnabled = async () => {
    setAuthTwoFactorEnabledError(null);
    setAuthTwoFactorEnabledSaved(false);
    try {
      await setSetting({
        key: "auth_two_factor_enabled",
        scopeType: "GLOBAL",
        value: authTwoFactorEnabledValue,
      });
      setAuthTwoFactorEnabledSaved(true);
    } catch (error) {
      setAuthTwoFactorEnabledError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const backupRows = backupsQuery.data ?? [];

  const handleRunBackupNow = async () => {
    setBackupRunInfo(null);
    setBackupRunError(null);
    setIsRunningBackupNow(true);
    try {
      const response = await fetch(api.backups.runNow.path, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Backup-Lauf konnte nicht gestartet werden");
      }
      const payload = await response.json() as {
        status: "success" | "error" | "skipped";
        reason?: string | null;
        cleanupDeletedCount?: number;
      };
      const base = payload.status === "success"
        ? "Backup erfolgreich erzeugt."
        : payload.status === "skipped"
          ? "Backup-Lauf uebersprungen."
          : "Backup-Lauf mit Fehler beendet.";
      const reason = payload.reason ? ` Grund: ${payload.reason}.` : "";
      const cleanup = typeof payload.cleanupDeletedCount === "number"
        ? ` Retention geloeschte Dateien: ${payload.cleanupDeletedCount}.`
        : "";
      setBackupRunInfo(`${base}${reason}${cleanup}`);
      await backupsQuery.refetch();
    } catch (error) {
      setBackupRunError(error instanceof Error ? error.message : "Backup-Lauf fehlgeschlagen");
    } finally {
      setIsRunningBackupNow(false);
    }
  };

  return (
    <div className="h-full min-h-0 rounded-lg border-2 border-foreground bg-white p-6 flex flex-col" data-testid="settings-landing-page">
      <h3 className="text-xl font-black tracking-tight text-primary">Einstellungen</h3>
      <p className="mb-5 mt-1 text-sm text-slate-500">Direkte Bearbeitung globaler und benutzerspezifischer Settings.</p>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="settings-group-other">
            <h4 className="font-bold text-slate-900">Weitere Einstellungen</h4>
            <p className="mt-1 text-xs text-slate-500">Allgemeine Oberflaechen- und Verhaltensoptionen.</p>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-attachmentPreviewSize">
          <p className="font-semibold text-slate-900">{previewSetting?.label ?? "Datei Vorschau Groesse"}</p>
          <p className="mb-3 text-xs text-slate-500">{previewSetting?.description ?? "Steuert die Groesse der Dateivorschau."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <select
              value={previewValue}
              onChange={(event) => setPreviewValue(event.target.value as PreviewSize)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
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

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-helpTextPreviewSize">
          <p className="font-semibold text-slate-900">{helpTextPreviewSetting?.label ?? "Hilfetext Vorschau Groesse"}</p>
          <p className="mb-3 text-xs text-slate-500">{helpTextPreviewSetting?.description ?? "Steuert die Groesse von Hilfetext-Previews."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <select
              value={helpTextPreviewValue}
              onChange={(event) => setHelpTextPreviewValue(event.target.value as HelpTextPreviewSize)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              data-testid="select-setting-helpTextPreviewSize"
            >
              {helpTextPreviewOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button onClick={() => void handleSaveHelpTextPreview()} disabled={isSaving} data-testid="button-save-helpTextPreviewSize">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(helpTextPreviewSetting?.resolvedValue ?? "medium")} ({helpTextPreviewSetting?.resolvedScope ?? "-"})</p>
          {helpTextPreviewSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {helpTextPreviewError && <p className="mt-1 text-xs text-destructive">{helpTextPreviewError}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-toastDesktopPosition">
          <p className="font-semibold text-slate-900">{toastDesktopPositionSetting?.label ?? "Toast Position Desktop"}</p>
          <p className="mb-3 text-xs text-slate-500">{toastDesktopPositionSetting?.description ?? "Steuert die Position von Info-Popups auf Desktop."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <select
              value={toastDesktopPositionValue}
              onChange={(event) => setToastDesktopPositionValue(event.target.value as ToastDesktopPosition)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              data-testid="select-setting-toastDesktopPosition"
            >
              {toastDesktopPositionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button onClick={() => void handleSaveToastDesktopPosition()} disabled={isSaving} data-testid="button-save-toastDesktopPosition">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(toastDesktopPositionSetting?.resolvedValue ?? defaultToastDesktopPosition)} ({toastDesktopPositionSetting?.resolvedScope ?? "-"})</p>
          {toastDesktopPositionSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {toastDesktopPositionError && <p className="mt-1 text-xs text-destructive">{toastDesktopPositionError}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-hoverPreviewOpenDelayMs">
          <p className="font-semibold text-slate-900">{hoverPreviewOpenDelaySetting?.label ?? "Hover Vorschau Verzoegerung (ms)"}</p>
          <p className="mb-3 text-xs text-slate-500">{hoverPreviewOpenDelaySetting?.description ?? "Verzoegerung bis Hover-Previews geoeffnet werden."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <Input
              type="number"
              min={0}
              max={2000}
              step={1}
              value={hoverPreviewOpenDelayValue}
              onChange={(event) => setHoverPreviewOpenDelayValue(event.target.value)}
              data-testid="input-setting-hoverPreviewOpenDelayMs"
            />
            <Button onClick={() => void handleSaveHoverPreviewOpenDelay()} disabled={isSaving} data-testid="button-save-hoverPreviewOpenDelayMs">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(hoverPreviewOpenDelaySetting?.resolvedValue ?? defaultHoverPreviewOpenDelayMs)} ({hoverPreviewOpenDelaySetting?.resolvedScope ?? "-"})</p>
          {hoverPreviewOpenDelaySaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {hoverPreviewOpenDelayError && <p className="mt-1 text-xs text-destructive">{hoverPreviewOpenDelayError}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-cardListColumns">
          <p className="font-semibold text-slate-900">{cardListColumnsSetting?.label ?? "Karten Spalten"}</p>
          <p className="mb-3 text-xs text-slate-500">{cardListColumnsSetting?.description ?? "Anzahl der Spalten in Kartenlisten."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <Input
              type="number"
              min={2}
              max={6}
              step={1}
              value={cardListColumnsValue}
              onChange={(event) => setCardListColumnsValue(event.target.value)}
              data-testid="input-setting-cardListColumns"
            />
            <Button onClick={() => void handleSaveCardListColumns()} disabled={isSaving} data-testid="button-save-cardListColumns">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(cardListColumnsSetting?.resolvedValue ?? defaultCardListColumns)} ({cardListColumnsSetting?.resolvedScope ?? "-"})</p>
          {cardListColumnsSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {cardListColumnsError && <p className="mt-1 text-xs text-destructive">{cardListColumnsError}</p>}
        </div>

            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="settings-group-calendar">
            <h4 className="font-bold text-slate-900">Kalendereinstellungen</h4>
            <p className="mt-1 text-xs text-slate-500">Konfigurationen fuer Kalenderansichten und Navigation.</p>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-calendarWeekendColumnPercent">
          <p className="font-semibold text-slate-900">{weekendWidthSetting?.label ?? "Kalender Wochenende Breite (%)"}</p>
          <p className="mb-3 text-xs text-slate-500">{weekendWidthSetting?.description ?? "Breite von Samstag/Sonntag relativ zu Werktagen."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
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

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
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

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
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
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="settings-group-backups">
            {isAdmin ? (
              <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-auth-two-factor-enabled">
                <p className="font-semibold text-slate-900">{authTwoFactorEnabledSetting?.label ?? "2FA global aktiv"}</p>
                <p className="mb-3 text-xs text-slate-500">
                  {authTwoFactorEnabledSetting?.description ?? "Aktiviert die verpflichtende Zwei-Faktor-Anmeldung fuer alle Benutzer."}
                </p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="flex h-10 items-center gap-3">
                    <Switch
                      checked={authTwoFactorEnabledValue}
                      onCheckedChange={setAuthTwoFactorEnabledValue}
                      data-testid="switch-setting-auth-two-factor-enabled"
                    />
                    <span className="text-sm text-slate-700">{authTwoFactorEnabledValue ? "Aktiv" : "Deaktiviert"}</span>
                  </div>
                  <Button
                    onClick={() => void handleSaveAuthTwoFactorEnabled()}
                    disabled={isSaving}
                    data-testid="button-save-auth-two-factor-enabled"
                  >
                    Speichern
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Wirksam: {stringifyValue(authTwoFactorEnabledSetting?.resolvedValue ?? false)} ({authTwoFactorEnabledSetting?.resolvedScope ?? "-"})
                </p>
                <p className="mt-1 text-xs text-slate-500">Default: deaktiviert. Die Aenderung wirkt fuer alle künftigen Logins.</p>
                {authTwoFactorEnabledSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                {authTwoFactorEnabledError && <p className="mt-1 text-xs text-destructive">{authTwoFactorEnabledError}</p>}
              </div>
            ) : null}

            <h4 className="font-bold text-slate-900">Backups</h4>
            <p className="mt-1 text-xs text-slate-500">Steuerung und Monitoring aller Backup-Funktionen.</p>

            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-backup-enabled">
          <p className="font-semibold text-slate-900">{backupEnabledSetting?.label ?? "Backups aktiv"}</p>
          <p className="mb-3 text-xs text-slate-500">{backupEnabledSetting?.description ?? "Aktiviert den automatischen Backup-Job."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex h-10 items-center gap-3">
              <Switch
                checked={backupEnabledValue}
                onCheckedChange={setBackupEnabledValue}
                data-testid="switch-setting-backup-enabled"
              />
              <span className="text-sm text-slate-700">{backupEnabledValue ? "Aktiv" : "Deaktiviert"}</span>
            </div>
            <Button onClick={() => void handleSaveBackupEnabled()} disabled={isSaving} data-testid="button-save-backup-enabled">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">
            Wirksam: {stringifyValue(backupEnabledSetting?.resolvedValue ?? true)} ({backupEnabledSetting?.resolvedScope ?? "-"})
          </p>
          {backupEnabledSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {backupEnabledError && <p className="mt-1 text-xs text-destructive">{backupEnabledError}</p>}
        </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4" data-testid="backups-monitoring-table">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-slate-900">Backups (Read-Only Monitoring)</p>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => void handleRunBackupNow()}
                disabled={isRunningBackupNow}
                data-testid="button-backups-run-now"
              >
                {isRunningBackupNow ? "Backup laeuft..." : "Backup jetzt erzeugen"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void backupsQuery.refetch()} data-testid="button-backups-refresh">
                Aktualisieren
              </Button>
            </div>
          </div>
          {backupRunInfo && <p className="mb-2 text-xs text-emerald-700">{backupRunInfo}</p>}
          {backupRunError && <p className="mb-2 text-xs text-destructive">{backupRunError}</p>}

          {backupsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Backups werden geladen...</p>
          ) : backupsQuery.isError ? (
            <p className="text-sm text-destructive">Backups konnten nicht geladen werden.</p>
          ) : backupRows.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine Backup-Eintraege vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" data-testid="table-backup-logs">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-2 py-2">Created</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Fehlermeldung</th>
                    <th className="px-2 py-2">Anzahl exportierter Datensaetze</th>
                    <th className="px-2 py-2">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {backupRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100" data-testid={`backup-row-${row.id}`}>
                      <td className="px-2 py-2">{new Date(row.createdAt).toLocaleString("de-DE")}</td>
                      <td className="px-2 py-2">{row.status}</td>
                      <td className="px-2 py-2">{row.errorMessage ?? "-"}</td>
                      <td className="px-2 py-2">{row.exportedRecordCount}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          {parseBackupFileRefs(row.filePath).excelPath ? (
                            <a href={`/api/admin/backups/${row.id}/download/excel`} className="underline text-primary" data-testid={`backup-download-excel-${row.id}`}>
                              Excel
                            </a>
                          ) : (
                            <span className="text-slate-400">Excel</span>
                          )}
                          {parseBackupFileRefs(row.filePath).pdfPath ? (
                            <a href={`/api/admin/backups/${row.id}/download/pdf`} className="underline text-primary" data-testid={`backup-download-pdf-${row.id}`}>
                              PDF
                            </a>
                          ) : (
                            <span className="text-slate-400">PDF</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </div>
          </section>

          <SaunaTourImportPreviewPanel />

        </div>
      </div>
    </div>
  );
}
