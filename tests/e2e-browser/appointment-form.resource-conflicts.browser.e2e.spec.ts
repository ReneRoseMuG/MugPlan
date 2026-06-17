/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Termin speichern ohne Mitarbeiter: kein Ressourcendialog, direktes Speichern.
 * - Termin speichern mit neuem Mitarbeiter ohne Konflikt und ohne KW-Plan: kein Dialog, direktes Speichern, Mitarbeiter übernommen.
 * - Termin speichern mit Mitarbeiter und Terminkonflikt: finaler Konfliktdialog nach Bestätigung.
 * - Termin speichern mit zwei Mitarbeitern, einer mit Konflikt: Dialog zeigt nur betroffenen.
 * - Datumswechsel zu belegtem Datum mit Mitarbeiter: Save-Review entfernt Konflikt-Mitarbeiter, Termin auf neues Datum ohne Mitarbeiter.
 * - Datumswechsel zu freiem Datum: Termin verschoben, kein Konflikt.
 * - Mitarbeiter manuell hinzufügen (Picker): wird direkt gespeichert wenn kein Konflikt und kein KW-Plan vorliegt.
 * - Konflikt-Mitarbeiter beim Datumswechsel: im Review-Dialog als zu entfernen angezeigt.
 * - Save-Review-Dialog abbrechen: keine Mutation.
 * - Mehrere Schritte im Save-Review-Dialog: alle Schritte durchlaufen.
 * - Mitarbeiter beim Tour-Wechsel übernehmen, dann Konflikt: finaler Dialog blockiert.
 * - Neuer Termin (kein bestehender) mit konfliktbehaftetem Mitarbeiter: Konflikt beim ersten Speichern.
 * - Neuer Termin ohne Mitarbeiter und ohne Wochenplanung: Save-Review-Dialog mit no-employees-Schritt erscheint, hat Inhalt, ist bestätigbar.
 *
 * Fehlerfälle:
 * - Termin wird trotz Konflikt gespeichert.
 * - Save-Review-Dialog erscheint nicht bei neuem Mitarbeiter.
 * - Abbruch mutiert den Termin.
 * - Konflikter Mitarbeiter im finalen Dialog nicht namentlich aufgeführt.
 * - Save-Review-Dialog öffnet sich ohne Inhalt und mit deaktiviertem Speichern-Button (no-employees-Fall).
 *
 * Ziel:
 * Das Terminformular-Speichern mit Ressourcenprüfung über alle Einstiegspfade absichern.
 */
import { expect, test } from "./fixtures";

import { db } from "../../server/db";
import { appointmentEmployees } from "../../shared/schema";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  addEmployeeViaPickerDialog,
  cancelSaveReviewDialog,
  confirmSaveReviewDialog,
  createAppointmentNoteFixture,
  dismissFinalConflictDialog,
  expectAppointmentUnchanged,
  expectFinalConflictDialog,
  navigateToWeekView,
  navigateWeekOffset,
  openAppointmentFormInWeekView,
  resolveWeek,
  snapshotAppointment,
} from "./helpers/appointment-conflict-helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-01: Termin ohne Mitarbeiter speichern → Save-Review-Dialog mit 'Keine Mitarbeiter'-Schritt
// ─────────────────────────────────────────────────────────────────────────────

