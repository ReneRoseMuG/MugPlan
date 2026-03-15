/**
 * Test Scope:
 *
 * Feature: FT30 - Mitarbeiterabwesenheiten Browser-Workflow
 *
 * Abgedeckte Regeln:
 * - FT30 ist im bestehenden Mitarbeiterformular erreichbar.
 * - Abwesenheiten lassen sich im Browser anlegen, bearbeiten und loeschen.
 * - Die FT30-UI bleibt im Mitarbeiterkontext und ohne Appointment-Bezug.
 *
 * Fehlerfaelle:
 * - FT30-Tab fehlt im Mitarbeiterformular.
 * - CRUD-Aktionen aktualisieren die sichtbare Liste nicht.
 *
 * Ziel:
 * Den isolierten FT30-CRUD-Flow im Browser end-to-end absichern.
 */
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../helpers/browserE2e";
import { resetDatabase } from "../helpers/resetDatabase";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  getRelativeBerlinDate,
  resetTestDataFactoryState,
} from "../helpers/testDataFactory";

test.beforeEach(async () => {
  resetTestDataFactoryState();
  await resetDatabase();
});

test("employee absences CRUD works inside employee form", async ({ page }) => {
  const employee = await createEmployeeFixture("FT30-BROWSER");
  const createFrom = getRelativeBerlinDate(2);
  const createUntil = getRelativeBerlinDate(4);
  const updateUntil = getRelativeBerlinDate(5);

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-abwesenheiten").click();

  await expect(page.getByTestId("employee-absences-panel")).toBeVisible();
  await page.getByTestId("input-employee-absence-from").fill(createFrom);
  await page.getByTestId("input-employee-absence-until").fill(createUntil);
  await page.getByTestId("button-save-employee-absence").click();
  await expect(page.getByTestId("dialog-employee-absence-preview")).toBeVisible();
  await page.keyboard.press("Escape");

  const firstRow = page.locator("[data-testid^='employee-absence-row-']").first();
  await expect(firstRow).toContainText("Urlaub");
  await expect(firstRow).toContainText("bis");

  await firstRow.getByRole("button", { name: "Bearbeiten" }).click();
  await page.getByTestId("select-employee-absence-type").click();
  await page.getByRole("option", { name: "Krankheit" }).click();
  await page.getByTestId("input-employee-absence-until").fill(updateUntil);
  await page.getByTestId("button-save-employee-absence").click();
  await expect(page.getByTestId("dialog-employee-absence-preview")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(firstRow).toContainText("Krankheit");

  await firstRow.getByRole("button", { name: "Loeschen" }).click();
  await expect(page.getByTestId("empty-employee-absences")).toBeVisible();
});

test("employee absences preview can be closed without bulk action and later apply explicit bulk replacement", async ({ page }) => {
  const employee = await createEmployeeFixture("FT30-BROWSER-BULK");
  const replacementEmployee = await createEmployeeFixture("FT30-BROWSER-REPLACEMENT");
  const companionEmployee = await createEmployeeFixture("FT30-BROWSER-COMPANION");
  const project = await createProjectFixture({ prefix: "FT30-BROWSER-BULK" });
  const createFrom = getRelativeBerlinDate(4);
  const createUntil = getRelativeBerlinDate(5);

  const affectedAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: createFrom,
    employeeIds: [employee.id, companionEmployee.id],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-abwesenheiten").click();

  await page.getByTestId("input-employee-absence-from").fill(createFrom);
  await page.getByTestId("input-employee-absence-until").fill(createUntil);
  await page.getByTestId("button-save-employee-absence").click();

  await expect(page.getByTestId("dialog-employee-absence-preview")).toBeVisible();
  await expect(page.getByTestId(`employee-absence-preview-appointment-${affectedAppointment.id}`)).toContainText(createFrom.split("-").reverse().join("."));
  await page.keyboard.press("Escape");

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${affectedAppointment.id}`);
    const body = await response.json();
    return body.employees.map((current: { id: number }) => current.id).sort((left: number, right: number) => left - right);
  }).toEqual([companionEmployee.id, employee.id].sort((left, right) => left - right));

  const previewButton = page.locator("[data-testid^='button-preview-employee-absence-']").first();
  await previewButton.click();
  await expect(page.getByTestId("dialog-employee-absence-preview")).toBeVisible();
  await page.getByTestId("select-employee-absence-replacement").click();
  await page.getByRole("option", { name: new RegExp(replacementEmployee.lastName) }).click();
  await page.getByTestId("button-employee-absence-bulk-replace").click();
  await page.getByRole("button", { name: "Bestaetigen" }).click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${affectedAppointment.id}`);
    const body = await response.json();
    return body.employees.map((current: { id: number }) => current.id).sort((left: number, right: number) => left - right);
  }).toEqual([companionEmployee.id, replacementEmployee.id].sort((left, right) => left - right));
});
