/**
 * Test Scope:
 *
 * Feature: FT01 - Historische Termine verhindern
 *
 * Abgedeckte Regeln:
 * - Drag & Drop in der Monatsansicht zeigt die konkrete VALIDATION_ERROR-Message des Servers.
 * - Der Fehler erscheint fuer ein reales Verschieben auf heute mit vergangener Startzeit als sichtbarer Toast.
 *
 * Fehlerfaelle:
 * - Die UI zeigt nur noch einen generischen Reload-Hinweis.
 * - Der Serverfehler geht beim echten Drag-&-Drop-Flow zwischen Request und Toast verloren.
 *
 * Ziel:
 * Das Durchreichen der konkreten Drag-&-Drop-Validierungsmessage im Browser Ende-zu-Ende absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("shows the concrete server validation message after dragging an appointment onto today", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "FT01-BROWSER-DRAGDROP" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    startTime: "00:00:00",
  });
  const today = getRelativeBerlinDate(0);

  await loginAsAdmin(page);
  await page.getByRole("button", { name: /Monats/i }).click();

  const appointmentBar = page.getByTestId(`appointment-bar-${appointment.id}`).first();
  await expect(appointmentBar).toBeVisible();

  const todayCalendarDay = page.getByTestId(`calendar-day-${today}`).first();
  await appointmentBar.dragTo(todayCalendarDay);

  await expect(page.getByText("Fehler beim Verschieben")).toBeVisible();
  await expect(page.getByText("Startzeit liegt in der Vergangenheit", { exact: true }).first()).toBeVisible();
});
