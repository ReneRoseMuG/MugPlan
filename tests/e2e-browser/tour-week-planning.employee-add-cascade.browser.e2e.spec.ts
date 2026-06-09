/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter zur Wochenplanung hinzufügen: Vorschau-Dialog erscheint mit betroffenen Terminen.
 * - Mitarbeiter ohne Terminüberschneidung: kein Konflikt, Zuweisung wird übernommen.
 * - Mitarbeiter mit Konflikt an einem Tag: Konflikt im Vorschau-Dialog angezeigt.
 * - Mitarbeiter mit Konflikt an mehreren Tagen: alle Konflikte aufgelistet.
 * - Nur konfliktfreie Termine werden übernommen (Teilübernahme).
 * - Vorschau-Dialog abbrechen: Wochenplanung unverändert.
 * - Mitarbeiter zu Tour ohne Termine in der KW: sofortige Übernahme, kein Dialog.
 * - Mehrere Mitarbeiter gleichzeitig hinzufügen: jeder einzeln geprüft.
 *
 * Fehlerfälle:
 * - Dialog erscheint nicht trotz betroffener Termine.
 * - Konflikt an einem Tag blockiert alle anderen Tage (ungewollte Blockade).
 * - Abbruch mutiert die Wochenplanung.
 * - Dialog zeigt falsche oder fehlende Terminbezüge.
 *
 * Ziel:
 * Das Hinzufügen von Mitarbeitern zur Tourenplanung einer Woche mit Kaskadenprüfung absichern.
 */
import { expect, test } from "./fixtures";

import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  insertTourWeekEmployee,
  navigateToWeekView,
  navigateWeekOffset,
  resolveWeek,
} from "./helpers/appointment-conflict-helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

// ─────────────────────────────────────────────────────────────────────────────
// Hilfsfunktionen für die Wochenplanungs-UI
// ─────────────────────────────────────────────────────────────────────────────

async function openTourWeekPlanningPanel(page: import("@playwright/test").Page, tourId: number) {
  await page.getByTestId(`week-tour-header-${tourId}`).click();
  await expect(page.getByTestId(`week-tour-planning-panel-${tourId}`)).toBeVisible();
}

async function addEmployeeToWeekPlan(page: import("@playwright/test").Page, tourId: number, employeeId: number) {
  const panel = page.getByTestId(`week-tour-planning-panel-${tourId}`);
  await panel.getByTestId(`week-planning-employee-add-${employeeId}`).click();
}

async function getWeekPlanPreviewDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-week-plan-preview");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function confirmWeekPlanPreviewDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-week-plan-preview");
  await dialog.getByTestId("button-week-plan-preview-confirm").click();
  await expect(dialog).toBeHidden();
}

async function cancelWeekPlanPreviewDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-week-plan-preview");
  await dialog.getByTestId("button-week-plan-preview-cancel").click();
  await expect(dialog).toBeHidden();
}

// ─────────────────────────────────────────────────────────────────────────────
// WA-01: Mitarbeiter hinzufügen, keine Termine → sofortige Übernahme, kein Dialog
// ─────────────────────────────────────────────────────────────────────────────

test("WA-01: Mitarbeiter zu Tour ohne Termine in der KW hinzufügen – sofortige Übernahme, kein Vorschau-Dialog", async ({ page }) => {
  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "WA-01" });
  const tour = await createTourFixture("#11aa66");
  const employee = await createEmployeeFixture("WA-01-EMP");

  // Termin in anderer KW (kein Konfliktpotential in Zielwoche)
  await createAppointmentFixture({
    projectId: project.id,
    startDate: resolveWeek(10).weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 1);

  await openTourWeekPlanningPanel(page, tour.id);
  await addEmployeeToWeekPlan(page, tour.id, employee.id);

  // Kein Vorschau-Dialog — direkt übernommen
  await expect(page.getByTestId("dialog-week-plan-preview")).toHaveCount(0);

  // Mitarbeiter-Badge in der Wochenplanung sichtbar
  await expect(
    page.getByTestId(`week-tour-planning-panel-${tour.id}`)
      .getByTestId(`week-planning-employee-badge-${employee.id}`),
  ).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-02: Mitarbeiter hinzufügen, Termin ohne Überschneidung → kein Konflikt, Dialog mit Vorschau
// ─────────────────────────────────────────────────────────────────────────────

test("WA-02: Mitarbeiter zu Tour mit Termin ohne Überschneidung hinzufügen – Vorschau-Dialog, keine Konflikte, Übernahme bestätigt", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "WA-02" });
  const tour = await createTourFixture("#22bb66");
  const employee = await createEmployeeFixture("WA-02-EMP");

  // Termin in dieser Woche, aber Mitarbeiter noch nicht belegt
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 2);

  await openTourWeekPlanningPanel(page, tour.id);
  await addEmployeeToWeekPlan(page, tour.id, employee.id);

  const dialog = await getWeekPlanPreviewDialog(page);

  // Termin in der Vorschau sichtbar
  await expect(dialog.getByTestId(`week-plan-preview-appointment-${appointment.id}`)).toBeVisible();

  // Kein Konflikt-Indikator
  await expect(dialog.getByTestId(`week-plan-preview-conflict-${appointment.id}`)).toHaveCount(0);

  await confirmWeekPlanPreviewDialog(page);

  // Mitarbeiter jetzt in der Wochenplanung
  await expect(
    page.getByTestId(`week-tour-planning-panel-${tour.id}`)
      .getByTestId(`week-planning-employee-badge-${employee.id}`),
  ).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-03: Mitarbeiter hinzufügen, Konflikt an einem Tag → Konflikt im Dialog angezeigt
