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

test.skip("shows and resolves the availability confirmation dialog during drag and drop", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "FT01-BROWSER-DD-AVAIL" });
  const excludedEmployee = await createEmployeeFixture("FT01-BROWSER-DD-ABSENT");
  const retainedEmployee = await createEmployeeFixture("FT01-BROWSER-DD-KEEP");
  const sourceDate = getRelativeBerlinDate(5);
  const targetDate = getRelativeBerlinDate(7);
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    employeeIds: [excludedEmployee.id, retainedEmployee.id],
  });

  await createEmployeeAbsenceFixture({
    employeeId: excludedEmployee.id,
    from: targetDate,
    until: targetDate,
  });

  await loginAsAdmin(page);
  await page.getByRole("button", { name: /Monats/i }).click();

  const appointmentBar = page.getByTestId(`appointment-bar-${appointment.id}`).first();
  await expect(appointmentBar).toBeVisible();
  await appointmentBar.dragTo(page.getByTestId(`calendar-day-${targetDate}`).first());

  await expect(page.getByTestId("dialog-calendar-month-availability-conflicts")).toContainText(excludedEmployee.fullName);
  await page.getByRole("button", { name: "Abbrechen" }).click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json();
    return {
      startDate: body.startDate,
      employees: body.employees.map((employee: { id: number }) => employee.id).sort((left: number, right: number) => left - right),
    };
  }).toEqual({
    startDate: sourceDate,
    employees: [excludedEmployee.id, retainedEmployee.id].sort((left, right) => left - right),
  });

  await appointmentBar.dragTo(page.getByTestId(`calendar-day-${targetDate}`).first());
  await expect(page.getByTestId("dialog-calendar-month-availability-conflicts")).toContainText(excludedEmployee.fullName);
  await page.getByRole("button", { name: "Trotzdem verschieben" }).click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json();
    return {
      startDate: body.startDate,
      employees: body.employees.map((employee: { id: number }) => employee.id),
    };
  }).toEqual({
    startDate: targetDate,
    employees: [retainedEmployee.id],
  });
});
