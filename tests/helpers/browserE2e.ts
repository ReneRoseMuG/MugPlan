import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { applyTestSystemSeed, resetDatabase } from "./resetDatabase";
import {
  assertIsolationFingerprintForConfiguredRun,
  injectConfiguredCanariesForRun,
  readIsolationExecutionConfigForSuite,
  shouldInjectConfiguredCanaries,
} from "./testIsolationExecution";
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
  await assertIsolationFingerprintForConfiguredRun(resolvedSuitePath);

  if (shouldInjectConfiguredCanaries()) {
    await injectConfiguredCanariesForRun();
  }
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