test("AF-01: Termin ohne Mitarbeiter speichern – Save-Review-Dialog zeigt 'Keine Mitarbeiter'-Schritt, nach Bestätigung gespeichert", async ({ page }) => {
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

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${appointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await page.getByTestId("button-save-appointment").click();

  // Save-Review-Dialog erscheint mit 'Keine Mitarbeiter'-Schritt
  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("appointment-save-review-step-no-employees")).toBeVisible();

  // Bestätigen → Termin wird ohne Mitarbeiter gespeichert
  await dialog.getByTestId("button-appointment-save-review-confirm").click();
  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-02: Neuer Mitarbeiter ohne Konflikt → kein Dialog, direktes Speichern
// ─────────────────────────────────────────────────────────────────────────────

test("AF-02: Neuer Mitarbeiter ohne Terminkonflikt im Formular – direkt gespeichert ohne Dialog, Mitarbeiter übernommen", async ({ page }) => {
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

  await addEmployeeViaPickerDialog(page, employee.id);

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${appointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await page.getByTestId("button-save-appointment").click();

  // Kein Save-Review-Dialog: kein Konflikt, kein KW-Plan → direktes Speichern
  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  const after = await snapshotAppointment(appointment.id);
  expect(after.employeeIds).toEqual([employee.id]);
  expect(after.startDate).toBe(week.weekStartDate);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-03: Mitarbeiter mit Terminkonflikt → finaler Konfliktdialog beim Speichern
// ─────────────────────────────────────────────────────────────────────────────

test("AF-03: Mitarbeiter mit Terminkonflikt im Formular – Finaler Konfliktdialog beim Speichern, Termin unverändert", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "AF-03" });
  const tour = await createTourFixture("#33cc77");
  const employee = await createEmployeeFixture("AF-03-EMP");

  // Konflikttermin: selber Mitarbeiter, selbes Datum (via Service, kein Konflikt beim ersten Insert)
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Zieltermin: zunächst ohne Mitarbeiter (kein Konfliktcheck beim Anlegen)
  const targetAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  // Mitarbeiter direkt in DB eintragen (bypasses Konfliktcheck) – beide Termine teilen nun denselben Mitarbeiter
  await db.insert(appointmentEmployees).values({
    appointmentId: targetAppointment.id,
    employeeId: employee.id,
  });

  const before = await snapshotAppointment(targetAppointment.id);

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, targetAppointment.id, 3);

  // Kein Save-Review-Dialog: keine Änderungen → direkt speichern → Server meldet EMPLOYEE_OVERLAP_CONFLICT
  await page.getByTestId("button-save-appointment").click();

  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);

  await expectAppointmentUnchanged(targetAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-04: Zwei Mitarbeiter, einer mit Konflikt → Dialog zeigt nur Konflikt-Mitarbeiter
// ─────────────────────────────────────────────────────────────────────────────

test("AF-04: Zwei Mitarbeiter, einer mit Konflikt – Finaler Dialog zeigt nur betroffenen Mitarbeiter", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "AF-04" });
  const tour = await createTourFixture("#44dd77");
  const freeEmployee = await createEmployeeFixture("AF-04-FREE");
  const conflictEmployee = await createEmployeeFixture("AF-04-CONFLICT");

  // Konflikt: conflictEmployee am weekStartDate belegt (via Service, kein Konflikt beim ersten Insert)
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [conflictEmployee.id],
  });

  // Zieltermin zunächst ohne Mitarbeiter
  const targetAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  // Beide Mitarbeiter direkt in DB eintragen (bypasses Konfliktcheck)
  await db.insert(appointmentEmployees).values([
    { appointmentId: targetAppointment.id, employeeId: freeEmployee.id },
    { appointmentId: targetAppointment.id, employeeId: conflictEmployee.id },
  ]);

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, targetAppointment.id, 4);

  // Kein Save-Review-Dialog: keine Änderungen → direktes Speichern → Server meldet nur conflictEmployee
  await page.getByTestId("button-save-appointment").click();

  // Finaler Konfliktdialog zeigt nur conflictEmployee
  const dialog = page.getByTestId("dialog-appointment-final-conflict");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId(`badge-appointment-final-conflict-${conflictEmployee.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`badge-appointment-final-conflict-${freeEmployee.id}`)).toHaveCount(0);

  await dismissFinalConflictDialog(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-05: Datumswechsel zu belegtem Datum → Save-Review entfernt Konflikt-Mitarbeiter
// ─────────────────────────────────────────────────────────────────────────────

test("AF-05: Datumswechsel zu belegtem Datum im Formular – Save-Review entfernt Konflikt-Mitarbeiter, Termin auf neues Datum ohne Mitarbeiter", async ({ page }) => {
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

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, targetAppointment.id, 5);

  await page.getByTestId("input-start-date").fill(week.weekSecondDate);

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${targetAppointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await page.getByTestId("button-save-appointment").click();

  // Save-Review-Dialog erscheint (Konflikt erkannt) und entfernt beim Bestätigen den Konflikt-Mitarbeiter
  await confirmSaveReviewDialog(page);

  // Auf abgeschlossenen PATCH warten, bevor der DB-Zustand geprüft wird
  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // Kein finaler Konfliktdialog: Konflikt wird durch Entfernen des Mitarbeiters gelöst
  await expect(page.getByTestId("dialog-appointment-final-conflict")).toHaveCount(0);

  // Termin auf neues Datum verschoben, Konflikt-Mitarbeiter automatisch entfernt
  const after = await snapshotAppointment(targetAppointment.id);
  expect(after.startDate).toBe(week.weekSecondDate);
  expect(after.employeeIds).toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-06: Datumswechsel zu freiem Datum → Termin verschoben, kein Dialog
// ─────────────────────────────────────────────────────────────────────────────

test("AF-06: Datumswechsel zu freiem Datum im Formular – direkt verschoben ohne Dialog, Mitarbeiter übernommen", async ({ page }) => {
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

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${appointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await page.getByTestId("button-save-appointment").click();

  // Kein Save-Review-Dialog: freies Datum, kein Konflikt, kein KW-Plan → direktes Speichern
  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // Kein finaler Konfliktdialog
  await expect(page.getByTestId("dialog-appointment-final-conflict")).toHaveCount(0);

  // Termin auf neues Datum verschoben, Mitarbeiter übernommen (kein Konflikt)
  const after = await snapshotAppointment(appointment.id);
  expect(after.startDate).toBe(week.weekSecondDate);
  expect(after.employeeIds).toEqual([employee.id]);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-07: Save-Review-Dialog abbrechen → keine Mutation
// ─────────────────────────────────────────────────────────────────────────────

test("AF-07: Save-Review-Dialog abbrechen – Termin vollständig unverändert", async ({ page }) => {
  const week = resolveWeek(7);
  const project = await createProjectFixture({ prefix: "AF-07" });
  const tour = await createTourFixture("#77aa77");
  const employee = await createEmployeeFixture("AF-07-EMP");

  // Konflikttermin am Zieldatum → Datumswechsel löst den Save-Review-Dialog aus
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

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
// AF-08: Konflikt-Mitarbeiter im Review-Dialog als zu entfernen gelistet
// ─────────────────────────────────────────────────────────────────────────────

test("AF-08: Konflikt-Mitarbeiter wird im Save-Review-Dialog als zu entfernen angezeigt", async ({ page }) => {
  const week = resolveWeek(8);
  const project = await createProjectFixture({ prefix: "AF-08" });
  const tour = await createTourFixture("#88bb77");
  const employee = await createEmployeeFixture("AF-08-EMP");

  // Konflikttermin am Zieldatum → Datumswechsel macht den Mitarbeiter konfliktbehaftet
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 8);

  // Datumswechsel zum belegten Datum → Ressourcenschritt mit Konflikt-Mitarbeiter
  await page.getByTestId("input-start-date").fill(week.weekSecondDate);
  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();

  // Konflikt-Mitarbeiter im Ressourcenschritt als "zu entfernen" gelistet
  await expect(dialog.getByTestId("appointment-save-review-step-resources")).toBeVisible();
  await expect(dialog.getByTestId(`badge-appointment-save-review-employee-${employee.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`appointment-week-preview-status-${employee.id}`)).toContainText("entfernt");
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-09: Mehrere Schritte im Save-Review-Dialog → vollständiger Durchlauf
// ─────────────────────────────────────────────────────────────────────────────

