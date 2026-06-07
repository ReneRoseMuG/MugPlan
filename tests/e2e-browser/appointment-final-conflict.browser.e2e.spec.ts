/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Finaler Konfliktdialog erscheint nach fehlgeschlagenem Formularspeichern mit Mitarbeiterkonflikt.
 * - Finaler Konfliktdialog erscheint nach fehlgeschlagenem Drag & Drop mit Mitarbeiterkonflikt.
 * - Finaler Konfliktdialog erscheint nach fehlgeschlagenem Cut & Paste mit Mitarbeiterkonflikt.
 * - Betroffene Mitarbeiter werden namentlich per Badge angezeigt.
 * - Kein "trotzdem speichern", keine Checkboxen, keine Teilübernahme.
 * - Nach Schließen bleibt der Termin vollständig unverändert.
 * - Bei mehreren konfliktbehafteten Mitarbeitern werden alle angezeigt.
 *
 * Fehlerfälle:
 * - Dialog erscheint nicht nach einem blockierten Speichern.
 * - Mitarbeitername fehlt im Dialog.
 * - Termin wird trotz Konflikt mutiert.
 * - Dialog zeigt Checkbox oder "trotzdem speichern"-Button.
 *
 * Ziel:
 * Den finalen Konfliktdialog über echte fehlgeschlagene Terminmutationen auslösen und
 * die fachliche Kernaussage belegen: Kein Termin wird bei Konflikt verändert.
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
  cutAndPasteAppointment,
  dismissFinalConflictDialog,
  dispatchWeekViewDrop,
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
// FC-01: Konflikt beim Formularspeichern
// ─────────────────────────────────────────────────────────────────────────────

test("FC-01: Finaler Konfliktdialog erscheint beim Formularspeichern – betroffener Mitarbeiter namentlich, Termin bleibt unverändert", async ({ page }) => {
  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "FC-01" });
  const tour = await createTourFixture("#225566");
  const employee = await createEmployeeFixture("FC-01-EMP");

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
  await openAppointmentFormInWeekView(page, targetAppointment.id, 1);

  // Datum auf den konfliktbehafteten Tag verschieben
  await page.getByTestId("input-start-date").fill(week.weekSecondDate);

  // Mitarbeiter manuell hinzufügen
  const employeePickerInput = page.getByTestId("employee-picker-input");
  await employeePickerInput.fill(employee.lastName ?? "");
  await page.getByTestId(`employee-picker-option-${employee.id}`).click();

  await page.getByTestId("button-save-appointment").click();

  await expectFinalConflictDialog(page, [employee.id]);

  // Kein "trotzdem speichern" — nur Schließen-Button
  const dialog = page.getByTestId("dialog-appointment-final-conflict");
  await expect(dialog.getByTestId("button-appointment-final-conflict-close")).toBeVisible();

  await dismissFinalConflictDialog(page);
  await expectAppointmentUnchanged(targetAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// FC-02: Konflikt bei Drag & Drop
// ─────────────────────────────────────────────────────────────────────────────

test("FC-02: Finaler Konfliktdialog bei Drag & Drop – Terminkarte verbleibt am Ursprung", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "FC-02" });
  const tour = await createTourFixture("#336677");
  const employee = await createEmployeeFixture("FC-02-EMP");

  // Konflikterstellter Termin am Zieldatum
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

  const dropped = await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekSecondDate, tour.id);
  expect(dropped).toBe(true);

  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);

  // Terminkarte noch am Ursprungsort sichtbar
  await expect(page.getByTestId(`week-appointment-panel-${sourceAppointment.id}`)).toBeVisible();

  await expectAppointmentUnchanged(sourceAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// FC-03: Konflikt bei Cut & Paste
// ─────────────────────────────────────────────────────────────────────────────

test("FC-03: Finaler Konfliktdialog bei Cut & Paste – Termin bleibt am Ursprung erhalten", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "FC-03" });
  const tour = await createTourFixture("#447788");
  const employee = await createEmployeeFixture("FC-03-EMP");

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
  await navigateWeekOffset(page, 3);

  await cutAndPasteAppointment(page, sourceAppointment.id, week.weekSecondDate, tour.id);

  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);

  // Termin nicht verschwunden
  await expect(page.getByTestId(`week-appointment-panel-${sourceAppointment.id}`)).toBeVisible();
  await expectAppointmentUnchanged(sourceAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// FC-04: Mehrere konfliktbehaftete Mitarbeiter
// ─────────────────────────────────────────────────────────────────────────────

test("FC-04: Finaler Konfliktdialog zeigt alle konfliktbehafteten Mitarbeiter namentlich", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "FC-04" });
  const tour = await createTourFixture("#558899");
  const employeeA = await createEmployeeFixture("FC-04-EMP-A");
  const employeeB = await createEmployeeFixture("FC-04-EMP-B");

  // Beide Mitarbeiter am Zieldatum belegt
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employeeA.id, employeeB.id],
  });

  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employeeA.id, employeeB.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 4);

  await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekSecondDate, tour.id);

  await expectFinalConflictDialog(page, [employeeA.id, employeeB.id]);
  await dismissFinalConflictDialog(page);
});
