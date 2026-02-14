import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

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

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");

  const [tables] = await connection.query("SHOW TABLES");
  const tableKey = Object.keys((tables as any)[0])[0];

  for (const row of tables as any[]) {
    const tableName = row[tableKey];
    await connection.query(`TRUNCATE TABLE \`${tableName}\``);
  }

  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  await connection.end();

  const { ensureSystemRoles } = await import("../../server/bootstrap/ensureSystemRoles");
  const { getAuthUserByUsername, createAdminUser } = await import("../../server/repositories/usersRepository");
  const { hashPassword } = await import("../../server/security/passwordHash");
  await ensureSystemRoles();

  const username = "test-admin";
  const existing = await getAuthUserByUsername(username);
  if (!existing) {
    const passwordHash = await hashPassword("test-admin-password");
    await createAdminUser({ username, passwordHash });
  }
}
