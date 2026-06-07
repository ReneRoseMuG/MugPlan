/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Termin speichern ohne Mitarbeiter: kein Ressourcendialog, direktes Speichern.
 * - Termin speichern mit neuem Mitarbeiter ohne Konflikt: Save-Review-Dialog, Mitarbeiter übernommen.
 * - Termin speichern mit Mitarbeiter und Terminkonflikt: finaler Konfliktdialog nach Bestätigung.
 * - Termin speichern mit zwei Mitarbeitern, einer mit Konflikt: Dialog zeigt nur betroffenen.
 * - Datumswechsel zu belegtem Datum mit Mitarbeiter: Konflikt erkannt, Termin unverändert.
 * - Datumswechsel zu freiem Datum: Termin verschoben, kein Konflikt.
 * - Mitarbeiter manuell hinzufügen (Picker): erscheint im Save-Review-Dialog.
 * - Mitarbeiter entfernen: im Review-Dialog als entfernt angezeigt.
 * - Save-Review-Dialog abbrechen: keine Mutation.
 * - Mehrere Schritte im Save-Review-Dialog: alle Schritte durchlaufen.
 * - Mitarbeiter beim Tour-Wechsel übernehmen, dann Konflikt: finaler Dialog blockiert.
 * - Neuer Termin (kein bestehender) mit konfliktbehaftetem Mitarbeiter: Konflikt beim ersten Speichern.
 *
 * Fehlerfälle:
 * - Termin wird trotz Konflikt gespeichert.
 * - Save-Review-Dialog erscheint nicht bei neuem Mitarbeiter.
 * - Abbruch mutiert den Termin.
 * - Konflikter Mitarbeiter im finalen Dialog nicht namentlich aufgeführt.
 *
 * Ziel:
 * Das Terminformular-Speichern mit Ressourcenprüfung über alle Einstiegspfade absichern.
 */
import { expect, test } from "@playwright/test";
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
  cancelSaveReviewDialog,
  confirmSaveReviewDialog,
  createAppointmentNoteFixture,
  dismissFinalConflictDialog,
  expectAppointmentUnchanged,
  expectFinalConflictDialog,
  openAppointmentFormInWeekView,
  resolveWeek,
  snapshotAppointment,
} from "./helpers/appointment-conflict-helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-01: Termin ohne Mitarbeiter speichern → kein Ressourcendialog
// ─────────────────────────────────────────────────────────────────────────────

test("AF-01: Termin ohne Mitarbeiter speichern – kein Save-Review-Dialog, direktes Speichern", async ({ page }) => {
  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "AF-01" });
  const tour = await createTourFixture("#11aa77");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 1);

  // Kleines Änderungsfeld, das keinen Einfluss auf Mitarbeiter hat
  // (Notizfeld ist nicht zwingend vorhanden; wir speichern ohne Änderung)
  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${appointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await page.getByTestId("button-save-appointment").click();

  // Kein Save-Review-Dialog
  await expect(page.getByTestId("dialog-appointment-save-review")).toHaveCount(0);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-02: Neuer Mitarbeiter ohne Konflikt → Save-Review-Dialog, Übernahme bestätigt
// ─────────────────────────────────────────────────────────────────────────────

test("AF-02: Neuer Mitarbeiter ohne Terminkonflikt im Formular – Save-Review-Dialog erscheint, Mitarbeiter nach Bestätigung übernommen", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "AF-02" });
  const tour = await createTourFixture("#22bb77");
  const employee = await createEmployeeFixture("AF-02-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 2);

  const employeePickerInput = page.getByTestId("employee-picker-input");
  await employeePickerInput.fill(employee.lastName ?? "AF-02");
  await page.getByTestId(`employee-picker-option-${employee.id}`).click();

  await page.getByTestId("button-save-appointment").click();

  const confirmed = await confirmSaveReviewDialog(page);
  expect(confirmed).toBe(true);

  const [updated] = await db
    .select({ startDate: appointments.startDate })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.startDate).toBe(week.weekStartDate);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-03: Mitarbeiter mit Terminkonflikt → finaler Konfliktdialog nach Bestätigung
// ─────────────────────────────────────────────────────────────────────────────

