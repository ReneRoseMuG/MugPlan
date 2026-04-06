import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/useSettings";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { AlertTriangle, CheckCheck, MinusCircle } from "lucide-react";

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
const defaultEntityFormShellSidebarWidthPx = 360;
const defaultEntityFormShellContentMaxWidthPx = 760;
const defaultToastDesktopPosition: ToastDesktopPosition = "bottom-right";

type BackupLogRow = {
  id: number;
  createdAt: string;
  status: "success" | "error" | "skipped";
  errorMessage: string | null;
  exportedRecordCount: number;
  filePath: string | null;
};

type DumpListRow = {
  filename: string;
  sizeBytes: number;
  createdAt: string;
};

type DumpImportPreviewRow = {
  fileHash: string;
  dumpId: string;
  targetDatabaseName: string;
  transferReadiness: "ready" | "warning" | "blocked";
  blockingIssues: string[];
  warnings: string[];
  confirmationPhrase: string;
  allowsProductionImport: boolean;
  isLegacyDump: boolean;
  manifestPresent: boolean;
  schemaRevision: string | null;
  expectedTables: Array<{
    key: string;
    rowCount: number;
    sha256: string;
  }>;
  expectedUploads: {
    fileCount: number;
    totalBytes: number;
    sha256: string;
  };
};

type DumpImportApplyRow = {
  transferId: string;
  dumpId: string;
  targetDatabaseName: string;
  targetBackupCreated: boolean;
  verificationPassed: boolean;
  importStatus: "success" | "warning" | "error";
  tablesRestored: number;
  uploadsRestored: boolean;
  durationMs: number;
  warnings: string[];
  blockingIssues: string[];
  journalPath: string;
  targetBackupPath: string | null;
  expectedUploads: {
    fileCount: number;
    totalBytes: number;
    sha256: string;
  };
  verifiedTables: Array<{
    key: string;
    expectedRowCount: number;
    actualRowCount: number;
    matches: boolean;
  }>;
  verifiedUploads: {
    fileCountMatches: boolean;
    totalBytesMatches: boolean;
    sha256Matches: boolean;
  };
};

