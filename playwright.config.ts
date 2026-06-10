import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { configureTestStorageIsolationSync } from "./tests/helpers/testStorageIsolation";
import { workerDatabaseUrl } from "./tests/helpers/workerDatabase";
import { workerStoragePaths } from "./tests/helpers/workerStorage";

process.env.NODE_ENV ??= "test";
process.env.MUGPLAN_MODE ??= "test";

// AP05/AP07 (MS-64): Parallel-Modus ueber PLAYWRIGHT_PARALLEL=1. Im seriellen Modus bleibt das
// bisherige Verhalten exakt erhalten (ein Server auf PORT_BASE, gemeinsame mugplan_test).
const PARALLEL = process.env.PLAYWRIGHT_PARALLEL === "1";
const PORT_BASE = Number(process.env.PLAYWRIGHT_PORT ?? "4174");
const WORKERS = Math.max(1, Number(process.env.PLAYWRIGHT_WORKERS ?? (PARALLEL ? "4" : "1")));

type WebServerConfig = NonNullable<Parameters<typeof defineConfig>[0]["webServer"]>;

function serialWebServer(): WebServerConfig {
  // Bisheriges Verhalten: ein Server, Storage-Isolation ueber den Haupt-Prozess gesetzt.
  configureTestStorageIsolationSync();
  return {
    command:
      `cross-env NODE_ENV=test MUGPLAN_MODE=test LOG_LEVEL=OFF PORT=${PORT_BASE} ` +
      `ATTACHMENT_STORAGE_PATH="${process.env.ATTACHMENT_STORAGE_PATH}" ` +
      `BACKUP_BASE_PATH="${process.env.BACKUP_BASE_PATH}" tsx server/index.ts`,
    url: `http://127.0.0.1:${PORT_BASE}`,
    timeout: 180_000,
    reuseExistingServer: false,
  };
}

function parallelWebServers(): WebServerConfig {
  const envPath = path.resolve(process.cwd(), ".env.test");
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  const baseUrl = (parsed.MYSQL_DATABASE_URL ?? "").trim();

  return Array.from({ length: WORKERS }, (_, index) => {
    const port = PORT_BASE + index;
    const storage = workerStoragePaths(index);
    // Server-Env inkl. Worker-DB-URL ueber das env-Feld (nicht im Kommandostring -> kein Secret
    // in der Prozessliste). Worker-DBs werden vorab im globalSetup provisioniert.
    const env = {
      ...process.env,
      NODE_ENV: "test",
      MUGPLAN_MODE: "test",
      LOG_LEVEL: "OFF",
      PORT: String(port),
      MYSQL_DATABASE_URL: workerDatabaseUrl(index, baseUrl),
      ATTACHMENT_STORAGE_PATH: storage.uploadsPath,
      BACKUP_BASE_PATH: storage.backupsPath,
      CORRECTION_WORKFLOW_OUTPUT_DIR: storage.correctionWorkflowsPath,
    } as Record<string, string>;

    return {
      command: "tsx server/index.ts",
      url: `http://127.0.0.1:${port}`,
      timeout: 180_000,
      reuseExistingServer: false,
      env,
    };
  });
}

export default defineConfig({
  testDir: "tests/e2e-browser",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  // Datei-Parallelitaet ueber getrennte Worker; Tests innerhalb einer Datei bleiben seriell.
  fullyParallel: false,
  workers: WORKERS,
  retries: process.env.CI ? 1 : 0,
  // Konsolen-Reporter (list) wie bisher; zusaetzlich ein maschinenlesbares JSON-Ergebnis,
  // damit die Abschluss-Zusammenfassung (Anzahl bestanden/fehlgeschlagen/uebersprungen) auch
  // dann verlaesslich vorliegt, wenn die Konsolenausgabe gekuerzt wird. test-results/ ist
  // bereits in .gitignore, das Artefakt wird also nicht eingecheckt.
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/browser-results.json" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT_BASE}`,
    headless: true,
    trace: "on-first-retry",
  },
  webServer: PARALLEL ? parallelWebServers() : serialWebServer(),
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
