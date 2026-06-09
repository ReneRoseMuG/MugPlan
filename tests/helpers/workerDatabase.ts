import mysql from "mysql2/promise";
import { getRuntimeConfig, initializeRuntimeEnv } from "../../server/config/runtimeEnv";
import {
  assertSafeDestructiveOperationTarget,
  assertSafeWriteTargetForTestMode,
  TEST_WORKER_DATABASE_PATTERN,
} from "../../server/security/dbSafetyGuards";

/**
 * AP03/AP10 (MS-64): Worker-Datenbank-Lifecycle.
 *
 * Pro Test-Worker eine eigene temporaere Testdatenbank deterministisch anlegen, ihr Schema
 * aufbauen und nach dem Lauf rueckstandsfrei bereinigen. Wiederverwendbar fuer Browser (AP05)
 * und Integration (AP10).
 *
 * Schemaaufbau per Klon statt Migration:
 * Die Migrationskette des Projekts enthaelt kein From-Scratch-Baseline (Basistabellen wie
 * `project`/`users` werden in keiner Migration erzeugt, sondern stammen historisch aus
 * `drizzle-kit push`). Eine frische DB laesst sich darum ueber `db:migrate:test` nicht
 * aufbauen. Deshalb wird das Schema jeder Worker-DB aus der bereits korrekten Basis-Test-DB
 * geklont (SHOW CREATE TABLE/VIEW inkl. Fremdschluessel).
 *
 * Sicherheit:
 * - Der Worker-DB-Name folgt dem in AP04 verankerten Muster `mugplan_w<index>_test` und wird
 *   vor jeder Operation gegen die zentralen Safety-Guards validiert (Testmodus, Host-Allowlist,
 *   `_test`-Suffix, Muster).
 *
 * Konfiguration:
 * - Die Funktionen akzeptieren eine explizite WorkerDbConfig. Wird keine uebergeben, wird sie
 *   aus der Laufzeit-Env gelesen. Die explizite Variante erlaubt Provisionierung, BEVOR
 *   runtimeEnv auf die Worker-URL festgelegt wird (Import-Reihenfolge fuer AP05/AP10).
 */

const WORKER_DB_PREFIX = "mugplan_w";
const WORKER_DB_SUFFIX = "_test";

export type WorkerDbConfig = {
  /** Basis-Test-URL; dient als Schema-Quelle und liefert Host/Port/Credentials. */
  baseUrl: string;
  allowedDatabases: string[];
  allowedHosts: string[];
};

/** Liest die Worker-DB-Konfiguration aus der Laufzeit-Env (initialisiert runtimeEnv). */
export function runtimeWorkerDbConfig(): WorkerDbConfig {
  initializeRuntimeEnv();
  const config = getRuntimeConfig();
  return {
    baseUrl: config.mysqlDatabaseUrl,
    allowedDatabases: config.allowedDatabases,
    allowedHosts: config.allowedHosts,
  };
}

/**
 * Loest den Worker-Index aus der Laufzeitumgebung auf.
 * - Playwright: TEST_WORKER_INDEX (0-basiert)
 * - Vitest: VITEST_POOL_ID / VITEST_WORKER_ID (1-basiert)
 * Faellt auf 0 zurueck, wenn keine Worker-Variable gesetzt ist (serieller Modus).
 */
