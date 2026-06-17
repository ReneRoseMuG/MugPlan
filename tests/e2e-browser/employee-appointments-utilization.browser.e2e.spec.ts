/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Termine-Tab im Mitarbeiterformular startet weiterhin in der Listenansicht.
 * - Die Auslastungsansicht ist ueber den eigenen Tab erreichbar und zeigt die Monatsnavigation mit KW-Sprung.
 * - Ein Termin in der Auslastungsansicht zeigt seine verdichteten Vorschauinformationen sichtbar an.
 *
 * Fehlerfaelle:
 * - Der Auslastungs-Tab fehlt oder die Listenansicht ist nicht mehr der Standard.
 * - Die Auslastungsansicht baut keine sichtbare Monatsansicht fuer den Mitarbeiter auf oder zeigt noch die Alt-Navigation.
 * - Ein Termin in der Auslastungsansicht zeigt die erwarteten Vorschauinformationen nicht mehr an.
 *
 * Ziel:
 * Den sichtbaren Nutzerfluss fuer die an den Monatskalender angeglichene Mitarbeiter-Auslastungsansicht browserseitig absichern.
 */
import { expect, test } from "./fixtures";

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
  await expect(page.getByTestId("button-prev")).toBeVisible();
  await expect(page.getByTestId("button-next")).toBeVisible();
  await expect(page.getByTestId("input-calendar-kw-jump")).toBeVisible();
  await expect(page.getByTestId("button-utilization-earlier")).toHaveCount(0);
  await expect(page.getByTestId("month-sheet-container")).toBeVisible();
  const appointmentCard = page.getByTestId(`month-compact-bar-${appointment.id}`);
  await expect(appointmentCard).toBeVisible();
  const appointmentBar = page.getByTestId(`appointment-bar-${appointment.id}`).first();
  await expect(appointmentBar).toBeVisible();
  await appointmentBar.scrollIntoViewIfNeeded();
  // cursor-Mode-HoverPreview: betreten und zusätzlich im Element bewegen, damit das Vorschaupanel öffnet
  await appointmentBar.hover();
  const barBox = await appointmentBar.boundingBox();
  if (barBox) {
    await page.mouse.move(barBox.x + barBox.width / 2 + 3, barBox.y + barBox.height / 2);
  }
  const previewPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`).first();
  await expect(previewPanel).toBeVisible();

  await expect(previewPanel).toContainText("09:30");
  await expect(previewPanel).toContainText("EMP UTIL Projekt");
  await expect(previewPanel).toContainText("K: EMP-UTIL");
  await expect(previewPanel).toContainText("PLZ:");
});
