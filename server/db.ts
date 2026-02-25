import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import { getRuntimeConfig, initializeRuntimeEnv } from "./config/runtimeEnv";
import { assertSafeDatabaseTargetForMode, parseDatabaseLogInfo } from "./security/dbSafetyGuards";
import { isSqlLoggingEnabled, logSql } from "./lib/logger";

initializeRuntimeEnv();
const runtime = getRuntimeConfig();

try {
  assertSafeDatabaseTargetForMode(
    runtime.mysqlDatabaseUrl,
    runtime.mode,
    runtime.allowedDatabases,
    runtime.allowedHosts,
  );
} catch (error) {
  const dbInfo = parseDatabaseLogInfo(runtime.mysqlDatabaseUrl);
  const allowedDatabases = runtime.allowedDatabases.join(", ");
  const allowedHosts = runtime.allowedHosts.join(", ");
  const reason = error instanceof Error ? error.message : String(error);
  throw new Error(
    `DB startup guard rejected target for mode '${runtime.mode}': ` +
      `db='${dbInfo.dbName}', host='${dbInfo.host ?? "unknown"}', ` +
      `allowedDatabases='${allowedDatabases}', allowedHosts='${allowedHosts}'. ` +
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
