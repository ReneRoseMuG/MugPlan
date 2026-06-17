/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - D&D zu anderer Tour ohne Mitarbeiter und Zielplanung: no-employee-Bestätigungsdialog, dann Tourwechsel.
 * - D&D zu anderer Tour mit Mitarbeiter, keine Zielplanung: Entfernen-Schritt erscheint.
 * - D&D zu anderer Tour ohne Mitarbeiter, mit Zielplanung: Übernahme-Schritt mit vorausgewähltem Mitarbeiter.
 * - D&D zu anderer Tour mit Mitarbeiter und Zielplanung: Entfernen-Schritt, dann Übernahme-Schritt.
 * - Zielplanung enthält kollidierenden Mitarbeiter: blockiert (nicht übernehmbar), Termin ohne ihn verschoben.
 * - Zielplanung enthält gemischte Mitarbeiter (frei + kollidierend): freier übernommen, kollidierender blockiert.
 * - D&D zu anderer Tour mit Notizen: Entfernen → Übernahme → Notizschritt vollständig.
 * - Dialog abbrechen: Termin bleibt vollständig unverändert.
 * - D&D zu anderer Tour und anderem Datum: Tour und Datum gemeinsam geändert.
 *
 * Fehlerfälle:
 * - Termin ohne Mitarbeiter wird ohne Bestätigung verschoben.
 * - Entfernen-Schritt fehlt bei vorhandenen Mitarbeitern.
 * - Übernahme-Schritt fehlt bei vorhandener Zielplanung.
 * - Termin mutiert trotz Abbruch.
 * - Kollidierender Zielplanungs-Mitarbeiter ist auswählbar oder wird übernommen.
 * - Notizschritt erscheint nicht nach Übernahme.
 *
 * Ziel:
 * Drag-and-Drop über Tourgrenzen mit allen Dialogkombinationen und Konflikterkennung absichern.
 */
import { expect, test } from "./fixtures";
import { eq } from "drizzle-orm";

import { db } from "../../server/db";
import { appointments } from "../../shared/schema";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  advanceMoveDialog,
  cancelMoveDialog,
  confirmMoveDialog,
  createAppointmentNoteFixture,
  dispatchWeekViewDrop,
  expectAppointmentUnchanged,
  getMoveDialog,
  insertTourWeekEmployee,
  navigateToWeekView,
  navigateWeekOffset,
  resolveWeek,
  snapshotAppointment,
} from "./helpers/appointment-conflict-helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-01: D&D zu anderer Tour, kein Mitarbeiter, keine Zielplanung → no-employee-Bestätigung
// ─────────────────────────────────────────────────────────────────────────────

