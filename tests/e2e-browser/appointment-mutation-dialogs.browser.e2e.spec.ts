/**
 * Test Scope:
 *
 * Feature: MILE-53 – Terminmutations-Dialoge (Task-220 + Task-221)
 *
 * Abgedeckte Regeln:
 * - Terminformular Tour-Wechsel (bestehender Termin): Dialog "Tourwechsel", Schritt 1 zeigt
 *   Mitarbeiter-Abzug-Warnung mit Badges per ID; Schritt 2 zeigt Wochenplanung vorselektiert.
 * - Kein "Alle wählen"/"Alle abwählen" in keinem Mutations-Dialog.
 * - Terminformular Speichern: Notizen-Schritt ohne Pflicht-Checkbox, Button direkt aktiv.
 * - D&D/Kalender-Move: Dialog immer "Termin verschieben", bis zu 3 isolierte Schritte:
 *   Schritt 1 Mitarbeiter-Abzug (Warn), Schritt 2 Wochenplanung (Select), Schritt 3 Notizen.
 * - Abbrechen bricht Verschiebung ab; Termin bleibt am Ursprungsort.
 * - Mitarbeiter-Abwahl in Schritt 2 wird in der DB persistiert.
 * - D&D/Kalender-Move: Zurück-Navigation stellt den vorigen Schritt samt Inhalt wieder her;
 *   in Schritt 1 existiert kein Zurück-Button; reine Navigation verändert den Termin nicht.
 * - D&D/Kalender-Move: vollständige Bestätigung über alle drei Schritte (inkl. Notizen)
 *   persistiert die Verschiebung (Zieldatum und Ziel-Tour) in der DB.
 *
 * Fehlerfälle:
 * - Dialog zeigt "Termin speichern" statt "Termin verschieben" bei D&D.
 * - Mitarbeiter-Abzug und Wochenplanung erscheinen im selben Schritt.
 * - "Alle wählen"/"Alle abwählen" sind noch sichtbar.
 * - Pflicht-Checkbox blockiert Speichern-Button im Notizen-Schritt.
 * - Abbrechen verschiebt Termin trotzdem.
 * - Zurück-Button fehlt in Schritt 2 oder stellt den vorigen Schritt nicht wieder her.
 * - Reine Schritt-Navigation (Weiter/Zurück) verändert den Termin bereits.
 * - Bestätigen im Notizen-Schritt persistiert die Verschiebung nicht.
 *
 * Isolationsklasse: B · Baseline: seeded · Storage: none
 *
 * Ziel:
 * Das bereinigte Dialog-Verhalten nach MILE-53 im echten Browser für alle Mutations-Pfade absichern.
 */
import { expect, test, type Page } from "./fixtures";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import { db } from "../../server/db";
import { appointmentNotes, notes, tourWeekEmployees } from "../../shared/schema";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolveNextEditableWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const nextWeekStart = startOfISOWeek(addWeeks(today, 1));
  const secondDay = addDays(nextWeekStart, 1);
  return {
    weekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
    weekSecondDate: format(secondDay, "yyyy-MM-dd"),
    isoYear: getISOWeekYear(nextWeekStart),
    isoWeek: getISOWeek(nextWeekStart),
  };
}

async function navigateToWeekView(page: Page) {
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
}

