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
import { getISOWeek, getISOWeekYear, parseISO } from "date-fns";

import { db } from "../../server/db";
import { tourWeekEmployees } from "../../shared/schema";
import {
  createAppointmentFixture,
  createEmployeeFixture,
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
  const targetDate = getRelativeBerlinDate(3);

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

  const patchResponsePromise = page.waitForResponse((response) => (
    response.url().includes(`/api/appointments/${appointment.id}`)
    && response.request().method() === "PATCH"
  ), { timeout: 15_000 });

  const dropObserved = await page.evaluate(async ({ appointmentId, sourceTestId, dayTestId }) => {
    const source = document.querySelector(`[data-testid="${sourceTestId}"]`);
    if (!(source instanceof HTMLElement)) {
      return false;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", String(appointmentId));

    source.dispatchEvent(new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const element = document.querySelector(`[data-testid="${dayTestId}"]`);
    if (!(element instanceof HTMLElement)) {
      source.dispatchEvent(new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
      return false;
    }

    let observed = false;
    element.addEventListener("drop", () => {
      observed = true;
    }, { once: true });

    element.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));
    source.dispatchEvent(new DragEvent("dragend", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));

    return observed;
  }, {
    appointmentId: appointment.id,
    sourceTestId: `week-appointment-panel-${appointment.id}`,
    dayTestId: `week-day-drop-overlay-${targetDate}-lane-tour-${tour.id}`,
  });

  expect(dropObserved).toBe(true);

  const resourceDialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(resourceDialog).toBeVisible();
  await expect(resourceDialog).toContainText("Termin verschieben");
  await resourceDialog.getByTestId("button-tour-employee-cascade-confirm").click();

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json() as { startDate: string };
    return body.startDate;
  }).toBe(targetDate);
});

test("dispatches a week-view drop to another tour and replaces employees from the target week planning", async ({ page }) => {
  const project = await createProjectFixture({ prefix: "FT04-BROWSER-WEEK-DROP-TOUR" });
  const sourceTour = await createTourFixture("#0f766e");
  const targetTour = await createTourFixture("#7c3aed");
  const currentEmployee = await createEmployeeFixture("FT04-WEEK-DROP-OLD");
  const plannedEmployee = await createEmployeeFixture("FT04-WEEK-DROP-PLAN");
  const sourceDate = getRelativeBerlinDate(2);
  const targetDate = getRelativeBerlinDate(3);
  const targetParsedDate = parseISO(targetDate);

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: getISOWeekYear(targetParsedDate),
    isoWeek: getISOWeek(targetParsedDate),
    employeeId: plannedEmployee.id,
  });

  await createAppointmentFixture({
    projectId: project.id,
    startDate: targetDate,
    tourId: targetTour.id,
    employeeIds: [],
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [currentEmployee.id],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();

  const patchResponsePromise = page.waitForResponse((response) => (
    response.url().includes(`/api/appointments/${appointment.id}`)
    && response.request().method() === "PATCH"
  ), { timeout: 15_000 });

  const dropObserved = await page.evaluate(async ({ appointmentId, sourceTestId, dayTestId }) => {
    const source = document.querySelector(`[data-testid="${sourceTestId}"]`);
    if (!(source instanceof HTMLElement)) {
      return false;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", String(appointmentId));

    source.dispatchEvent(new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const element = document.querySelector(`[data-testid="${dayTestId}"]`);
    if (!(element instanceof HTMLElement)) {
      source.dispatchEvent(new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
      return false;
    }

    let observed = false;
    element.addEventListener("drop", () => {
      observed = true;
    }, { once: true });

    element.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));
    source.dispatchEvent(new DragEvent("dragend", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));

    return observed;
  }, {
    appointmentId: appointment.id,
    sourceTestId: `week-appointment-panel-${appointment.id}`,
    dayTestId: `week-day-drop-overlay-${targetDate}-lane-tour-${targetTour.id}`,
  });

  expect(dropObserved).toBe(true);

  const resourceDialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(resourceDialog).toBeVisible();
  await expect(resourceDialog).toContainText("Termin verschieben");
  await expect(resourceDialog).toContainText("Mitarbeiter werden ersetzt");
  await expect(resourceDialog.getByTestId(`appointment-week-preview-status-${currentEmployee.id}`)).toContainText(
    "Wird vom Termin entfernt",
  );
  await expect(resourceDialog.getByTestId(`appointment-week-preview-checkbox-${plannedEmployee.id}`)).toBeChecked();
  await expect(resourceDialog.getByTestId("button-appointment-week-mode-additive")).toHaveCount(0);
  await expect(resourceDialog.getByTestId("button-appointment-week-mode-replace")).toHaveCount(0);
  await resourceDialog.getByTestId("button-tour-employee-cascade-confirm").click();

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json() as { startDate: string; tourId: number; employees: Array<{ id: number }> };
    return {
      startDate: body.startDate,
      tourId: body.tourId,
      employeeIds: body.employees.map((employee) => employee.id).sort((a, b) => a - b),
    };
  }).toEqual({
    startDate: targetDate,
    tourId: targetTour.id,
    employeeIds: [plannedEmployee.id],
  });
});