// ─────────────────────────────────────────────────────────────────────────────

test("WA-03: Mitarbeiter hinzufügen, Konflikt an einem Tag – Vorschau-Dialog zeigt Konflikt, Termin abweisend markiert", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "WA-03" });
  const tour = await createTourFixture("#33cc66");
  const employee = await createEmployeeFixture("WA-03-EMP");

  // Termin am Starttag, Mitarbeiter bereits anderweitig belegt
  const conflictTour = await createTourFixture("#33cc77");
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: conflictTour.id,
    employeeIds: [employee.id],
  });

  // Termin in der Ziel-Tour ohne diesen Mitarbeiter
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 3);

  await openTourWeekPlanningPanel(page, tour.id);
  await addEmployeeToWeekPlan(page, tour.id, employee.id);

  const dialog = await getWeekPlanPreviewDialog(page);

  // Konflikt am Termin angezeigt
  await expect(dialog.getByTestId(`week-plan-preview-conflict-${appointment.id}`)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-04: Mitarbeiter hinzufügen, Konflikte an mehreren Tagen → alle aufgelistet
// ─────────────────────────────────────────────────────────────────────────────

test("WA-04: Mitarbeiter hinzufügen, Konflikte an mehreren Tagen – alle Konflikttermine im Dialog aufgelistet", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "WA-04" });
  const tour = await createTourFixture("#44dd66");
  const employee = await createEmployeeFixture("WA-04-EMP");
  const conflictTour = await createTourFixture("#44dd77");

  // Zwei Konflikte: Montag und Dienstag
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: conflictTour.id,
    employeeIds: [employee.id],
  });
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: conflictTour.id,
    employeeIds: [employee.id],
  });

  // Zwei Termine in Ziel-Tour
  const appointmentA = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });
  const appointmentB = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 4);

  await openTourWeekPlanningPanel(page, tour.id);
  await addEmployeeToWeekPlan(page, tour.id, employee.id);

  const dialog = await getWeekPlanPreviewDialog(page);

  // Beide Konflikte sichtbar
  await expect(dialog.getByTestId(`week-plan-preview-conflict-${appointmentA.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`week-plan-preview-conflict-${appointmentB.id}`)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-05: Teilübernahme — konfliktfreie Termine werden übernommen, Konflikte nicht
// ─────────────────────────────────────────────────────────────────────────────

test("WA-05: Mitarbeiter hinzufügen, gemischte Situation – konfliktfreier Termin übernommen, Konflikttermin ausgelassen", async ({ page }) => {
  const week = resolveWeek(5);
  const project = await createProjectFixture({ prefix: "WA-05" });
  const tour = await createTourFixture("#55ee66");
  const employee = await createEmployeeFixture("WA-05-EMP");
  const conflictTour = await createTourFixture("#55ee77");

  // Konflikt nur am Montag
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: conflictTour.id,
    employeeIds: [employee.id],
  });

  // Montag-Termin in Ziel-Tour (Konflikt)
  const conflictAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  // Dienstag-Termin in Ziel-Tour (kein Konflikt)
  const freeAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 5);

  await openTourWeekPlanningPanel(page, tour.id);
  await addEmployeeToWeekPlan(page, tour.id, employee.id);

  const dialog = await getWeekPlanPreviewDialog(page);

  // Konflikt am Montag sichtbar, Dienstag konfliktfrei
  await expect(dialog.getByTestId(`week-plan-preview-conflict-${conflictAppointment.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`week-plan-preview-conflict-${freeAppointment.id}`)).toHaveCount(0);
  await expect(dialog.getByTestId(`week-plan-preview-appointment-${freeAppointment.id}`)).toBeVisible();

  await confirmWeekPlanPreviewDialog(page);

  // Mitarbeiter in Wochenplanung vorhanden
  await expect(
    page.getByTestId(`week-tour-planning-panel-${tour.id}`)
      .getByTestId(`week-planning-employee-badge-${employee.id}`),
  ).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-06: Vorschau-Dialog abbrechen → Wochenplanung unverändert
// ─────────────────────────────────────────────────────────────────────────────

test("WA-06: Vorschau-Dialog abbrechen – Wochenplanung unverändert, kein Mitarbeiter hinzugefügt", async ({ page }) => {
  const week = resolveWeek(6);
  const project = await createProjectFixture({ prefix: "WA-06" });
  const tour = await createTourFixture("#66ff66");
  const employee = await createEmployeeFixture("WA-06-EMP");

  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 6);

  await openTourWeekPlanningPanel(page, tour.id);
  await addEmployeeToWeekPlan(page, tour.id, employee.id);

  await getWeekPlanPreviewDialog(page);
  await cancelWeekPlanPreviewDialog(page);

  // Mitarbeiter-Badge nicht in der Wochenplanung
  await expect(
    page.getByTestId(`week-tour-planning-panel-${tour.id}`)
      .getByTestId(`week-planning-employee-badge-${employee.id}`),
  ).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-07: Bereits in Wochenplanung eingetragener Mitarbeiter → kein Doppeleintrag
// ─────────────────────────────────────────────────────────────────────────────

test("WA-07: Bereits eingetragener Mitarbeiter wird nicht erneut angeboten – Hinzufügen-Aktion nicht vorhanden", async ({ page }) => {
  const week = resolveWeek(7);
  const tour = await createTourFixture("#77aa66");
  const employee = await createEmployeeFixture("WA-07-EMP");

  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employee.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 7);

  await openTourWeekPlanningPanel(page, tour.id);

  // Mitarbeiter bereits eingetragen — kein separater Add-Button erwartet
  await expect(
    page.getByTestId(`week-tour-planning-panel-${tour.id}`)
      .getByTestId(`week-planning-employee-badge-${employee.id}`),
  ).toBeVisible();
  await expect(
    page.getByTestId(`week-tour-planning-panel-${tour.id}`)
      .getByTestId(`week-planning-employee-add-${employee.id}`),
  ).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-08: Mehrere Mitarbeiter hinzufügen — individuelle Konfliktprüfung pro Mitarbeiter
// ─────────────────────────────────────────────────────────────────────────────

test("WA-08: Zwei Mitarbeiter hinzufügen, einer mit Konflikt – Vorschau unterscheidet Konflikt und Konfliktfreiheit", async ({ page }) => {
  const week = resolveWeek(8);
  const project = await createProjectFixture({ prefix: "WA-08" });
  const tour = await createTourFixture("#88bb66");
  const freeEmployee = await createEmployeeFixture("WA-08-FREE");
  const conflictEmployee = await createEmployeeFixture("WA-08-CONFLICT");
  const conflictTour = await createTourFixture("#88bb77");

  // conflictEmployee ist Montag bereits belegt
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: conflictTour.id,
    employeeIds: [conflictEmployee.id],
  });

  // Termin in Ziel-Tour am Montag
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 8);

  await openTourWeekPlanningPanel(page, tour.id);

  // freeEmployee hinzufügen
  await addEmployeeToWeekPlan(page, tour.id, freeEmployee.id);
  const dialogFree = await getWeekPlanPreviewDialog(page);
  await expect(dialogFree.getByTestId(`week-plan-preview-conflict-${appointment.id}`)).toHaveCount(0);
  await confirmWeekPlanPreviewDialog(page);

  // conflictEmployee hinzufügen
  await addEmployeeToWeekPlan(page, tour.id, conflictEmployee.id);
  const dialogConflict = await getWeekPlanPreviewDialog(page);
  await expect(dialogConflict.getByTestId(`week-plan-preview-conflict-${appointment.id}`)).toBeVisible();
});
