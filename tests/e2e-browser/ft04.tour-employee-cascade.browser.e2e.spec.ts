/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Neue Touren duerfen Mitarbeiter direkt ohne Kaskaden-Dialog speichern.
 * - Bestehende Touren fuehren Mitarbeiter-Hinzufuegen und -Abziehen nur ueber den selektiven Vorschau-Dialog aus.
 * - Die Sammelbuttons starten aus leerer Auswahl und steuern die Kaskadenselektion sichtbar.
 *
 * Fehlerfaelle:
 * - Bestehende Touren mutieren Mitarbeiter weiter still ueber den normalen Save-Flow.
 * - Die selektive Checkbox-Auswahl wird bei der Kaskade ignoriert.
 *
 * Ziel:
 * Die sichtbare FT04-UX fuer direkte Erstzuweisung und bestaetigungspflichtige Kaskaden browserseitig regressionssicher absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("creates a new tour with direct initial employee assignment and no cascade dialog", async ({ page }) => {
  const employee = await createEmployeeFixture("FT04-BROWSER-CREATE");

  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId("button-new-tour").click();
  await page.getByTestId("button-add-tour-member").click();
  await page.getByTestId(`employee-picker-card-${employee.id}`).dblclick();

  await expect(page.getByTestId("dialog-tour-employee-cascade")).toHaveCount(0);
  await page.getByTestId("button-save-tour").click();
  await expect(page.getByTestId("button-new-tour")).toBeVisible();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/employees/${employee.id}`);
    const payload = await response.json();
    return payload.employee.tourId;
  }).not.toBeNull();
});

test("uses the cascade dialog for adding and removing members on existing tours", async ({ page }) => {
  const tour = await createTourFixture("#4477aa");
  const candidate = await createEmployeeFixture("FT04-BROWSER-CANDIDATE");
  const project = await createProjectFixture({ prefix: "FT04-BROWSER", name: "FT04 Browser Projekt" });

  const firstAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    tourId: tour.id,
  });
  const secondAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();

  await page.getByTestId("button-add-tour-member").click();
  await page.getByTestId(`employee-picker-card-${candidate.id}`).dblclick();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Mitarbeiter zu Tour-Terminen hinzufügen");
  await expect(dialog.getByTestId("text-tour-employee-cascade-range")).toContainText("Termine (2) - Termine im Zeitraum von");
  await expect(dialog).not.toContainText("Mitarbeiter:");
  await expect(dialog).toContainText("FT04 Browser Projekt");
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${firstAppointment!.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${secondAppointment!.id}`)).toBeVisible();
  await expect(dialog.getByTestId("button-tour-cascade-select-all")).toBeVisible();
  await expect(dialog.getByTestId("button-tour-cascade-deselect-all")).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${firstAppointment!.id}`)).not.toBeChecked();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${secondAppointment!.id}`)).not.toBeChecked();
  await dialog.getByTestId("button-tour-cascade-select-all").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${firstAppointment!.id}`)).toBeChecked();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${secondAppointment!.id}`)).toBeChecked();
  await dialog.getByTestId(`tour-employee-cascade-checkbox-${secondAppointment!.id}`).click();
  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${firstAppointment!.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b);
  }).toEqual([candidate.id]);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${secondAppointment!.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b);
  }).toEqual([]);

  await page.getByTestId("button-close-tour").click();
  await page.getByTestId("nav-mitarbeiter").click();
  const employeeCard = page.getByTestId(`employee-card-${candidate.id}`);
  await expect(employeeCard.getByTestId(`badge-employee-tour-${candidate.id}`)).toContainText(tour.name);
  await expect(employeeCard.getByTestId(`text-employee-current-appointments-${candidate.id}`)).toContainText("1");

  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tour.id}`).dblclick();

  await page.getByTestId(`badge-tour-member-${candidate.id}-remove`).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Mitarbeiter von Tour-Terminen abziehen");
  await expect(dialog.getByTestId("text-tour-employee-cascade-range")).toContainText("Termine (1) - Termine im Zeitraum von");
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${firstAppointment!.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${firstAppointment!.id}`)).not.toBeChecked();
  await dialog.getByTestId("button-tour-cascade-deselect-all").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${firstAppointment!.id}`)).not.toBeChecked();
  await dialog.getByTestId("button-tour-cascade-select-all").click();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${firstAppointment!.id}`)).toBeChecked();
  await expect(dialog.getByTestId("button-tour-employee-cascade-confirm")).toBeVisible();
  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/employees/${candidate.id}`);
    const payload = await response.json();
    return payload.employee.tourId;
  }).toBeNull();

  await page.getByTestId("button-close-tour").click();
  await page.getByTestId("nav-mitarbeiter").click();
  await expect(page.getByTestId(`badge-employee-tour-${candidate.id}`)).toHaveCount(0);
  await expect(page.getByTestId(`text-employee-current-appointments-${candidate.id}`)).toContainText("0");
});
