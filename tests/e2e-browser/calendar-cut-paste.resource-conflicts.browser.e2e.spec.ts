/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Cut & Paste auf freien Zielzeitpunkt (selbe Tour): Termin verschoben, Mitarbeiter erhalten.
 * - Cut & Paste auf kollidierenden Zielzeitpunkt: finaler Konfliktdialog, Termin unverändert.
 * - Cut & Paste zu anderer Tour ohne Mitarbeiter und Zielplanung: no-employee-Bestätigungsdialog, dann Tourwechsel.
 * - Cut & Paste zu anderer Tour mit Mitarbeiter: Entfernen-Schritt erscheint.
 * - Cut & Paste zu anderer Tour mit Zielplanung: Übernahme-Schritt erscheint.
 * - Cut & Paste mit Notizen: Notizschritt erscheint, Termin bestätigt.
 * - Cut & Paste, kollidierender Wochenplan-Mitarbeiter: blockiert (nicht übernehmbar), Termin ohne ihn verschoben.
 *
 * Fehlerfälle:
 * - Termin wird trotz Konflikt am Ziel verschoben.
 * - Mitarbeiter geht nach erfolgreicher Verschiebung verloren.
 * - Termin ohne Mitarbeiter wird ohne Bestätigung verschoben.
 * - Finaler Konfliktdialog zeigt keinen Mitarbeiternamen.
 *
 * Ziel:
 * Cut-and-Paste-Verschiebung mit Konflikt- und Dialogverhalten über alle relevanten Szenarien absichern.
 */
import { expect, test } from "./fixtures";
import { format } from "date-fns";
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
  confirmMoveDialog,
  createAppointmentNoteFixture,
  cutAndPasteAppointment,
  dismissFinalConflictDialog,
  expectAppointmentUnchanged,
  expectFinalConflictDialog,
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
// CP-01: Cut & Paste auf freien Zielzeitpunkt — Mitarbeiter bleibt erhalten
// ─────────────────────────────────────────────────────────────────────────────

test("CP-01: Cut & Paste auf freien Zielzeitpunkt in selber Tour – Termin verschoben, Mitarbeiter erhalten", async ({ page }) => {
  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "CP-01" });
  const tour = await createTourFixture("#11aa55");
  const employee = await createEmployeeFixture("CP-01-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 1);
  await expect(page.getByTestId(`week-appointment-menu-trigger-${appointment.id}`)).toBeVisible();

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${appointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await cutAndPasteAppointment(page, appointment.id, week.weekSecondDate, tour.id);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  const [updated] = await db
    .select({ startDate: appointments.startDate })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  // startDate kommt beim Direkt-DB-Read als lokales Date-Objekt zurück; lokal formatieren
  // (nicht toISOString, das wegen UTC-Verschiebung off-by-one liefern könnte).
  expect(format(updated.startDate, "yyyy-MM-dd")).toBe(week.weekSecondDate);
});

// ─────────────────────────────────────────────────────────────────────────────
// CP-02: Cut & Paste auf kollidierenden Zielzeitpunkt → Finaler Konfliktdialog
// ─────────────────────────────────────────────────────────────────────────────

test("CP-02: Cut & Paste auf kollidierenden Zielzeitpunkt – Finaler Konfliktdialog, Termin bleibt am Ursprung", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "CP-02" });
  const tour = await createTourFixture("#22bb55");
  const employee = await createEmployeeFixture("CP-02-EMP");

  // Konflikttermin am Ziel
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const before = await snapshotAppointment(sourceAppointment.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 2);

  await cutAndPasteAppointment(page, sourceAppointment.id, week.weekSecondDate, tour.id);

  await expectFinalConflictDialog(page, [employee.id], "dialog-calendar-move-final-conflict");
  await dismissFinalConflictDialog(page, "dialog-calendar-move-final-conflict");

  // Terminkarte noch sichtbar
  await expect(page.getByTestId(`week-appointment-panel-${sourceAppointment.id}`)).toBeVisible();
  await expectAppointmentUnchanged(sourceAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// CP-03: Cut & Paste zu anderer Tour, kein Mitarbeiter, keine Zielplanung → no-employee-Bestätigung
// ─────────────────────────────────────────────────────────────────────────────

test("CP-03: Cut & Paste zu anderer Tour ohne Mitarbeiter und Zielplanung – no-employee-Bestätigung, dann Tour gewechselt", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "CP-03" });
  const sourceTour = await createTourFixture("#33cc11");
  const targetTour = await createTourFixture("#44dd22");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 3);

  await cutAndPasteAppointment(page, appointment.id, week.weekStartDate, targetTour.id);

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
// CP-04: Cut & Paste zu anderer Tour, Mitarbeiter vorhanden → Entfernen-Schritt
// ─────────────────────────────────────────────────────────────────────────────

