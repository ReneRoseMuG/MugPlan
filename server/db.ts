import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import { getRuntimeConfig, initializeRuntimeEnv } from "./config/runtimeEnv";
import { isSqlLoggingEnabled, logSql } from "./lib/logger";

initializeRuntimeEnv();
const runtime = getRuntimeConfig();
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
