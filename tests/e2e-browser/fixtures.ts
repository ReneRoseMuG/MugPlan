import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { test as base } from "@playwright/test";
import { workerDatabaseUrl } from "../helpers/workerDatabase";

/**
 * AP05/AP07 (MS-64): Worker-bewusste Playwright-Fixtures fuer parallele Browser-Tests.
 *
 * WICHTIG: Browser-Specs muessen `test`/`expect` aus DIESER Datei importieren (statt aus
 * "@playwright/test"), und zwar als ERSTEN Import. Der Bootstrap-Block unten setzt
 * MYSQL_DATABASE_URL auf die Worker-DB, BEVOR die nachfolgenden Spec-Imports
 * (browserE2e, testDataFactory -> server/db) den DB-Pool erzeugen (override:false in
 * runtimeEnv haelt den Wert). So zeigt der DB-Zugriff im Spec-Prozess (resetDatabase,
 * Repositories, Factory) auf dieselbe Worker-DB wie der zugehoerige Worker-Server.
 *
 * Aktiv nur bei PLAYWRIGHT_PARALLEL=1. Ohne dieses Flag (serieller Fallback) ist der
 * Bootstrap ein No-op und baseURL zeigt auf den Standard-Port -> unveraendertes Verhalten.
 *
 * Kein Produktionscode: ausschliesslich Testinfrastruktur + Env-Variablen.
 */

const PARALLEL = process.env.PLAYWRIGHT_PARALLEL === "1";
const PORT_BASE = Number(process.env.PLAYWRIGHT_PORT ?? "4174");

if (PARALLEL) {
  process.env.NODE_ENV = "test";
  process.env.MUGPLAN_MODE = "test";

  const envPath = path.resolve(process.cwd(), ".env.test");
  if (!fs.existsSync(envPath)) {
    throw new Error(`Browser-Worker-Setup: erwartete Env-Datei fehlt: '${envPath}'.`);
  }
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  const baseUrl = (parsed.MYSQL_DATABASE_URL ?? "").trim();
  if (!baseUrl) {
    throw new Error("Browser-Worker-Setup: MYSQL_DATABASE_URL fehlt in .env.test.");
  }

  // WICHTIG: parallelIndex (TEST_PARALLEL_INDEX), NICHT workerIndex. workerIndex steigt global
  // bei jedem Worker-Ersatz (z. B. nach einem Testfehler) und uebersteigt dann die Worker-Zahl;
  // parallelIndex bleibt in [0, workers) und wird bei Ersatz-Workern wiederverwendet -> passt
  // zu den vorab provisionierten Worker-DBs und Server-Ports.
  const index = Number.parseInt(process.env.TEST_PARALLEL_INDEX ?? "0", 10) || 0;
  process.env.MYSQL_DATABASE_URL = workerDatabaseUrl(index, baseUrl);
}

export const test = base.extend({
  // baseURL auf den Server-Port des parallelIndex zeigen lassen. Im seriellen Modus ist
  // parallelIndex 0 -> PORT_BASE (identisch zur bisherigen Konfiguration).
  baseURL: async ({}, use, testInfo) => {
    await use(`http://127.0.0.1:${PORT_BASE + testInfo.parallelIndex}`);
  },
});

// Alles Uebrige (expect, Page, Locator, devices, ...) unveraendert aus @playwright/test
// durchreichen; der lokale `test`-Export (oben) hat Vorrang vor dem Stern-Re-Export.
export * from "@playwright/test";
