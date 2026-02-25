import mysql from "mysql2/promise";
import { getRuntimeConfig, getRuntimeMode } from "../config/runtimeEnv";
import {
  assertSafeDestructiveOperationTarget,
  assertSqlDatabaseIdentity,
} from "../security/dbSafetyGuards";

export async function assertSafeDemoSeedPurgeTarget(): Promise<void> {
  const runtimeMode = getRuntimeMode();
  const runtimeConfig = getRuntimeConfig();
  const expectedTarget = assertSafeDestructiveOperationTarget({
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
}
