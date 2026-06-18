/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter aus Wochenplanung entfernen: Bestätigungsdialog erscheint.
 * - Mitarbeiter hat keine Termine in der KW: sofortige Entfernung nach Bestätigung.
 * - Mitarbeiter hat Termine in der KW: betroffene Termine im Dialog aufgelistet.
 * - Bestätigung entfernt Mitarbeiter aus allen aufgelisteten Terminen der KW.
 * - Mitarbeiter mit Terminen an mehreren Tagen: alle Tage im Dialog aufgelistet.
 * - Abbrechen des Dialogs: Wochenplanung und Termindaten unverändert.
 * - Mitarbeiter nur von Terminen in der betroffenen KW entfernt, nicht aus anderen KW.
 *
 * Fehlerfälle:
 * - Bestätigungsdialog erscheint nicht.
 * - Termin in der KW nach Entfernung noch mit Mitarbeiter verknüpft.
 * - Termin in anderer KW wird fälschlicherweise verändert.
 * - Abbruch mutiert die Wochenplanung.
 *
 * Ziel:
 * Das Entfernen von Mitarbeitern aus der Tourenplanung einer Woche mit Kaskadenprüfung absichern.
 */
import { expect, test } from "./fixtures";
import { and, eq } from "drizzle-orm";

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
// Hilfsfunktionen für die Wochenplanungs-UI (Entfernen)
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

async function removeEmployeeFromWeekPlan(page: import("@playwright/test").Page, tourId: number, employeeId: number) {
  await page.getByTestId(`week-personnel-employee-tour-${tourId}-${employeeId}-remove`).first().click();
}

async function getWeekPlanRemoveDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function confirmWeekPlanRemoveDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toBeHidden();
}

async function cancelWeekPlanRemoveDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toBeHidden();
}

// ─────────────────────────────────────────────────────────────────────────────
// WR-01: Mitarbeiter ohne Termine in der KW entfernen → keine Terminliste im Dialog
// ─────────────────────────────────────────────────────────────────────────────

test("WR-01: Mitarbeiter ohne Termine in der KW aus Wochenplanung entfernen – Dialog ohne Terminliste, sofort entfernt", async ({ page }) => {
  const week = resolveWeek(1);
  const tour = await createTourFixture("#11aa88");
  const employee = await createEmployeeFixture("WR-01-EMP");

  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employee.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 1);

  await openTourWeekPlanningPanel(page, tour.id);
  await removeEmployeeFromWeekPlan(page, tour.id, employee.id);

  const dialog = await getWeekPlanRemoveDialog(page);

  // Keine betroffenen Termine — Mitarbeiter hat keine Termine in der KW
  await expect(dialog.getByTestId(/^tour-employee-cascade-row-/)).toHaveCount(0);

  await confirmWeekPlanRemoveDialog(page);

  // Mitarbeiter-Badge nicht mehr in der Wochenplanung
  await expect(page.getByTestId(`week-personnel-employee-tour-${tour.id}-${employee.id}`)).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// WR-02: Mitarbeiter mit einem Termin in der KW entfernen → Termin im Dialog, nach Bestätigung entfernt
// ─────────────────────────────────────────────────────────────────────────────

test("WR-02: Mitarbeiter mit einem Termin in der KW entfernen – Termin im Dialog aufgelistet, nach Bestätigung Mitarbeiter vom Termin getrennt", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "WR-02" });
  const tour = await createTourFixture("#22bb88");
  const employee = await createEmployeeFixture("WR-02-EMP");

  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 2);

  await openTourWeekPlanningPanel(page, tour.id);
  await removeEmployeeFromWeekPlan(page, tour.id, employee.id);

  const dialog = await getWeekPlanRemoveDialog(page);

  // Termin im Dialog sichtbar
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${appointment.id}`)).toBeVisible();

  await confirmWeekPlanRemoveDialog(page);

  // Mitarbeiter-Verknüpfung in DB aufgehoben
  const links = await db
    .select()
    .from(appointmentEmployees)
    .where(
      and(
        eq(appointmentEmployees.appointmentId, appointment.id),
        eq(appointmentEmployees.employeeId, employee.id),
      ),
    );
  expect(links).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// WR-03: Mitarbeiter mit mehreren Terminen in der KW → alle Termine aufgelistet
// ─────────────────────────────────────────────────────────────────────────────

test("WR-03: Mitarbeiter mit mehreren Terminen in der KW entfernen – alle betroffenen Termine im Dialog aufgelistet", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "WR-03" });
  const tour = await createTourFixture("#33cc88");
  const employee = await createEmployeeFixture("WR-03-EMP");

  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employee.id);

  const appointmentA = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });
  const appointmentB = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 3);

  await openTourWeekPlanningPanel(page, tour.id);
  await removeEmployeeFromWeekPlan(page, tour.id, employee.id);

  const dialog = await getWeekPlanRemoveDialog(page);

  // Beide Termine aufgelistet
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${appointmentA.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${appointmentB.id}`)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// WR-04: Abbruch → Wochenplanung und Terminzuweisung unverändert
// ─────────────────────────────────────────────────────────────────────────────

