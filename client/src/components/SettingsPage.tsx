import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { api } from "@shared/routes";
import { AlertTriangle, CheckCheck, MinusCircle } from "lucide-react";

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

type SystemSeedPreviewItem = {
  key: string;
  kind: "tag" | "tour" | "customer" | "noteTemplate";
  label: string;
  status: "missing" | "unchanged" | "update" | "migrate";
  message: string;
  canApply: boolean;
  checkedByDefault: boolean;
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

async function invalidateSystemSeedQueries(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["/api/tours"] }),
    queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/customers",
    }),
    queryClient.invalidateQueries({ queryKey: ["/api/note-templates"] }),
    queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/tags",
    }),
    invalidateTagProjectionQueries(),
  ]);
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
  const [activePane, setActivePane] = useState<"oberflaeche" | "kalender" | "sicherheit" | "backup">("oberflaeche");
  const [activeBackupTab, setActiveBackupTab] = useState<"backups" | "dumps" | "import">("backups");

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

  const systemSeedPreviewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(api.admin.systemSeedPreview.path, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "System-Seed-Prüfung konnte nicht ausgeführt werden");
      }
      return response.json() as Promise<{ items: SystemSeedPreviewItem[] }>;
    },
    onMutate: () => {
      setSystemSeedError(null);
      setSystemSeedLogLines([]);
    },
    onSuccess: (payload) => {
      setSystemSeedPreviewItems(payload.items);
      setSelectedSystemSeedKeys(payload.items.filter((item) => item.checkedByDefault).map((item) => item.key));
    },
    onError: (error) => {
      setSystemSeedPreviewItems([]);
      setSelectedSystemSeedKeys([]);
      setSystemSeedError(error instanceof Error ? error.message : "System-Seed-Prüfung konnte nicht ausgeführt werden");
    },
  });

  const systemSeedApplyMutation = useMutation({
    mutationFn: async (selectedKeys: string[]) => {
      const response = await fetch(api.admin.systemSeedApply.path, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedKeys }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "System-Seed konnte nicht ausgeführt werden");
      }
      return response.json() as Promise<{ logLines: string[] }>;
    },
    onMutate: () => {
      setSystemSeedError(null);
      setSystemSeedLogLines([]);
    },
    onSuccess: async (payload) => {
      setSystemSeedLogLines(payload.logLines);
      await invalidateSystemSeedQueries();
    },
    onError: (error) => {
      setSystemSeedError(error instanceof Error ? error.message : "System-Seed konnte nicht ausgeführt werden");
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
  const [systemSeedError, setSystemSeedError] = useState<string | null>(null);
  const [systemSeedPreviewItems, setSystemSeedPreviewItems] = useState<SystemSeedPreviewItem[]>([]);
  const [selectedSystemSeedKeys, setSelectedSystemSeedKeys] = useState<string[]>([]);
  const [systemSeedLogLines, setSystemSeedLogLines] = useState<string[]>([]);
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

  const navItemClass = (pane: typeof activePane) =>
    `w-full flex items-center gap-2 px-4 py-1.5 text-sm border-l-2 text-left ${
      activePane === pane
        ? "border-amber-600 text-slate-900 font-medium bg-white"
        : "border-transparent text-slate-600 hover:bg-slate-100"
    }`;

  const innerTabClass = (tab: typeof activeBackupTab) =>
    `px-3.5 py-1.5 text-xs border-b-2 -mb-px cursor-pointer ${
      activeBackupTab === tab
        ? "border-amber-600 text-amber-700 font-medium"
        : "border-transparent text-slate-500 hover:text-slate-700"
    }`;

  const pageTitle = isAdmin ? "Einstellungen" : "Meine Einstellungen";
  const pageIntro = isAdmin
    ? "Benutzerbezogene und systemweite Einstellungen"
    : "Benutzerspezifische Einstellungen für Vorschau, Layout und persönliche Anzeige";

  return (
    <div className="h-full min-h-0 rounded-lg border-2 border-foreground bg-white flex flex-col" data-testid="settings-landing-page">
      <div className="flex min-h-0 flex-1">

        {/* Sidebar */}
        <nav
          className="w-[188px] flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col"
          data-testid="settings-nav"
          aria-label="Einstellungen Navigation"
        >
          <div className="px-4 py-4 border-b border-slate-200">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">{pageTitle}</p>
          </div>

          <div className="py-2">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-4 pt-2 pb-1">Anzeige</p>
            <button
              className={navItemClass("oberflaeche")}
              onClick={() => setActivePane("oberflaeche")}
              data-testid="nav-item-oberflaeche"
              aria-current={activePane === "oberflaeche" ? "page" : undefined}
            >
              Oberfläche
            </button>
            {isAdmin ? (
              <button
                className={navItemClass("kalender")}
                onClick={() => setActivePane("kalender")}
                data-testid="nav-item-kalender"
                aria-current={activePane === "kalender" ? "page" : undefined}
              >
                Kalender
              </button>
            ) : null}
          </div>

          {isAdmin ? (
            <div className="py-2 border-t border-slate-200">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-4 pt-2 pb-1">System</p>
              <button
                className={navItemClass("sicherheit")}
                onClick={() => setActivePane("sicherheit")}
                data-testid="nav-item-sicherheit"
                aria-current={activePane === "sicherheit" ? "page" : undefined}
              >
                Sicherheit
              </button>
              <button
                className={navItemClass("backup")}
                onClick={() => setActivePane("backup")}
                data-testid="nav-item-backup"
                aria-current={activePane === "backup" ? "page" : undefined}
              >
                Backup &amp; Dump
              </button>
            </div>
          ) : null}
        </nav>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="mb-5 pb-3 border-b border-slate-200">
            <h2 className="text-base font-medium text-slate-900">{pageTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">{pageIntro}</p>
          </div>

          {/* ── Oberfläche ── */}
          {activePane === "oberflaeche" && (
            <div data-testid="settings-pane-oberflaeche">
              <div className="mb-5 pb-3 border-b border-slate-200">
                <h2 className="text-base font-medium text-slate-900">Oberfläche</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isAdmin
                    ? "Vorschau, Spalten, Formular-Layout und Toast-Position"
                    : "Vorschau, Spalten und Formular-Layout für deinen Benutzer"}
                </p>
              </div>

              {/* USER settings */}
              <div className="mb-6">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  Benutzerspezifisch
                  <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 tracking-normal normal-case ml-1">USER</span>
                </p>
                <div className="space-y-2">

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-attachmentPreviewSize">
                    <p className="font-semibold text-slate-900 text-sm">{previewSetting?.label ?? "Datei Vorschau Größe"}</p>
                    <p className="mb-3 text-xs text-slate-500">{previewSetting?.description ?? "Steuert die Größe der Dateivorschau."}</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <select
                        value={previewValue}
                        onChange={(event) => setPreviewValue(event.target.value as PreviewSize)}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        data-testid="select-setting-attachmentPreviewSize"
                      >
                        {previewOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={() => void handleSavePreview()} disabled={isSaving} data-testid="button-save-attachmentPreviewSize">
                        Speichern
                      </Button>
                    </div>
                    {previewSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                    {previewError && <p className="mt-1 text-xs text-destructive">{previewError}</p>}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-helpTextPreviewSize">
                    <p className="font-semibold text-slate-900 text-sm">{helpTextPreviewSetting?.label ?? "Hilfetext Vorschau Größe"}</p>
                    <p className="mb-3 text-xs text-slate-500">{helpTextPreviewSetting?.description ?? "Steuert die Größe von Hilfetext-Previews."}</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <select
                        value={helpTextPreviewValue}
                        onChange={(event) => setHelpTextPreviewValue(event.target.value as HelpTextPreviewSize)}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        data-testid="select-setting-helpTextPreviewSize"
                      >
                        {helpTextPreviewOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={() => void handleSaveHelpTextPreview()} disabled={isSaving} data-testid="button-save-helpTextPreviewSize">
                        Speichern
                      </Button>
                    </div>
                    {helpTextPreviewSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                    {helpTextPreviewError && <p className="mt-1 text-xs text-destructive">{helpTextPreviewError}</p>}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-cardListColumns">
                    <p className="font-semibold text-slate-900 text-sm">{cardListColumnsSetting?.label ?? "Karten Spalten"}</p>
                    <p className="mb-3 text-xs text-slate-500">{cardListColumnsSetting?.description ?? "Anzahl der Spalten in Kartenlisten (2–6)."}</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <Input
                        type="number" min={2} max={6} step={1}
                        value={cardListColumnsValue}
                        onChange={(event) => setCardListColumnsValue(event.target.value)}
                        data-testid="input-setting-cardListColumns"
                      />
                      <Button size="sm" onClick={() => void handleSaveCardListColumns()} disabled={isSaving} data-testid="button-save-cardListColumns">
                        Speichern
                      </Button>
                    </div>
                    {cardListColumnsSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                    {cardListColumnsError && <p className="mt-1 text-xs text-destructive">{cardListColumnsError}</p>}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-entityFormShellSidebarWidthPx">
                    <p className="font-semibold text-slate-900 text-sm">{entityFormShellSidebarWidthSetting?.label ?? "Formular Sidebar Breite (px)"}</p>
                    <p className="mb-3 text-xs text-slate-500">{entityFormShellSidebarWidthSetting?.description ?? "Feste Breite der rechten Formular-Sidebar (260–480 px)."}</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <Input
                        type="number" min={260} max={480} step={1}
                        value={entityFormShellSidebarWidthValue}
                        onChange={(event) => setEntityFormShellSidebarWidthValue(event.target.value)}
                        data-testid="input-setting-entityFormShellSidebarWidthPx"
                      />
                      <Button size="sm" onClick={() => void handleSaveEntityFormShellSidebarWidth()} disabled={isSaving} data-testid="button-save-entityFormShellSidebarWidthPx">
                        Speichern
                      </Button>
                    </div>
                    {entityFormShellSidebarWidthSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                    {entityFormShellSidebarWidthError && <p className="mt-1 text-xs text-destructive">{entityFormShellSidebarWidthError}</p>}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-entityFormShellContentMaxWidthPx">
                    <p className="font-semibold text-slate-900 text-sm">{entityFormShellContentMaxWidthSetting?.label ?? "Formular Inhalt Max-Breite (px)"}</p>
                    <p className="mb-3 text-xs text-slate-500">{entityFormShellContentMaxWidthSetting?.description ?? "Maximale Breite des zentrierten Formularinhalts (640–1100 px)."}</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <Input
                        type="number" min={640} max={1100} step={1}
                        value={entityFormShellContentMaxWidthValue}
                        onChange={(event) => setEntityFormShellContentMaxWidthValue(event.target.value)}
                        data-testid="input-setting-entityFormShellContentMaxWidthPx"
                      />
                      <Button size="sm" onClick={() => void handleSaveEntityFormShellContentMaxWidth()} disabled={isSaving} data-testid="button-save-entityFormShellContentMaxWidthPx">
                        Speichern
                      </Button>
                    </div>
                    {entityFormShellContentMaxWidthSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                    {entityFormShellContentMaxWidthError && <p className="mt-1 text-xs text-destructive">{entityFormShellContentMaxWidthError}</p>}
                  </div>

                </div>
              </div>

              {/* GLOBAL settings */}
              {isAdmin ? (
                <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  Global
                  <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300 tracking-normal normal-case ml-1">GLOBAL</span>
                </p>
                <div className="space-y-2">

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-toastDesktopPosition">
                    <p className="font-semibold text-slate-900 text-sm">{toastDesktopPositionSetting?.label ?? "Toast Position Desktop"}</p>
                    <p className="mb-3 text-xs text-slate-500">{toastDesktopPositionSetting?.description ?? "Position von Info-Popups auf Desktop (gilt für alle Nutzer)."}</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <select
                        value={toastDesktopPositionValue}
                        onChange={(event) => setToastDesktopPositionValue(event.target.value as ToastDesktopPosition)}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        data-testid="select-setting-toastDesktopPosition"
                      >
                        {toastDesktopPositionOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={() => void handleSaveToastDesktopPosition()} disabled={isSaving} data-testid="button-save-toastDesktopPosition">
                        Speichern
                      </Button>
                    </div>
                    {toastDesktopPositionSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                    {toastDesktopPositionError && <p className="mt-1 text-xs text-destructive">{toastDesktopPositionError}</p>}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-hoverPreviewOpenDelayMs">
                    <p className="font-semibold text-slate-900 text-sm">{hoverPreviewOpenDelaySetting?.label ?? "Hover Vorschau Verzögerung (ms)"}</p>
                    <p className="mb-3 text-xs text-slate-500">{hoverPreviewOpenDelaySetting?.description ?? "Verzögerung bis Hover-Previews geöffnet werden (0–2000 ms)."}</p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <Input
                        type="number" min={0} max={2000} step={1}
                        value={hoverPreviewOpenDelayValue}
                        onChange={(event) => setHoverPreviewOpenDelayValue(event.target.value)}
                        data-testid="input-setting-hoverPreviewOpenDelayMs"
                      />
                      <Button size="sm" onClick={() => void handleSaveHoverPreviewOpenDelay()} disabled={isSaving} data-testid="button-save-hoverPreviewOpenDelayMs">
                        Speichern
                      </Button>
                    </div>
                    {hoverPreviewOpenDelaySaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                    {hoverPreviewOpenDelayError && <p className="mt-1 text-xs text-destructive">{hoverPreviewOpenDelayError}</p>}
                  </div>

                </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Kalender ── */}
          {activePane === "kalender" && isAdmin && (
            <div data-testid="settings-pane-kalender">
              <div className="mb-5 pb-3 border-b border-slate-200">
                <h2 className="text-base font-medium text-slate-900">Kalender</h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  Konfigurationen für Kalenderansichten und Navigation
                  <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300 tracking-normal normal-case ml-1">GLOBAL</span>
                </p>
              </div>
              <div className="space-y-2">

                <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-calendarWeekendColumnPercent">
                  <p className="font-semibold text-slate-900 text-sm">{weekendWidthSetting?.label ?? "Wochenende Spaltenbreite (%)"}</p>
                  <p className="mb-3 text-xs text-slate-500">{weekendWidthSetting?.description ?? "Breite von Sa/So relativ zu Werktagen (1–100)."}</p>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                    <Input
                      type="number" min={1} max={100} step={1}
                      value={weekendColumnPercentValue}
                      onChange={(event) => setWeekendColumnPercentValue(event.target.value)}
                      data-testid="input-setting-calendarWeekendColumnPercent"
                    />
                    <Button size="sm" onClick={() => void handleSaveWeekendColumnPercent()} disabled={isSaving} data-testid="button-save-calendarWeekendColumnPercent">
                      Speichern
                    </Button>
                  </div>
                  {weekendSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                  {weekendError && <p className="mt-1 text-xs text-destructive">{weekendError}</p>}
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-calendarWeekScrollRange">
                  <p className="font-semibold text-slate-900 text-sm">{weekScrollRangeSetting?.label ?? "Scrollbereich Wochen"}</p>
                  <p className="mb-3 text-xs text-slate-500">{weekScrollRangeSetting?.description ?? "Anzahl zusätzlicher Wochen im horizontalen Scroll (0–12)."}</p>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                    <Input
                      type="number" min={0} max={12} step={1}
                      value={weekScrollRangeValue}
                      onChange={(event) => setWeekScrollRangeValue(event.target.value)}
                      data-testid="input-setting-calendarWeekScrollRange"
                    />
                    <Button size="sm" onClick={() => void handleSaveWeekScrollRange()} disabled={isSaving} data-testid="button-save-calendarWeekScrollRange">
                      Speichern
                    </Button>
                  </div>
                  {weekScrollRangeSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                  {weekScrollRangeError && <p className="mt-1 text-xs text-destructive">{weekScrollRangeError}</p>}
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-calendarMonthScrollRange">
                  <p className="font-semibold text-slate-900 text-sm">{monthScrollRangeSetting?.label ?? "Scrollbereich Monate"}</p>
                  <p className="mb-3 text-xs text-slate-500">{monthScrollRangeSetting?.description ?? "Anzahl zusätzlicher Monate im horizontalen Scroll (0–12)."}</p>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                    <Input
                      type="number" min={0} max={12} step={1}
                      value={monthScrollRangeValue}
                      onChange={(event) => setMonthScrollRangeValue(event.target.value)}
                      data-testid="input-setting-calendarMonthScrollRange"
                    />
                    <Button size="sm" onClick={() => void handleSaveMonthScrollRange()} disabled={isSaving} data-testid="button-save-calendarMonthScrollRange">
                      Speichern
                    </Button>
                  </div>
                  {monthScrollRangeSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                  {monthScrollRangeError && <p className="mt-1 text-xs text-destructive">{monthScrollRangeError}</p>}
                </div>

              </div>
            </div>
          )}

          {/* ── Sicherheit ── */}
          {activePane === "sicherheit" && isAdmin && (
            <div data-testid="settings-pane-sicherheit">
              <div className="mb-5 pb-3 border-b border-slate-200">
                <h2 className="text-base font-medium text-slate-900">Sicherheit</h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  Globale Login- und Zugriffseinstellungen (nur Admin)
                  <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300 tracking-normal normal-case ml-1">GLOBAL</span>
                </p>
              </div>
              {isAdmin ? (
                <div className="space-y-2" data-testid="settings-group-security">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="setting-row-auth-two-factor-enabled">
                    <p className="font-semibold text-slate-900 text-sm">{authTwoFactorEnabledSetting?.label ?? "2FA global aktiv"}</p>
                    <p className="mb-3 text-xs text-slate-500">
                      {authTwoFactorEnabledSetting?.description ?? "Aktiviert die verpflichtende Zwei-Faktor-Anmeldung für alle Benutzer. Wirkt ab dem nächsten Login."}
                    </p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex h-9 items-center gap-3">
                        <Switch
                          checked={authTwoFactorEnabledValue}
                          onCheckedChange={setAuthTwoFactorEnabledValue}
                          data-testid="switch-setting-auth-two-factor-enabled"
                        />
                        <span className="text-sm text-slate-700">{authTwoFactorEnabledValue ? "Aktiv" : "Deaktiviert"}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => void handleSaveAuthTwoFactorEnabled()}
                        disabled={isSaving}
                        data-testid="button-save-auth-two-factor-enabled"
                      >
                        Speichern
                      </Button>
                    </div>
                    {authTwoFactorEnabledSaved && <p className="mt-1 text-xs text-emerald-700">Gespeichert.</p>}
                    {authTwoFactorEnabledError && <p className="mt-1 text-xs text-destructive">{authTwoFactorEnabledError}</p>}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4" data-testid="settings-system-seed-section">
                    <p className="font-semibold text-slate-900 text-sm">System-Stammdaten</p>
                    <p className="mb-3 text-xs text-slate-500">
                      Prüft definierte System-Tags, Soll-Touren, Systemkunden und Notizvorlagen, zeigt Abweichungen mit Checkboxen und führt nur die bestätigten Schritte aus.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() => systemSeedPreviewMutation.mutate()}
                        disabled={systemSeedPreviewMutation.isPending || systemSeedApplyMutation.isPending || isSaving}
                        data-testid="button-preview-system-seed"
                      >
                        {systemSeedPreviewMutation.isPending ? "System-Seed wird geprüft..." : "System-Seed prüfen"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => systemSeedApplyMutation.mutate(selectedSystemSeedKeys)}
                        disabled={selectedSystemSeedKeys.length === 0 || systemSeedPreviewMutation.isPending || systemSeedApplyMutation.isPending || isSaving}
                        data-testid="button-apply-system-seed"
                      >
                        {systemSeedApplyMutation.isPending ? "Auswahl wird angelegt..." : "Ausgewählte Einträge anlegen"}
                      </Button>
                    </div>
                    {systemSeedError && <p className="mt-2 text-xs text-destructive">{systemSeedError}</p>}
                    {systemSeedPreviewItems.length > 0 ? (
                      <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-4" data-testid="system-seed-preview-items">
                        <p className="text-xs text-slate-600">
                          {selectedSystemSeedKeys.length} von {systemSeedPreviewItems.filter((item) => item.canApply).length} anlegbaren oder aktualisierbaren Einträgen ausgewählt.
                        </p>
                        <ul className="space-y-2">
                          {systemSeedPreviewItems.map((item) => {
                            const checked = selectedSystemSeedKeys.includes(item.key);
                            const statusLabel = item.status === "missing"
                              ? "Fehlt"
                              : item.status === "update"
                                ? "Abweichung"
                                : item.status === "migrate"
                                  ? "Migration"
                                  : "Vorhanden";

                            return (
                              <li
                                key={item.key}
                                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                data-testid={`system-seed-preview-item-${item.key}`}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={checked}
                                    disabled={!item.canApply || systemSeedApplyMutation.isPending}
                                    onCheckedChange={(nextChecked) => {
                                      setSelectedSystemSeedKeys((current) => {
                                        const next = new Set(current);
                                        if (nextChecked) {
                                          next.add(item.key);
                                        } else {
                                          next.delete(item.key);
                                        }
                                        return Array.from(next);
                                      });
                                    }}
                                    data-testid={`checkbox-system-seed-${item.key}`}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-medium text-slate-900">{item.label}</span>
                                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                        {item.kind === "noteTemplate"
                                          ? "Notizvorlage"
                                          : item.kind === "tour"
                                            ? "Tour"
                                            : item.kind === "customer"
                                              ? "Kunde"
                                              : "Tag"}
                                      </span>
                                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                        {statusLabel}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                    {systemSeedLogLines.length > 0 ? (
                      <ul className="mt-3 space-y-1 text-xs text-slate-700" data-testid="system-seed-log-lines">
                        {systemSeedLogLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Sicherheitseinstellungen sind nur für Administratoren sichtbar.</p>
              )}
            </div>
          )}

          {/* ── Backup & Dump ── */}
          {activePane === "backup" && isAdmin && (
            <div data-testid="settings-pane-backup">
              <div className="mb-5 pb-3 border-b border-slate-200">
                <h2 className="text-base font-medium text-slate-900">Backup &amp; Dump</h2>
                <p className="text-xs text-slate-500 mt-1">Steuerung, Protokoll und Datentransfer</p>
              </div>

              {/* Inner tabs */}
              <div className="flex border-b border-slate-200 mb-5" data-testid="backup-inner-tabs">
                <button className={innerTabClass("backups")} onClick={() => setActiveBackupTab("backups")} data-testid="backup-inner-tab-backups">Backups</button>
                <button className={innerTabClass("dumps")} onClick={() => setActiveBackupTab("dumps")} data-testid="backup-inner-tab-dumps">Dumps</button>
                <button className={innerTabClass("import")} onClick={() => setActiveBackupTab("import")} data-testid="backup-inner-tab-import">Import</button>
              </div>

              {/* Inner tab: Backups */}
              {activeBackupTab === "backups" && (
                <div data-testid="settings-group-backups">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={backupEnabledValue}
                        onCheckedChange={(checked) => void handleSaveBackupEnabled(checked)}
                        data-testid="switch-setting-backup-enabled"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {backupEnabledSetting?.label ?? "Automatische Backups"}: {backupEnabledValue ? "aktiv" : "deaktiviert"}
                      </span>
                      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300 tracking-normal normal-case">GLOBAL</span>
                    </div>
                    <div className="flex gap-2">
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
                  {backupEnabledSaved && <p className="mb-2 text-xs text-emerald-700">Gespeichert.</p>}
                  {backupEnabledError && <p className="mb-2 text-xs text-destructive">{backupEnabledError}</p>}
                  {backupRunInfo && <p className="mb-2 text-xs text-emerald-700">{backupRunInfo}</p>}
                  {backupRunError && <p className="mb-2 text-xs text-destructive">{backupRunError}</p>}

                  <div className="rounded-md border border-slate-200 bg-white overflow-hidden" data-testid="backups-monitoring-table">
                    {backupsQuery.isLoading ? (
                      <p className="p-4 text-sm text-slate-500">Backups werden geladen...</p>
                    ) : backupsQuery.isError ? (
                      <p className="p-4 text-sm text-destructive">Backups konnten nicht geladen werden.</p>
                    ) : backupRows.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">Noch keine Backup-Einträge vorhanden.</p>
                    ) : (
                      <div className="overflow-auto" data-testid="table-backup-logs-frame">
                        <table className="min-w-full text-sm" data-testid="table-backup-logs">
                          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                            <tr className="border-b border-slate-200 text-left">
                              <th className="bg-white px-3 py-2 text-xs font-medium text-slate-500">Datum</th>
                              <th className="bg-white px-3 py-2 text-xs font-medium text-slate-500">Status</th>
                              <th className="bg-white px-3 py-2 text-xs font-medium text-slate-500">Umfang</th>
                              <th className="bg-white px-3 py-2 text-xs font-medium text-slate-500">Download</th>
                            </tr>
                          </thead>
                          <tbody>
                            {backupRows.map((row) => {
                              const fileRefs = parseBackupFileRefs(row.filePath);
                              return (
                                <tr key={row.id} className="border-b border-slate-100" data-testid={`backup-row-${row.id}`}>
                                  <td className="px-3 py-2">{formatBackupDate(row.createdAt)}</td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex items-center" title={row.errorMessage ?? undefined}>
                                      <BackupStatusIcon row={row} />
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{formatBackupScope(row.exportedRecordCount)}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-2">
                                      {fileRefs.excelPath ? (
                                        <a href={`/api/admin/backups/${row.id}/download/excel`} className="underline text-primary text-xs" data-testid={`backup-download-excel-${row.id}`}>Excel</a>
                                      ) : (
                                        <span className="text-slate-400 text-xs">Excel</span>
                                      )}
                                      {fileRefs.pdfPath ? (
                                        <a href={`/api/admin/backups/${row.id}/download/pdf`} className="underline text-primary text-xs" data-testid={`backup-download-pdf-${row.id}`}>PDF</a>
                                      ) : (
                                        <span className="text-slate-400 text-xs">PDF</span>
                                      )}
                                      {fileRefs.zipPath ? (
                                        <a href={`/api/admin/backups/${row.id}/download/zip`} className="underline text-primary text-xs" data-testid={`backup-download-zip-${row.id}`}>ZIP</a>
                                      ) : (
                                        <span className="text-slate-400 text-xs">ZIP</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="sticky bottom-0 z-10 bg-slate-50 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                            <tr className="border-t border-slate-200">
                              <td colSpan={4} className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                                Einträge: {backupRows.length}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inner tab: Dumps */}
              {activeBackupTab === "dumps" && (
                <div data-testid="settings-group-dumps">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Button onClick={() => void handleCreateDump()} disabled={isDumpCreating} size="sm" data-testid="button-dump-create">
                      {isDumpCreating ? "Dump wird erstellt..." : "Dump erstellen"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void dumpsQuery.refetch()} data-testid="button-dumps-refresh">
                      Aktualisieren
                    </Button>
                  </div>
                  {dumpCreateResult && (
                    <p className="mb-3 text-xs text-emerald-700" data-testid="dump-create-success">
                      Dump erstellt: {dumpCreateResult.filename} ({(dumpCreateResult.sizeBytes / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {dumpCreateError && (
                    <p className="mb-3 text-xs text-destructive" data-testid="dump-create-error">{dumpCreateError}</p>
                  )}

                  <div className="rounded-md border border-slate-200 bg-white overflow-hidden" data-testid="dump-list-section">
                    {dumpsQuery.isLoading ? (
                      <p className="p-4 text-sm text-slate-500">Dumps werden geladen...</p>
                    ) : dumpsQuery.isError ? (
                      <p className="p-4 text-sm text-destructive">Dumps konnten nicht geladen werden.</p>
                    ) : dumpRows.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">Noch keine Dumps vorhanden.</p>
                    ) : (
                      <div className="overflow-auto" data-testid="table-dump-list-frame">
                        <table className="min-w-full text-sm" data-testid="table-dump-list">
                          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                            <tr className="border-b border-slate-200 text-left">
                              <th className="bg-white px-3 py-2 text-xs font-medium text-slate-500">Erstellt</th>
                              <th className="bg-white px-3 py-2 text-xs font-medium text-slate-500">Größe</th>
                              <th className="bg-white px-3 py-2 text-xs font-medium text-slate-500">Download</th>
                              <th className="bg-white px-3 py-2 text-xs font-medium text-slate-500">Löschen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dumpRows.map((row) => (
                              <tr key={row.filename} className="border-b border-slate-100" data-testid={`dump-row-${row.filename}`}>
                                <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString("de-DE")}</td>
                                <td className="px-3 py-2">{(row.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                                <td className="px-3 py-2">
                                  <a
                                    href={`/api/admin/dumps/${encodeURIComponent(row.filename)}/download`}
                                    className="underline text-primary text-xs"
                                    data-testid={`dump-download-${row.filename}`}
                                  >
                                    ZIP
                                  </a>
                                </td>
                                <td className="px-3 py-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleDeleteDump(row.filename)}
                                    disabled={isDumpDeleting === row.filename}
                                    data-testid={`dump-delete-${row.filename}`}
                                  >
                                    {isDumpDeleting === row.filename ? "..." : "Löschen"}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="sticky bottom-0 z-10 bg-slate-50 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                            <tr className="border-t border-slate-200">
                              <td colSpan={4} className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                                Einträge: {dumpRows.length}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inner tab: Import */}
              {activeBackupTab === "import" && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4" data-testid="dump-import-section">
                  <p className="font-semibold text-amber-900 text-sm mb-1">Achtung – destruktive Aktion</p>
                  <p className="mb-3 text-xs text-amber-800" data-testid="dump-import-warning">
                    Der Import überschreibt alle vorhandenen Daten (außer Benutzer und Rollen) unwiderruflich. Vor dem Anwenden wird automatisch ein Ziel-Backup erstellt.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
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
                      size="sm"
                      variant="outline"
                      onClick={() => void handlePreviewDumpImport()}
                      disabled={!selectedDumpFile || isDumpPreviewLoading || isDumpApplying}
                      data-testid="button-dump-import-preview"
                    >
                      {isDumpImporting ? "Prüfung läuft..." : "Vorschau prüfen"}
                    </Button>
                  </div>

                  {dumpImportPreview && (
                    <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-4" data-testid="dump-import-preview-report">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-semibold text-slate-900">Status: {dumpImportPreview.transferReadiness}</span>
                        <span className="text-slate-600">Ziel: {dumpImportPreview.targetDatabaseName}</span>
                        <span className="text-slate-600">Dump: {dumpImportPreview.dumpId}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 md:grid-cols-3">
                        <div>Tabellen: {dumpImportPreview.expectedTables.length}</div>
                        <div>Upload-Dateien: {dumpImportPreview.expectedUploads.fileCount}</div>
                        <div>Upload-Größe: {(dumpImportPreview.expectedUploads.totalBytes / 1024 / 1024).toFixed(2)} MB</div>
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
                          size="sm"
                          onClick={() => void handleApplyDumpImport()}
                          disabled={
                            isDumpApplying
                            || dumpImportPreview.transferReadiness === "blocked"
                            || dumpConfirmationInput.trim() !== dumpImportPreview.confirmationPhrase
                          }
                          data-testid="button-dump-import-apply"
                        >
                          {isDumpApplying ? "Import läuft..." : "Import anwenden"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {dumpImportResult && (
                    <p className="mt-3 text-xs text-emerald-700" data-testid="dump-import-success">
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
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
