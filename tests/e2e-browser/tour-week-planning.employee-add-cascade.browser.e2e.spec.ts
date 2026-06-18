/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - KW-Plan-Spalte im Wochen-View einblenden/erweitern, Mitarbeiter über den Picker hinzufügen.
 * - Mitarbeiter ohne Terminüberschneidung: Cascade-Dialog zeigt Termine als übernehmbar, Zuweisung bestätigt.
 * - Tour ohne Termine in der KW: Cascade-Dialog ohne Terminliste, direkt bestätigbar.
 * - Belegter Mitarbeiter (Konflikt an einem oder mehreren Tagen): wird im Picker angeboten; der Konflikt zeigt sich tagesgenau erst beim Buchen auf die Termine.
 * - Vorschau-/Cascade-Dialog abbrechen: Wochenplanung unverändert.
 * - Bereits eingetragener Mitarbeiter: im Picker nicht erneut angeboten.
 * - Mehrere Mitarbeiter: freie werden übernommen, belegte werden angeboten und beim Buchen als Konflikt markiert.
 *
 * Fehlerfälle:
 * - Cascade-Dialog erscheint nicht trotz Hinzufügen.
 * - Belegter Mitarbeiter wird trotz Konflikt im Picker angeboten.
 * - Abbruch mutiert die Wochenplanung.
 * - Cascade-Dialog zeigt falsche oder fehlende Terminbezüge.
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
  // KW-Plan-Spalte (Wochenplanung) im Wochen-View einblenden; Zielwoche ist nach Navigation die erste sichtbare
  await page.getByTestId("switch-week-personnel-column").click();
  await expect(page.getByTestId(`week-personnel-column-tour-${tourId}`).first()).toBeVisible();
  // Personalspalte erweitern, falls eingeklappt (Einklapp-Zustand kann aus vorherigem Test persistieren)
  const addButton = page.getByTestId(`button-add-week-personnel-tour-${tourId}`).first();
  if (!(await addButton.isVisible())) {
    await page.getByTestId(`button-week-personnel-column-toggle-tour-${tourId}`).first().click();
  }
  await expect(addButton).toBeVisible();
}

async function addEmployeeToWeekPlan(page: import("@playwright/test").Page, tourId: number, employeeId: number) {
  await page.getByTestId(`button-add-week-personnel-tour-${tourId}`).first().click();
  await page.getByTestId(`employee-picker-card-${employeeId}`).dblclick();
}

async function getWeekPlanPreviewDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function confirmWeekPlanPreviewDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toBeHidden();
}

async function cancelWeekPlanPreviewDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
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

  // Tour ohne Termine in der KW: Cascade-Dialog ohne Terminliste, nur bestätigen
  await confirmWeekPlanPreviewDialog(page);

  // Mitarbeiter-Badge in der Wochenplanung sichtbar
  await expect(page.getByTestId(`week-personnel-employee-tour-${tour.id}-${employee.id}`).first()).toBeVisible();
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

  // Termin in der Vorschau sichtbar, konfliktfrei übernehmbar
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${appointment.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-status-${appointment.id}`)).toContainText("Wird zum Termin hinzugefügt");

  await confirmWeekPlanPreviewDialog(page);

  // Mitarbeiter jetzt in der Wochenplanung
  await expect(page.getByTestId(`week-personnel-employee-tour-${tour.id}-${employee.id}`).first()).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-03: Belegter Mitarbeiter (Konflikt an einem Tag) → wird angeboten, Konflikt erst beim Buchen
// ─────────────────────────────────────────────────────────────────────────────

test("WA-03: Belegter Mitarbeiter mit Konflikt an einem Tag – wird angeboten und beim Buchen als Konflikt markiert", async ({ page }) => {
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

  // Termin in der Ziel-Tour am selben Tag
  const appointmentMonday = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 3);

  await openTourWeekPlanningPanel(page, tour.id);

  // Neue Regel: belegter Mitarbeiter wird angeboten; der Konflikt zeigt sich erst beim Buchen.
  await page.getByTestId(`button-add-week-personnel-tour-${tour.id}`).first().click();
  await expect(page.getByTestId(`employee-picker-card-${employee.id}`)).toHaveCount(1);
  await page.getByTestId(`employee-picker-card-${employee.id}`).dblclick();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-status-${appointmentMonday.id}`)).toContainText("Überschneidung mit bestehendem Termin");
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-04: Mitarbeiter mit Konflikten an mehreren Tagen → wird angeboten, beide Tage Konflikt beim Buchen
// ─────────────────────────────────────────────────────────────────────────────

