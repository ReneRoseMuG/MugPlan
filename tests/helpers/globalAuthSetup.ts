import fs from "fs";
import path from "path";
import { chromium, type Page } from "@playwright/test";

const PORT_BASE = Number(process.env.PLAYWRIGHT_PORT ?? "4174");
const PARALLEL = process.env.PLAYWRIGHT_PARALLEL === "1";
const WORKERS = Math.max(1, Number(process.env.PLAYWRIGHT_WORKERS ?? (PARALLEL ? "4" : "1")));

/**
 * Pfad zur gespeicherten Admin-Auth-State-Datei fuer einen Playwright-Worker.
 * Wird von fixtures.ts importiert um den korrekten Worker-Pfad zu laden.
 */
export function adminAuthStatePath(parallelIndex: number): string {
  return path.join("test-results", `auth-admin-${parallelIndex}.json`);
}

async function loginToServer(page: Page, serverUrl: string): Promise<void> {
  // Diagnose: Konsolen-/Seitenfehler sammeln, um einen Fehlstart der SPA sichtbar zu machen.
  const consoleErrors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => { consoleErrors.push(`pageerror: ${err.message}`); });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      // domcontentloaded statt load: die SPA-Shell genuegt; auf "load" zu warten kann bei
      // kaltem Vite-Cache unnoetig lange blockieren.
      await page.goto(`${serverUrl}/`, { timeout: 60_000, waitUntil: "domcontentloaded" });
      break;
    } catch {
      if (attempt === 2) {
        throw new Error(`[globalAuthSetup] Server nicht erreichbar: ${serverUrl}`);
      }
      await new Promise<void>((r) => { setTimeout(r, 2_000); });
    }
  }

  const sidebar = page.getByTestId("sidebar");
  const loginField = page.getByLabel("Benutzername oder E-Mail");
  const setupUsername = page.getByLabel("Admin Benutzername");

  // Auf den ersten gerenderten Zustand warten: bereits eingeloggt (sidebar), regulaeres Login-
  // Formular oder – bei frisch provisionierter, noch leerer Worker-DB – der Admin-Setup-Screen
  // ("Ersteinrichtung"). Der allererste Seitenaufbau optimiert bei kaltem Vite-Cache die
  // Dependencies im middlewareMode-Server und kann deutlich laenger als der Standard-Timeout dauern.
  try {
    await Promise.race([
      sidebar.waitFor({ state: "visible", timeout: 120_000 }),
      loginField.waitFor({ state: "visible", timeout: 120_000 }),
      setupUsername.waitFor({ state: "visible", timeout: 120_000 }),
    ]);
  } catch (error) {
    const url = page.url();
    const title = await page.title().catch(() => "?");
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 1500) ?? "").catch(() => "?");
    throw new Error(
      `[globalAuthSetup] Weder Login-, Setup- noch App-Shell sichtbar bei ${serverUrl}.\n`
      + `URL: ${url}\nTitle: ${title}\n`
      + `Console-Fehler: ${consoleErrors.slice(0, 12).join(" | ") || "(keine)"}\n`
      + `Body(1500): ${bodyText}`,
    );
  }

  if (await sidebar.isVisible().catch(() => false)) return;

  // Frisch provisionierte Worker-DBs enthalten nur das Schema (keinen Admin). Dann zeigt die App
  // die Ersteinrichtung: initialen Admin anlegen. setupAdmin meldet den Admin direkt an (Session).
  // Gleiche Credentials wie der spaetere resetDatabase-Admin, damit userId=1 konsistent bleibt.
  if (await setupUsername.isVisible().catch(() => false)) {
    await setupUsername.fill("test-admin");
    await page.getByLabel("Admin Passwort").fill("test-admin-password");
    await page.getByRole("button", { name: "Admin anlegen" }).click();
    await sidebar.waitFor({ state: "visible", timeout: 30_000 });
    return;
  }

  await loginField.fill("test-admin");
  await page.getByLabel("Passwort").fill("test-admin-password");
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes("/api/auth/login") && resp.request().method() === "POST",
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: "Anmelden" }).click(),
  ]);
  await sidebar.waitFor({ state: "visible", timeout: 30_000 });
}

/**
 * Playwright globalSetup: laeuft einmalig nach dem Start aller Worker-Server und vor
 * dem ersten Test. Loggt den Admin-User bei jedem Worker-Server ein und speichert den
 * session-State als storageState-Datei. Die Fixtures laden diesen State in den
 * Browser-Kontext jedes Tests – so entfaellt der Login-Durchlauf in >90 % der Tests.
 *
 * Warum die Session browsertest-Tests ueberlebt:
 * - express-session nutzt einen In-Memory-Store (nicht DB-gespeichert).
 * - resetDatabase() bereinigt den Store nicht.
 * - Der Admin-User wird nach jedem Reset als erstes mit userId=1 angelegt.
 * - Daher bleibt das Session-Cookie mit userId=1 nach resetDatabase() gueltig.
 */
export default async function globalAuthSetup(): Promise<void> {
  fs.mkdirSync("test-results", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (let index = 0; index < WORKERS; index += 1) {
      const serverUrl = `http://127.0.0.1:${PORT_BASE + index}`;
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await loginToServer(page, serverUrl);
        const authPath = adminAuthStatePath(index);
        await context.storageState({ path: authPath });
        // eslint-disable-next-line no-console
        console.log(`[globalAuthSetup] worker ${index}: auth gespeichert → ${authPath}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
