import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  provisionWorkerDatabase,
  resolveWorkerIndex,
  workerDatabaseUrl,
  type WorkerDbConfig,
} from "./helpers/workerDatabase";

/**
 * AP10 (MS-64): Per-Worker-DB-Injektion fuer worker-parallele Vitest-Laeufe.
 *
 * Dieser Setupfile MUSS vor `setup.integration.ts` laufen. Er setzt die Worker-spezifische
 * MYSQL_DATABASE_URL, BEVOR runtimeEnv/server/db initialisiert werden (dotenv laedt mit
 * override:false; runtimeEnv cached beim ersten Init). So zeigen runtimeEnv, server/db,
 * resetDatabase und der per-DB Reset-Lock auf die Worker-DB statt auf die gemeinsame Test-DB.
 *
 * Aktiv nur bei MUGPLAN_WORKER_DB=1. Ohne dieses Flag (serieller Fallback) ist der Setupfile
 * ein No-op und die Tests laufen unveraendert gegen die gemeinsame Test-DB.
 *
 * Die Provisionierung (drop + create + Schema-Klon aus der Basis-Test-DB) erfolgt idempotent
 * und einmal pro Worker-Prozess (Guard ueber globalThis). Die Konfiguration wird direkt aus
 * .env.test geparst (nicht ueber runtimeEnv), damit der runtimeEnv-Cache nicht vorzeitig auf
 * die Basis-URL festgelegt wird und die Schema-Quelle die echte Basis-Test-DB bleibt.
 */

const WORKER_DB_FLAG = "MUGPLAN_WORKER_DB";
const PROVISIONED_FLAG = "__mugplanWorkerDbProvisioned";

function parseCsv(raw: string | undefined, lowercase = false): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => (lowercase ? value.toLowerCase() : value));
}

if (process.env[WORKER_DB_FLAG] === "1") {
  process.env.NODE_ENV = "test";
  process.env.MUGPLAN_MODE = "test";

  const envPath = path.resolve(process.cwd(), ".env.test");
  if (!fs.existsSync(envPath)) {
    throw new Error(`Worker-DB-Setup: erwartete Env-Datei fehlt: '${envPath}'.`);
  }
  const parsed = dotenv.parse(fs.readFileSync(envPath));

  const baseUrl = (parsed.MYSQL_DATABASE_URL ?? "").trim();
  if (!baseUrl) {
    throw new Error("Worker-DB-Setup: MYSQL_DATABASE_URL fehlt in .env.test.");
  }

  const config: WorkerDbConfig = {
    baseUrl,
    allowedDatabases: parseCsv(parsed.DB_ALLOWED_DATABASES_TEST),
    allowedHosts: parseCsv(parsed.DB_ALLOWED_HOSTS_TEST, true),
  };

  const index = resolveWorkerIndex();

  // Einmal pro Worker-Prozess provisionieren. process.env ueberlebt den Modul-Reset zwischen
  // Testdateien (isolate:true) innerhalb desselben Worker-Prozesses; das Schema bleibt bestehen,
  // die Daten werden pro Test ueber resetDatabase gewischt.
  if (process.env[PROVISIONED_FLAG] !== "1") {
    await provisionWorkerDatabase(index, config);
    process.env[PROVISIONED_FLAG] = "1";
  }

  // Ab hier zeigt die Laufzeit-DB-URL auf die Worker-DB. runtimeEnv (spaeter geladen) laedt
  // .env.test mit override:false und behaelt diesen Wert.
  process.env.MYSQL_DATABASE_URL = workerDatabaseUrl(index, baseUrl);
}
