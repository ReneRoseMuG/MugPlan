/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Bootstrap legt Systemrollen idempotent an.
 * - Rollen bleiben nach wiederholter Ausfuehrung konsistent sortiert und vollstaendig.
 *
 * Fehlerfaelle:
 * - Fehlende oder doppelte Systemrollen nach dem Bootstrap.
 *
 * Ziel:
 * Die Integritaet der zentralen Systemrollen beim Bootstrap absichern.
 */
import { describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import { asc } from "drizzle-orm";
import { db } from "../../../server/db";
import { ensureSystemRoles } from "../../../server/bootstrap/ensureSystemRoles";
import { getRuntimeConfig, getRuntimeMode } from "../../../server/config/runtimeEnv";
import {
  assertSafeDestructiveOperationTarget,
  assertSqlDatabaseIdentity,
} from "../../../server/security/dbSafetyGuards";
import { roles } from "../../../shared/schema";

async function truncateRolesOnly() {
  const runtimeMode = getRuntimeMode();
  const runtimeConfig = getRuntimeConfig();
  const target = assertSafeDestructiveOperationTarget({
    mode: runtimeMode,
    databaseUrl: runtimeConfig.mysqlDatabaseUrl,
    allowedDatabases: runtimeConfig.allowedDatabases,
    allowedHosts: runtimeConfig.allowedHosts,
  });

  const connection = await mysql.createConnection(runtimeConfig.mysqlDatabaseUrl);
  await assertSqlDatabaseIdentity(connection, target.dbName);
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  await connection.query("TRUNCATE TABLE `roles`");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  await connection.end();
}

describe("startup bootstrap: ensureSystemRoles", () => {

  it("creates ADMIN/READER/DISPATCHER when roles table is empty", async () => {
    await truncateRolesOnly();

    await ensureSystemRoles();

    const rows = await db
      .select({ code: roles.code })
      .from(roles)
      .orderBy(asc(roles.code));

    expect(rows.map((row) => row.code)).toEqual(["ADMIN", "DISPATCHER", "READER"]);
  });

  it("is idempotent when called repeatedly", async () => {
    await ensureSystemRoles();
    await ensureSystemRoles();

    const rows = await db
      .select({ code: roles.code })
      .from(roles)
      .orderBy(asc(roles.code));

    expect(rows.map((row) => row.code)).toEqual(["ADMIN", "DISPATCHER", "READER"]);
  });
});
