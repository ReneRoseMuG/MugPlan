/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Termin ohne Mitarbeiter, Wochenplanung vorhanden, aber alle geplanten Mitarbeiter
 *   am Zieltermin durch doppelte Planung gesperrt → Mitarbeiter-Schritt erscheint.
 * - Der Auswahl-Schritt zeigt den Konflikthinweis und benennt die Konsequenz.
 * - Nach Bestätigung wird der Termin ohne Mitarbeiter gespeichert/verschoben.
 * - D&D innerhalb derselben Tour und KW setzt keinen Preview-Pfad →
 *   BWK-02 testet deshalb Cross-Tour-D&D im Wochenkalender.
 * - BWK-03 testet Cross-KW-D&D im Monatskalender (gleiche Tour, andere KW).
 *
 * Fehlerfälle:
 * - Dialog erscheint nicht obwohl Termin keine Mitarbeiter hat und Wochenplanung vorhanden ist.
 * - Gesperrter Mitarbeiter wird trotzdem auf den Termin übernommen.
 * - Konfliktanzeige im Auswahl-Schritt fehlt.
 * - Konsequenztext ("Der Termin wird ohne Mitarbeiter …") fehlt im Auswahl-Schritt.
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

let week1: ReturnType<typeof resolveWeek>;
let week2: ReturnType<typeof resolveWeek>;
let sourceTour: Awaited<ReturnType<typeof createTourFixture>>;
let targetTour: Awaited<ReturnType<typeof createTourFixture>>;
// BWK-01 + BWK-03: gesperrter Mitarbeiter in sourceTour-Wochenplänen (KW1 + KW2)
let blockedEmployee: Awaited<ReturnType<typeof createEmployeeFixture>>;
// BWK-02: separater Mitarbeiter für targetTour-Wochenplan (KW1) –
// uq_twe_year_week_employee erlaubt einen Mitarbeiter nur in einer Tour-Wochenplanung pro KW
let blockedEmployee2: Awaited<ReturnType<typeof createEmployeeFixture>>;
let project: Awaited<ReturnType<typeof createProjectFixture>>;