function parseBackupFileRefs(filePathRaw: string | null): { excelPath?: string; pdfPath?: string; zipPath?: string } {
  if (!filePathRaw) return {};
  try {
    const parsed = JSON.parse(filePathRaw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const candidate = parsed as { excelPath?: unknown; pdfPath?: unknown; zipPath?: unknown };
    return {
      excelPath: typeof candidate.excelPath === "string" ? candidate.excelPath : undefined,
      pdfPath: typeof candidate.pdfPath === "string" ? candidate.pdfPath : undefined,
      zipPath: typeof candidate.zipPath === "string" ? candidate.zipPath : undefined,
    };
  } catch {
    return {};
  }
}

function formatBackupDate(value: string): string {
  return new Date(value).toLocaleDateString("de-DE");
}

function formatBackupScope(value: number): string {
  return `${value} DS`;
}

function BackupStatusIcon({ row }: { row: BackupLogRow }) {
  const title = row.status === "error"
    ? row.errorMessage ?? "Backup fehlgeschlagen"
    : row.status === "skipped"
      ? row.errorMessage === "no_changes"
        ? "Keine Änderungen"
        : row.errorMessage ?? "Backup übersprungen"
      : "Backup erfolgreich";

  if (row.status === "success") {
    return (
      <span title={title}>
        <CheckCheck className="h-4 w-4 text-emerald-600" aria-label="Backup erfolgreich" />
      </span>
    );
  }

  if (row.status === "error") {
    return (
      <span title={title}>
        <AlertTriangle className="h-4 w-4 text-red-600" aria-label="Backup fehlgeschlagen" />
      </span>
    );
  }

  return (
    <span title={title}>
      <MinusCircle className="h-4 w-4 text-sky-600" aria-label="Backup übersprungen" />
    </span>
  );
}

export function SettingsPage() {
  const { settingsByKey, isLoading, isError, errorMessage, retry, setSetting, isSaving } = useSettings();
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const isAdmin = userRole === "ADMIN";

  const previewSetting = settingsByKey.get("attachmentPreviewSize");
  const helpTextPreviewSetting = settingsByKey.get("helpTextPreviewSize");
  const toastDesktopPositionSetting = settingsByKey.get("toastDesktopPosition");
  const entityFormShellSidebarWidthSetting = settingsByKey.get("entityFormShell.sidebarWidthPx");
  const entityFormShellContentMaxWidthSetting = settingsByKey.get("entityFormShell.contentMaxWidthPx");
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

  const dumpsQuery = useQuery<DumpListRow[]>({
    queryKey: [api.dumps.list.path],
    queryFn: async () => {
      const response = await fetch(api.dumps.list.path, { credentials: "include" });
      if (!response.ok) throw new Error("Dump-Liste konnte nicht geladen werden");
      return response.json();
    },
  });

  const resolvedPreviewValue = useMemo(() => {
    const value = previewSetting?.resolvedValue;
    if (value === "small" || value === "medium" || value === "large") {
      return value;
    }
    return "large" as PreviewSize;
  }, [previewSetting?.resolvedValue]);

  const resolvedHelpTextPreviewValue = useMemo(() => {
    const value = helpTextPreviewSetting?.resolvedValue;
    if (value === "small" || value === "medium" || value === "large") {
      return value;
    }
    return "large" as HelpTextPreviewSize;
  }, [helpTextPreviewSetting?.resolvedValue]);

  const resolvedToastDesktopPosition = useMemo(() => {
    const value = toastDesktopPositionSetting?.resolvedValue;
    if (value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right") {
      return value;
    }
    return defaultToastDesktopPosition;
  }, [toastDesktopPositionSetting?.resolvedValue]);

  const resolvedEntityFormShellSidebarWidth = useMemo(() => {
    const value = entityFormShellSidebarWidthSetting?.resolvedValue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 260 && value <= 480) {
      return value;
    }
    return defaultEntityFormShellSidebarWidthPx;
  }, [entityFormShellSidebarWidthSetting?.resolvedValue]);

  const resolvedEntityFormShellContentMaxWidth = useMemo(() => {
    const value = entityFormShellContentMaxWidthSetting?.resolvedValue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 640 && value <= 1100) {
      return value;
    }
    return defaultEntityFormShellContentMaxWidthPx;
  }, [entityFormShellContentMaxWidthSetting?.resolvedValue]);

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
  const [entityFormShellSidebarWidthValue, setEntityFormShellSidebarWidthValue] = useState<string>(String(resolvedEntityFormShellSidebarWidth));
  const [entityFormShellContentMaxWidthValue, setEntityFormShellContentMaxWidthValue] = useState<string>(String(resolvedEntityFormShellContentMaxWidth));
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
  const [entityFormShellSidebarWidthError, setEntityFormShellSidebarWidthError] = useState<string | null>(null);
  const [entityFormShellContentMaxWidthError, setEntityFormShellContentMaxWidthError] = useState<string | null>(null);
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
  const [entityFormShellSidebarWidthSaved, setEntityFormShellSidebarWidthSaved] = useState(false);
  const [entityFormShellContentMaxWidthSaved, setEntityFormShellContentMaxWidthSaved] = useState(false);
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

  const [isDumpCreating, setIsDumpCreating] = useState(false);
  const [dumpCreateError, setDumpCreateError] = useState<string | null>(null);
  const [dumpCreateResult, setDumpCreateResult] = useState<DumpListRow | null>(null);
  const [selectedDumpFile, setSelectedDumpFile] = useState<File | null>(null);
  const [isDumpPreviewLoading, setIsDumpPreviewLoading] = useState(false);
  const [isDumpApplying, setIsDumpApplying] = useState(false);
  const [dumpImportPreview, setDumpImportPreview] = useState<DumpImportPreviewRow | null>(null);
  const [dumpImportResult, setDumpImportResult] = useState<DumpImportApplyRow | null>(null);
  const [dumpImportError, setDumpImportError] = useState<string | null>(null);
  const [dumpConfirmationInput, setDumpConfirmationInput] = useState("");
  const [isDumpDeleting, setIsDumpDeleting] = useState<string | null>(null);
  const isDumpImporting = isDumpPreviewLoading || isDumpApplying;

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
    setEntityFormShellSidebarWidthValue(String(resolvedEntityFormShellSidebarWidth));
  }, [resolvedEntityFormShellSidebarWidth]);

  useEffect(() => {
    setEntityFormShellContentMaxWidthValue(String(resolvedEntityFormShellContentMaxWidth));
  }, [resolvedEntityFormShellContentMaxWidth]);

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

  const handleSaveEntityFormShellSidebarWidth = async () => {
    setEntityFormShellSidebarWidthError(null);
    setEntityFormShellSidebarWidthSaved(false);
    const parsed = Number(entityFormShellSidebarWidthValue);
    if (!Number.isInteger(parsed) || parsed < 260 || parsed > 480) {
      setEntityFormShellSidebarWidthError("Bitte eine ganze Zahl von 260 bis 480 eingeben.");
      return;
    }

    try {
      await setSetting({
        key: "entityFormShell.sidebarWidthPx",
        scopeType: "USER",
        value: parsed,
      });
      setEntityFormShellSidebarWidthSaved(true);
    } catch (error) {
      setEntityFormShellSidebarWidthError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  };

  const handleSaveEntityFormShellContentMaxWidth = async () => {
    setEntityFormShellContentMaxWidthError(null);
    setEntityFormShellContentMaxWidthSaved(false);
    const parsed = Number(entityFormShellContentMaxWidthValue);
    if (!Number.isInteger(parsed) || parsed < 640 || parsed > 1100) {
      setEntityFormShellContentMaxWidthError("Bitte eine ganze Zahl von 640 bis 1100 eingeben.");
      return;
    }

    try {
      await setSetting({
        key: "entityFormShell.contentMaxWidthPx",
        scopeType: "USER",
        value: parsed,
      });
      setEntityFormShellContentMaxWidthSaved(true);
    } catch (error) {
      setEntityFormShellContentMaxWidthError(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
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

  const handleSaveBackupEnabled = async (nextValue: boolean) => {
    setBackupEnabledError(null);
    setBackupEnabledSaved(false);
    setBackupEnabledValue(nextValue);
    try {
      await setSetting({
        key: "backup_enabled",
        scopeType: "GLOBAL",
        value: nextValue,
      });
      setBackupEnabledSaved(true);
      void backupsQuery.refetch();
    } catch (error) {
      setBackupEnabledValue(resolvedBackupEnabled);
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

  const backupRows = (backupsQuery.data ?? []).slice(0, 15);
  const dumpRows = dumpsQuery.data ?? [];

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
          ? "Backup-Lauf übersprungen."
          : "Backup-Lauf mit Fehler beendet.";
      const reason = payload.reason ? ` Grund: ${payload.reason}.` : "";
      const cleanup = typeof payload.cleanupDeletedCount === "number"
        ? ` Retention gelöschte Dateien: ${payload.cleanupDeletedCount}.`
        : "";
      setBackupRunInfo(`${base}${reason}${cleanup}`);
      await backupsQuery.refetch();
    } catch (error) {
      setBackupRunError(error instanceof Error ? error.message : "Backup-Lauf fehlgeschlagen");
    } finally {
      setIsRunningBackupNow(false);
    }
  };

  const handleCreateDump = async () => {
    setDumpCreateError(null);
    setDumpCreateResult(null);
    setIsDumpCreating(true);
    try {
      const response = await fetch(api.dumps.create.path, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Dump konnte nicht erstellt werden");
      const payload = await response.json() as DumpListRow;
      setDumpCreateResult(payload);
      await dumpsQuery.refetch();
    } catch (error) {
      setDumpCreateError(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setIsDumpCreating(false);
    }
  };


  const handleDeleteDump = async (filename: string) => {
    setIsDumpDeleting(filename);
    try {
      const response = await fetch(`/api/admin/dumps/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Dump konnte nicht gelöscht werden");
      await dumpsQuery.refetch();
    } catch {
      // silently ignore — list will still show the file
    } finally {
      setIsDumpDeleting(null);
    }
  };

  const handlePreviewDumpImport = async () => {
    if (!selectedDumpFile) return;
    setDumpImportError(null);
    setDumpConfirmationInput("");
    setDumpImportPreview(null);
    setDumpImportResult(null);
    setIsDumpPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedDumpFile);
      const response = await fetch(api.dumps.importPreview.path, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Import-Vorschau fehlgeschlagen");
      }
      const payload = await response.json() as DumpImportPreviewRow;
      setDumpImportPreview(payload);
    } catch (error) {
      setDumpImportError(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setIsDumpPreviewLoading(false);
    }
  };

  const handleApplyDumpImport = async () => {
    if (!selectedDumpFile || !dumpImportPreview) return;
    setDumpImportError(null);
    setDumpImportResult(null);
    setIsDumpApplying(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedDumpFile);
      formData.append("fileHash", dumpImportPreview.fileHash);
      formData.append("confirmationPhrase", dumpImportPreview.confirmationPhrase);
      formData.append("productionConfirmationText", dumpConfirmationInput);
      const response = await fetch(api.dumps.importApply.path, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Import fehlgeschlagen");
      }
      const payload = await response.json() as DumpImportApplyRow;
      setDumpImportResult(payload);
      await dumpsQuery.refetch();
    } catch (error) {
      setDumpImportError(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setIsDumpApplying(false);
    }
  };

  return (
    <div className="h-full min-h-0 rounded-lg border-2 border-foreground bg-white p-6 flex flex-col" data-testid="settings-landing-page">
      <h3 className="text-xl font-black tracking-tight text-primary">Einstellungen</h3>
      

      <Tabs defaultValue="settings" className="flex min-h-0 flex-1 flex-col" data-testid="settings-tabs">
        <TabsList className="self-start" data-testid="settings-tabs-list">
          <TabsTrigger value="settings" data-testid="tab-settings-general">Einstellungen</TabsTrigger>
          <TabsTrigger value="backup" data-testid="tab-settings-backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="settings-tab-content-general">
          <div className="space-y-4">
            {isAdmin ? (
              <section className="rounded-md border border-slate-200 bg-white p-4" data-testid="settings-group-security">
                <h4 className="font-bold text-slate-900">Sicherheit</h4>
                <p className="mt-1 text-xs text-slate-500">Globale Login- und Zugriffseinstellungen.</p>
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-auth-two-factor-enabled">
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
                  <p className="mt-1 text-xs text-slate-500">Default: deaktiviert. Die Aenderung wirkt fuer alle kuenftigen Logins.</p>
                  {authTwoFactorEnabledSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                  {authTwoFactorEnabledError && <p className="mt-1 text-xs text-destructive">{authTwoFactorEnabledError}</p>}
                </div>
              </section>
            ) : null}
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

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-entityFormShellSidebarWidthPx">
          <p className="font-semibold text-slate-900">{entityFormShellSidebarWidthSetting?.label ?? "Formular Sidebar Breite (px)"}</p>
          <p className="mb-3 text-xs text-slate-500">{entityFormShellSidebarWidthSetting?.description ?? "Steuert die feste Breite der rechten Formular-Sidebar."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <Input
              type="number"
              min={260}
              max={480}
              step={1}
              value={entityFormShellSidebarWidthValue}
              onChange={(event) => setEntityFormShellSidebarWidthValue(event.target.value)}
              data-testid="input-setting-entityFormShellSidebarWidthPx"
            />
            <Button onClick={() => void handleSaveEntityFormShellSidebarWidth()} disabled={isSaving} data-testid="button-save-entityFormShellSidebarWidthPx">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(entityFormShellSidebarWidthSetting?.resolvedValue ?? defaultEntityFormShellSidebarWidthPx)} ({entityFormShellSidebarWidthSetting?.resolvedScope ?? "-"})</p>
          {entityFormShellSidebarWidthSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {entityFormShellSidebarWidthError && <p className="mt-1 text-xs text-destructive">{entityFormShellSidebarWidthError}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-entityFormShellContentMaxWidthPx">
          <p className="font-semibold text-slate-900">{entityFormShellContentMaxWidthSetting?.label ?? "Formular Inhalt Max-Breite (px)"}</p>
          <p className="mb-3 text-xs text-slate-500">{entityFormShellContentMaxWidthSetting?.description ?? "Steuert die maximale Breite des zentrierten Formularinhalts."}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <Input
              type="number"
              min={640}
              max={1100}
              step={1}
              value={entityFormShellContentMaxWidthValue}
              onChange={(event) => setEntityFormShellContentMaxWidthValue(event.target.value)}
              data-testid="input-setting-entityFormShellContentMaxWidthPx"
            />
            <Button onClick={() => void handleSaveEntityFormShellContentMaxWidth()} disabled={isSaving} data-testid="button-save-entityFormShellContentMaxWidthPx">
              Speichern
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-600">Wirksam: {stringifyValue(entityFormShellContentMaxWidthSetting?.resolvedValue ?? defaultEntityFormShellContentMaxWidthPx)} ({entityFormShellContentMaxWidthSetting?.resolvedScope ?? "-"})</p>
          {entityFormShellContentMaxWidthSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
          {entityFormShellContentMaxWidthError && <p className="mt-1 text-xs text-destructive">{entityFormShellContentMaxWidthError}</p>}
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

          </div>
        </TabsContent>

        <TabsContent value="backup" className="mt-4 min-h-0 flex-1 overflow-hidden pr-1" data-testid="settings-tab-content-backup">

          <div className="flex h-full min-h-0 flex-col gap-4" data-testid="settings-group-backups">
            {false ? (
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
                <p className="mt-1 text-xs text-slate-500">Default: deaktiviert. Die Änderung wirkt für alle künftigen Logins.</p>
                {authTwoFactorEnabledSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                {authTwoFactorEnabledError && <p className="mt-1 text-xs text-destructive">{authTwoFactorEnabledError}</p>}
              </div>
            ) : null}

            <h4 className="hidden">Backups</h4>
            <p className="hidden">Steuerung und Monitoring aller Backup-Funktionen.</p>

            <div className="flex min-h-0 w-full max-w-5xl flex-1 self-center flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="backups-monitoring-table">
          <div className="mb-3">
            <p className="font-semibold text-slate-900">Backups</p>
            <p className="text-xs text-slate-500">Historie der letzten 15 Backup-Läufe inklusive Excel-, PDF- und ZIP-Download.</p>
          </div>
          {backupRunInfo && <p className="mb-2 text-xs text-emerald-700">{backupRunInfo}</p>}
          {backupRunError && <p className="mb-2 text-xs text-destructive">{backupRunError}</p>}

          {backupsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Backups werden geladen...</p>
          ) : backupsQuery.isError ? (
            <p className="text-sm text-destructive">Backups konnten nicht geladen werden.</p>
          ) : backupRows.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine Backup-Einträge vorhanden.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200" data-testid="table-backup-logs-frame">
              <table className="min-w-full text-sm" data-testid="table-backup-logs">
                <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="bg-white px-2 py-2">Datum</th>
                    <th className="bg-white px-2 py-2">Status</th>
                    <th className="bg-white px-2 py-2">Umfang</th>
                    <th className="bg-white px-2 py-2">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {backupRows.map((row) => {
                    const fileRefs = parseBackupFileRefs(row.filePath);
                    return (
                    <tr key={row.id} className="border-b border-slate-100" data-testid={`backup-row-${row.id}`}>
                      <td className="px-2 py-2">{formatBackupDate(row.createdAt)}</td>
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center" title={row.errorMessage ?? undefined}>
                          <BackupStatusIcon row={row} />
                        </span>
                      </td>
                      <td className="px-2 py-2">{formatBackupScope(row.exportedRecordCount)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          {fileRefs.excelPath ? (
                            <a href={`/api/admin/backups/${row.id}/download/excel`} className="underline text-primary" data-testid={`backup-download-excel-${row.id}`}>
                              Excel
                            </a>
                          ) : (
                            <span className="text-slate-400">Excel</span>
                          )}
                          {fileRefs.pdfPath ? (
                            <a href={`/api/admin/backups/${row.id}/download/pdf`} className="underline text-primary" data-testid={`backup-download-pdf-${row.id}`}>
                              PDF
                            </a>
                          ) : (
                            <span className="text-slate-400">PDF</span>
                          )}
                          {fileRefs.zipPath ? (
                            <a href={`/api/admin/backups/${row.id}/download/zip`} className="underline text-primary" data-testid={`backup-download-zip-${row.id}`}>
                              ZIP
                            </a>
                          ) : (
                            <span className="text-slate-400">ZIP</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 bg-slate-50 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                  <tr className="border-t border-slate-200">
                    <td colSpan={4} className="bg-slate-50 px-2 py-2 text-xs font-medium text-slate-600">
                      Einträge: {backupRows.length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t border-slate-200 pt-4" data-testid="backup-controls-container">
            <div className="min-w-[220px]">
              <p className="font-semibold text-slate-900">{backupEnabledSetting?.label ?? "Backups aktiv"}</p>
              
              <div className="flex h-10 items-center gap-3">
                <Switch
                  checked={backupEnabledValue}
                  onCheckedChange={(checked) => void handleSaveBackupEnabled(checked)}
                  data-testid="switch-setting-backup-enabled"
                />
                <span className="text-sm text-slate-700">{backupEnabledValue ? "Aktiv" : "Deaktiviert"}</span>
              </div>
              {backupEnabledSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
              {backupEnabledError && <p className="mt-1 text-xs text-destructive">{backupEnabledError}</p>}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => void handleRunBackupNow()}
                disabled={isRunningBackupNow}
                data-testid="button-backups-run-now"
              >
                {isRunningBackupNow ? "Backup läuft..." : "Backup erzeugen"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void backupsQuery.refetch()} data-testid="button-backups-refresh">
                Aktualisieren
              </Button>
            </div>
          </div>
            </div>
            <div className="sticky bottom-0 z-10 shrink-0 rounded-md border border-slate-200 bg-slate-50 p-4 shadow-[0_-1px_0_0_rgba(226,232,240,1)]" data-testid="dump-import-section">
              <p className="font-semibold text-slate-900">Dump Import</p>
              <p className="mb-1 text-xs text-slate-500">
                ZIP-Dump hochladen, Vorschau prüfen und erst danach mit Sicherheitsphrase anwenden.
              </p>
              <p className="mb-3 text-xs font-medium text-amber-700" data-testid="dump-import-warning">
                Achtung: Der Import überschreibt alle vorhandenen Daten (außer Benutzer und Rollen) unwiderruflich.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    setSelectedDumpFile(e.target.files?.[0] ?? null);
                    setDumpImportPreview(null);
                    setDumpImportResult(null);
                    setDumpImportError(null);
                    setDumpConfirmationInput("");
                  }}
                  data-testid="input-dump-import-file"
                  className="text-sm"
                />
                <Button
                  onClick={() => void handlePreviewDumpImport()}
                  disabled={!selectedDumpFile || isDumpPreviewLoading || isDumpApplying}
                  data-testid="button-dump-import-preview"
                >
                  {isDumpImporting ? "Prüfung läuft..." : "Vorschau prüfen"}
                </Button>
              </div>
              {dumpImportPreview && (
                <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-white p-4" data-testid="dump-import-preview-report">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-slate-900">Status: {dumpImportPreview.transferReadiness}</span>
                    <span>Ziel: {dumpImportPreview.targetDatabaseName}</span>
                    <span>Dump: {dumpImportPreview.dumpId}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 md:grid-cols-3">
                    <div>Tabellen: {dumpImportPreview.expectedTables.length}</div>
                    <div>Upload-Dateien: {dumpImportPreview.expectedUploads.fileCount}</div>
                    <div>Upload-Groesse: {(dumpImportPreview.expectedUploads.totalBytes / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  {dumpImportPreview.warnings.length > 0 && (
                    <div data-testid="dump-import-preview-warnings">
                      <p className="text-xs font-semibold text-amber-700">Warnungen</p>
                      {dumpImportPreview.warnings.map((warning) => (
                        <p key={warning} className="text-xs text-amber-700">{warning}</p>
                      ))}
                    </div>
                  )}
                  {dumpImportPreview.blockingIssues.length > 0 && (
                    <div data-testid="dump-import-preview-blockers">
                      <p className="text-xs font-semibold text-destructive">Blocker</p>
                      {dumpImportPreview.blockingIssues.map((issue) => (
                        <p key={issue} className="text-xs text-destructive">{issue}</p>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-900">Sicherheitsphrase</p>
                    <p className="text-xs text-slate-600" data-testid="dump-import-confirmation-phrase">{dumpImportPreview.confirmationPhrase}</p>
                    <Input
                      value={dumpConfirmationInput}
                      onChange={(event) => setDumpConfirmationInput(event.target.value)}
                      data-testid="input-dump-import-confirmation"
                    />
                    <Button
                      onClick={() => void handleApplyDumpImport()}
                      disabled={
                        isDumpApplying
                        || dumpImportPreview.transferReadiness === "blocked"
                        || dumpConfirmationInput.trim() !== dumpImportPreview.confirmationPhrase
                      }
                      data-testid="button-dump-import-apply"
                    >
                      {isDumpApplying ? "Import laeuft..." : "Import anwenden"}
                    </Button>
                  </div>
                </div>
              )}
              {dumpImportResult && (
                <p className="mt-2 text-xs text-emerald-700" data-testid="dump-import-success">
                  Import abgeschlossen. Tabellen wiederhergestellt: {dumpImportResult.tablesRestored}. Anhänge: {dumpImportResult.uploadsRestored ? "wiederhergestellt" : "nicht enthalten"}.
                </p>
              )}
              {dumpImportResult && (
                <div className="mt-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600" data-testid="dump-import-summary">
                  <p>Status: {dumpImportResult.importStatus}</p>
                  <p>Verifikation: {dumpImportResult.verificationPassed ? "bestanden" : "fehlgeschlagen"}</p>
                  <p>Zielbackup: {dumpImportResult.targetBackupCreated ? "erstellt" : "nicht erstellt"}</p>
                  {dumpImportResult.warnings.map((warning) => (
                    <p key={warning} className="text-amber-700">{warning}</p>
                  ))}
                  {dumpImportResult.blockingIssues.map((issue) => (
                    <p key={issue} className="text-destructive">{issue}</p>
                  ))}
                </div>
              )}
              {dumpImportError && (
                <p className="mt-2 text-xs text-destructive" data-testid="dump-import-error">{dumpImportError}</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="db-dump" className="mt-4 min-h-0 flex-1 overflow-hidden pr-1" data-testid="settings-tab-content-db-dump">
          <div className="flex h-full min-h-0 flex-col gap-4" data-testid="settings-group-dumps">
            <p className="hidden">
              Vollständiger Export und Import aller Anwendungsdaten inkl. Anhänge (außer Benutzer und Rollen).
            </p>

            <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
              {/* Dump erstellen */}
              <div className="shrink-0 rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="dump-create-section">
                <p className="font-semibold text-slate-900">Dump erstellen</p>
                <p className="mb-3 text-xs text-slate-500">
                  Exportiert alle Tabellendaten und den Anhang-Ordner als ZIP-Datei.
                </p>
                <Button
                  onClick={() => void handleCreateDump()}
                  disabled={isDumpCreating}
                  data-testid="button-dump-create"
                >
                  {isDumpCreating ? "Dump wird erstellt..." : "Dump erstellen"}
                </Button>
                {dumpCreateResult && (
                  <p className="mt-2 text-xs text-emerald-700" data-testid="dump-create-success">
                    Dump erstellt: {dumpCreateResult.filename} ({(dumpCreateResult.sizeBytes / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {dumpCreateError && (
                  <p className="mt-2 text-xs text-destructive" data-testid="dump-create-error">{dumpCreateError}</p>
                )}
              </div>

              {/* Dump-Liste */}
              <div className="min-h-0 flex-1 rounded-md border border-slate-200 bg-white p-4" data-testid="dump-list-section">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-slate-900">Vorhandene Dumps</p>
                  <Button variant="outline" size="sm" onClick={() => void dumpsQuery.refetch()} data-testid="button-dumps-refresh">
                    Aktualisieren
                  </Button>
                </div>
                {dumpsQuery.isLoading ? (
                  <p className="text-sm text-slate-500">Dumps werden geladen...</p>
                ) : dumpsQuery.isError ? (
                  <p className="text-sm text-destructive">Dumps konnten nicht geladen werden.</p>
                ) : dumpRows.length === 0 ? (
                  <p className="text-sm text-slate-500">Noch keine Dumps vorhanden.</p>
                ) : (
                  <div className="h-full min-h-0 overflow-auto rounded-md border border-slate-200" data-testid="table-dump-list-frame">
                    <table className="min-w-full text-sm" data-testid="table-dump-list">
                      <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                        <tr className="border-b border-slate-200 text-left">
                          <th className="bg-white px-2 py-2">Erstellt</th>
                          <th className="bg-white px-2 py-2">Groesse</th>
                          <th className="bg-white px-2 py-2">Download</th>
                          <th className="bg-white px-2 py-2">Loeschen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dumpRows.map((row) => (
                          <tr key={row.filename} className="border-b border-slate-100" data-testid={`dump-row-${row.filename}`}>
                            <td className="px-2 py-2">{new Date(row.createdAt).toLocaleString("de-DE")}</td>
                            <td className="px-2 py-2">{(row.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                            <td className="px-2 py-2">
                              <a
                                href={`/api/admin/dumps/${encodeURIComponent(row.filename)}/download`}
                                className="underline text-primary"
                                data-testid={`dump-download-${row.filename}`}
                              >
                                ZIP
                              </a>
                            </td>
                            <td className="px-2 py-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDeleteDump(row.filename)}
                                disabled={isDumpDeleting === row.filename}
                                data-testid={`dump-delete-${row.filename}`}
                              >
                                {isDumpDeleting === row.filename ? "..." : "Loeschen"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="sticky bottom-0 z-10 bg-slate-50 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                        <tr className="border-t border-slate-200">
                          <td colSpan={4} className="bg-slate-50 px-2 py-2 text-xs font-medium text-slate-600">
                            Eintraege: {dumpRows.length}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Import */}
              <div className="sticky bottom-0 z-10 shrink-0 rounded-md border border-slate-200 bg-slate-50 p-4 shadow-[0_-1px_0_0_rgba(226,232,240,1)]" data-testid="dump-import-section">
                <p className="font-semibold text-slate-900">Dump Import</p>
                <p className="mb-1 text-xs text-slate-500">
                  ZIP-Dump hochladen, Vorschau pruefen und erst danach mit Sicherheitsphrase anwenden.
                </p>
                <p className="mb-3 text-xs text-amber-700 font-medium" data-testid="dump-import-warning">
                  Achtung: Der Import überschreibt alle vorhandenen Daten (außer Benutzer und Rollen) unwiderruflich.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      setSelectedDumpFile(e.target.files?.[0] ?? null);
                      setDumpImportPreview(null);
                      setDumpImportResult(null);
                      setDumpImportError(null);
                      setDumpConfirmationInput("");
                    }}
                    data-testid="input-dump-import-file"
                    className="text-sm"
                  />
                  <Button
                    onClick={() => void handlePreviewDumpImport()}
                    disabled={!selectedDumpFile || isDumpPreviewLoading || isDumpApplying}
                    data-testid="button-dump-import-preview"
                  >
                    {isDumpImporting ? "Prüfung läuft..." : "Vorschau prüfen"}
                  </Button>
                </div>
                {dumpImportPreview && (
                  <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-white p-4" data-testid="dump-import-preview-report">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-semibold text-slate-900">Status: {dumpImportPreview.transferReadiness}</span>
                      <span>Ziel: {dumpImportPreview.targetDatabaseName}</span>
                      <span>Dump: {dumpImportPreview.dumpId}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 md:grid-cols-3">
                      <div>Tabellen: {dumpImportPreview.expectedTables.length}</div>
                      <div>Upload-Dateien: {dumpImportPreview.expectedUploads.fileCount}</div>
                      <div>Upload-Groesse: {(dumpImportPreview.expectedUploads.totalBytes / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    {dumpImportPreview.warnings.length > 0 && (
                      <div data-testid="dump-import-preview-warnings">
                        <p className="text-xs font-semibold text-amber-700">Warnungen</p>
                        {dumpImportPreview.warnings.map((warning) => (
                          <p key={warning} className="text-xs text-amber-700">{warning}</p>
                        ))}
                      </div>
                    )}
                    {dumpImportPreview.blockingIssues.length > 0 && (
                      <div data-testid="dump-import-preview-blockers">
                        <p className="text-xs font-semibold text-destructive">Blocker</p>
                        {dumpImportPreview.blockingIssues.map((issue) => (
                          <p key={issue} className="text-xs text-destructive">{issue}</p>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-900">Sicherheitsphrase</p>
                      <p className="text-xs text-slate-600" data-testid="dump-import-confirmation-phrase">{dumpImportPreview.confirmationPhrase}</p>
                      <Input
                        value={dumpConfirmationInput}
                        onChange={(event) => setDumpConfirmationInput(event.target.value)}
                        data-testid="input-dump-import-confirmation"
                      />
                      <Button
                        onClick={() => void handleApplyDumpImport()}
                        disabled={
                          isDumpApplying
                          || dumpImportPreview.transferReadiness === "blocked"
                          || dumpConfirmationInput.trim() !== dumpImportPreview.confirmationPhrase
                        }
                        data-testid="button-dump-import-apply"
                      >
                        {isDumpApplying ? "Import laeuft..." : "Import anwenden"}
                      </Button>
                    </div>
                  </div>
                )}
                {dumpImportResult && (
                  <p className="mt-2 text-xs text-emerald-700" data-testid="dump-import-success">
                    Import abgeschlossen. Tabellen wiederhergestellt: {dumpImportResult.tablesRestored}.
                    Anhänge: {dumpImportResult.uploadsRestored ? "wiederhergestellt" : "nicht enthalten"}.
                  </p>
                )}
                {dumpImportResult && (
                  <div className="mt-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600" data-testid="dump-import-summary">
                    <p>Status: {dumpImportResult.importStatus}</p>
                    <p>Verifikation: {dumpImportResult.verificationPassed ? "bestanden" : "fehlgeschlagen"}</p>
                    <p>Zielbackup: {dumpImportResult.targetBackupCreated ? "erstellt" : "nicht erstellt"}</p>
                    {dumpImportResult.warnings.map((warning) => (
                      <p key={warning} className="text-amber-700">{warning}</p>
                    ))}
                    {dumpImportResult.blockingIssues.map((issue) => (
                      <p key={issue} className="text-destructive">{issue}</p>
                    ))}
                  </div>
                )}
                {dumpImportError && (
                  <p className="mt-2 text-xs text-destructive" data-testid="dump-import-error">{dumpImportError}</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
