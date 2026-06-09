/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein neuer Mitarbeiter kann im Create-Formular vor dem ersten Save einen Draft-Tag erhalten.
 * - Der gewählte Mitarbeitertag wird beim ersten Save persistiert.
 * - Nach dem erneuten Öffnen bleibt derselbe Tag sichtbar.
 * - Die Mitarbeiterkarte zeigt den persistierten Tag weiter an und grenzt gleichnamige Konkurrenz ohne Tag ab.
 *
 * Fehlerfälle:
 * - Draft-Tags gehen beim ersten Save verloren.
 * - Persistierte Mitarbeitertags fehlen nach dem Reopen wieder.
 * - Die Mitarbeiterkarte verliert den sichtbaren Tag oder zeigt ihn auch bei ungetaggter Konkurrenz.
 *
 * Ziel:
 * Den echten Auswahl-, Speicher- und Wiederfinde-Pfad für Mitarbeitertags browserseitig regressionssicher absichern.
 */
import { expect, test, type Page } from "./fixtures";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createEmployeeFixtureWithOverrides,
  createTagFixture,
} from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

async function openEmployees(page: Page) {
  await loginAsAdmin(page);
  await page.goto("/standalone/employees");
  await expect(page.getByTestId("button-new-employee")).toBeVisible();
}

async function findEmployeeEntry(page: Page, employee: { id: number; lastName: string }) {
  await page.locator("#employee-filter-last-name").fill(employee.lastName);

  const tableRow = page.getByTestId("table-employees").locator("tbody tr")
    .filter({ hasText: employee.lastName })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  return page.getByTestId(`employee-card-${employee.id}`).first();
}

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/employee-tags.persistence.browser.e2e.spec.ts");
});

test("persists a draft employee tag on first save and keeps it visible on reopen and card view", async ({ page }) => {
  const tag = await createTagFixture("FT28-EMPLOYEE-TAG");
  const distractorEmployee = await createEmployeeFixtureWithOverrides({
    prefix: "FT28-EMPLOYEE-TAG-DISTRACTOR",
    firstName: "Dora",
    lastName: "Tagfluss",
    email: "dora.tagfluss@example.test",
  });
  const createdEmployeeInput = {
    firstName: "Clara",
    lastName: "Tagfluss",
    email: "clara.tagfluss@example.test",
  };

  await openEmployees(page);
  await page.getByTestId("button-new-employee").click();
  await expect(page.getByTestId("button-save-employee")).toBeVisible();

  await page.getByTestId("input-employee-firstname").fill(createdEmployeeInput.firstName);
  await page.getByTestId("input-employee-lastname").fill(createdEmployeeInput.lastName);
  await page.getByTestId("input-employee-email").fill(createdEmployeeInput.email);

  await page.getByTestId("employee-tag-picker-button-add").click();
  await page.getByTestId(`employee-tag-picker-add-tag-${tag.id}-add`).click();
  await expect(page.getByTestId(`employee-tag-picker-tag-${tag.id}`)).toBeVisible();

  const createdEmployeeResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/employees"
  ));
  await page.getByTestId("button-save-employee").click();
  const createdEmployeeResponse = await createdEmployeeResponsePromise;
  expect(createdEmployeeResponse.ok(), await createdEmployeeResponse.text()).toBeTruthy();

  const createdEmployee = (await createdEmployeeResponse.json()) as { id: number };
  const createdEmployeeId = Number(createdEmployee.id);
  expect(createdEmployeeId).toBeGreaterThan(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/employees/${createdEmployeeId}/tags`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { tag: { id: number } }) => item.tag.id);
  }).toEqual(expect.arrayContaining([tag.id]));

  await openEmployees(page);
  const createdEntry = await findEmployeeEntry(page, {
    id: createdEmployeeId,
    lastName: createdEmployeeInput.lastName,
  });
  await expect(createdEntry).toContainText(createdEmployeeInput.firstName);
  await createdEntry.dblclick();
  await expect(page.getByTestId(`employee-tag-picker-tag-${tag.id}`)).toBeVisible();

  await openEmployees(page);
  const createdCard = page.getByTestId(`employee-card-${createdEmployeeId}`).first();
  const distractorCard = page.getByTestId(`employee-card-${distractorEmployee.id}`).first();
  await expect(createdCard).toBeVisible();
  await expect(distractorCard).toBeVisible();
  await expect(page.getByTestId(`employee-card-tags-${createdEmployeeId}-tag-${tag.id}`)).toBeVisible();
  await expect(page.getByTestId(`employee-card-tags-${distractorEmployee.id}-tag-${tag.id}`)).toHaveCount(0);
});