test("AF-09: Save-Review-Dialog mit mehreren Schritten – vollständiger Durchlauf, Termin gespeichert", async ({ page }) => {
  const week = resolveWeek(9);
  const project = await createProjectFixture({ prefix: "AF-09" });
  const tour = await createTourFixture("#99cc77");
  const employee = await createEmployeeFixture("AF-09-EMP");

  // Konflikttermin am Zieldatum → Ressourcenschritt
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Notiz → Notizschritt (zusammen mit Datumswechsel)
  await createAppointmentNoteFixture(appointment.id, "AF-09-NOTE");

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 9);

  // Datumswechsel zum belegten Datum → Ressourcen- und Notizschritt
  await page.getByTestId("input-start-date").fill(week.weekSecondDate);

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${appointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  await page.getByTestId("button-save-appointment").click();

  // Mehrere Schritte: "Weiter" zeigt an, dass es nicht der letzte Schritt ist
  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("button-appointment-save-review-next")).toBeVisible();

  // Alle Schritte vollständig durchlaufen und bestätigen
  await confirmSaveReviewDialog(page);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // Kein finaler Konfliktdialog (Konflikt-Mitarbeiter wurde entfernt)
  await expect(page.getByTestId("dialog-appointment-final-conflict")).toHaveCount(0);

  // Termin auf neues Datum gespeichert
  const after = await snapshotAppointment(appointment.id);
  expect(after.startDate).toBe(week.weekSecondDate);
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

  // Datumswechsel → Notizschritt erscheint (Notiz vorhanden + Zeitbezug geändert)
  await page.getByTestId("input-start-date").fill(week.weekSecondDate);
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
  await page.getByTestId(`badge-employee-${employee.id}-remove`).click();
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

  // Konflikttermin via Service (erster Insert, kein Konflikt)
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Zieltermin zunächst ohne Mitarbeiter
  const targetAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  // Mitarbeiter direkt in DB eintragen (bypasses Konfliktcheck)
  await db.insert(appointmentEmployees).values({
    appointmentId: targetAppointment.id,
    employeeId: employee.id,
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, targetAppointment.id, 12);

  // Kein Form-Change → direktes Speichern → Server meldet Konflikt
  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-appointment-final-conflict");
  await expect(dialog).toBeVisible();

  // Nur Schließen-Button — kein "trotzdem speichern"
  await expect(dialog.getByTestId("button-appointment-final-conflict-close")).toBeVisible();
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);

  await dismissFinalConflictDialog(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// AF-13: Neuer Termin ohne Mitarbeiter – no-employees-Schritt, Inhalt, bestätigbar
// ─────────────────────────────────────────────────────────────────────────────

test("AF-13: Neuer Termin ohne Mitarbeiter und ohne Wochenplanung – Save-Review-Dialog zeigt Inhalt und lässt sich bestätigen", async ({ page }) => {
  const week = resolveWeek(13);
  const project = await createProjectFixture({ prefix: "AF-13" });
  const tour = await createTourFixture("#ee55bb");

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 13);

  const newButton = page.getByTestId(`button-new-appointment-week-${week.weekStartDate}-lane-tour-${tour.id}`);
  await expect(newButton).toBeVisible();
  await newButton.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();

  // Projekt auswählen (fachlich erforderlich: Projekt oder Kunde)
  await page.getByTestId("button-select-project").click();
  const table = page.getByTestId("table-projects");
  await expect(table).toBeVisible();
  await page.locator("#project-filter-order-number").fill(project.orderNumber ?? "");
  await page.locator("#project-filter-title").fill(project.name);
  const row = table.locator("tbody tr").filter({ hasText: project.name }).first();
  await expect(row).toBeVisible();
  await row.dblclick();
  await expect(page.getByTestId("badge-project")).toBeVisible();

  // Keine Mitarbeiter hinzufügen — Standardzustand des neuen Termins

  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/appointments",
    { timeout: 10_000 },
  );

  await page.getByTestId("button-save-appointment").click();

  // Save-Review-Dialog erscheint mit no-employees-Schritt als einzigem Schritt
  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("appointment-save-review-step-no-employees")).toBeVisible();
  await expect(dialog).toContainText("Termin hat keine Mitarbeiter");
  await expect(dialog).toContainText("Soll er trotzdem gespeichert werden?");

  // "Trotzdem speichern" Button ist sichtbar und aktiv
  const confirmButton = dialog.getByTestId("button-appointment-save-review-confirm");
  await expect(confirmButton).toBeVisible();
  await expect(confirmButton).toBeEnabled();
  await expect(confirmButton).toContainText("Trotzdem speichern");

  // Bestätigung → Termin wird ohne Mitarbeiter angelegt
  await confirmButton.click();
  const postResponse = await postResponsePromise;
  expect(postResponse.status()).toBe(201);

  await expect(dialog).toBeHidden();
});
