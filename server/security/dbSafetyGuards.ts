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

function parsePort(databaseUrl: string): number {
  const parsed = new URL(databaseUrl);
  if (parsed.port) {
    const explicit = Number.parseInt(parsed.port, 10);
    if (!Number.isInteger(explicit) || explicit <= 0 || explicit > 65535) {
      throw new Error(`Invalid database port in URL '${databaseUrl}'.`);
    }
    return explicit;
  }
  if (parsed.protocol === "mysql:") return 3306;
  if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") return 5432;
  throw new Error(`Cannot infer database port for protocol '${parsed.protocol}'.`);
}

export function parseDatabaseLogInfo(databaseUrl: string): { dbName: string; host: string | null; port: number | null } {
  try {
    const parsed = new URL(databaseUrl);
    const dbName = parsed.pathname.replace(/^\/+/, "").trim();
    const host = parsed.hostname?.trim().toLowerCase() || null;
    const port = parsed.port ? Number.parseInt(parsed.port, 10) : parsed.protocol === "mysql:" ? 3306 : null;
    return { dbName, host, port: Number.isInteger(port) ? port : null };
  } catch {
    return { dbName: "unknown", host: null, port: null };
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
): { dbName: string; host: string; port: number } {
  const dbName = parseDatabaseName(databaseUrl);
  const host = parseHostName(databaseUrl);
  const port = parsePort(databaseUrl);

  if (!allowedDatabases.includes(dbName)) {
    throw new Error(`Unsafe database target for mode '${mode}': db='${dbName}', host='${host || "unknown"}'.`);
  }
  if (!allowedHosts.includes(host)) {
    throw new Error(`Unsafe host target for mode '${mode}': db='${dbName}', host='${host || "unknown"}'.`);
  }
  return { dbName, host, port };
}

export function assertTestMode(mode: RuntimeMode, mugplanModeRaw = process.env.MUGPLAN_MODE): void {
  assertRuntimeMode("test", mode);
  const mugplanMode = (mugplanModeRaw ?? "").trim().toLowerCase();
  if (mugplanMode !== "test") {
    throw new Error(
      `Invalid MUGPLAN_MODE for test operations: expected 'test', received '${mugplanModeRaw ?? ""}'.`,
    );
  }
}

export function assertSafeWriteTargetForTestMode(
  databaseUrl: string,
  allowedDatabases: string[],
  allowedHosts: string[],
): { dbName: string; host: string; port: number } {
  const target = assertSafeDatabaseTargetForMode(
    databaseUrl,
    "test",
    allowedDatabases,
    allowedHosts,
  );
  if (!target.dbName.endsWith("_test")) {
    throw new Error(`Unsafe test database name: '${target.dbName}'. Expected '*_test' suffix.`);
  }
  return target;
}

export function assertSafeDestructiveOperationTarget(params: {
  mode: RuntimeMode;
  databaseUrl: string;
  allowedDatabases: string[];
  allowedHosts: string[];
  mugplanModeRaw?: string;
}): { dbName: string; host: string; port: number } {
  assertTestMode(params.mode, params.mugplanModeRaw);
  return assertSafeWriteTargetForTestMode(
    params.databaseUrl,
    params.allowedDatabases,
    params.allowedHosts,
  );
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