test("CP-04: Cut & Paste zu anderer Tour mit Mitarbeiter – Entfernen-Schritt erscheint, Mitarbeiter nach Bestätigung entfernt", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "CP-04" });
  const sourceTour = await createTourFixture("#44ee11");
  const targetTour = await createTourFixture("#55ff22");
  const employee = await createEmployeeFixture("CP-04-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 4);

  await cutAndPasteAppointment(page, appointment.id, week.weekStartDate, targetTour.id);

  const dialog = await getMoveDialog(page);
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${employee.id}`)).toBeVisible();

  await confirmMoveDialog(page);
  await expect(dialog).toBeHidden();

  const [updated] = await db
    .select({ tourId: appointments.tourId })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.tourId).toBe(targetTour.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// CP-05: Cut & Paste zu anderer Tour, Zielplanung vorhanden → Übernahme-Schritt
// ─────────────────────────────────────────────────────────────────────────────

test("CP-05: Cut & Paste zu anderer Tour mit Zielplanung – Übernahme-Schritt, Ziel-Mitarbeiter vorausgewählt", async ({ page }) => {
  const week = resolveWeek(5);
  const project = await createProjectFixture({ prefix: "CP-05" });
  const sourceTour = await createTourFixture("#55aa11");
  const targetTour = await createTourFixture("#66bb22");
  const weekEmployee = await createEmployeeFixture("CP-05-WEEK-EMP");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, weekEmployee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 5);

  await cutAndPasteAppointment(page, appointment.id, week.weekStartDate, targetTour.id);

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
// CP-06: Cut & Paste mit Notizen → Notizschritt erscheint nach Tourwechsel
// ─────────────────────────────────────────────────────────────────────────────

test("CP-06: Cut & Paste zu anderer Tour mit Notizen – Notizschritt erscheint, Termin nach Bestätigung verschoben", async ({ page }) => {
  const week = resolveWeek(6);
  const project = await createProjectFixture({ prefix: "CP-06" });
  const sourceTour = await createTourFixture("#66cc11");
  const targetTour = await createTourFixture("#77dd22");
  const weekEmployee = await createEmployeeFixture("CP-06-WEEK-EMP");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, weekEmployee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: sourceTour.id,
  });
  await createAppointmentNoteFixture(appointment.id, "CP-06-NOTE");

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 6);

  await cutAndPasteAppointment(page, appointment.id, week.weekStartDate, targetTour.id);

  const dialog = await getMoveDialog(page);

  // Übernahme-Schritt
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();
  await advanceMoveDialog(page);

  // Notizschritt
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
// CP-07: Cut & Paste, kollidierender Wochenplan-Mitarbeiter → blockiert, Termin ohne ihn verschoben
// ─────────────────────────────────────────────────────────────────────────────

test("CP-07: Cut & Paste zu anderer Tour, kollidierender Wochenplan-Mitarbeiter – blockiert, Termin ohne ihn verschoben", async ({ page }) => {
  const week = resolveWeek(7);
  const project = await createProjectFixture({ prefix: "CP-07" });
  const sourceTour = await createTourFixture("#77ee11");
  const targetTour = await createTourFixture("#88ff22");
  const conflictEmployee = await createEmployeeFixture("CP-07-CONFLICT");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, conflictEmployee.id);

  // Konflikttermin am Zieldatum in Zieltour
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
  await navigateWeekOffset(page, 7);

  await cutAndPasteAppointment(page, sourceAppointment.id, week.weekStartDate, targetTour.id);

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