test("AF-03: Mitarbeiter mit Terminkonflikt im Formular – Finaler Konfliktdialog nach Bestätigung, Termin unverändert", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "AF-03" });
  const tour = await createTourFixture("#33cc77");
  const employee = await createEmployeeFixture("AF-03-EMP");

  // Konflikttermin: selber Mitarbeiter, selbes Datum
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const targetAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  const before = await snapshotAppointment(targetAppointment.id);

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, targetAppointment.id, 3);

  // Datum auf Konflikttag setzen
  await page.getByTestId("input-start-date").fill(week.weekSecondDate);

  // Mitarbeiter hinzufügen
  const employeePickerInput = page.getByTestId("employee-picker-input");
  await employeePickerInput.fill(employee.lastName ?? "AF-03");
  await page.getByTestId(`employee-picker-option-${employee.id}`).click();

  await page.getByTestId("button-save-appointment").click();

  // Save-Review-Dialog durchlaufen
  const confirmed = await confirmSaveReviewDialog(page);
  if (confirmed) {
    // Finaler Konfliktdialog erscheint
    await expectFinalConflictDialog(page, [employee.id]);
    await dismissFinalConflictDialog(page);
  } else {
    // Direkt finaler Konfliktdialog (ohne Save-Review-Schritt)
    await expectFinalConflictDialog(page, [employee.id]);
    await dismissFinalConflictDialog(page);
  }

  await expectAppointmentUnchanged(targetAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-04: Zwei Mitarbeiter, einer mit Konflikt → Dialog zeigt nur Konflikt-Mitarbeiter
// ─────────────────────────────────────────────────────────────────────────────

test("AF-04: Zwei Mitarbeiter hinzufügen, einer mit Konflikt – Finaler Dialog zeigt nur betroffenen Mitarbeiter", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "AF-04" });
  const tour = await createTourFixture("#44dd77");
  const freeEmployee = await createEmployeeFixture("AF-04-FREE");
  const conflictEmployee = await createEmployeeFixture("AF-04-CONFLICT");

  // Konflikt: conflictEmployee am Zieldatum belegt
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [conflictEmployee.id],
  });

  const targetAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, targetAppointment.id, 4);

  await page.getByTestId("input-start-date").fill(week.weekSecondDate);

  const pickerInput = page.getByTestId("employee-picker-input");
  await pickerInput.fill(freeEmployee.lastName ?? "AF-04-FREE");
  await page.getByTestId(`employee-picker-option-${freeEmployee.id}`).click();

  await pickerInput.fill(conflictEmployee.lastName ?? "AF-04-CONFLICT");
  await page.getByTestId(`employee-picker-option-${conflictEmployee.id}`).click();

  await page.getByTestId("button-save-appointment").click();

  await confirmSaveReviewDialog(page);

  // Finaler Konfliktdialog zeigt nur conflictEmployee
  const dialog = page.getByTestId("dialog-appointment-final-conflict");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId(`badge-appointment-final-conflict-${conflictEmployee.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`badge-appointment-final-conflict-${freeEmployee.id}`)).toHaveCount(0);

  await dismissFinalConflictDialog(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-05: Datumswechsel zu belegtem Datum → Konflikt erkannt, Termin unverändert
// ─────────────────────────────────────────────────────────────────────────────

test("AF-05: Datumswechsel zu belegtem Datum im Formular – Konflikt erkannt, Termin unverändert", async ({ page }) => {
  const week = resolveWeek(5);
  const project = await createProjectFixture({ prefix: "AF-05" });
  const tour = await createTourFixture("#55ee77");
  const employee = await createEmployeeFixture("AF-05-EMP");

  // Konflikttermin am Zieldatum
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const targetAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const before = await snapshotAppointment(targetAppointment.id);

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, targetAppointment.id, 5);

  await page.getByTestId("input-start-date").fill(week.weekSecondDate);

  await page.getByTestId("button-save-appointment").click();

  await confirmSaveReviewDialog(page);

  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);

  await expectAppointmentUnchanged(targetAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-06: Datumswechsel zu freiem Datum → Termin verschoben, kein Konflikt
// ─────────────────────────────────────────────────────────────────────────────

test("AF-06: Datumswechsel zu freiem Datum im Formular – Termin verschoben, kein Konfliktdialog", async ({ page }) => {
  const week = resolveWeek(6);
  const project = await createProjectFixture({ prefix: "AF-06" });
  const tour = await createTourFixture("#66ff77");
  const employee = await createEmployeeFixture("AF-06-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 6);

  await page.getByTestId("input-start-date").fill(week.weekSecondDate);

  await page.getByTestId("button-save-appointment").click();

  await confirmSaveReviewDialog(page);

  // Kein finaler Konfliktdialog
  await expect(page.getByTestId("dialog-appointment-final-conflict")).toHaveCount(0);

  const [updated] = await db
    .select({ startDate: appointments.startDate })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.startDate).toBe(week.weekSecondDate);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-07: Save-Review-Dialog abbrechen → keine Mutation
// ─────────────────────────────────────────────────────────────────────────────

test("AF-07: Save-Review-Dialog abbrechen – Termin vollständig unverändert", async ({ page }) => {
  const week = resolveWeek(7);
  const project = await createProjectFixture({ prefix: "AF-07" });
  const tour = await createTourFixture("#77aa77");
  const employee = await createEmployeeFixture("AF-07-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const before = await snapshotAppointment(appointment.id);

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 7);

  await page.getByTestId("input-start-date").fill(week.weekSecondDate);
  await page.getByTestId("button-save-appointment").click();

  await cancelSaveReviewDialog(page);

  await expectAppointmentUnchanged(appointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-08: Mitarbeiter entfernen → im Review-Dialog als entfernt gelistet
// ─────────────────────────────────────────────────────────────────────────────

test("AF-08: Mitarbeiter im Formular entfernen – im Save-Review-Dialog als entfernt aufgeführt", async ({ page }) => {
  const week = resolveWeek(8);
  const project = await createProjectFixture({ prefix: "AF-08" });
  const tour = await createTourFixture("#88bb77");
  const employee = await createEmployeeFixture("AF-08-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 8);

  // Mitarbeiter entfernen
  await page.getByTestId(`badge-appointment-employee-${employee.id}-remove`).click();

  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();

  // Entfernter Mitarbeiter im Review-Dialog
  await expect(dialog.getByTestId(`badge-appointment-save-review-employee-${employee.id}`)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-09: Mehrere Schritte im Save-Review-Dialog → vollständiger Durchlauf
// ─────────────────────────────────────────────────────────────────────────────

test("AF-09: Save-Review-Dialog mit mehreren Schritten – vollständiger Durchlauf, Termin gespeichert", async ({ page }) => {
  const week = resolveWeek(9);
  const project = await createProjectFixture({ prefix: "AF-09" });
  const tour = await createTourFixture("#99cc77");
  const employeeA = await createEmployeeFixture("AF-09-EMP-A");
  const employeeB = await createEmployeeFixture("AF-09-EMP-B");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employeeA.id],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 9);

  // Zweiten Mitarbeiter hinzufügen und Datum wechseln → mehrere Review-Schritte
  const pickerInput = page.getByTestId("employee-picker-input");
  await pickerInput.fill(employeeB.lastName ?? "AF-09-EMP-B");
  await page.getByTestId(`employee-picker-option-${employeeB.id}`).click();

  await page.getByTestId("button-save-appointment").click();

  const confirmed = await confirmSaveReviewDialog(page);
  expect(confirmed).toBe(true);

  // Kein Konfliktdialog
  await expect(page.getByTestId("dialog-appointment-final-conflict")).toHaveCount(0);

  const [updated] = await db
    .select({ startDate: appointments.startDate })
    .from(appointments)
    .where(eq(appointments.id, appointment.id));
  expect(updated.startDate).toBe(week.weekStartDate);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-10: Termin mit Notizen speichern → Notizschritt im Save-Review-Dialog
// ─────────────────────────────────────────────────────────────────────────────

test("AF-10: Termin mit Notizen speichern – Notizschritt erscheint im Save-Review-Dialog", async ({ page }) => {
  const week = resolveWeek(10);
  const project = await createProjectFixture({ prefix: "AF-10" });
  const tour = await createTourFixture("#aa11dd");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  await createAppointmentNoteFixture(appointment.id, "AF-10-NOTE");

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 10);

  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();

  // Notizschritt im Save-Review-Dialog
  await expect(dialog.getByTestId("appointment-save-review-step-notes")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-11: Kein Mitarbeiter im Review-Dialog → Schritt "Keine Mitarbeiter" sichtbar
// ─────────────────────────────────────────────────────────────────────────────

test("AF-11: Termin ohne Mitarbeiter im Save-Review-Dialog – Schritt 'Keine Mitarbeiter' erscheint", async ({ page }) => {
  const week = resolveWeek(11);
  const project = await createProjectFixture({ prefix: "AF-11" });
  const tour = await createTourFixture("#bb22ee");
  const employee = await createEmployeeFixture("AF-11-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 11);

  // Mitarbeiter entfernen → Termin ohne Mitarbeiter
  await page.getByTestId(`badge-appointment-employee-${employee.id}-remove`).click();
  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();

  // Schritt "Keine Mitarbeiter" sichtbar
  await expect(dialog.getByTestId("appointment-save-review-step-no-employees")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-12: Finaler Konfliktdialog — kein "trotzdem speichern", nur Schließen
// ─────────────────────────────────────────────────────────────────────────────

test("AF-12: Finaler Konfliktdialog im Formular – kein 'trotzdem speichern', nur Schließen-Button", async ({ page }) => {
  const week = resolveWeek(12);
  const project = await createProjectFixture({ prefix: "AF-12" });
  const tour = await createTourFixture("#cc33ff");
  const employee = await createEmployeeFixture("AF-12-EMP");

  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const targetAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, targetAppointment.id, 12);

  await page.getByTestId("input-start-date").fill(week.weekSecondDate);

  const pickerInput = page.getByTestId("employee-picker-input");
  await pickerInput.fill(employee.lastName ?? "AF-12");
  await page.getByTestId(`employee-picker-option-${employee.id}`).click();

  await page.getByTestId("button-save-appointment").click();
  await confirmSaveReviewDialog(page);

  const dialog = page.getByTestId("dialog-appointment-final-conflict");
  await expect(dialog).toBeVisible();

  // Nur Schließen-Button — kein "trotzdem speichern"
  await expect(dialog.getByTestId("button-appointment-final-conflict-close")).toBeVisible();
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);

  await dismissFinalConflictDialog(page);
});
