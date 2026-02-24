import type { Connection } from "mysql2/promise";
import type { RuntimeMode } from "../config/runtimeEnv";

const expectedSuffixByMode: Record<RuntimeMode, string> = {
  test: "_test",
  development: "_dev",
  production: "_production",
};

function parseDatabaseName(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  return parsed.pathname.replace(/^\/+/, "").trim();
}

export function parseDatabaseLogInfo(databaseUrl: string): { dbName: string; host: string | null } {
  try {
    const parsed = new URL(databaseUrl);
    const dbName = parsed.pathname.replace(/^\/+/, "").trim();
    const host = parsed.hostname?.trim() || null;
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

export function assertSafeDatabaseUrlForMode(databaseUrl: string, mode: RuntimeMode): string {
  const dbName = parseDatabaseName(databaseUrl);
  const expectedSuffix = expectedSuffixByMode[mode];
  if (!dbName.endsWith(expectedSuffix)) {
    throw new Error(`Unsafe database target '${dbName}' for mode '${mode}'.`);
  }
  return dbName;
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
