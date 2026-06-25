/**
 * Test Scope:
 *
 * Bereich:
 * - Sichtbare Kalender-Fehlermeldungen beim Drag-and-drop
 *
 * Abgedeckte Regeln:
 * - Drag & Drop in der Monatsübersicht zeigt die konkrete VALIDATION_ERROR-Message des Servers.
 * - Der Fehler erscheint für ein Verschieben auf heute mit vergangener Startzeit als sichtbarer Toast.
 *
 * Fehlerfälle:
 * - Die UI zeigt nur noch einen generischen Reload-Hinweis.
 * - Der Serverfehler geht beim Drag-&-Drop-Flow zwischen Request und Toast verloren.
 *
 * Ziel:
 * Das Durchreichen der konkreten Drag-&-Drop-Validierungsmessage im Browser Ende-zu-Ende absichern.
 *
 * Hinweis zur Mechanik:
 * Der Drag wird per dispatchMonthViewDrop synthetisch ausgelöst (wie in den übrigen
 * Monats-D&D-Tests), weil Playwright dragTo das HTML5-native drop-Event nicht zuverlässig
 * auslöst. Der Server-Validierungs-Flow (PATCH -> 409) und die sichtbare Fehlermeldung
 * werden danach unverändert echt geprüft.
 */
import { expect, test } from "./fixtures";

import {
  createAppointmentFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { closeDispatcherLoginConflictsDialog, loginAsRole, resetBrowserSuiteState } from "../helpers/browserE2e";
import { dispatchMonthViewDrop } from "./helpers/appointment-conflict-helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("shows the concrete server validation message after dragging an appointment onto today", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "FT01-BROWSER-DRAGDROP" });
  const tour = await createTourFixture("#0f766e");
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    startTime: "00:00:00",
    tourId: tour.id,
  });
  const today = getRelativeBerlinDate(0);

  await loginAsRole(page, "DISPATCHER");
  await closeDispatcherLoginConflictsDialog(page);
  await page.getByTestId("nav-monatsuebersicht").click();

  const appointmentBar = page.getByTestId(`appointment-bar-${appointment.id}`).first();
  await expect(appointmentBar).toBeVisible();

  const todayCalendarDay = page.getByTestId(`month-sheet-day-${today}`).first();
  await expect(todayCalendarDay).toBeVisible();

  const patchResponsePromise = page.waitForResponse((response) => (
    response.url().includes(`/api/appointments/${appointment.id}`)
    && response.request().method() === "PATCH"
  ), { timeout: 15_000 });

  await dispatchMonthViewDrop(page, appointment.id, today);

  const resourceDialog = page.getByTestId("dialog-appointment-move");
  await expect(resourceDialog).toBeVisible();
  await expect(resourceDialog).toContainText("Termin verschieben");
  await resourceDialog.getByTestId("button-appointment-move-confirm").click();

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(409);

  const responseBody = JSON.parse(await patchResponse.text()) as { code?: string; message?: string };
  expect(responseBody.code).toBe("VALIDATION_ERROR");
  expect(responseBody.message).toBe("Startzeit liegt in der Vergangenheit");

  await expect(appointmentBar).toBeVisible();

  await expect(page.getByText("Verschieben fehlgeschlagen", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Startzeit liegt in der Vergangenheit", { exact: true }).first()).toBeVisible();
});