export function resolveWorkerIndex(): number {
  const raw =
    process.env.TEST_WORKER_INDEX ??
    process.env.VITEST_POOL_ID ??
    process.env.VITEST_WORKER_ID ??
    "0";
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

/** Deterministischer Worker-DB-Name fuer einen Worker-Index. */
export function workerDatabaseName(index: number = resolveWorkerIndex()): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid worker index for database name: '${index}'.`);
  }
  const name = `${WORKER_DB_PREFIX}${index}${WORKER_DB_SUFFIX}`;
  // Defensive Selbstpruefung: der erzeugte Name muss das verankerte Muster erfuellen.
  if (!TEST_WORKER_DATABASE_PATTERN.test(name)) {
    throw new Error(`Derived worker database name '${name}' violates the worker pattern.`);
  }
  return name;
}

/** Basis-DB-Name (Schema-Quelle) aus einer DB-URL. */
function databaseNameFromUrl(url: string): string {
  return new URL(url).pathname.replace(/^\/+/, "").trim();
}

/** Baut die Worker-DB-URL aus der Basis-Test-URL, indem der DB-Pfad ersetzt wird. */
export function workerDatabaseUrl(
  index: number = resolveWorkerIndex(),
  baseUrl: string = runtimeWorkerDbConfig().baseUrl,
): string {
  const url = new URL(baseUrl);
  url.pathname = `/${workerDatabaseName(index)}`;
  return url.toString();
}

/**
 * Klont das Schema (Tabellen inkl. Fremdschluessel, danach Views) aus der Quell-DB in die
 * aktuell verbundene Worker-DB. Foreign-Key-Checks werden waehrend des Aufbaus deaktiviert,
 * damit die Tabellenreihenfolge keine Rolle spielt.
 */
async function cloneSchemaInto(
  connection: mysql.Connection,
  workerName: string,
  sourceDb: string,
): Promise<void> {
  await connection.query(`USE \`${workerName}\``);
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    const [tableRows] = await connection.query(`SHOW FULL TABLES FROM \`${sourceDb}\``);
    const rows = tableRows as Array<Record<string, string>>;
    const tableKey = rows.length > 0 ? Object.keys(rows[0])[0] : null;

    const baseTables: string[] = [];
    const views: string[] = [];
    for (const row of rows) {
      const name = tableKey ? row[tableKey] : "";
      const type = row["Table_type"];
      if (type === "VIEW") {
        views.push(name);
      } else {
        baseTables.push(name);
      }
    }

    for (const table of baseTables) {
      const [createRows] = await connection.query(
        `SHOW CREATE TABLE \`${sourceDb}\`.\`${table}\``,
      );
      const ddl = (createRows as Array<Record<string, string>>)[0]?.["Create Table"];
      if (ddl) {
        await connection.query(ddl);
      }
    }

    for (const view of views) {
      const [createRows] = await connection.query(
        `SHOW CREATE VIEW \`${sourceDb}\`.\`${view}\``,
      );
      const ddl = (createRows as Array<Record<string, string>>)[0]?.["Create View"];
      if (ddl) {
        await connection.query(ddl);
      }
    }
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

/**
 * Provisioniert die Worker-DB idempotent: validiert das Ziel gegen die Safety-Guards,
 * verwirft eine evtl. vorhandene Worker-DB (sauberer Ausgangszustand) und baut das Schema
 * frisch aus der Basis-Test-DB. Die Verbindung erfolgt ueber die Basis-Test-DB.
 */
export async function provisionWorkerDatabase(
  index: number = resolveWorkerIndex(),
  config: WorkerDbConfig = runtimeWorkerDbConfig(),
): Promise<{ name: string; url: string }> {
  const name = workerDatabaseName(index);
  const url = workerDatabaseUrl(index, config.baseUrl);
  const sourceDb = databaseNameFromUrl(config.baseUrl);

  // Guards: validieren Name (Muster), Host-Allowlist und `_test`-Suffix (Write + destruktiv).
  assertSafeWriteTargetForTestMode(url, config.allowedDatabases, config.allowedHosts);
  assertSafeDestructiveOperationTarget({
    mode: "test",
    databaseUrl: url,
    allowedDatabases: config.allowedDatabases,
    allowedHosts: config.allowedHosts,
  });

  const connection = await mysql.createConnection(config.baseUrl);
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await connection.query(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await cloneSchemaInto(connection, name, sourceDb);
  } finally {
    await connection.end();
  }
  return { name, url };
}

/** Bequemer Setup: Worker-DB provisionieren (anlegen + Schema klonen). */
export async function setUpWorkerDatabase(
  index: number = resolveWorkerIndex(),
  config: WorkerDbConfig = runtimeWorkerDbConfig(),
): Promise<{ name: string; url: string }> {
  return provisionWorkerDatabase(index, config);
}

/**
 * Entfernt die Worker-DB rueckstandsfrei. Validiert das Ziel zuvor gegen den destruktiven
 * Guard. Die Verbindung erfolgt ueber die Basis-Test-DB, nicht ueber die zu loeschende DB.
 */
export async function dropWorkerDatabase(
  index: number = resolveWorkerIndex(),
  config: WorkerDbConfig = runtimeWorkerDbConfig(),
): Promise<void> {
  const name = workerDatabaseName(index);
  const url = workerDatabaseUrl(index, config.baseUrl);

  assertSafeDestructiveOperationTarget({
    mode: "test",
    databaseUrl: url,
    allowedDatabases: config.allowedDatabases,
    allowedHosts: config.allowedHosts,
  });

  const connection = await mysql.createConnection(config.baseUrl);
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);
  } finally {
    await connection.end();
  }
}
