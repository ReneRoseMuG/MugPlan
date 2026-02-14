import { beforeEach, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import { asc } from "drizzle-orm";
import { db } from "../../../server/db";
import { ensureSystemRoles } from "../../../server/bootstrap/ensureSystemRoles";
import { roles } from "../../../shared/schema";
import { resetDatabase } from "../../helpers/resetDatabase";

async function truncateRolesOnly() {
  const connection = await mysql.createConnection(process.env.MYSQL_DATABASE_URL!);
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  await connection.query("TRUNCATE TABLE `roles`");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  await connection.end();
}

describe("startup bootstrap: ensureSystemRoles", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

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
