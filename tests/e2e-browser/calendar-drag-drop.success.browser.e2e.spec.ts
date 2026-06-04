/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein regulaerer Zukunftstermin laesst sich in der Monatsuebersicht per Drag-and-drop auf einen anderen Zukunftstag verschieben.
 * - Der Monatskalender loest dabei den echten PATCH-Request aus und zeigt den Termin danach am Zieltag.
 *
 * Fehlerfaelle:
 * - Drag-and-drop startet im Monatskalender nicht.
 * - Der Browser verschiebt optisch, aber kein Request wird gesendet.
 * - Der Request ist erfolgreich, der Termin bleibt aber sichtbar am Ursprungstag.
 *
 * Ziel:
 * Einen positiven Browser-Referenztest fuer den normalen D&D-Pfad der Monatsuebersicht bereitstellen.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

function isPointInsideBox(
  point: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number },
) {
  return (
    point.x >= box.x
    && point.x <= box.x + box.width
    && point.y >= box.y
    && point.y <= box.y + box.height
  );
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("moves a regular future appointment onto another future day in the month sheet", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "FT01-BROWSER-MONTH-DND" });
  const tour = await createTourFixture("#0f766e");
  const sourceDate = getRelativeBerlinDate(2);
  const targetDate = getRelativeBerlinDate(3);
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-monatsuebersicht").click();

  const appointmentBar = page.getByTestId(`appointment-bar-${appointment.id}`).first();
  const sourceCalendarDay = page.getByTestId(`month-sheet-day-${sourceDate}`).first();
  const targetCalendarDay = page.getByTestId(`month-sheet-day-${targetDate}`).first();

  await expect(appointmentBar).toBeVisible();

  const patchResponsePromise = page.waitForResponse((response) => (
    response.url().includes(`/api/appointments/${appointment.id}`)
    && response.request().method() === "PATCH"
  ), { timeout: 15_000 });

  await appointmentBar.dragTo(targetCalendarDay);

  const resourceDialog = page.getByTestId("dialog-appointment-move");
  await expect(resourceDialog).toBeVisible();
  await expect(resourceDialog).toContainText("Termin verschieben");
  await resourceDialog.getByTestId("button-appointment-move-confirm").click();

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json() as { startDate: string };
    return body.startDate;
  }).toBe(targetDate);

  await expect(appointmentBar).toBeVisible();

  const [appointmentBarBox, sourceDayBox, targetDayBox] = await Promise.all([
    appointmentBar.boundingBox(),
    sourceCalendarDay.boundingBox(),
    targetCalendarDay.boundingBox(),
  ]);

  expect(appointmentBarBox).not.toBeNull();
  expect(sourceDayBox).not.toBeNull();
  expect(targetDayBox).not.toBeNull();

  const appointmentCenter = {
    x: appointmentBarBox!.x + appointmentBarBox!.width / 2,
    y: appointmentBarBox!.y + appointmentBarBox!.height / 2,
  };

  expect(isPointInsideBox(appointmentCenter, targetDayBox!)).toBe(true);
  expect(isPointInsideBox(appointmentCenter, sourceDayBox!)).toBe(false);
});