test("WA-04: Mitarbeiter mit Konflikten an mehreren Tagen – wird angeboten und beim Buchen an beiden Tagen als Konflikt markiert", async ({ page }) => {
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

  // Zwei Termine in der Ziel-Tour (Montag und Dienstag)
  const appointmentMonday = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });
  const appointmentTuesday = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 4);

  await openTourWeekPlanningPanel(page, tour.id);

  // Neue Regel: angeboten; beim Buchen sind beide belegten Tage Konflikte.
  await page.getByTestId(`button-add-week-personnel-tour-${tour.id}`).first().click();
  await expect(page.getByTestId(`employee-picker-card-${employee.id}`)).toHaveCount(1);
  await page.getByTestId(`employee-picker-card-${employee.id}`).dblclick();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-status-${appointmentMonday.id}`)).toContainText("Überschneidung mit bestehendem Termin");
  await expect(page.getByTestId(`tour-employee-cascade-status-${appointmentTuesday.id}`)).toContainText("Überschneidung mit bestehendem Termin");
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-05: Mitarbeiter mit Konflikt an einem von mehreren Tagen → angeboten; Montag gesperrt, Dienstag buchbar
// ─────────────────────────────────────────────────────────────────────────────

test("WA-05: Mitarbeiter mit Konflikt an einem von mehreren Tagen – wird angeboten; Montag gesperrt, Dienstag buchbar", async ({ page }) => {
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

  // Montag-Termin (Konflikt für den Mitarbeiter) und Dienstag-Termin (frei) in der Ziel-Tour
  const appointmentMonday = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });
  const appointmentTuesday = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 5);

  await openTourWeekPlanningPanel(page, tour.id);

  // Neue Regel: angeboten; beim Buchen ist Montag ein Konflikt, Dienstag aber buchbar (tagesgenau).
  await page.getByTestId(`button-add-week-personnel-tour-${tour.id}`).first().click();
  await expect(page.getByTestId(`employee-picker-card-${employee.id}`)).toHaveCount(1);
  await page.getByTestId(`employee-picker-card-${employee.id}`).dblclick();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-status-${appointmentMonday.id}`)).toContainText("Überschneidung mit bestehendem Termin");
  await expect(page.getByTestId(`tour-employee-cascade-status-${appointmentTuesday.id}`)).toContainText("Wird zum Termin hinzugefügt");
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
  await expect(page.getByTestId(`week-personnel-employee-tour-${tour.id}-${employee.id}`)).toHaveCount(0);
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

  // Mitarbeiter bereits eingetragen — Badge sichtbar
  await expect(page.getByTestId(`week-personnel-employee-tour-${tour.id}-${employee.id}`).first()).toBeVisible();

  // Bereits eingetragener Mitarbeiter wird im Hinzufügen-Picker nicht erneut angeboten
  await page.getByTestId(`button-add-week-personnel-tour-${tour.id}`).first().click();
  await expect(page.getByTestId(`employee-picker-card-${employee.id}`)).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// WA-08: Mehrere Mitarbeiter — freier wird angeboten/übernommen, belegter nicht angeboten
// ─────────────────────────────────────────────────────────────────────────────

test("WA-08: Zwei Mitarbeiter – freier wird übernommen, belegter wird angeboten und beim Buchen als Konflikt markiert", async ({ page }) => {
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

  // freeEmployee hinzufügen — konfliktfrei
  await addEmployeeToWeekPlan(page, tour.id, freeEmployee.id);
  const dialogFree = await getWeekPlanPreviewDialog(page);
  await expect(dialogFree.getByTestId(`tour-employee-cascade-status-${appointment.id}`)).toContainText("Wird zum Termin hinzugefügt");
  await confirmWeekPlanPreviewDialog(page);

  // conflictEmployee ist am Montag belegt → wird jetzt im Picker angeboten;
  // der Konflikt zeigt sich erst beim Buchen auf den Termin.
  await page.getByTestId(`button-add-week-personnel-tour-${tour.id}`).first().click();
  await expect(page.getByTestId(`employee-picker-card-${conflictEmployee.id}`)).toHaveCount(1);
  await page.getByTestId(`employee-picker-card-${conflictEmployee.id}`).dblclick();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toBeVisible();
  await expect(page.getByTestId(`tour-employee-cascade-status-${appointment.id}`)).toContainText("Überschneidung mit bestehendem Termin");
});
