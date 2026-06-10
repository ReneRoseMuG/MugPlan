/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Verschieben eines Termins OHNE Mitarbeiter innerhalb derselben Tour/KW bietet die Wochenplanung des Ziels an.
 * - Gilt fuer Drag-and-Drop (WP-01) und Cut/Paste (WP-02) gleichermassen.
 * - Bestaetigen uebernimmt den vorausgewaehlten Wochenplanungs-Mitarbeiter auf den verschobenen Termin.
 *
 * Fehlerfaelle:
 * - Move-Dialog erscheint nicht, der Termin wandert ohne Mitarbeiter (Regression vor dem Fix).
 * - Falscher oder kein Mitarbeiter wird uebernommen.
 * - Termin bleibt am Ursprungstag.
 *
 * Ziel:
 * Absichern, dass der Kalender-Move (D&D und Cut/Paste) bei Terminen ohne Mitarbeiter
 * die Personalplanung der Zielwoche genauso anbietet wie das Terminformular.
 *
 * Isolation: Klasse B (eigene Fixtures je Test, keine harte Leerheit noetig), Baseline core,
 * Storage none. Eindeutige Identitaet ueber je Test frisch erzeugte Tour/Mitarbeiter.
 */
import { format } from "date-fns";

import { expect, test } from "./fixtures";

import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  confirmMoveDialog,
  dispatchWeekViewDrop,
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
// WP-01: D&D Termin ohne Mitarbeiter, selbe Tour/KW, Wochenplanung vorhanden
// ─────────────────────────────────────────────────────────────────────────────

test("WP-01: D&D Termin ohne Mitarbeiter in selber Tour/KW – Move-Dialog bietet KW-Mitarbeiter an, Bestaetigen uebernimmt ihn", async ({ page }) => {
  test.setTimeout(120_000);

  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "WP-01" });
  const tour = await createTourFixture("#11aa44");
  const employee = await createEmployeeFixture("WP-01-EMP");
  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employee.id);

  // Termin bewusst OHNE Mitarbeiter
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  const before = await snapshotAppointment(appointment.id);
  expect(before.employeeIds, "Termin startet ohne Mitarbeiter").toEqual([]);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 1);
  await expect(page.getByTestId(`week-appointment-panel-${appointment.id}`)).toBeVisible();

  const dropped = await dispatchWeekViewDrop(page, appointment.id, week.weekSecondDate, tour.id);
  expect(dropped).toBe(true);

  // Move-Dialog reagiert und bietet die Wochenplanung an (Identitaetsnachweis ueber Mitarbeiter-ID)
  const dialog = await getMoveDialog(page);
  await expect(dialog.getByTestId("appointment-move-selection-list")).toBeVisible();
  await expect(dialog.getByTestId(`appointment-move-preview-row-${employee.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${employee.id}`)).toBeChecked();

  await confirmMoveDialog(page);

  // DB-Nachweis: verschoben UND genau der KW-Mitarbeiter zugewiesen (Anzahl + Identitaet)
  const after = await snapshotAppointment(appointment.id);
  expect(format(new Date(String(after.startDate)), "yyyy-MM-dd"), "Termin auf Zieltag verschoben").toBe(week.weekSecondDate);
  expect(after.employeeIds, "KW-Mitarbeiter uebernommen").toEqual([employee.id]);
});

// ─────────────────────────────────────────────────────────────────────────────
// WP-02: Cut/Paste Termin ohne Mitarbeiter, selbe Tour/KW, Wochenplanung vorhanden
// ─────────────────────────────────────────────────────────────────────────────

test("WP-02: Cut/Paste Termin ohne Mitarbeiter in selber Tour/KW – Move-Dialog bietet KW-Mitarbeiter an, Bestaetigen uebernimmt ihn", async ({ page }) => {
  test.setTimeout(120_000);

  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "WP-02" });
  const tour = await createTourFixture("#22bb55");
  const employee = await createEmployeeFixture("WP-02-EMP");
  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employee.id);

  // Termin bewusst OHNE Mitarbeiter
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
  });

  const before = await snapshotAppointment(appointment.id);
  expect(before.employeeIds, "Termin startet ohne Mitarbeiter").toEqual([]);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 2);
  await expect(page.getByTestId(`week-appointment-panel-${appointment.id}`)).toBeVisible();

  // Cut/Paste: Termin selektieren, am Zieltag das Tagesaktions-Menue oeffnen und "Markierten Termin einfuegen" waehlen.
  await page.getByTestId(`week-appointment-menu-trigger-${appointment.id}`).click();
  await page.getByTestId(`week-appointment-cut-${appointment.id}`).click();
  await page.getByTestId(`button-new-appointment-week-${week.weekSecondDate}-lane-tour-${tour.id}`).click();
  await page.getByTestId(`button-insert-selected-appointment-week-${week.weekSecondDate}-lane-tour-${tour.id}`).click();

  // Move-Dialog reagiert und bietet die Wochenplanung an (Identitaetsnachweis ueber Mitarbeiter-ID)
  const dialog = await getMoveDialog(page);
  await expect(dialog.getByTestId("appointment-move-selection-list")).toBeVisible();
  await expect(dialog.getByTestId(`appointment-move-preview-row-${employee.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${employee.id}`)).toBeChecked();

  await confirmMoveDialog(page);

  // DB-Nachweis: verschoben UND genau der KW-Mitarbeiter zugewiesen (Anzahl + Identitaet)
  const after = await snapshotAppointment(appointment.id);
  expect(format(new Date(String(after.startDate)), "yyyy-MM-dd"), "Termin auf Zieltag verschoben").toBe(week.weekSecondDate);
  expect(after.employeeIds, "KW-Mitarbeiter uebernommen").toEqual([employee.id]);
});
