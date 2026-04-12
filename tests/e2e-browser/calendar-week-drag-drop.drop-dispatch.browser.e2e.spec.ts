/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Wochenansicht verarbeitet einen Drop auf ein gueltiges Ziel und sendet den echten PATCH fuer das Appointment.
 *
 * Fehlerfaelle:
 * - Der Wochen-Drop-Pfad loest trotz gueltigem dataTransfer keinen PATCH aus.
 * - Das Appointment bleibt nach einem erfolgreich verarbeiteten Drop auf dem Ursprungsdatum.
 *
 * Ziel:
 * Den eigentlichen Drop-/Persistenzpfad der Wochenansicht getrennt vom nativen Browser-Drag absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("dispatches a week-view drop with appointment data and persists the new target date", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "FT01-BROWSER-WEEK-DROP" });
  const tour = await createTourFixture("#0f766e");
  const sourceDate = getRelativeBerlinDate(2);
  const targetDate = getRelativeBerlinDate(4);

  await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    endDate: targetDate,
    tourId: tour.id,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();

  const targetWeekDay = page.getByTestId(`week-day-${targetDate}-lane-tour-${tour.id}`).first();
  await expect(targetWeekDay).toBeVisible();

  const patchResponsePromise = page.waitForResponse((response) => (
    response.url().includes(`/api/appointments/${appointment.id}`)
    && response.request().method() === "PATCH"
  ), { timeout: 15_000 });

  const dropObserved = await page.evaluate(({ appointmentId, dayTestId }) => {
    const element = document.querySelector(`[data-testid="${dayTestId}"]`);
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    let observed = false;
    element.addEventListener("drop", () => {
      observed = true;
    }, { once: true });

    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", String(appointmentId));

    element.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));

    return observed;
  }, {
    appointmentId: appointment.id,
    dayTestId: `week-day-${targetDate}-lane-tour-${tour.id}`,
  });

  expect(dropObserved).toBe(true);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json() as { startDate: string };
    return body.startDate;
  }).toBe(targetDate);
});