test("WR-04: Entfernen-Dialog abbrechen – Wochenplanung und Termindaten unverändert", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "WR-04" });
  const tour = await createTourFixture("#44dd88");
  const employee = await createEmployeeFixture("WR-04-EMP");

  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 4);

  await openTourWeekPlanningPanel(page, tour.id);
  await removeEmployeeFromWeekPlan(page, tour.id, employee.id);

  await getWeekPlanRemoveDialog(page);
  await cancelWeekPlanRemoveDialog(page);

  // Mitarbeiter-Badge noch in der Wochenplanung
  await expect(
    page.getByTestId(`week-personnel-employee-tour-${tour.id}-${employee.id}`).first(),
  ).toBeVisible();

  // Mitarbeiter-Verknüpfung in DB erhalten
  const links = await db
    .select()
    .from(appointmentEmployees)
    .where(
      and(
        eq(appointmentEmployees.appointmentId, appointment.id),
        eq(appointmentEmployees.employeeId, employee.id),
      ),
    );
  expect(links).toHaveLength(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// WR-05: Entfernung betrifft nur aktuelle KW, nicht andere KW
// ─────────────────────────────────────────────────────────────────────────────

test("WR-05: Mitarbeiter aus Wochenplanung entfernen – Termin in anderer KW bleibt unverändert", async ({ page }) => {
  const week = resolveWeek(5);
  const otherWeek = resolveWeek(12);
  const project = await createProjectFixture({ prefix: "WR-05" });
  const tour = await createTourFixture("#55ee88");
  const employee = await createEmployeeFixture("WR-05-EMP");

  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employee.id);

  // Termin in aktueller KW
  const thisWeekAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Termin in anderer KW — soll nicht betroffen sein
  const otherWeekAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: otherWeek.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 5);

  await openTourWeekPlanningPanel(page, tour.id);
  await removeEmployeeFromWeekPlan(page, tour.id, employee.id);

  const dialog = await getWeekPlanRemoveDialog(page);

  // Nur Termin der aktuellen KW im Dialog
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${thisWeekAppointment.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`tour-employee-cascade-row-${otherWeekAppointment.id}`)).toHaveCount(0);

  await confirmWeekPlanRemoveDialog(page);

  // Termin in aktueller KW: Mitarbeiter entfernt
  const thisWeekLinks = await db
    .select()
    .from(appointmentEmployees)
    .where(
      and(
        eq(appointmentEmployees.appointmentId, thisWeekAppointment.id),
        eq(appointmentEmployees.employeeId, employee.id),
      ),
    );
  expect(thisWeekLinks).toHaveLength(0);

  // Termin in anderer KW: Mitarbeiter erhalten
  const otherWeekLinks = await db
    .select()
    .from(appointmentEmployees)
    .where(
      and(
        eq(appointmentEmployees.appointmentId, otherWeekAppointment.id),
        eq(appointmentEmployees.employeeId, employee.id),
      ),
    );
  expect(otherWeekLinks).toHaveLength(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// WR-06: Mitarbeiter hat Termin aber Wochenplanung fehlt → kein Entfernen-Button
// ─────────────────────────────────────────────────────────────────────────────

test("WR-06: Mitarbeiter ohne Wochenplanung-Eintrag – kein Entfernen-Button im Panel sichtbar", async ({ page }) => {
  const week = resolveWeek(6);
  const project = await createProjectFixture({ prefix: "WR-06" });
  const tour = await createTourFixture("#66ff88");
  const employee = await createEmployeeFixture("WR-06-EMP");

  // Termin mit Mitarbeiter, aber kein Wochenplanungs-Eintrag
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 6);

  await openTourWeekPlanningPanel(page, tour.id);

  // Kein Entfernen-Button für diesen Mitarbeiter (nicht in Wochenplanung)
  await expect(
    page.getByTestId(`week-personnel-employee-tour-${tour.id}-${employee.id}-remove`),
  ).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// WR-07: Mehrere Mitarbeiter — nur der entfernte betroffen
// ─────────────────────────────────────────────────────────────────────────────

test("WR-07: Von zwei Wochenplanungs-Mitarbeitern einen entfernen – nur der entfernte aus Terminen getrennt", async ({ page }) => {
  const week = resolveWeek(7);
  const project = await createProjectFixture({ prefix: "WR-07" });
  const tour = await createTourFixture("#77aa88");
  const employeeA = await createEmployeeFixture("WR-07-EMP-A");
  const employeeB = await createEmployeeFixture("WR-07-EMP-B");

  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employeeA.id);
  await insertTourWeekEmployee(tour.id, week.isoYear, week.isoWeek, employeeB.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employeeA.id, employeeB.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 7);

  await openTourWeekPlanningPanel(page, tour.id);

  // Nur employeeA entfernen
  await removeEmployeeFromWeekPlan(page, tour.id, employeeA.id);
  await getWeekPlanRemoveDialog(page);
  await confirmWeekPlanRemoveDialog(page);

  // employeeA aus Termin entfernt
  const linksA = await db
    .select()
    .from(appointmentEmployees)
    .where(
      and(
        eq(appointmentEmployees.appointmentId, appointment.id),
        eq(appointmentEmployees.employeeId, employeeA.id),
      ),
    );
  expect(linksA).toHaveLength(0);

  // employeeB weiterhin am Termin
  const linksB = await db
    .select()
    .from(appointmentEmployees)
    .where(
      and(
        eq(appointmentEmployees.appointmentId, appointment.id),
        eq(appointmentEmployees.employeeId, employeeB.id),
      ),
    );
  expect(linksB).toHaveLength(1);
});
