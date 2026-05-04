/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Admin-Benutzerverwaltung bleibt auf kleinen Viewports vertikal scrollbar.
 * - Untere Benutzerzeilen sind bei vielen echten Benutzerdaten sichtbar erreichbar.
 *
 * Fehlerfälle:
 * - Die Benutzerliste wird im festen App-Layout unten abgeschnitten.
 * - Der letzte Benutzer kann nicht in den sichtbaren Bereich gescrollt werden.
 *
 * Ziel:
 * Die Erreichbarkeit der unteren Benutzer in der Adminsicht im echten Browser absichern.
 */
import { expect, test } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

const suitePath = "tests/e2e-browser/users-management-scroll.browser.e2e.spec.ts";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState(suitePath);
});

async function createVisibleUsers(count: number) {
  const { createUser } = await import("../../server/repositories/usersRepository");
  const { hashPassword } = await import("../../server/security/passwordHash");
  const passwordHash = await hashPassword("browser-user-scroll-password");
  const createdUsers: Array<{ id: number; username: string; fullName: string }> = [];

  for (let index = 1; index <= count; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const username = `browser-scroll-user-${suffix}`;
    const firstName = "Scroll";
    const lastName = `Benutzer ${suffix}`;
    const created = await createUser({
      username,
      email: `${username}@example.test`,
      firstName,
      lastName,
      passwordHash,
      roleCode: "READER",
    });
    createdUsers.push({
      id: created.id,
      username,
      fullName: `${firstName} ${lastName}`,
    });
  }

  return createdUsers;
}

test("untere Benutzerzeilen sind auf kleinem Bildschirm per Scroll erreichbar", async ({ page }) => {
  const users = await createVisibleUsers(18);
  const lastUser = users[users.length - 1]!;

  await page.setViewportSize({ width: 1024, height: 520 });
  await loginAsAdmin(page);
  await page.getByTestId("nav-benutzer").click();
  await expect(page.getByText("Benutzerverwaltung", { exact: true })).toBeVisible();
  await expect(page.getByTestId("users-management-table")).toBeVisible();

  const lastRow = page.getByTestId(`users-row-${lastUser.id}`);
  await lastRow.scrollIntoViewIfNeeded();
  await expect(lastRow).toBeVisible();
  await expect(lastRow).toContainText(lastUser.username);
  await expect(lastRow).toContainText(lastUser.fullName);
});