test.beforeAll(async () => {
  await resetBrowserSuiteState();

  week1 = resolveWeek(1);
  week2 = resolveWeek(2);
  sourceTour = await createTourFixture("#775511");
  targetTour = await createTourFixture("#116688");
  blockedEmployee = await createEmployeeFixture("BWKP-BLOCKED");
  blockedEmployee2 = await createEmployeeFixture("BWKP-BLOCKED2");
  project = await createProjectFixture({ prefix: "BWKP", name: "BWKP Projekt" });

  // Sperrt blockedEmployee auf weekSecondDate (employee-global, gilt für BWK-01).
  // targetTour als Tour-Träger, damit targetTours Lane im Wochenkalender sichtbar ist (BWK-02).
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week1.weekSecondDate,
    tourId: targetTour.id,
    employeeIds: [blockedEmployee.id],
  });

  // Sperrt blockedEmployee2 auf weekSecondDate (gilt für BWK-02) und
  // hält targetTours Lane im Wochenkalender weiterhin sichtbar.
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week1.weekSecondDate,
    tourId: targetTour.id,
    employeeIds: [blockedEmployee2.id],
  });

  // Wochenpläne für KW1:
  // blockedEmployee in sourceTour (BWK-01 Formular-Speichern)
  await insertTourWeekEmployee(sourceTour.id, week1.isoYear, week1.isoWeek, blockedEmployee.id);
  // blockedEmployee2 in targetTour (BWK-02 Cross-Tour-D&D) – separater Mitarbeiter wegen Unique-Constraint
  await insertTourWeekEmployee(targetTour.id, week1.isoYear, week1.isoWeek, blockedEmployee2.id);

  // Für BWK-03: blockedEmployee auf week2.weekStartDate sperren + Wochenplan KW2 in sourceTour
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week2.weekStartDate,
    tourId: sourceTour.id,
    employeeIds: [blockedEmployee.id],
  });
  await insertTourWeekEmployee(sourceTour.id, week2.isoYear, week2.isoWeek, blockedEmployee.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// BWK-01: Formular-Speichern (Datumswechsel innerhalb selber Tour + KW)
// ─────────────────────────────────────────────────────────────────────────────

test("BWK-01: Formular-Speichern – gesperrter Wochenplan-Mitarbeiter zeigt Konflikt und Konsequenz, Termin wird ohne Mitarbeiter gespeichert", async ({ page }) => {
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week1.weekStartDate,
    tourId: sourceTour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, sourceAppointment.id, 1);

  // Datum auf den Tag verschieben, an dem blockedEmployee bereits verplant ist
  await page.getByTestId("input-start-date").fill(week1.weekSecondDate);
  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();

  // Ressourcen-Schritt: blockedEmployee als Konflikt sichtbar, Konsequenztext prominent vorhanden
  await expect(dialog.getByTestId("appointment-save-review-step-resources")).toBeVisible();
  await expect(dialog.getByTestId(`appointment-week-preview-status-${blockedEmployee.id}`)).toBeVisible();
  await expect(dialog).toContainText("Der Termin wird ohne Mitarbeiter gespeichert.");

  // Ressourcen-Schritt ist einziger Schritt → Bestätigen direkt
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
  }).toEqual({ startDate: week1.weekSecondDate, employeeCount: 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// BWK-02: Wochenkalender Cross-Tour-D&D
// ─────────────────────────────────────────────────────────────────────────────

test("BWK-02: Wochenkalender Cross-Tour-D&D – gesperrter Wochenplan-Mitarbeiter zeigt Konflikt und Konsequenz, Termin wird ohne Mitarbeiter verschoben", async ({ page }) => {
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week1.weekStartDate,
    tourId: sourceTour.id,
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

  // Cross-Tour-D&D: sourceTour → targetTour auf weekSecondDate
  const dropped = await dispatchWeekViewDrop(page, sourceAppointment.id, week1.weekSecondDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Auswahl-Schritt: Konflikthinweis + Konsequenz prominent + blockedEmployee2 als gesperrt sichtbar
  await expect(dialog.getByTestId("appointment-move-selection-list")).toBeVisible();
  await expect(dialog).toContainText("doppelter Planung nicht verfügbar");
  await expect(dialog).toContainText("Der Termin wird ohne Mitarbeiter verschoben.");
  await expect(dialog.getByTestId(`appointment-move-preview-status-${blockedEmployee2.id}`)).toBeVisible();

  // Auswahl-Schritt ist einziger Schritt → Bestätigen direkt
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
      tourId: body.tourId,
      employeeCount: (body.employees as Array<{ id: number }>).length,
    };
  }).toEqual({ startDate: week1.weekSecondDate, tourId: targetTour.id, employeeCount: 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// BWK-03: Monatskalender Cross-KW-D&D (gleiche Tour, nächste KW)
// ─────────────────────────────────────────────────────────────────────────────

test("BWK-03: Monatskalender Cross-KW-D&D – gesperrter Wochenplan-Mitarbeiter zeigt Konflikt und Konsequenz, Termin wird ohne Mitarbeiter verschoben", async ({ page }) => {
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week1.weekStartDate,
    tourId: sourceTour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-monatsuebersicht").click();

  const appointmentBar = page.getByTestId(`appointment-bar-${sourceAppointment.id}`).first();
  // Ziel: KW2-Montag – selbe Tour, andere KW → Preview wird geladen, blockedEmployee gesperrt
  const targetCalendarDay = page.getByTestId(`month-sheet-day-${week2.weekStartDate}`).first();

  await expect(appointmentBar).toBeVisible();

  const patchResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/appointments/${sourceAppointment.id}`) && response.request().method() === "PATCH",
    { timeout: 15_000 },
  );

  await appointmentBar.dragTo(targetCalendarDay);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Auswahl-Schritt: Konflikthinweis + Konsequenz prominent + blockedEmployee als gesperrt sichtbar
  await expect(dialog.getByTestId("appointment-move-selection-list")).toBeVisible();
  await expect(dialog).toContainText("doppelter Planung nicht verfügbar");
  await expect(dialog).toContainText("Der Termin wird ohne Mitarbeiter verschoben.");
  await expect(dialog.getByTestId(`appointment-move-preview-status-${blockedEmployee.id}`)).toBeVisible();

  // Auswahl-Schritt ist einziger Schritt → Bestätigen direkt
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
  }).toEqual({ startDate: week2.weekStartDate, employeeCount: 0 });
});