async function openExistingAppointmentInNextWeek(page: Page, appointmentId: number) {
  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();
  const panel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(panel).toBeVisible();
  await panel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function createAppointmentNote(appointmentId: number, titleToken: string): Promise<number> {
  const result = await db.insert(notes).values({
    title: titleToken,
    body: `Testnotiz fuer ${titleToken}`,
    print: true,
    version: 1,
  });
  const noteId = Number(result[0].insertId);
  await db.insert(appointmentNotes).values({ appointmentId, noteId, version: 1 });
  return noteId;
}

/** Dispatches a synthetic drag-and-drop drop event in the week view. */
async function dispatchWeekViewDrop(
  page: Page,
  appointmentId: number,
  targetDate: string,
  targetTourId: number,
): Promise<boolean> {
  return page.evaluate(
    async ({ id, sourceTestId, dayTestId }) => {
      const source = document.querySelector(`[data-testid="${sourceTestId}"]`);
      if (!(source instanceof HTMLElement)) return false;

      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", String(id));

      source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const target = document.querySelector(`[data-testid="${dayTestId}"]`);
      if (!(target instanceof HTMLElement)) {
        source.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }));
        return false;
      }

      let dropped = false;
      target.addEventListener("drop", () => { dropped = true; }, { once: true });
      target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
      source.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }));
      return dropped;
    },
    {
      id: appointmentId,
      sourceTestId: `week-appointment-panel-${appointmentId}`,
      dayTestId: `week-day-drop-overlay-${targetDate}-lane-tour-${targetTourId}`,
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gruppe A – Terminformular
// ─────────────────────────────────────────────────────────────────────────────

test("A-01: Terminformular Tour-Wechsel – Titel 'Tourwechsel', Warn-Schritt mit Mitarbeiter-Badges, kein 'Alle wählen'", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-A01" });
  const sourceTour = await createTourFixture("#225566");
  const targetTour = await createTourFixture("#66aa44");
  const removedEmployee = await createEmployeeFixture("DIAL-A01-REMOVED");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekSecondDate,
    tourId: sourceTour.id,
    employeeIds: [removedEmployee.id],
  });

  await openExistingAppointmentInNextWeek(page, appointment.id);

  // Tour wechseln: erst entfernen, dann neue wählen
  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Tourwechsel");
  await expect(dialog).not.toContainText("Termin verschieben");

  // Warn-Schritt: Mitarbeiter-Badge per ID sichtbar
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${removedEmployee.id}`)).toBeVisible();

  // Kein "Alle wählen"/"Alle abwählen"
  await expect(dialog.getByRole("button", { name: "Alle wählen" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Alle abwählen" })).toHaveCount(0);
});

test("A-02: Terminformular Tour-Wechsel – Schritt 2 Wochenplanung vorselektiert, kein 'Alle wählen'", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-A02" });
  const sourceTour = await createTourFixture("#225577");
  const targetTour = await createTourFixture("#66bb44");
  const currentEmployee = await createEmployeeFixture("DIAL-A02-CURRENT");
  const weekEmployee = await createEmployeeFixture("DIAL-A02-WEEK");

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekSecondDate,
    tourId: sourceTour.id,
    employeeIds: [currentEmployee.id],
  });

  await openExistingAppointmentInNextWeek(page, appointment.id);

  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Tourwechsel");

  // Schritt 1: Warn → Weiter
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${currentEmployee.id}`)).toBeVisible();
  await dialog.getByRole("button", { name: "Weiter" }).click();

  // Schritt 2: Wochenplanung – Mitarbeiter vorselektiert
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();

  // Kein "Alle wählen"/"Alle abwählen"
  await expect(dialog.getByRole("button", { name: "Alle wählen" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Alle abwählen" })).toHaveCount(0);
});

test("A-03: Terminformular Speichern – Notizen-Schritt ohne Pflicht-Checkbox, Button direkt aktiv", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const targetWeekStart = startOfISOWeek(addWeeks(parseISO(nextWeek.weekStartDate), 1));
  const targetDate = format(addDays(targetWeekStart, 1), "yyyy-MM-dd");
  const project = await createProjectFixture({ prefix: "DIAL-A03" });
  const tour = await createTourFixture("#334466");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekSecondDate,
    tourId: tour.id,
  });
  await createAppointmentNote(appointment.id, "DIAL-A03-NOTE");

  await openExistingAppointmentInNextWeek(page, appointment.id);

  // Datum in nächste KW verschieben → triggert Notizen-Schritt beim Speichern
  await page.getByTestId("input-start-date").fill(targetDate);
  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("appointment-save-review-step-notes")).toBeVisible();

  // Keine Pflicht-Checkbox
  await expect(dialog.getByTestId("checkbox-appointment-save-review-notes-reviewed")).toHaveCount(0);

  // Bestätigen-Button direkt aktiv – kein Klick auf Checkbox nötig
  const confirmButton = dialog.getByTestId("button-appointment-save-review-confirm").or(
    dialog.getByTestId("button-appointment-save-review-next"),
  );
  await expect(confirmButton.first()).toBeEnabled();

  // Kein "Alle wählen"/"Alle abwählen"
  await expect(dialog.getByRole("button", { name: "Alle wählen" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Alle abwählen" })).toHaveCount(0);
});

test("A-04: Terminformular Tour-Wechsel Abbrechen – Tourauswahl bleibt erhalten", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-A04" });
  const sourceTour = await createTourFixture("#226688");
  const targetTour = await createTourFixture("#aa4466");
  const employee = await createEmployeeFixture("DIAL-A04-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekSecondDate,
    tourId: sourceTour.id,
    employeeIds: [employee.id],
  });

  await openExistingAppointmentInNextWeek(page, appointment.id);

  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toHaveCount(0);

  // Ziel-Tour-Badge noch im Formular sichtbar (Tour wurde vor Dialog ausgewählt)
  await expect(page.getByTestId("badge-tour")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// Gruppe B – D&D / Kalender-Move
// ─────────────────────────────────────────────────────────────────────────────

test("B-01: D&D 3-Schritt-Flow – Titel 'Termin verschieben' in jedem Schritt, Stepper korrekt", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-B01" });
  const sourceTour = await createTourFixture("#001122");
  const targetTour = await createTourFixture("#334455");
  const removedEmployee = await createEmployeeFixture("DIAL-B01-REMOVED");
  const weekEmployee = await createEmployeeFixture("DIAL-B01-WEEK");

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const sourceDate = nextWeek.weekSecondDate;
  const targetDate = format(addDays(parseISO(nextWeek.weekStartDate), 3), "yyyy-MM-dd");

  // Termin in Ziel-Tour anlegen, damit die Lane im Kalender sichtbar ist
  await createAppointmentFixture({ projectId: project.id, startDate: targetDate, tourId: targetTour.id });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [removedEmployee.id],
  });
  await createAppointmentNote(appointment.id, "DIAL-B01-NOTE");

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();

  const dropped = await dispatchWeekViewDrop(page, appointment.id, targetDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Schritt 1 – Mitarbeiter
  await expect(dialog).toContainText("Termin verschieben");
  await expect(dialog).not.toContainText("Termin speichern");
  await dialog.getByRole("button", { name: "Weiter" }).click();

  // Schritt 2 – Wochenplanung
  await expect(dialog).toContainText("Termin verschieben");
  await dialog.getByRole("button", { name: "Weiter" }).click();

  // Schritt 3 – Notizen
  await expect(dialog).toContainText("Termin verschieben");
  await expect(dialog.getByTestId("appointment-move-step-notes")).toBeVisible();
  await expect(dialog.getByTestId("appointment-move-notes-previous-date")).toContainText(
    format(parseISO(sourceDate), "dd.MM.yy"),
  );
});

