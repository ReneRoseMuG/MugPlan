import fs from "fs";
import path from "path";
import * as backupRepository from "../repositories/backupRepository";

export type BackupDownloadKind = "excel" | "pdf";

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

function parseFilePathJson(filePathRaw: string | null): { excelPath?: string; pdfPath?: string } {
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
  const configuredPath = kind === "excel" ? parsed.excelPath : parsed.pdfPath;
  if (!configuredPath) {
    throw new BackupServiceError("Datei fuer diesen Backup-Eintrag nicht verfuegbar", 404, "NOT_FOUND");
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

export function isBackupServiceError(error: unknown): error is BackupServiceError {
  return error instanceof BackupServiceError;
}

