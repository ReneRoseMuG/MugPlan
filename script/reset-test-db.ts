import mysql from "mysql2/promise";
import { getRuntimeConfig, getRuntimeMode, initializeRuntimeEnv } from "../server/config/runtimeEnv";
import {
  assertRuntimeMode,
  assertSafeDatabaseUrlForMode,
  assertSqlDatabaseIdentity,
} from "../server/security/dbSafetyGuards";

process.env.NODE_ENV = "test";
initializeRuntimeEnv();
const runtimeMode = getRuntimeMode();
const runtimeConfig = getRuntimeConfig();
assertRuntimeMode("test", runtimeMode);
const expectedDatabaseName = assertSafeDatabaseUrlForMode(runtimeConfig.mysqlDatabaseUrl, runtimeMode);

console.log("DB:", expectedDatabaseName);

async function reset() {
  const connection = await mysql.createConnection(runtimeConfig.mysqlDatabaseUrl);
  try {
    await assertSqlDatabaseIdentity(connection, expectedDatabaseName);
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
    await connection.end();
  }
}

reset().then(() => {
  console.log("Test DB reset complete.");
});
