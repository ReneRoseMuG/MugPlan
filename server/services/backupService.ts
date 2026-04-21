import fs from "fs";
import path from "path";
import * as backupRepository from "../repositories/backupRepository";
import { runBackupManualTick } from "./backupScheduler";

export type BackupDownloadKind = "excel" | "pdf" | "zip";

export class BackupServiceError extends Error {
  status: number;
  code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(message: string, status: number, code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestContext = {
  roleKey: "LESER" | "DISPONENT" | "ADMIN";
};

function requireAdmin(context: RequestContext): void {
  if (context.roleKey !== "ADMIN") {
    throw new BackupServiceError("Keine Berechtigung", 403, "FORBIDDEN");
  }
}

export async function listBackupLogs(context: RequestContext) {
  requireAdmin(context);
  const rows = await backupRepository.listBackupLogs(200);
  return rows.map((row) => ({
    id: row.id,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    status: row.status,
    errorMessage: row.errorMessage ?? null,
    exportedRecordCount: row.exportedRecordCount ?? 0,
    filePath: row.filePath ?? null,
  }));
}

function parseFilePathJson(filePathRaw: string | null): { excelPath?: string; pdfPath?: string; zipPath?: string } {
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

export async function resolveBackupDownloadPath(
  context: RequestContext,
  backupLogId: number,
  kind: BackupDownloadKind,
): Promise<{ filePath: string; fileName: string }> {
  requireAdmin(context);
  const record = await backupRepository.getBackupLogById(backupLogId);
  if (!record) {
    throw new BackupServiceError("Backup-Log nicht gefunden", 404, "NOT_FOUND");
  }

  const parsed = parseFilePathJson(record.filePath);
  const configuredPath = kind === "excel"
    ? parsed.excelPath
    : kind === "pdf"
      ? parsed.pdfPath
      : parsed.zipPath;
  if (!configuredPath) {
    throw new BackupServiceError("Datei für diesen Backup-Eintrag nicht verfügbar", 404, "NOT_FOUND");
  }

  const resolvedPath = path.resolve(configuredPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new BackupServiceError("Datei nicht gefunden", 404, "NOT_FOUND");
  }

  return {
    filePath: resolvedPath,
    fileName: path.basename(resolvedPath),
  };
}

export async function createSkippedBackupLog(reason: string): Promise<void> {
  await backupRepository.createBackupLogEntry({
    status: "skipped",
    errorMessage: reason,
    exportedRecordCount: 0,
    filePath: null,
  });
}

export async function runBackupNow(context: RequestContext) {
  requireAdmin(context);
  return runBackupManualTick();
}

export function isBackupServiceError(error: unknown): error is BackupServiceError {
  return error instanceof BackupServiceError;
}
