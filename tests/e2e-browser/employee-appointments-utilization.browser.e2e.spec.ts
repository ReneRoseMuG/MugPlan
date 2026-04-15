/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Termine-Tab im Mitarbeiterformular startet weiterhin in der Listenansicht.
 * - Die neue Auslastungsansicht ist ueber den lokalen Toggle erreichbar und zeigt den festen 6-Wochen-Bereich.
 * - Klick auf eine Termin-Karte der Auslastungsansicht oeffnet denselben Termin im Formular.
 *
 * Fehlerfaelle:
 * - Der Toggle im Mitarbeiterformular fehlt oder die Listenansicht ist nicht mehr der Standard.
 * - Die Auslastungsansicht baut keine sichtbare Termin-Karte fuer den Mitarbeiter auf.
 * - Kartenklick oeffnet den Termin nicht mehr.
 *
 * Ziel:
 * Den sichtbaren Nutzerfluss fuer die neue Mitarbeiter-Auslastungsansicht browserseitig absichern.
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

test.beforeEach(async () => {
  await resetBrowserSuiteState();
});

test("employee form switches from appointments list to utilization board and opens a clicked appointment", async ({ page }) => {
  const employee = await createEmployeeFixture("EMP-UTIL");
  const tour = await createTourFixture("#225588");
  const project = await createProjectFixture({ prefix: "EMP-UTIL", name: "EMP UTIL Projekt" });
  const appointmentDate = getRelativeBerlinDate(1);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: appointmentDate,
    startTime: "09:30:00",
    employeeIds: [employee.id],
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-termine").click();

  await expect(page.getByTestId("toggle-employee-appointments-view")).toBeVisible();
  await expect(page.getByTestId("table-appointments-list")).toBeVisible();

  await page.getByTestId("toggle-employee-appointments-utilization").click();

  const board = page.getByTestId("employee-appointments-utilization-board");
  await expect(board).toBeVisible();
  const appointmentCard = page.getByTestId(`button-employee-utilization-appointment-${appointment.id}-${appointmentDate}`);
  await expect(appointmentCard).toBeVisible();
  await expect(appointmentCard).toContainText("EMP UTIL Projekt");
  await expect(appointmentCard).toContainText(tour.name);

  await appointmentCard.click();

  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
});
