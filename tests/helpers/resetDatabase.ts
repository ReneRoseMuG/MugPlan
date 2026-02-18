import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const RESET_DB_LOCK_NAME = "mugplan_test_reset_database_lock";
const RESET_DB_LOCK_TIMEOUT_SECONDS = 60;

if (process.env.NODE_ENV !== "test") {
  throw new Error("resetDatabase darf nur im Testmodus laufen.");
}

if (!process.env.MYSQL_DATABASE_URL?.includes("mugplan_test")) {
  throw new Error("resetDatabase verweigert – keine Test-Datenbank.");
}


export async function resetDatabase() {
  const connection = await mysql.createConnection(
    process.env.MYSQL_DATABASE_URL!
  );

  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK(?, ?) AS lockStatus", [
      RESET_DB_LOCK_NAME,
      RESET_DB_LOCK_TIMEOUT_SECONDS,
    ]);
    const lockStatus = (lockRows as Array<{ lockStatus: number | null }>)[0]?.lockStatus ?? null;
    if (lockStatus !== 1) {
      throw new Error("resetDatabase lock konnte nicht erworben werden.");
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    const [tables] = await connection.query("SHOW TABLES");
    const tableRows = tables as any[];
    if (tableRows.length > 0) {
      const tableKey = Object.keys(tableRows[0])[0];
      for (const row of tableRows) {
        const tableName = row[tableKey];
        await connection.query(`TRUNCATE TABLE \`${tableName}\``);
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    try {
      await connection.query("DO RELEASE_LOCK(?)", [RESET_DB_LOCK_NAME]);
    } finally {
      await connection.end();
    }
  }

  const { ensureSystemRoles } = await import("../../server/bootstrap/ensureSystemRoles");
  const { getAuthUserByUsername, createAdminUser } = await import("../../server/repositories/usersRepository");
  const { hashPassword } = await import("../../server/security/passwordHash");
  await ensureSystemRoles();

  const username = "test-admin";
  const existing = await getAuthUserByUsername(username);
  if (!existing) {
    const passwordHash = await hashPassword("test-admin-password");
    try {
      await createAdminUser({ username, passwordHash });
    } catch (error) {
      const mysqlError = error as { code?: string; errno?: number } | null;
      const isDuplicate = mysqlError?.code === "ER_DUP_ENTRY" || mysqlError?.errno === 1062;
      if (!isDuplicate) {
        throw error;
      }
    }
  }
}
