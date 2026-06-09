import mysql from "mysql2/promise";
import { getRuntimeConfig, initializeRuntimeEnv } from "../../server/config/runtimeEnv";
import {
  assertSafeDestructiveOperationTarget,
  assertSafeWriteTargetForTestMode,
  TEST_WORKER_DATABASE_PATTERN,
} from "../../server/security/dbSafetyGuards";

/**
 * AP03 (MS-64): Worker-Datenbank-Lifecycle.
 *
 * Pro Test-Worker eine eigene temporaere Testdatenbank deterministisch anlegen, ihr Schema
 * aufbauen und nach dem Lauf rueckstandsfrei bereinigen. Wiederverwendbar fuer Browser (AP05)
 * und Integration (AP10).
 *
 * Schemaaufbau per Klon statt Migration:
 * Die Migrationskette des Projekts enthaelt kein From-Scratch-Baseline (Basistabellen wie
 * `project`/`users` werden in keiner Migration erzeugt, sondern stammen historisch aus
 * `drizzle-kit push`). Eine frische DB laesst sich darum ueber `db:migrate:test` nicht
 * aufbauen (FK auf nicht existierende Tabelle). Deshalb wird das Schema jeder Worker-DB aus
 * der bereits korrekten Basis-Test-DB geklont (SHOW CREATE TABLE/VIEW inkl. Fremdschluessel).
 * Das tieferliegende fehlende Baseline-Migrationsskript ist als separater Auftrag zu behandeln.
 *
 * Sicherheit:
 * - Der Worker-DB-Name folgt dem in AP04 verankerten Muster `mugplan_w<index>_test` und wird
 *   vor jeder Operation gegen die zentralen Safety-Guards validiert (Testmodus, Host-Allowlist,
 *   `_test`-Suffix, Muster).
 */

const WORKER_DB_PREFIX = "mugplan_w";
const WORKER_DB_SUFFIX = "_test";

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

/** Baut die Worker-DB-URL aus der Basis-Test-URL, indem der DB-Pfad ersetzt wird. */
export function workerDatabaseUrl(
  index: number = resolveWorkerIndex(),
  baseUrl: string = getRuntimeConfig().mysqlDatabaseUrl,
): string {
  const url = new URL(baseUrl);
  url.pathname = `/${workerDatabaseName(index)}`;
  return url.toString();
}

/** DB-Name der Basis-Test-DB (Schema-Quelle) aus der Laufzeit-URL. */
function baseTestDatabaseName(): string {
  const url = new URL(getRuntimeConfig().mysqlDatabaseUrl);
  return url.pathname.replace(/^\/+/, "").trim();
}

/**
 * Verbindung auf Serverebene (verbunden mit der Basis-Test-DB, die garantiert existiert)
 * fuer DB-uebergreifende Operationen wie CREATE/DROP DATABASE und das Schema-Klonen.
 */
async function connectToServer(): Promise<mysql.Connection> {
  const config = getRuntimeConfig();
  return mysql.createConnection(config.mysqlDatabaseUrl);
}

/**
 * Klont das Schema (Tabellen inkl. Fremdschluessel, danach Views) aus der Basis-Test-DB in
 * die Ziel-DB. Foreign-Key-Checks werden waehrend des Aufbaus deaktiviert, damit die
 * Tabellenreihenfolge keine Rolle spielt.
 */
async function cloneSchemaInto(connection: mysql.Connection, workerName: string): Promise<void> {
  const sourceDb = baseTestDatabaseName();
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
 * Legt die Worker-DB an (idempotent) und klont das Schema aus der Basis-Test-DB.
 * Validiert das Ziel zuvor gegen den Test-Write-Guard.
 */
export async function createWorkerDatabase(
  index: number = resolveWorkerIndex(),
): Promise<{ name: string; url: string }> {
  initializeRuntimeEnv();
  const config = getRuntimeConfig();
  const name = workerDatabaseName(index);
  const url = workerDatabaseUrl(index);

  // Guard: validiert Name (Muster), Host-Allowlist und `_test`-Suffix.
  assertSafeWriteTargetForTestMode(url, config.allowedDatabases, config.allowedHosts);

  const connection = await connectToServer();
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await cloneSchemaInto(connection, name);
  } finally {
    await connection.end();
  }
  return { name, url };
}

/** Bequemer Setup: Worker-DB anlegen und Schema aufbauen. */
export async function setUpWorkerDatabase(
  index: number = resolveWorkerIndex(),
): Promise<{ name: string; url: string }> {
  return createWorkerDatabase(index);
}

/**
 * Entfernt die Worker-DB rueckstandsfrei. Validiert das Ziel zuvor gegen den destruktiven
 * Guard (Testmodus + Write-Target). Die Verbindung erfolgt ueber die Basis-Test-DB, nicht
 * ueber die zu loeschende Worker-DB.
 */
export async function dropWorkerDatabase(
  index: number = resolveWorkerIndex(),
): Promise<void> {
  initializeRuntimeEnv();
  const config = getRuntimeConfig();
  const name = workerDatabaseName(index);
  const url = workerDatabaseUrl(index);

  assertSafeDestructiveOperationTarget({
    mode: "test",
    databaseUrl: url,
    allowedDatabases: config.allowedDatabases,
    allowedHosts: config.allowedHosts,
  });

  const connection = await connectToServer();
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${name}\``);
  } finally {
    await connection.end();
  }
}
