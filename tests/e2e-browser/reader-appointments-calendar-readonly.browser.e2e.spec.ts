/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Leser sehen in Wochen- und Monatskalender keine UI-Einstiege zur Terminanlage.
 * - Leser können bestehende Kalendereinträge weiter öffnen.
 * - Das Terminformular bleibt für Leser ein reiner Lesedialog ohne Mutationsaktionen.
 *
 * Fehlerfälle:
 * - Kalender zeigen für Leser weiterhin `+`-Buttons zur Terminanlage.
 * - Bestehende Termine lassen sich aus dem Kalender nicht mehr öffnen.
 * - Das Terminformular zeigt für Leser weiterhin Save-/Delete-/Park-/Storno- oder Sidebar-Mutationen.
 *
 * Ziel:
 * Die Leser-Readonly-Regeln für Kalender und Terminformular browserseitig gegen sichtbare Regressionspfade absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createCustomerFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe("Reader appointments and calendars readonly", () => {
  test.describe.configure({ mode: "serial" });

  let appointmentId: number;

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-appointments-calendar-readonly.browser.e2e.spec.ts");

    const customer = await createCustomerFixture("READER-CAL-CUST");
    const project = await createProjectFixture({
      prefix: "READER-CAL-PROJ",
      customerId: customer.id,
      name: "Reader Kalender Projekt",
    });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(2),
    });

    appointmentId = appointment.id;
  });

  test("hides create entrypoints in week and month calendar views for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-wochenuebersicht").click();
    await expect(page.getByTestId(`week-appointment-panel-${appointmentId}`).first()).toBeVisible();
    await expect(page.locator('[data-testid^="button-new-appointment-week-"]')).toHaveCount(0);

    await page.getByTestId("nav-monatsuebersicht").click();
    await expect(page.getByTestId("month-sheet-container")).toBeVisible();
    await expect(page.locator('[data-testid^="button-new-appointment-month-sheet-"]')).toHaveCount(0);
  });

  test("opens existing appointments from the week calendar in readonly mode for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-wochenuebersicht").click();
    const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`).first();
    await expect(appointmentPanel).toBeVisible();

    await appointmentPanel.dblclick();

    await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-cancel-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-park-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-delete-appointment")).toHaveCount(0);
    await expect(page.getByTestId("button-add-employee")).toHaveCount(0);
    await expect(page.getByTestId("appointment-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
  });
});
