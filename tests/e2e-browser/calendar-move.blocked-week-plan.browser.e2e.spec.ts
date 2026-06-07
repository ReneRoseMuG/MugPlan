/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Termin ohne Mitarbeiter, Wochenplanung vorhanden, aber alle geplanten Mitarbeiter
 *   am Zieltermin durch doppelte Planung gesperrt → Mitarbeiter-Schritt erscheint.
 * - Der Mitarbeiter-Schritt zeigt die Warnung "Der Termin hat keine geplanten Mitarbeiter."
 * - Nach Bestätigung wird der Termin ohne Mitarbeiter gespeichert/verschoben.
 * - Gilt für alle drei Mutations-Pfade: Formular-Speichern, Wochenkalender D&D, Monatskalender D&D.
 *
 * Fehlerfälle:
 * - Dialog erscheint nicht obwohl Termin keine Mitarbeiter hat und Wochenplanung vorhanden ist.
 * - Gesperrter Mitarbeiter wird trotzdem auf den Termin übernommen.
 * - Mitarbeiter-Schritt fehlt und der Termin wird stillschweigend ohne Rückmeldung gespeichert.
 * - Konfliktanzeige im Auswahl-Schritt fehlt.
 *
 * Isolationsklasse: B · Baseline: core · Storage: none
 *
 * Ziel:
 * Das korrekte Dialog-Verhalten bei komplett gesperrter Wochenplanung im echten Browser
 * für alle drei Mutations-Pfade absichern.
 */
import { expect, test } from "@playwright/test";

import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  dispatchWeekViewDrop,
  insertTourWeekEmployee,
  navigateToWeekView,
  navigateWeekOffset,
  openAppointmentFormInWeekView,
  resolveWeek,
} from "./helpers/appointment-conflict-helpers";

test.describe.configure({ mode: "serial" });

let week: ReturnType<typeof resolveWeek>;
let tour: Awaited<ReturnType<typeof createTourFixture>>;
let blockedEmployee: Awaited<ReturnType<typeof createEmployeeFixture>>;
let project: Awaited<ReturnType<typeof createProjectFixture>>;

test.beforeAll(async () => {
  await resetBrowserSuiteState();

  week = resolveWeek(1);
  tour = await createTourFixture("#775511");
  blockedEmployee = await createEmployeeFixture("BWKP-BLOCKED");
  project = await createProjectFixture({ prefix: "BWKP", name: "BWKP Projekt" });

  // Bestehender Termin am Zieltermin macht blockedEmployee dort nicht verfügbar
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [blockedEmployee.id],
  });

  // blockedEmployee ist in der Wochenplanung der Tour eingetragen
  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, blockedEmployee.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// BWK-01: Formular-Speichern
// ─────────────────────────────────────────────────────────────────────────────

