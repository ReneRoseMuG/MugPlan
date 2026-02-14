import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env.test" });
console.log("DB:", process.env.MYSQL_DATABASE_URL);

if (process.env.NODE_ENV !== "test") {
  throw new Error("Refusing to reset DB outside test mode.");
}

if (!process.env.MYSQL_DATABASE_URL?.includes("mysql")) {
  throw new Error("Invalid DB connection.");
}

async function reset() {
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
}

reset().then(() => {
  console.log("Test DB reset complete.");
});
