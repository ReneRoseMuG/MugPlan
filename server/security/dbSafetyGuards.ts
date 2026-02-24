import type { Connection } from "mysql2/promise";
import type { RuntimeMode } from "../config/runtimeEnv";

function parseDatabaseName(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  return parsed.pathname.replace(/^\/+/, "").trim();
}

function parseHostName(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  return (parsed.hostname?.trim() ?? "").toLowerCase();
}

export function parseDatabaseLogInfo(databaseUrl: string): { dbName: string; host: string | null } {
  try {
    const parsed = new URL(databaseUrl);
    const dbName = parsed.pathname.replace(/^\/+/, "").trim();
    const host = parsed.hostname?.trim().toLowerCase() || null;
    return { dbName, host };
  } catch {
    return { dbName: "unknown", host: null };
  }
}

export function assertRuntimeMode(expected: RuntimeMode, actual: RuntimeMode): void {
  if (actual !== expected) {
    throw new Error(`Invalid runtime mode: expected '${expected}', received '${actual}'.`);
  }
}

export function assertSafeDatabaseTargetForMode(
  databaseUrl: string,
  mode: RuntimeMode,
  allowedDatabases: string[],
  allowedHosts: string[],
): { dbName: string; host: string } {
  const dbName = parseDatabaseName(databaseUrl);
  const host = parseHostName(databaseUrl);

  if (!allowedDatabases.includes(dbName)) {
    throw new Error(
      `Unsafe database target for mode '${mode}': db='${dbName}', host='${host || "unknown"}'.`,
    );
  }
  if (!allowedHosts.includes(host)) {
    throw new Error(
      `Unsafe host target for mode '${mode}': db='${dbName}', host='${host || "unknown"}'.`,
    );
  }
  return { dbName, host };
}

export async function assertSqlDatabaseIdentity(
  connection: Connection,
  expectedDatabaseName: string,
): Promise<void> {
  const [rows] = await connection.query("SELECT DATABASE() AS dbName");
  const dbName = (rows as Array<{ dbName: string | null }>)[0]?.dbName?.trim() ?? "";
  if (!dbName) {
    throw new Error("Could not resolve active SQL database name.");
  }
  if (dbName !== expectedDatabaseName) {
    throw new Error(`Active SQL database '${dbName}' does not match expected '${expectedDatabaseName}'.`);
  }
}