test("B-02: D&D Schritt 1 – nur Warn-Badge, keine Auswahlliste sichtbar", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-B02" });
  const sourceTour = await createTourFixture("#112233");
  const targetTour = await createTourFixture("#aabbcc");
  const removedEmployee = await createEmployeeFixture("DIAL-B02-REMOVED");
  const weekEmployee = await createEmployeeFixture("DIAL-B02-WEEK");

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const sourceDate = nextWeek.weekSecondDate;
  const targetDate = format(addDays(parseISO(nextWeek.weekStartDate), 3), "yyyy-MM-dd");

  // Termin in Ziel-Tour anlegen, damit die Lane im Kalender sichtbar ist
  await createAppointmentFixture({ projectId: project.id, startDate: targetDate, tourId: targetTour.id });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [removedEmployee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();

  const dropped = await dispatchWeekViewDrop(page, appointment.id, targetDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Termin verschieben");

  // Warn-Badge für entfernten Mitarbeiter sichtbar
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${removedEmployee.id}`)).toBeVisible();

  // Auswahlliste noch nicht sichtbar (Schritt 1)
  await expect(dialog.getByTestId("appointment-move-selection-list")).toHaveCount(0);

  // Kein "Alle wählen"/"Alle abwählen"
  await expect(dialog.getByRole("button", { name: "Alle wählen" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Alle abwählen" })).toHaveCount(0);
});

test("B-03: D&D Schritt 2 – Wochenplanung vorselektiert, kein 'Alle wählen'", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-B03" });
  const sourceTour = await createTourFixture("#223344");
  const targetTour = await createTourFixture("#bbccdd");
  const removedEmployee = await createEmployeeFixture("DIAL-B03-REMOVED");
  const weekEmployee = await createEmployeeFixture("DIAL-B03-WEEK");

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const sourceDate = nextWeek.weekSecondDate;
  const targetDate = format(addDays(parseISO(nextWeek.weekStartDate), 3), "yyyy-MM-dd");

  // Termin in Ziel-Tour anlegen, damit die Lane im Kalender sichtbar ist
  await createAppointmentFixture({ projectId: project.id, startDate: targetDate, tourId: targetTour.id });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [removedEmployee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();

  const dropped = await dispatchWeekViewDrop(page, appointment.id, targetDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Weiter zu Schritt 2
  await dialog.getByRole("button", { name: "Weiter" }).click();

  // Wochenplanung: Mitarbeiter vorselektiert
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();

  // Kein "Alle wählen"/"Alle abwählen"
  await expect(dialog.getByRole("button", { name: "Alle wählen" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Alle abwählen" })).toHaveCount(0);
});

test("B-04: D&D Abbrechen in Schritt 1 – Termin verbleibt am Ursprungsort", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-B04" });
  const sourceTour = await createTourFixture("#335566");
  const targetTour = await createTourFixture("#ccddee");
  const employee = await createEmployeeFixture("DIAL-B04-EMP");

  const sourceDate = nextWeek.weekSecondDate;
  const targetDate = format(addDays(parseISO(nextWeek.weekStartDate), 3), "yyyy-MM-dd");

  // Termin in Ziel-Tour anlegen, damit die Lane im Kalender sichtbar ist
  await createAppointmentFixture({ projectId: project.id, startDate: targetDate, tourId: targetTour.id });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();

  const dropped = await dispatchWeekViewDrop(page, appointment.id, targetDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Abbrechen in Schritt 1
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toHaveCount(0);

  // Termin liegt noch am Ursprungsdatum
  const response = await page.request.get(`/api/appointments/${appointment.id}`);
  const body = await response.json() as { startDate: string; tourId: number };
  expect(body.startDate).toBe(sourceDate);
  expect(body.tourId).toBe(sourceTour.id);
});

test("B-05: D&D Abbrechen in Schritt 2 – Termin verbleibt am Ursprungsort", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-B05" });
  const sourceTour = await createTourFixture("#446677");
  const targetTour = await createTourFixture("#ddeeff");
  const removedEmployee = await createEmployeeFixture("DIAL-B05-REMOVED");
  const weekEmployee = await createEmployeeFixture("DIAL-B05-WEEK");

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const sourceDate = nextWeek.weekSecondDate;
  const targetDate = format(addDays(parseISO(nextWeek.weekStartDate), 3), "yyyy-MM-dd");

  // Termin in Ziel-Tour anlegen, damit die Lane im Kalender sichtbar ist
  await createAppointmentFixture({ projectId: project.id, startDate: targetDate, tourId: targetTour.id });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [removedEmployee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();

  const dropped = await dispatchWeekViewDrop(page, appointment.id, targetDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Weiter zu Schritt 2, dann abbrechen
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toHaveCount(0);

  // Termin liegt noch am Ursprungsdatum
  const response = await page.request.get(`/api/appointments/${appointment.id}`);
  const body = await response.json() as { startDate: string; tourId: number };
  expect(body.startDate).toBe(sourceDate);
  expect(body.tourId).toBe(sourceTour.id);
});

test("B-06: D&D Mitarbeiter-Abwahl in Schritt 2 wird in DB persistiert", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-B06" });
  const sourceTour = await createTourFixture("#557788");
  const targetTour = await createTourFixture("#eeff00");
  const removedEmployee = await createEmployeeFixture("DIAL-B06-REMOVED");
  const weekEmployee1 = await createEmployeeFixture("DIAL-B06-WEEK1");
  const weekEmployee2 = await createEmployeeFixture("DIAL-B06-WEEK2");

  await db.insert(tourWeekEmployees).values([
    { tourId: targetTour.id, isoYear: nextWeek.isoYear, isoWeek: nextWeek.isoWeek, employeeId: weekEmployee1.id },
    { tourId: targetTour.id, isoYear: nextWeek.isoYear, isoWeek: nextWeek.isoWeek, employeeId: weekEmployee2.id },
  ]);

  const sourceDate = nextWeek.weekSecondDate;
  const targetDate = format(addDays(parseISO(nextWeek.weekStartDate), 3), "yyyy-MM-dd");

  // Termin in Ziel-Tour anlegen, damit die Lane im Kalender sichtbar ist
  await createAppointmentFixture({ projectId: project.id, startDate: targetDate, tourId: targetTour.id });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [removedEmployee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();

  const patchResponsePromise = page.waitForResponse(
    (r) => r.url().includes(`/api/appointments/${appointment.id}`) && r.request().method() === "PATCH",
    { timeout: 15_000 },
  );

  const dropped = await dispatchWeekViewDrop(page, appointment.id, targetDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Weiter zu Schritt 2
  await dialog.getByRole("button", { name: "Weiter" }).click();

  // weekEmployee2 abwählen – nur weekEmployee1 bleibt selektiert
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee1.id}`)).toBeChecked();
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee2.id}`)).toBeChecked();
  await dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee2.id}`).click();
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee2.id}`)).not.toBeChecked();

  await dialog.getByTestId("button-appointment-move-confirm").click();

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // DB: nur weekEmployee1 ist am Termin, weekEmployee2 nicht
  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json() as {
      startDate: string;
      tourId: number;
      employees: Array<{ id: number }>;
    };
    return {
      startDate: body.startDate,
      tourId: body.tourId,
      employeeIds: body.employees.map((e) => e.id).sort((a, b) => a - b),
    };
  }).toEqual({
    startDate: targetDate,
    tourId: targetTour.id,
    employeeIds: [weekEmployee1.id],
  });
});

test("B-07: D&D Zurück-Navigation – von Schritt 2 zurück zu Schritt 1, Inhalt wiederhergestellt, kein Speichern", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-B07" });
  const sourceTour = await createTourFixture("#668899");
  const targetTour = await createTourFixture("#99aabb");
  const removedEmployee = await createEmployeeFixture("DIAL-B07-REMOVED");
  const weekEmployee = await createEmployeeFixture("DIAL-B07-WEEK");

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const sourceDate = nextWeek.weekSecondDate;
  const targetDate = format(addDays(parseISO(nextWeek.weekStartDate), 3), "yyyy-MM-dd");

  // Termin in Ziel-Tour anlegen, damit die Lane im Kalender sichtbar ist
  await createAppointmentFixture({ projectId: project.id, startDate: targetDate, tourId: targetTour.id });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [removedEmployee.id],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();

  const dropped = await dispatchWeekViewDrop(page, appointment.id, targetDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Schritt 1: Warn-Badge sichtbar, in Schritt 1 gibt es keinen Zurück-Button
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${removedEmployee.id}`)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Zurück" })).toHaveCount(0);

  // Weiter zu Schritt 2: Wochenplanung sichtbar, Warn-Badge nicht mehr im DOM
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${removedEmployee.id}`)).toHaveCount(0);

  // Zurück zu Schritt 1: Warn-Badge wieder sichtbar, Auswahlliste nicht mehr im DOM
  await dialog.getByRole("button", { name: "Zurück" }).click();
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${removedEmployee.id}`)).toBeVisible();
  await expect(dialog.getByTestId("appointment-move-selection-list")).toHaveCount(0);

  // Reine Navigation darf den Termin nicht verändert haben
  const response = await page.request.get(`/api/appointments/${appointment.id}`);
  const body = await response.json() as { startDate: string; tourId: number };
  expect(body.startDate).toBe(sourceDate);
  expect(body.tourId).toBe(sourceTour.id);
});

