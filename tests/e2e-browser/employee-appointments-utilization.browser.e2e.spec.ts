/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Termine-Tab im Mitarbeiterformular startet weiterhin in der Listenansicht.
 * - Die Auslastungsansicht ist ueber den eigenen Tab erreichbar und zeigt den aktuellen Wochenbereich.
 * - Ein Termin in der Auslastungsansicht zeigt seine verdichteten Vorschauinformationen sichtbar an.
 *
 * Fehlerfaelle:
 * - Der Auslastungs-Tab fehlt oder die Listenansicht ist nicht mehr der Standard.
 * - Die Auslastungsansicht baut keine sichtbare Monatsansicht fuer den Mitarbeiter auf.
 * - Ein Termin in der Auslastungsansicht zeigt die erwarteten Vorschauinformationen nicht mehr an.
 *
 * Ziel:
 * Den sichtbaren Nutzerfluss fuer die aktuelle Mitarbeiter-Auslastungsansicht browserseitig absichern.
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

test("employee form switches from appointments list to utilization view and shows the appointment preview", async ({ page }) => {
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
  await expect(page.getByTestId("table-appointments-list")).toBeVisible();
  await page.getByTestId("tab-employee-auslastung").click();

  const utilizationView = page.getByTestId("employee-utilization-view");
  await expect(utilizationView).toBeVisible();
  await expect(page.getByTestId("employee-utilization-nav-top")).toBeVisible();
  await expect(page.getByTestId("month-sheet-container")).toBeVisible();
  const appointmentCard = page.getByTestId(`month-compact-bar-${appointment.id}`);
  await expect(appointmentCard).toBeVisible();
  await appointmentCard.hover();

  await expect(page.getByText("09:30 |", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("EMP UTIL Projekt").first()).toBeVisible();
  await expect(page.getByText("K: EMP-UTIL", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("PLZ:", { exact: false }).first()).toBeVisible();
});
