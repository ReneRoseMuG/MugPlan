/**
 * Test Scope:
 *
 * Feature: MS-64 / AP03 - Worker-Datenbank-Lifecycle
 *
 * Abgedeckte Regeln:
 * - Aus einem Worker-Index entsteht reproduzierbar genau eine DB mit `_test`-Suffix.
 * - Das Schema der Worker-DB wird vollstaendig aus der Basis-Test-DB geklont
 *   (gleiche Tabellenanzahl, Kerntabellen vorhanden, Fremdschluessel uebernommen).
 * - Die Bereinigung entfernt die Worker-DB rueckstandsfrei.
 *
 * Fehlerfaelle:
 * - Fehlende Kerntabellen oder fehlende Fremdschluessel nach dem Aufbau gelten als Fehler.
 * - Restbestand der Worker-DB nach Teardown gilt als Fehler.
 *
 * Ziel:
 * Den per-Worker-DB-Lebenszyklus (Anlegen, Schema-Klon, Bereinigen) als Fundament fuer
 * worker-parallele Browser- (AP05) und Integrationstests (AP10) absichern.
 *
 * Isolation: Klasse S (legt eine eigene, eindeutig benannte Worker-DB an und loescht sie
 * wieder; beruehrt die gemeinsame Test-DB nicht). Baseline: core. Storage: none.
 */
import mysql from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";
import { getRuntimeConfig } from "../../../server/config/runtimeEnv";
import {
  dropWorkerDatabase,
  setUpWorkerDatabase,
  workerDatabaseName,
  workerDatabaseUrl,
} from "../../helpers/workerDatabase";

// Bewusst hoher, kollisionsfreier Index, der nicht mit realen Worker-Indizes (0..N) kollidiert.
const TEST_WORKER_INDEX = 970;

function baseDbName(): string {
  return new URL(getRuntimeConfig().mysqlDatabaseUrl).pathname.replace(/^\/+/, "").trim();
}

async function withServerConnection<T>(fn: (c: mysql.Connection) => Promise<T>): Promise<T> {
  const connection = await mysql.createConnection(getRuntimeConfig().mysqlDatabaseUrl);
  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
}

async function schemaExists(name: string): Promise<boolean> {
  return withServerConnection(async (connection) => {
    const [rows] = await connection.query(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
      [name],
    );
    return Array.isArray(rows) && rows.length > 0;
  });
}

async function tableCount(schema: string): Promise<number> {
  return withServerConnection(async (connection) => {
    const [rows] = await connection.query(
      "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
      [schema],
    );
    return Number((rows as Array<{ n: number }>)[0]?.n ?? 0);
  });
}

async function tableExists(schema: string, table: string): Promise<boolean> {
  return withServerConnection(async (connection) => {
    const [rows] = await connection.query(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1",
      [schema, table],
    );
    return Array.isArray(rows) && rows.length > 0;
  });
}

async function foreignKeyCount(schema: string): Promise<number> {
  return withServerConnection(async (connection) => {
    const [rows] = await connection.query(
      "SELECT COUNT(*) AS n FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL",
      [schema],
    );
    return Number((rows as Array<{ n: number }>)[0]?.n ?? 0);
  });
}

describe("MS-64 AP03: worker database lifecycle", () => {
  afterAll(async () => {
    // Sicherheitsnetz: auch bei fehlgeschlagenem Test keine Worker-DB zuruecklassen.
    await dropWorkerDatabase(TEST_WORKER_INDEX);
  });

  it("derives a deterministic *_test database name from the worker index", () => {
    expect(workerDatabaseName(TEST_WORKER_INDEX)).toBe("mugplan_w970_test");
    expect(workerDatabaseName(TEST_WORKER_INDEX).endsWith("_test")).toBe(true);
    expect(workerDatabaseUrl(TEST_WORKER_INDEX)).toContain("/mugplan_w970_test");
  });

  it("creates the worker database and clones the full schema incl. foreign keys", async () => {
    const { name } = await setUpWorkerDatabase(TEST_WORKER_INDEX);
    expect(name).toBe("mugplan_w970_test");
    expect(await schemaExists(name)).toBe(true);

    // Kerntabellen vorhanden.
    for (const table of ["project", "users", "customer", "appointments", "employee"]) {
      expect(await tableExists(name, table), `expected table '${table}' in worker DB`).toBe(true);
    }

    // Gleiche Tabellenanzahl wie die Quelle (vollstaendiger Klon).
    const source = baseDbName();
    expect(await tableCount(name)).toBe(await tableCount(source));

    // Fremdschluessel wurden uebernommen (Beleg gegen reines CREATE TABLE LIKE).
    expect(await foreignKeyCount(name)).toBeGreaterThan(0);
  }, 120_000);

  it("removes the worker database without residue", async () => {
    await dropWorkerDatabase(TEST_WORKER_INDEX);
    expect(await schemaExists(workerDatabaseName(TEST_WORKER_INDEX))).toBe(false);
  }, 60_000);
});