test("B-08: D&D 3-Schritt vollständig bestätigen – Notizen-Schritt, Verschiebung in DB persistiert", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "DIAL-B08" });
  const sourceTour = await createTourFixture("#77aa99");
  const targetTour = await createTourFixture("#aa99cc");
  const removedEmployee = await createEmployeeFixture("DIAL-B08-REMOVED");
  const weekEmployee = await createEmployeeFixture("DIAL-B08-WEEK");

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const sourceDate = nextWeek.weekSecondDate;
  const targetDate = format(addDays(parseISO(nextWeek.weekStartDate), 3), "yyyy-MM-dd");

  // Termin in Ziel-Tour anlegen, damit die Lane im Kalender sichtbar ist
  await createAppointmentFixture({ projectId: project.id, startDate: targetDate, tourId: targetTour.id });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: sourceDate,
    tourId: sourceTour.id,
    employeeIds: [removedEmployee.id],
  });
  // Notiz erzwingt den dritten Schritt (Notizen) im Move-Dialog
  await createAppointmentNote(appointment.id, "DIAL-B08-NOTE");

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await page.getByTestId("button-next").click();

  const patchResponsePromise = page.waitForResponse(
    (r) => r.url().includes(`/api/appointments/${appointment.id}`) && r.request().method() === "PATCH",
    { timeout: 15_000 },
  );

  const dropped = await dispatchWeekViewDrop(page, appointment.id, targetDate, targetTour.id);
  expect(dropped).toBe(true);

  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();

  // Schritt 1 Warn → Weiter
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${removedEmployee.id}`)).toBeVisible();
  await dialog.getByRole("button", { name: "Weiter" }).click();

  // Schritt 2 Wochenplanung → Weiter
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();
  await dialog.getByRole("button", { name: "Weiter" }).click();

  // Schritt 3 Notizen → Bestätigen (letzter Schritt)
  await expect(dialog.getByTestId("appointment-move-step-notes")).toBeVisible();
  await dialog.getByTestId("button-appointment-move-confirm").click();

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // DB: Termin liegt jetzt am Zieldatum in der Ziel-Tour
  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json() as { startDate: string; tourId: number };
    return { startDate: body.startDate, tourId: body.tourId };
  }).toEqual({ startDate: targetDate, tourId: targetTour.id });
});
