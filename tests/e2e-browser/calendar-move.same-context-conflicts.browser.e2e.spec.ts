/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - D&D auf freien Zielzeitpunkt (selbe Tour, selbe KW): Mitarbeiter bleibt erhalten, Verschiebung erfolgt.
 * - D&D auf kollidierenden Zielzeitpunkt: Konfliktdialog erscheint, Termin bleibt am Ursprung.
 * - Mehrtägiger Termin: Überschneidung über den gesamten Zeitraum erkannt.
 * - Termin mit Notizen: Notizschritt erscheint, Notiz bleibt nach Bestätigung erhalten.
 * - Termin ohne Notizen: Konfliktprüfung läuft auch ohne vorherige Dialogschritte.
 *
 * Fehlerfälle:
 * - Mitarbeiter nach erfolgreicher Verschiebung nicht mehr am Termin.
 * - Termin bleibt am Ursprung trotz erfolgreicher Verschiebung.
 * - Konflikt bei mehrtägigem Termin nicht für alle Tage erkannt.
 * - Notiz geht nach Verschiebung verloren.
 *
 * Ziel:
 * Drag-and-Drop-Konflikterkennung innerhalb derselben Tour und Kalenderwoche absichern.
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
  confirmMoveDialog,
  createAppointmentNoteFixture,
  dismissFinalConflictDialog,
  dispatchWeekViewDrop,
  expectAppointmentUnchanged,
  expectFinalConflictDialog,
  getMoveDialog,
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
// SC-01: Verschieben auf freien Zielzeitpunkt — Mitarbeiter bleibt erhalten
// ─────────────────────────────────────────────────────────────────────────────

test("SC-01: D&D auf freien Zielzeitpunkt in selber Tour/KW – Mitarbeiter bleibt, Termin verschoben", async ({ page }) => {
  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "SC-01" });
  const tour = await createTourFixture("#11aa44");
  const employee = await createEmployeeFixture("SC-01-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 1);
  await expect(page.getByTestId(`week-appointment-panel-${appointment.id}`)).toBeVisible();

  const patchResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/appointments/${appointment.id}`) && response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  const dropped = await dispatchWeekViewDrop(page, appointment.id, week.weekSecondDate, tour.id);
  expect(dropped).toBe(true);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // DB-Prüfung: Termin auf neuem Datum
  const [updated] = await db.select({ startDate: appointments.startDate }).from(appointments).where(eq(appointments.id, appointment.id));
  expect(String(updated.startDate).slice(0, 10)).toBe(week.weekSecondDate);
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-02: Verschieben auf kollidierenden Zielzeitpunkt
// ─────────────────────────────────────────────────────────────────────────────

test("SC-02: D&D auf kollidierenden Zielzeitpunkt in selber Tour/KW – Konfliktdialog, Termin bleibt am Ursprung", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "SC-02" });
  const tour = await createTourFixture("#22bb55");
  const employee = await createEmployeeFixture("SC-02-EMP");

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

  await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekSecondDate, tour.id);

  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);

  await expect(page.getByTestId(`week-appointment-panel-${sourceAppointment.id}`)).toBeVisible();
  await expectAppointmentUnchanged(sourceAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-03: Mehrtägiger Termin — Überschneidung im neuen Gesamtzeitraum erkannt
// ─────────────────────────────────────────────────────────────────────────────

test("SC-03: D&D mehrtägiger Termin – Überschneidung im Gesamtzeitraum erkannt, Verschiebung blockiert", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "SC-03" });
  const tour = await createTourFixture("#33cc66");
  const employee = await createEmployeeFixture("SC-03-EMP");

  // Konflikt auf einem der Mitteltage des geplanten neuen Zeitraums
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Mehrtägiger Termin: soll auf weekStartDate → weekEndDate verschoben werden
  const multiDayAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    endDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const before = await snapshotAppointment(multiDayAppointment.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 3);

  // Verschieben auf weekSecondDate (Konflikt liegt dort)
  await dispatchWeekViewDrop(page, multiDayAppointment.id, week.weekSecondDate, tour.id);

  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);
  await expectAppointmentUnchanged(multiDayAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-04: Termin mit Notizen — Notizschritt erscheint, Notiz bleibt erhalten
// ─────────────────────────────────────────────────────────────────────────────

test("SC-04: D&D Termin mit Notizen in selber Tour/KW – Notizschritt erscheint, Notiz nach Bestätigung erhalten", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "SC-04" });
  const tour = await createTourFixture("#44dd77");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });
  await createAppointmentNoteFixture(appointment.id, "SC-04-NOTE");

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 4);

  const dropped = await dispatchWeekViewDrop(page, appointment.id, week.weekSecondDate, tour.id);
  expect(dropped).toBe(true);

  // Move-Dialog mit Notizschritt
  const dialog = await getMoveDialog(page);
  await expect(dialog.getByTestId("appointment-move-step-notes")).toBeVisible();

  await confirmMoveDialog(page);

  // Termin auf neuem Datum
  const [updated] = await db.select({ startDate: appointments.startDate }).from(appointments).where(eq(appointments.id, appointment.id));
  expect(updated.startDate).toBe(week.weekSecondDate);
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-05: Termin ohne Notizen — Konfliktprüfung läuft ohne Dialogschritte
// ─────────────────────────────────────────────────────────────────────────────

test("SC-05: D&D ohne Notizen in selber Tour/KW – Konfliktprüfung läuft ohne vorherigen Dialogschritt", async ({ page }) => {
  const week = resolveWeek(5);
  const project = await createProjectFixture({ prefix: "SC-05" });
  const tour = await createTourFixture("#55ee88");
  const employee = await createEmployeeFixture("SC-05-EMP");

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

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 5);

  await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekSecondDate, tour.id);

  // Direkter Konfliktdialog ohne vorherigen Move-Dialog-Schritt
  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);
});