test("BWK-01: Formular-Speichern – gesperrter Wochenplan-Mitarbeiter löst Mitarbeiter-Schritt aus, Termin wird ohne Mitarbeiter gespeichert", async ({ page }) => {
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, sourceAppointment.id, 1);

  // Datum auf den Tag verschieben, an dem blockedEmployee bereits verplant ist
  await page.getByTestId("input-start-date").fill(week.weekSecondDate);
  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();

  // Ressourcen-Schritt: blockedEmployee als Konflikt sichtbar
  await expect(dialog.getByTestId("appointment-save-review-step-resources")).toBeVisible();
  await expect(dialog.getByTestId(`appointment-week-preview-status-${blockedEmployee.id}`)).toBeVisible();

  // Weiter → Mitarbeiter-Schritt
  await dialog.getByTestId("button-appointment-save-review-next").click();

  await expect(dialog.getByTestId("appointment-save-review-step-no-employees")).toBeVisible();
  await expect(dialog).toContainText("Der Termin hat keine geplanten Mitarbeiter.");

  const confirmButton = dialog.getByTestId("button-appointment-save-review-confirm");
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${sourceAppointment.id}`);
    const body = await response.json();
    return {
      startDate: body.startDate,
      employeeCount: (body.employees as Array<{ id: number }>).length,
    };
  }).toEqual({ startDate: week.weekSecondDate, employeeCount: 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// BWK-02: Wochenkalender D&D
// ─────────────────────────────────────────────────────────────────────────────

test("BWK-02: Wochenkalender D&D – gesperrter Wochenplan-Mitarbeiter löst Mitarbeiter-Schritt aus, Termin wird ohne Mitarbeiter verschoben", async ({ page }) => {
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 1);

  await expect(page.getByTestId(`week-appointment-panel-${sourceAppointment.id}`)).toBeVisible();

  const patchResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/appointments/${sourceAppointment.id}`) && response.request().method() === "PATCH",
    { timeout: 15_000 },
  );

  const dropped = await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekSecondDate, tour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Auswahl-Schritt: Konflikthinweis und blockedEmployee als gesperrt sichtbar
  await expect(dialog.getByTestId("appointment-move-selection-list")).toBeVisible();
  await expect(dialog).toContainText("doppelter Planung nicht verfügbar");
  await expect(dialog.getByTestId(`appointment-move-preview-status-${blockedEmployee.id}`)).toBeVisible();

  // Weiter → Mitarbeiter-Schritt
  await dialog.getByRole("button", { name: "Weiter" }).click();

  await expect(dialog.getByTestId("appointment-move-step-no-employees")).toBeVisible();
  await expect(dialog).toContainText("Der Termin hat keine geplanten Mitarbeiter.");

  const confirmButton = dialog.getByTestId("button-appointment-move-confirm");
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(dialog).toHaveCount(0);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${sourceAppointment.id}`);
    const body = await response.json();
    return {
      startDate: body.startDate,
      employeeCount: (body.employees as Array<{ id: number }>).length,
    };
  }).toEqual({ startDate: week.weekSecondDate, employeeCount: 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// BWK-03: Monatskalender D&D
// ─────────────────────────────────────────────────────────────────────────────

test("BWK-03: Monatskalender D&D – gesperrter Wochenplan-Mitarbeiter löst Mitarbeiter-Schritt aus, Termin wird ohne Mitarbeiter verschoben", async ({ page }) => {
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-monatsuebersicht").click();

  const appointmentBar = page.getByTestId(`appointment-bar-${sourceAppointment.id}`).first();
  const targetCalendarDay = page.getByTestId(`month-sheet-day-${week.weekSecondDate}`).first();

  await expect(appointmentBar).toBeVisible();

  const patchResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/appointments/${sourceAppointment.id}`) && response.request().method() === "PATCH",
    { timeout: 15_000 },
  );

  await appointmentBar.dragTo(targetCalendarDay);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Auswahl-Schritt: Konflikthinweis und blockedEmployee als gesperrt sichtbar
  await expect(dialog.getByTestId("appointment-move-selection-list")).toBeVisible();
  await expect(dialog).toContainText("doppelter Planung nicht verfügbar");
  await expect(dialog.getByTestId(`appointment-move-preview-status-${blockedEmployee.id}`)).toBeVisible();

  // Weiter → Mitarbeiter-Schritt
  await dialog.getByRole("button", { name: "Weiter" }).click();

  await expect(dialog.getByTestId("appointment-move-step-no-employees")).toBeVisible();
  await expect(dialog).toContainText("Der Termin hat keine geplanten Mitarbeiter.");

  const confirmButton = dialog.getByTestId("button-appointment-move-confirm");
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(dialog).toHaveCount(0);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${sourceAppointment.id}`);
    const body = await response.json();
    return {
      startDate: body.startDate,
      employeeCount: (body.employees as Array<{ id: number }>).length,
    };
  }).toEqual({ startDate: week.weekSecondDate, employeeCount: 0 });
});
