import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import { getRuntimeConfig, initializeRuntimeEnv } from "./config/runtimeEnv";
import {
  assertSafeDatabaseTargetForMode,
  assertSafeWriteTargetForTestMode,
  assertTestMode,
  parseDatabaseLogInfo,
} from "./security/dbSafetyGuards";
import { isSqlLoggingEnabled, logSql } from "./lib/logger";

initializeRuntimeEnv();
const runtime = getRuntimeConfig();

try {
  if (runtime.mode === "test") {
    // Hard architectural gate: test clients are only created after explicit mode+target checks.
    assertTestMode(runtime.mode);
    assertSafeWriteTargetForTestMode(
      runtime.mysqlDatabaseUrl,
      runtime.allowedDatabases,
      runtime.allowedHosts,
      runtime.allowedPorts,
    );
  } else {
    assertSafeDatabaseTargetForMode(
      runtime.mysqlDatabaseUrl,
      runtime.mode,
      runtime.allowedDatabases,
      runtime.allowedHosts,
      runtime.allowedPorts,
    );
  }
} catch (error) {
  const dbInfo = parseDatabaseLogInfo(runtime.mysqlDatabaseUrl);
  const allowedDatabases = runtime.allowedDatabases.join(", ");
  const allowedHosts = runtime.allowedHosts.join(", ");
  const allowedPorts = runtime.allowedPorts.join(", ");
  const reason = error instanceof Error ? error.message : String(error);
  throw new Error(
    `DB startup guard rejected target for mode '${runtime.mode}': ` +
      `db='${dbInfo.dbName}', host='${dbInfo.host ?? "unknown"}', port='${dbInfo.port ?? "unknown"}', ` +
      `allowedDatabases='${allowedDatabases}', allowedHosts='${allowedHosts}', allowedPorts='${allowedPorts}'. ` +
      `Reason: ${reason}`,
  );
}

export const pool = mysql.createPool(runtime.mysqlDatabaseUrl);

const sqlLoggingEnabled = isSqlLoggingEnabled();

export const db = drizzle(pool, {
  schema,
  mode: "default",
  logger: sqlLoggingEnabled
    ? {
        logQuery(query: string, params: unknown[]) {
          logSql("query", { query, params });
        },
      }
    : false,
});