test("CC-01: D&D zu anderer Tour ohne Mitarbeiter und Zielplanung – no-employee-Bestätigung, dann Tour gewechselt", async ({ page }) => {
  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "CC-01" });
  const sourceTour = await createTourFixture("#11aa22");
  const targetTour = await createTourFixture("#22bb33");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 1);
  await expect(page.getByTestId(`week-appointment-panel-${appointment.id}`)).toBeVisible();

  const dropped = await dispatchWeekViewDrop(page, appointment.id, week.weekStartDate, targetTour.id);
  expect(dropped).toBe(true);

  // Termin ohne Mitarbeiter: Move-Dialog mit no-employee-Schritt erscheint (kein direkter Move)
  const dialog = await getMoveDialog(page);
  await expect(dialog).toContainText("Termin hat keine Mitarbeiter");

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${appointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await confirmMoveDialog(page);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  const [updated] = await db
    .select({ tourId: appointments.tourId })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.tourId).toBe(targetTour.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-02: D&D zu anderer Tour, Mitarbeiter vorhanden, keine Zielplanung → Entfernen-Schritt
// ─────────────────────────────────────────────────────────────────────────────

test("CC-02: D&D zu anderer Tour mit Mitarbeiter, keine Zielplanung – Entfernen-Schritt, Mitarbeiter nach Bestätigung entfernt", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "CC-02" });
  const sourceTour = await createTourFixture("#aa1122");
  const targetTour = await createTourFixture("#bb2233");
  const employee = await createEmployeeFixture("CC-02-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 2);

  await dispatchWeekViewDrop(page, appointment.id, week.weekStartDate, targetTour.id);

  const dialog = await getMoveDialog(page);
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${employee.id}`)).toBeVisible();

  // Kein Übernahme-Schritt
  await expect(dialog.getByTestId("appointment-move-selection-list")).toHaveCount(0);

  await confirmMoveDialog(page);
  await expect(dialog).toBeHidden();

  const [updated] = await db
    .select({ tourId: appointments.tourId })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.tourId).toBe(targetTour.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-03: D&D zu anderer Tour, kein Mitarbeiter, Zielplanung vorhanden → Übernahme-Schritt
// ─────────────────────────────────────────────────────────────────────────────

test("CC-03: D&D zu anderer Tour ohne Mitarbeiter, mit Zielplanung – Übernahme-Schritt, Ziel-Mitarbeiter vorausgewählt", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "CC-03" });
  const sourceTour = await createTourFixture("#cc1122");
  const targetTour = await createTourFixture("#dd2233");
  const weekEmployee = await createEmployeeFixture("CC-03-WEEK-EMP");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, weekEmployee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 3);

  await dispatchWeekViewDrop(page, appointment.id, week.weekStartDate, targetTour.id);

  const dialog = await getMoveDialog(page);

  // Kein Entfernen-Schritt
  await expect(dialog.getByTestId("appointment-move-removal-warning")).toHaveCount(0);

  // Übernahme-Schritt: Mitarbeiter vorausgewählt
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();

  await confirmMoveDialog(page);
  await expect(dialog).toBeHidden();

  const [updated] = await db
    .select({ tourId: appointments.tourId })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.tourId).toBe(targetTour.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-04: D&D zu anderer Tour mit Mitarbeiter und Zielplanung → vollständige Reihenfolge
// ─────────────────────────────────────────────────────────────────────────────

test("CC-04: D&D zu anderer Tour mit Mitarbeiter und Zielplanung – Entfernen-Schritt, dann Übernahme-Schritt", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "CC-04" });
  const sourceTour = await createTourFixture("#ee1122");
  const targetTour = await createTourFixture("#ff2233");
  const currentEmployee = await createEmployeeFixture("CC-04-CURRENT");
  const weekEmployee = await createEmployeeFixture("CC-04-WEEK");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, weekEmployee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
    employeeIds: [currentEmployee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 4);

  await dispatchWeekViewDrop(page, appointment.id, week.weekStartDate, targetTour.id);

  const dialog = await getMoveDialog(page);

  // Schritt 1: Entfernen-Schritt
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${currentEmployee.id}`)).toBeVisible();

  await advanceMoveDialog(page);

  // Schritt 2: Übernahme-Schritt
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();

  await confirmMoveDialog(page);
  await expect(dialog).toBeHidden();

  const [updated] = await db
    .select({ tourId: appointments.tourId })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.tourId).toBe(targetTour.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-05: Zielplanung enthält kollidierenden Mitarbeiter → blockiert, Termin ohne ihn verschoben
// ─────────────────────────────────────────────────────────────────────────────

test("CC-05: D&D zu anderer Tour, Zielplanung hat kollidierenden Mitarbeiter – Mitarbeiter blockiert, Termin ohne ihn verschoben", async ({ page }) => {
  const week = resolveWeek(5);
  const project = await createProjectFixture({ prefix: "CC-05" });
  const sourceTour = await createTourFixture("#11cc22");
  const targetTour = await createTourFixture("#22dd33");
  const conflictEmployee = await createEmployeeFixture("CC-05-CONFLICT");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, conflictEmployee.id);

  // Konflikttermin: Mitarbeiter am selben Datum bereits belegt
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: targetTour.id,
    employeeIds: [conflictEmployee.id],
  });

  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
  });

  const before = await snapshotAppointment(sourceAppointment.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 5);

  await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekStartDate, targetTour.id);

  // Übernahme-Schritt: kollidierender Wochenplan-Mitarbeiter ist blockiert (nicht auswählbar)
  const dialog = await getMoveDialog(page);
  await expect(dialog.getByTestId(`appointment-move-preview-status-${conflictEmployee.id}`)).toContainText(
    "Am Zieltermin besteht bereits eine ganztägige Planung.",
  );
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${conflictEmployee.id}`)).toHaveCount(0);

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${sourceAppointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await confirmMoveDialog(page);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // Kein finaler Konfliktdialog: der blockierte Mitarbeiter wurde gar nicht übernommen
  await expect(page.getByTestId("dialog-calendar-move-final-conflict")).toHaveCount(0);

  // Termin zur Ziel-Tour verschoben (Datum unverändert), ohne den blockierten Mitarbeiter
  const after = await snapshotAppointment(sourceAppointment.id);
  expect(after.startDate).toBe(before.startDate);
  expect(after.tourId).toBe(targetTour.id);
  expect(after.employeeIds).toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-06: Zielplanung gemischt (frei + kollidierend) → freier übernommen, kollidierender blockiert
// ─────────────────────────────────────────────────────────────────────────────

test("CC-06: D&D zu anderer Tour, gemischte Zielplanung – freier Mitarbeiter übernommen, kollidierender blockiert", async ({ page }) => {
  const week = resolveWeek(6);
  const project = await createProjectFixture({ prefix: "CC-06" });
  const sourceTour = await createTourFixture("#11ee22");
  const targetTour = await createTourFixture("#22ff33");
  const freeEmployee = await createEmployeeFixture("CC-06-FREE");
  const conflictEmployee = await createEmployeeFixture("CC-06-CONFLICT");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, freeEmployee.id);
  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, conflictEmployee.id);

  // Nur conflictEmployee ist am Zieldatum belegt
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: targetTour.id,
    employeeIds: [conflictEmployee.id],
  });

  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
  });

  const before = await snapshotAppointment(sourceAppointment.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 6);

  await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekStartDate, targetTour.id);

  const dialog = await getMoveDialog(page);

  // Freier Wochenplan-Mitarbeiter ist auswählbar, kollidierender ist blockiert (nicht auswählbar)
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${freeEmployee.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`appointment-move-preview-status-${conflictEmployee.id}`)).toContainText(
    "Am Zieltermin besteht bereits eine ganztägige Planung.",
  );
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${conflictEmployee.id}`)).toHaveCount(0);

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${sourceAppointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await confirmMoveDialog(page);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // Kein finaler Konfliktdialog: kollidierender Mitarbeiter wurde nicht übernommen
  await expect(page.getByTestId("dialog-calendar-move-final-conflict")).toHaveCount(0);

  // Termin verschoben mit freiem Mitarbeiter, kollidierender nicht übernommen
  const after = await snapshotAppointment(sourceAppointment.id);
  expect(after.startDate).toBe(before.startDate);
  expect(after.tourId).toBe(targetTour.id);
  expect(after.employeeIds).toEqual([freeEmployee.id]);
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-07: D&D zu anderer Tour mit Notizen → Entfernen + Übernahme + Notizschritt
// ─────────────────────────────────────────────────────────────────────────────

test("CC-07: D&D zu anderer Tour mit Mitarbeiter, Zielplanung und Notizen – alle drei Schritte in korrekter Reihenfolge", async ({ page }) => {
  const week = resolveWeek(7);
  const project = await createProjectFixture({ prefix: "CC-07" });
  const sourceTour = await createTourFixture("#11ff22");
  const targetTour = await createTourFixture("#22aa33");
  const currentEmployee = await createEmployeeFixture("CC-07-CURRENT");
  const weekEmployee = await createEmployeeFixture("CC-07-WEEK");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, weekEmployee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
    employeeIds: [currentEmployee.id],
  });
  await createAppointmentNoteFixture(appointment.id, "CC-07-NOTE");

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 7);

  await dispatchWeekViewDrop(page, appointment.id, week.weekStartDate, targetTour.id);

  const dialog = await getMoveDialog(page);

  // Schritt 1: Entfernen
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${currentEmployee.id}`)).toBeVisible();
  await advanceMoveDialog(page);

  // Schritt 2: Übernahme
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();
  await advanceMoveDialog(page);

  // Schritt 3: Notizen
  await expect(dialog.getByTestId("appointment-move-step-notes")).toBeVisible();

  await confirmMoveDialog(page);
  await expect(dialog).toBeHidden();

  const [updated] = await db
    .select({ tourId: appointments.tourId })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.tourId).toBe(targetTour.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-08: Dialog abbrechen → Termin vollständig unverändert
// ─────────────────────────────────────────────────────────────────────────────

test("CC-08: D&D zu anderer Tour, Dialog abbrechen – Tour und Mitarbeiter des Termins unverändert", async ({ page }) => {
  const week = resolveWeek(8);
  const project = await createProjectFixture({ prefix: "CC-08" });
  const sourceTour = await createTourFixture("#aa1133");
  const targetTour = await createTourFixture("#bb2244");
  const employee = await createEmployeeFixture("CC-08-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
    employeeIds: [employee.id],
  });

  const before = await snapshotAppointment(appointment.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 8);

  await dispatchWeekViewDrop(page, appointment.id, week.weekStartDate, targetTour.id);

  await getMoveDialog(page);
  await cancelMoveDialog(page);

  await expectAppointmentUnchanged(appointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// CC-09: D&D zu anderer Tour und anderem Datum → Tour und Datum gemeinsam geändert
// ─────────────────────────────────────────────────────────────────────────────

test("CC-09: D&D zu anderer Tour und anderem Datum – Tourwechsel und Datumsverschiebung gemeinsam bestätigt", async ({ page }) => {
  const week = resolveWeek(9);
  const project = await createProjectFixture({ prefix: "CC-09" });
  const sourceTour = await createTourFixture("#cc2233");
  const targetTour = await createTourFixture("#dd3344");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 9);

  // Anderes Datum UND andere Tour in einem Drop
  const dropped = await dispatchWeekViewDrop(page, appointment.id, week.weekSecondDate, targetTour.id);
  expect(dropped).toBe(true);

  // Termin ohne Mitarbeiter: Move-Dialog mit no-employee-Schritt erscheint (kein direkter Move)
  const dialog = await getMoveDialog(page);
  await expect(dialog).toContainText("Termin hat keine Mitarbeiter");

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${appointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await confirmMoveDialog(page);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  const [updated] = await db
    .select({ tourId: appointments.tourId, startDate: appointments.startDate })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.tourId).toBe(targetTour.id);
  expect(new Date(updated.startDate).toISOString().slice(0, 10)).toBe(week.weekSecondDate);
});
