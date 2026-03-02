import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { getRuntimeConfig, getRuntimeMode } from "../config/runtimeEnv";
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

  const storagePaths = await adminRepository.listAllAttachmentStoragePaths();
  const deleted = await adminRepository.resetDomainData();

  let filesDeleted = 0;
  let filesMissing = 0;
  for (const storagePath of storagePaths) {
    try {
      fs.unlinkSync(path.resolve(storagePath));
      filesDeleted += 1;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        filesMissing += 1;
        continue;
      }
      logError(`${logPrefix} attachment delete failed`, {
        storagePath,
        message: err.message,
      });
      throw error;
    }
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
