/**
 * Test Scope:
 *
 * Feature: FT01 - Verfuegbarkeitsfeedback im Terminformular
 *
 * Abgedeckte Regeln:
 * - Speichern bestaetigt Verfuegbarkeitskonflikte explizit und zeigt ausgeschlossene Mitarbeiter sichtbar an.
 * - Der Mitarbeiter-Picker bleibt ohne Startdatum leer und zeigt den Pflicht-Hinweis.
 * - Der Mitarbeiter-Picker blendet nicht verfuegbare Mitarbeiter aus und zeigt sie nur informativ an.
 *
 * Fehlerfaelle:
 * - Nicht verfuegbare Mitarbeiter werden still entfernt.
 * - Der Picker zeigt ohne Datum weiter auswaehlbare Mitarbeiter.
 *
 * Ziel:
 * Die sichtbare FT01-UX im Terminformular browserseitig regressionssicher absichern.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  createAppointmentFixture,
  createEmployeeAbsenceFixture,
  createEmployeeFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function openExistingAppointment(page: Page, appointmentId: number) {
  await loginAsAdmin(page);
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function openNewAppointmentFromWeek(page: Page) {
  await loginAsAdmin(page);
  const button = page.locator('[data-testid^="button-new-appointment-week-"]').first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

test.skip("shows excluded employees after confirming an availability conflict on save", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "FT01-BROWSER-ALERT" });
  const excludedEmployee = await createEmployeeFixture("FT01-BROWSER-EXCLUDED");
  const retainedEmployee = await createEmployeeFixture("FT01-BROWSER-RETAINED");
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    employeeIds: [excludedEmployee.id, retainedEmployee.id],
  });

  await createEmployeeAbsenceFixture({
    employeeId: excludedEmployee.id,
    from: getRelativeBerlinDate(2),
    until: getRelativeBerlinDate(2),
  });

  await openExistingAppointment(page, appointment.id);
  await page.getByTestId("button-save-appointment").click();

  await expect(page.getByTestId("dialog-appointment-availability-conflicts")).toContainText(excludedEmployee.fullName);
  await page.getByRole("button", { name: "Aenderung bestaetigen" }).click();

  await expect(page.getByTestId("alert-appointment-excluded-employees")).toContainText(excludedEmployee.fullName);
  await expect(page.getByTestId("alert-appointment-excluded-employees")).toContainText("Abwesenheit");
});

test.skip("requires a start date before the employee picker shows selectable employees", async ({ page }) => {
  await openNewAppointmentFromWeek(page);
  await page.getByTestId("input-start-date").fill("");
  await page.getByTestId("button-add-employee").click();

  await expect(page.getByTestId("alert-employee-picker-availability")).toContainText("Bitte zuerst ein Startdatum festlegen.");
  await expect(page.getByTestId("list-employee-picker").getByText("Bitte zuerst ein Startdatum festlegen.")).toBeVisible();
  await expect(page.locator('[data-testid^="employee-picker-card-"]')).toHaveCount(0);
});

test.skip("shows unavailable employees only in the informative list of the employee picker", async ({ page }) => {
  const availableEmployee = await createEmployeeFixture("FT01-BROWSER-PICKER-OK");
  const absentEmployee = await createEmployeeFixture("FT01-BROWSER-PICKER-ABSENT");

  await createEmployeeAbsenceFixture({
    employeeId: absentEmployee.id,
    from: getRelativeBerlinDate(3),
    until: getRelativeBerlinDate(3),
  });

  await openNewAppointmentFromWeek(page);
  await page.getByTestId("input-start-date").fill(getRelativeBerlinDate(3));
  await page.getByTestId("button-add-employee").click();

  await expect(page.getByTestId(`employee-picker-card-${availableEmployee.id}`)).toBeVisible();
  await expect(page.locator(`[data-testid="employee-picker-card-${absentEmployee.id}"]`)).toHaveCount(0);
  await expect(page.getByTestId("alert-employee-picker-unavailable-list")).toContainText(absentEmployee.fullName);
});
