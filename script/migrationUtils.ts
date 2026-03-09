import fs from "fs";
import path from "path";
import crypto from "crypto";
import mysql from "mysql2/promise";
import {
  getRuntimeConfig,
  getRuntimeMode,
  initializeRuntimeEnv,
  type RuntimeMode,
} from "../server/config/runtimeEnv";
import {
  assertSafeDatabaseTargetForMode,
  assertSafeWriteTargetForTestMode,
  assertSqlDatabaseIdentity,
  assertTestMode,
} from "../server/security/dbSafetyGuards";

type RepoMigration = {
  id: number;
  tag: string;
  fileName: string;
  hash: string;
};

type AppliedMigration = {
  id: number;
  hash: string;
  createdAt: number | null;
};

type TargetInfo = {
  mode: RuntimeMode;
  dbName: string;
  host: string;
  port: number;
  url: string;
};

export function initializeMigrationRuntime(): TargetInfo {
  const runtimeConfig = initializeRuntimeEnv();
  const mode = getRuntimeMode();

  const target = mode === "test"
    ? (() => {
        assertTestMode(mode);
        return assertSafeWriteTargetForTestMode(
          runtimeConfig.mysqlDatabaseUrl,
          runtimeConfig.allowedDatabases,
          runtimeConfig.allowedHosts,
        );
      })()
    : assertSafeDatabaseTargetForMode(
        runtimeConfig.mysqlDatabaseUrl,
        mode,
        runtimeConfig.allowedDatabases,
        runtimeConfig.allowedHosts,
      );

  return {
    mode,
    dbName: target.dbName,
    host: target.host,
    port: target.port,
    url: runtimeConfig.mysqlDatabaseUrl,
  };
}

export function readRepoMigrations(): RepoMigration[] {
  const migrationsDir = path.resolve(process.cwd(), "migrations");
  return fs.readdirSync(migrationsDir)
    .filter((entry) => /^\d+_.+\.sql$/.test(entry))
    .sort()
    .map((fileName) => {
      const absolutePath = path.join(migrationsDir, fileName);
      const content = fs.readFileSync(absolutePath, "utf8");
      const id = Number.parseInt(fileName.slice(0, fileName.indexOf("_")), 10) + 1;
      return {
        id,
        tag: fileName.replace(/\.sql$/, ""),
        fileName,
        hash: crypto.createHash("sha256").update(content).digest("hex"),
      };
    });
}

export async function readAppliedMigrations(target: TargetInfo): Promise<AppliedMigration[]> {
  const connection = await mysql.createConnection(target.url);
  try {
    await assertSqlDatabaseIdentity(connection, target.dbName);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        hash text NOT NULL,
        created_at bigint DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY id (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    const [rows] = await connection.query(
      "SELECT id, hash, created_at AS createdAt FROM __drizzle_migrations ORDER BY id",
    );
    return rows as AppliedMigration[];
  } finally {
    await connection.end();
  }
}

export function diffMigrationState(repo: RepoMigration[], applied: AppliedMigration[]) {
  const appliedHashes = new Set(applied.map((entry) => entry.hash));
  const pending = repo.filter((entry) => !appliedHashes.has(entry.hash));
  const unexpected = applied.filter((entry) => !repo.some((repoEntry) => repoEntry.hash === entry.hash));
  return { pending, unexpected };
}
