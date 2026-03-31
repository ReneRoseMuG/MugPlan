import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { getRuntimeConfig, getRuntimeMode } from "../config/runtimeEnv";
import { resolveAttachmentStoragePath } from "../lib/attachmentFiles";
import { assertSafeAdminDestructiveOperationTarget, assertSqlDatabaseIdentity } from "../security/dbSafetyGuards";
import * as adminRepository from "../repositories/adminRepository";
import { logError, logInfo } from "../lib/logger";

const logPrefix = "[admin-service]";

export type ResetDatabaseResult = {
  ok: true;
  deleted: adminRepository.ResetDomainDataCounts;
  attachments: {
    filesDeleted: number;
    filesMissing: number;
  };
  durationMs: number;
};

export async function resetDatabase(): Promise<ResetDatabaseResult> {
  const startedAtMs = Date.now();
  logInfo(`${logPrefix} reset start`);

  const runtimeMode = getRuntimeMode();
  const runtimeConfig = getRuntimeConfig();
  const expectedTarget = assertSafeAdminDestructiveOperationTarget({
    mode: runtimeMode,
    databaseUrl: runtimeConfig.mysqlDatabaseUrl,
    allowedDatabases: runtimeConfig.allowedDatabases,
    allowedHosts: runtimeConfig.allowedHosts,
  });
  const safetyConnection = await mysql.createConnection(runtimeConfig.mysqlDatabaseUrl);
  try {
    await assertSqlDatabaseIdentity(safetyConnection, expectedTarget.dbName);
  } finally {
    await safetyConnection.end();
  }

  const attachmentFiles = await adminRepository.listAllAttachmentFileRefs();
  const deleted = await adminRepository.resetDomainData();

  let filesDeleted = 0;
  let filesMissing = 0;
  for (const attachmentFile of attachmentFiles) {
    const currentPath = await resolveAttachmentStoragePath(attachmentFile.filename);
    const candidatePaths = [currentPath];
    const legacyPath = path.resolve(attachmentFile.storagePath);
    if (!candidatePaths.includes(legacyPath)) {
      candidatePaths.push(legacyPath);
    }

    let deletedAny = false;
    for (const candidatePath of candidatePaths) {
      try {
        if (!fs.existsSync(candidatePath)) {
          continue;
        }
        fs.unlinkSync(candidatePath);
        deletedAny = true;
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        logError(`${logPrefix} attachment delete failed`, {
          storagePath: candidatePath,
          message: err.message,
        });
        throw error;
      }
    }

    if (deletedAny) {
      filesDeleted += 1;
      continue;
    }

    filesMissing += 1;
  }

  const durationMs = Date.now() - startedAtMs;
  logInfo(`${logPrefix} reset finish`, {
    durationMs,
    deleted,
    attachments: { filesDeleted, filesMissing },
  });

  return {
    ok: true,
    deleted,
    attachments: {
      filesDeleted,
      filesMissing,
    },
    durationMs,
  };
}
