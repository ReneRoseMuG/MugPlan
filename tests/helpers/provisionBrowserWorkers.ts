import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { provisionWorkerDatabase, type WorkerDbConfig } from "./workerDatabase";
import { prepareWorkerStorage } from "./workerStorage";

/**
 * AP05 (MS-64): Vorstufe fuer den parallelen Browser-Modus.
 *
 * Provisioniert VOR dem Start der Playwright-Worker-Server fuer jeden Worker-Index eine eigene
 * Worker-DB (Schema-Klon aus der Basis-Test-DB) und legt isolierte Storage-Verzeichnisse an.
 *
 * Warum nicht in playwright globalSetup: Playwright startet den webServer VOR globalSetup. Die
 * Worker-Server wuerden also gegen noch nicht provisionierte DBs booten und scheitern. Daher
 * laeuft diese Provisionierung als eigener Schritt vor `playwright test` (siehe package.json
 * Skript test:e2e:browser:parallel).
 *
 * Worker-Anzahl aus PLAYWRIGHT_WORKERS (Default 4); muss mit der Playwright-Worker-Zahl
 * uebereinstimmen.
 */
function parseCsv(raw: string | undefined, lowercase = false): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => (lowercase ? value.toLowerCase() : value));
}

async function main(): Promise<void> {
  const workers = Math.max(1, Number(process.env.PLAYWRIGHT_WORKERS ?? "4"));

  const envPath = path.resolve(process.cwd(), ".env.test");
  if (!fs.existsSync(envPath)) {
    throw new Error(`Browser-Worker-Provisionierung: erwartete Env-Datei fehlt: '${envPath}'.`);
  }
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  const baseUrl = (parsed.MYSQL_DATABASE_URL ?? "").trim();
  if (!baseUrl) {
    throw new Error("Browser-Worker-Provisionierung: MYSQL_DATABASE_URL fehlt in .env.test.");
  }

  const config: WorkerDbConfig = {
    baseUrl,
    allowedDatabases: parseCsv(parsed.DB_ALLOWED_DATABASES_TEST),
    allowedHosts: parseCsv(parsed.DB_ALLOWED_HOSTS_TEST, true),
  };

  for (let index = 0; index < workers; index += 1) {
    prepareWorkerStorage(index);
    // eslint-disable-next-line no-await-in-loop -- sequentielle Provisionierung ist gewollt
    const { name } = await provisionWorkerDatabase(index, config);
    // eslint-disable-next-line no-console
    console.log(`[provision] worker DB bereit: ${name}`);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
