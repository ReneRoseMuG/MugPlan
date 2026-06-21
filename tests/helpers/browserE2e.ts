import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { applyTestSystemSeed, resetDatabase } from "./resetDatabase";
import { readIsolationExecutionConfigForSuite } from "./testIsolationExecution";
import { resetTestDataFactoryState } from "./testDataFactory";
import { resetIsolatedTestStorage } from "./testStorageIsolation";

type BrowserRoleCode = "ADMIN" | "DISPATCHER" | "READER";

export async function resetBrowserSuiteState(testPath?: string) {
  const resolvedSuitePath = resolveBrowserSuitePath(testPath);
  const config = readIsolationExecutionConfigForSuite(resolvedSuitePath);

  await resetIsolatedTestStorage();
  resetTestDataFactoryState();
  await resetDatabase();
  if (config.baseline === "seeded") {
    await applyTestSystemSeed();
  }

  // AP02/AP06 (MS-64): Fingerprint-/Canary-Checks des Alt-Isolations-Frameworks entfernt.
  // Im worker-isolierten Modell (eigene DB + eigenes Storage je Worker) bieten sie keinen
  // zusaetzlichen Schutz und sind unter Parallelitaet fehleranfaellig (Storage-Fingerprint im
  // Spec-Prozess). Die baseline-Entscheidung (core/seeded) bleibt erhalten.
}

function resolveBrowserSuitePath(testPath?: string) {
  if (testPath) {
    return testPath;
  }

  const stack = new Error().stack ?? "";
  const stackLines = stack.split("\n");

  for (const line of stackLines) {
    const match = line.match(/tests[\\/](e2e-browser[\\/][^:\)\s]+\.spec\.ts)/);
    if (match?.[1]) {
      return `tests/${match[1].replaceAll("\\", "/")}`;
    }
  }

  return "browser-suite";
}

async function isVisible(locator: ReturnType<Page["getByTestId"]> | ReturnType<Page["getByLabel"]>) {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

export async function loginAsAdmin(page: Page) {
  await loginAsRole(page, "ADMIN");
}

async function ensureBrowserRoleUser(roleCode: Exclude<BrowserRoleCode, "ADMIN">) {
  const username = `browser-${roleCode.toLowerCase()}`;
  const password = `browser-${roleCode.toLowerCase()}-password`;
  const { getAuthUserByUsername, createUser } = await import("../../server/repositories/usersRepository");
  const existingUser = await getAuthUserByUsername(username);
  if (!existingUser) {
    const { hashPassword } = await import("../../server/security/passwordHash");
    await createUser({
      username,
      email: `${username}@local.test`,
      firstName: "Browser",
      lastName: roleCode,
      passwordHash: await hashPassword(password),
      roleCode,
    });
  }

  return { username, password };
}

export async function loginAsRole(page: Page, roleCode: BrowserRoleCode) {
  const credentials = roleCode === "ADMIN"
    ? { username: "test-admin", password: "test-admin-password" }
    : await ensureBrowserRoleUser(roleCode);

  // AP-auth-opt: Prueft ob bereits eine gueltige Session der richtigen Rolle vorliegt
  // (z. B. via globalAuthSetup-storageState). Short-circuit auf ~0.5 s statt ~3 s Login.
  // Bei falschem Role-Code wird sauber abgemeldet und dann neu eingeloggt.
  try {
    const sessionResp = await page.request.get("/api/auth/session");
    if (sessionResp.ok()) {
      const session = await sessionResp.json() as { roleCode?: string };
      if (session.roleCode === roleCode) {
        if (!(await isVisible(page.getByTestId("sidebar")))) {
          await page.goto("/");
        }
        await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId("nav-termine")).toBeVisible({ timeout: 15_000 });
        return;
      }
      // Eingeloggt als falsche Rolle → abmelden, dann weiter mit normalem Login
      await page.request.post("/api/auth/logout");
    }
  } catch {
    // Netzwerkfehler oder noch kein Server erreichbar → normaler Login-Ablauf
  }

  try {
    await page.goto("/");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ERR_CONNECTION_FAILED")) {
      throw error;
    }
    await page.waitForTimeout(1000);
    await page.goto("/");
  }

  const loginField = page.getByLabel("Benutzername oder E-Mail");
  const passwordField = page.getByLabel("Passwort");
  const sidebar = page.getByTestId("sidebar");
  const appointmentsNav = page.getByTestId("nav-termine");

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isVisible(sidebar) || await isVisible(appointmentsNav)) {
      await expect(sidebar).toBeVisible({ timeout: 15_000 });
      await expect(appointmentsNav).toBeVisible({ timeout: 15_000 });
      return;
    }

    if (await isVisible(loginField)) {
      await passwordField.fill(credentials.password);
      await loginField.fill(credentials.username);
      await Promise.all([
        page.waitForResponse((response) => (
          response.url().includes("/api/auth/login")
          && response.request().method() === "POST"
        ), { timeout: 15_000 }),
        page.getByRole("button", { name: "Anmelden" }).click(),
      ]);
      await expect(sidebar).toBeVisible({ timeout: 15_000 });
      await expect(appointmentsNav).toBeVisible({ timeout: 15_000 });
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Neither login screen nor authenticated app shell became visible in loginAsRole(${roleCode}).`);
}

export async function loginAsReader(page: Page) {
  await loginAsRole(page, "READER");
}

export async function closeDispatcherLoginConflictsDialog(page: Page) {
  const dialog = page.getByTestId("dialog-dispatcher-login-conflicts");
  await dialog.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByTestId("button-close-dispatcher-login-conflicts").click();
    await expect(dialog).toBeHidden();
  }
}

export async function confirmAppointmentSaveReviewIfVisible(page: Page) {
  const dialog = page.getByTestId("dialog-appointment-save-review");
  await dialog.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (!(await dialog.isVisible().catch(() => false))) {
    return false;
  }

  for (let step = 0; step < 5; step += 1) {
    const nextButton = dialog.getByTestId("button-appointment-save-review-next");
    if (await nextButton.isVisible().catch(() => false)) {
      await expect(nextButton).toBeEnabled();
      await nextButton.click();
      continue;
    }

    const confirmButton = dialog.getByTestId("button-appointment-save-review-confirm");
    if (await confirmButton.isVisible().catch(() => false)) {
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();
      return true;
    }
  }

  throw new Error("Appointment save review dialog did not expose a confirmable step.");
}
