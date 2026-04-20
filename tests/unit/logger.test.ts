/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Logger schreibt normale, Error- und Auth-Eintraege in echte Dateien auf einem Temp-Dateisystem.
 * - Error-Logs werden zusaetzlich in error.log geschrieben.
 * - Auth-Logs werden zusaetzlich in auth.log geschrieben.
 * - LOG_DIR ueberschreibt den Standardpfad fuer Laufzeitlogs.
 *
 * Fehlerfaelle:
 * - Nicht-Error-Logs duerfen nicht in error.log landen.
 * - Das Log-Verzeichnis muss vor dem Schreiben defensiv erzeugt werden.
 *
 * Ziel:
 * Absicherung der neuen Dateiaufteilung fuer Laufzeit-, Error- und Auth-Logs
 * mit echten Dateisystemzugriffen in einem isolierten Temp-Verzeichnis.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let tempRoot: string | null = null;

function restoreEnv(): void {
  process.env = { ...originalEnv };
}

async function createTempRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "mugplan-logger-"));
}

async function importLogger() {
  return import("../../server/lib/logger");
}

async function waitForFile(filePath: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return await fs.readFile(filePath, "utf8");
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error(`Timed out waiting for log file '${filePath}'.`);
}

async function waitForFileContent(filePath: string, expectedSnippet: string): Promise<string> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      if (content.includes(expectedSnippet)) {
        return content;
      }
    } catch {
      // Retry until the async append has flushed content.
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for '${expectedSnippet}' in log file '${filePath}'.`);
}

describe("logger runtime file routing", () => {
  beforeEach(async () => {
    vi.resetModules();
    restoreEnv();
    delete process.env.LOG_DIR;
    delete process.env.LOG_HTTP_MODE;
    delete process.env.LOG_HTTP_SLOW_MS;
    delete process.env.LOG_SQL;
    process.env.LOG_LEVEL = "INFO";
    process.chdir(repoRoot);
    tempRoot = await createTempRoot();
    process.chdir(tempRoot);
  });

  afterEach(async () => {
    restoreEnv();
    process.chdir(repoRoot);
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
      tempRoot = null;
    }
  });

  it("logError writes to daily log and error.log", async () => {
    const { logError } = await importLogger();
    const dailyFileName = `${new Date().toISOString().slice(0, 10)}.log`;

    logError("kaputt", { code: "E_FAIL" });

    const logDir = path.resolve(tempRoot!, "app-logs");
    const dailyLogPath = path.join(logDir, dailyFileName);
    const errorLogPath = path.join(logDir, "error.log");

    const [dailyContent, errorContent] = await Promise.all([
      waitForFileContent(dailyLogPath, "[ERROR] kaputt"),
      waitForFileContent(errorLogPath, "[ERROR] kaputt"),
    ]);

    expect(await fs.stat(logDir)).toBeTruthy();
    expect(dailyContent).toContain("[ERROR] kaputt");
    expect(dailyContent).toContain('"code":"E_FAIL"');
    expect(errorContent).toContain("[ERROR] kaputt");
  });

  it("logInfo writes only to the daily log", async () => {
    const { logInfo } = await importLogger();
    const dailyFileName = `${new Date().toISOString().slice(0, 10)}.log`;

    logInfo("alles gut");

    const logDir = path.resolve(tempRoot!, "app-logs");
    const dailyLogPath = path.join(logDir, dailyFileName);
    const errorLogPath = path.join(logDir, "error.log");
    const dailyContent = await waitForFileContent(dailyLogPath, "[INFO] alles gut");

    expect(dailyContent).toContain("[INFO] alles gut");
    await expect(fs.access(errorLogPath)).rejects.toThrow();
  });

  it("logAuth writes to the daily log and auth.log", async () => {
    const { logAuth } = await importLogger();
    const dailyFileName = `${new Date().toISOString().slice(0, 10)}.log`;

    logAuth("login_success", { userId: 7 });

    const logDir = path.resolve(tempRoot!, "app-logs");
    const dailyLogPath = path.join(logDir, dailyFileName);
    const authLogPath = path.join(logDir, "auth.log");

    const [dailyContent, authContent] = await Promise.all([
      waitForFileContent(dailyLogPath, "[INFO] [auth] login_success"),
      waitForFileContent(authLogPath, "[INFO] [auth] login_success"),
    ]);

    expect(dailyContent).toContain("[INFO] [auth] login_success");
    expect(dailyContent).toContain('"userId":7');
    expect(authContent).toContain("[INFO] [auth] login_success");
    expect(authContent).toContain('"userId":7');
  });

  it("uses YYYY-MM-DD.log for the daily file name", async () => {
    const { logWarn } = await importLogger();
    const expectedDailyFileName = `${new Date().toISOString().slice(0, 10)}.log`;

    logWarn("achtung");

    const logDir = path.resolve(tempRoot!, "app-logs");
    const dailyLogPath = path.join(logDir, expectedDailyFileName);
    const dailyContent = await waitForFileContent(dailyLogPath, "[WARN] achtung");

    expect(dailyContent).toContain("[WARN] achtung");
  });

  it("respects LOG_DIR overrides", async () => {
    process.env.LOG_DIR = "./custom-runtime-logs";
    const { logInfo } = await importLogger();

    logInfo("anderswo");

    const dailyFileName = `${new Date().toISOString().slice(0, 10)}.log`;
    const customDir = path.resolve(tempRoot!, "custom-runtime-logs");
    const customDailyLogPath = path.join(customDir, dailyFileName);
    const customDailyContent = await waitForFileContent(customDailyLogPath, "[INFO] anderswo");

    expect(customDailyContent).toContain("[INFO] anderswo");
  });
});
