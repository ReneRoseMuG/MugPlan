/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Neuer-Mitarbeiter-Formular zeigt seine Sidebar bereits vor dem ersten Save.
 * - Eine Draft-Notiz und ein Draft-Anhang lassen sich vor dem ersten Save erfassen.
 * - Nach dem ersten Save werden dieselben Sidebar-Daten dem erzeugten Mitarbeiter korrekt zugeordnet.
 * - Beim erneuten Öffnen im Edit-Modus bleiben Notiz und Anhang sichtbar.
 *
 * Fehlerfälle:
 * - Die Create-Sidebar fehlt im Mitarbeiterformular.
 * - Draft-Notizen oder Draft-Anhänge gehen beim ersten Save verloren.
 * - Beim Reopen fehlen dieselben Sidebar-Daten wieder.
 *
 * Ziel:
 * Die Create-Sidebar-Persistenz des Mitarbeiterformulars browserseitig regressionssicher absichern.
 */
import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

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

async function createNoteViaDialog(page: Page, input: { title: string; body: string }) {
  await page.getByTestId("button-new-note").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("input-note-title").fill(input.title);
  await dialog.getByTestId("richtext-editor").fill(input.body);
  await dialog.getByTestId("button-save-note").click();
}

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/employee-form.create-sidebar-persistence.browser.e2e.spec.ts");
});

test("persists note and attachment from the new employee form and restores them on reopen", async ({ page }) => {
  const employeeInput = {
    firstName: "Mila",
    lastName: "Sidebarfluss",
    email: "mila.sidebarfluss@example.test",
  };
  const note = {
    title: "Create Sidebar Mitarbeiternotiz",
    body: "Notiz aus dem Neuer-Mitarbeiter-Formular",
  };
  const attachmentName = "create-employee-sidebar-attachment.txt";

  await openEmployees(page);
  await page.getByTestId("button-new-employee").click();
  await expect(page.getByTestId("button-save-employee")).toBeVisible();
  await expect(page.getByTestId("employee-form-sidebar")).toBeVisible();

  await page.getByTestId("input-employee-firstname").fill(employeeInput.firstName);
  await page.getByTestId("input-employee-lastname").fill(employeeInput.lastName);
  await page.getByTestId("input-employee-email").fill(employeeInput.email);

  await createNoteViaDialog(page, note);
  await expect(
    page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first(),
  ).toBeVisible();

  const fileInput = page.getByTestId("employee-form-sidebar").locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: attachmentName,
    mimeType: "text/plain",
    buffer: Buffer.from("mitarbeiteranhang aus create sidebar", "utf8"),
  });
  await expect(page.getByTestId("employee-form-sidebar").getByText(attachmentName)).toBeVisible();

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
    const response = await page.request.get(`/api/employees/${createdEmployeeId}/notes`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { title: string }) => item.title);
  }).toEqual(expect.arrayContaining([note.title]));

  await expect.poll(async () => {
    const response = await page.request.get(`/api/employees/${createdEmployeeId}/attachments`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { originalName: string }) => item.originalName);
  }).toEqual(expect.arrayContaining([attachmentName]));

  await openEmployees(page);
  const createdEntry = await findEmployeeEntry(page, {
    id: createdEmployeeId,
    lastName: employeeInput.lastName,
  });
  await expect(createdEntry).toContainText(employeeInput.firstName);
  await createdEntry.dblclick();

  await expect(
    page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first(),
  ).toBeVisible();
  await expect(page.getByTestId("employee-form-sidebar").getByText(attachmentName)).toBeVisible();
});
