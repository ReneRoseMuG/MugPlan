/**
 * Gemeinsame Browser-Helfer für die MS-57 Testsuite: Termin- und Personalkonflikte.
 *
 * Alle Suites importieren aus dieser Datei statt lokale Kopien zu pflegen.
 * Kein Produktivcode, kein direkter Playwright-Test — reine Hilfsfunktionen.
 */
import { expect, type Page } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { eq } from "drizzle-orm";

import { db } from "../../../server/db";
import {
  appointmentEmployees,
  appointmentNotes,
  appointments,
  notes,
  tourWeekEmployees,
} from "../../../shared/schema";
import { getRelativeBerlinDate } from "../../helpers/testDataFactory";

// ─────────────────────────────────────────────────────────────────────────────
// Woche auflösen
// ─────────────────────────────────────────────────────────────────────────────

export interface WeekContext {
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekSecondDate: string;
  weekEndDate: string;
}

/**
 * Gibt die KW-Daten für eine Woche zurück, die `offsetWeeks` Wochen in der Zukunft liegt.
 * offset=1 → nächste KW (editierbar), offset=2 → übernächste KW, etc.
 */
export function resolveWeek(offsetWeeks = 1): WeekContext {
  const today = parseISO(getRelativeBerlinDate(0));
  const weekStart = startOfISOWeek(addWeeks(today, offsetWeeks));
  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekSecondDate: format(addDays(weekStart, 1), "yyyy-MM-dd"),
    weekEndDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Trägt einen Mitarbeiter in die Wochenplanung einer Tour ein. */
export async function insertTourWeekEmployee(
  tourId: number,
  isoYear: number,
  isoWeek: number,
  employeeId: number,
): Promise<void> {
  await db.insert(tourWeekEmployees).values({ tourId, isoYear, isoWeek, employeeId });
}

/** Legt eine Notiz an und verknüpft sie mit dem Termin. Gibt die noteId zurück. */
export async function createAppointmentNoteFixture(
  appointmentId: number,
  titleToken: string,
): Promise<number> {
  const result = await db.insert(notes).values({
    title: titleToken,
    body: `Testnotiz ${titleToken}`,
    print: true,
    version: 1,
  });
  const noteId = Number(result[0].insertId);
  await db.insert(appointmentNotes).values({ appointmentId, noteId, version: 1 });
  return noteId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment-Snapshot (DB-Zustand für Unverändertheitsprüfung)
// ─────────────────────────────────────────────────────────────────────────────

export interface AppointmentSnapshot {
  startDate: string | null;
  endDate: string | null;
  tourId: number | null;
  employeeIds: number[];
}

/** Liest den aktuellen DB-Zustand eines Termins für spätere Vergleiche. */
export async function snapshotAppointment(appointmentId: number): Promise<AppointmentSnapshot> {
  const [appt] = await db
    .select({ startDate: appointments.startDate, endDate: appointments.endDate, tourId: appointments.tourId })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  const empRows = await db
    .select({ employeeId: appointmentEmployees.employeeId })
    .from(appointmentEmployees)
    .where(eq(appointmentEmployees.appointmentId, appointmentId));

  return {
    startDate: appt?.startDate ?? null,
    endDate: appt?.endDate ?? null,
    tourId: appt?.tourId ?? null,
    employeeIds: empRows.map((r) => r.employeeId).sort((a, b) => a - b),
  };
}

/**
 * Prüft, dass der DB-Zustand des Termins identisch mit dem Snapshot vor der Mutation ist.
 * Kernaussage: "Der Termin bleibt vollständig unverändert."
 */
export async function expectAppointmentUnchanged(
  appointmentId: number,
  before: AppointmentSnapshot,
): Promise<void> {
  const after = await snapshotAppointment(appointmentId);
  expect(after.startDate, "startDate nach Abbruch/Konflikt").toBe(before.startDate);
  expect(after.endDate, "endDate nach Abbruch/Konflikt").toBe(before.endDate);
  expect(after.tourId, "tourId nach Abbruch/Konflikt").toBe(before.tourId);
  expect(after.employeeIds, "employeeIds nach Abbruch/Konflikt").toEqual(before.employeeIds);
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

export async function navigateToWeekView(page: Page): Promise<void> {
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
}

/**
 * Navigiert in der Wochenansicht um `steps` Wochen vorwärts (positiv) oder rückwärts (negativ).
 * Setzt voraus, dass die Wochenansicht bereits geöffnet ist.
 */
export async function navigateWeekOffset(page: Page, steps: number): Promise<void> {
  const buttonId = steps >= 0 ? "button-next" : "button-prev";
  const count = Math.abs(steps);
  for (let i = 0; i < count; i += 1) {
    await page.getByTestId(buttonId).click();
  }
}

/**
 * Öffnet das Terminformular für einen bestehenden Termin in der Wochenansicht.
 * weekOffset: wie viele Wochen vorwärts navigiert werden soll (Standard: 1 = nächste KW).
 */
export async function openAppointmentFormInWeekView(
  page: Page,
  appointmentId: number,
  weekOffset = 1,
): Promise<void> {
  await navigateToWeekView(page);
  await navigateWeekOffset(page, weekOffset);
  const panel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(panel).toBeVisible();
  await panel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

// ─────────────────────────────────────────────────────────────────────────────
// Drag & Drop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Löst einen synthetischen Drag-and-Drop-Drop in der Wochenansicht aus.
 * Gibt true zurück, wenn der Drop-Event das Ziel erreicht hat.
 */
export async function dispatchWeekViewDrop(
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

export async function dispatchMonthViewDrop(
  page: Page,
  appointmentId: number,
  targetDate: string,
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
      sourceTestId: `appointment-bar-${appointmentId}`,
      dayTestId: `month-sheet-day-${targetDate}`,
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cut & Paste
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schneidet einen Termin aus (Dropdown-Menü → Ausschneiden) und fügt ihn
 * durch Klick auf die Zielzelle ein.
 */
export async function cutAndPasteAppointment(
  page: Page,
  appointmentId: number,
  targetDate: string,
  targetTourId: number,
): Promise<void> {
  await page.getByTestId(`week-appointment-menu-trigger-${appointmentId}`).click();
  await page.getByTestId(`week-appointment-cut-${appointmentId}`).click();
  await page.getByTestId(`week-day-drop-overlay-${targetDate}-lane-tour-${targetTourId}`).click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Finaler Konfliktdialog
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prüft, dass der finale Konfliktdialog erscheint und — falls angegeben —
 * dass die Mitarbeiter namentlich (per Badge-ID) aufgeführt sind.
 * Stellt sicher: keine Teilübernahme, keine Checkboxen, kein "trotzdem speichern".
 */
export async function expectFinalConflictDialog(
  page: Page,
  conflictingEmployeeIds?: number[],
): Promise<void> {
  const dialog = page.getByTestId("dialog-appointment-final-conflict");
  await expect(dialog).toBeVisible();

  if (conflictingEmployeeIds && conflictingEmployeeIds.length > 0) {
    for (const employeeId of conflictingEmployeeIds) {
      await expect(dialog.getByTestId(`badge-appointment-final-conflict-${employeeId}`)).toBeVisible();
    }
  }

  // Kein "trotzdem speichern" — nur Schließen
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
}

/** Schließt den finalen Konfliktdialog. */
export async function dismissFinalConflictDialog(page: Page): Promise<void> {
  await page.getByTestId("button-appointment-final-conflict-close").click();
  await expect(page.getByTestId("dialog-appointment-final-conflict")).toBeHidden();
}

// ─────────────────────────────────────────────────────────────────────────────
// Move-Dialog (Tourwechsel / Termin verschieben)
// ─────────────────────────────────────────────────────────────────────────────

/** Wartet auf den Move-Dialog und gibt den Locator zurück. */
export async function getMoveDialog(page: Page) {
  const dialog = page.getByTestId("dialog-appointment-move");
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Klickt "Weiter" im Move-Dialog um zum nächsten Schritt zu gelangen. */
export async function advanceMoveDialog(page: Page): Promise<void> {
  const dialog = page.getByTestId("dialog-appointment-move");
  await dialog.getByRole("button", { name: "Weiter" }).click();
}

/** Klickt "Bestätigen" oder "Speichern" im letzten Schritt des Move-Dialogs. */
export async function confirmMoveDialog(page: Page): Promise<void> {
  const dialog = page.getByTestId("dialog-appointment-move");
  const confirm = dialog.getByTestId("button-appointment-move-confirm");
  await expect(confirm).toBeEnabled();
  await confirm.click();
}

/** Klickt "Abbrechen" im Move-Dialog. */
export async function cancelMoveDialog(page: Page): Promise<void> {
  const dialog = page.getByTestId("dialog-appointment-move");
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toBeHidden();
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee-Picker-Dialog
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Öffnet den Employee-Picker-Dialog, wechselt in die Listenansicht und
 * wählt den Mitarbeiter mit der angegebenen ID aus. Schließt den Dialog
 * durch Bestätigung. Deterministisch unabhängig vom gespeicherten View-Mode.
 */
export async function addEmployeeViaPickerDialog(page: Page, employeeId: number): Promise<void> {
  await page.getByTestId("button-add-employee").click();
  await page.getByTestId("toggle-employee-picker-list").click();
  await expect(page.getByTestId(`employee-picker-list-row-${employeeId}`)).toBeVisible();
  await page.getByTestId(`employee-picker-list-row-${employeeId}`).click();
  await page.getByTestId("button-confirm-employee-picker-selection").click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Save-Review-Dialog (Terminformular Speichern)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Durchläuft alle Schritte des Save-Review-Dialogs durch wiederholtes Klicken auf
 * "Weiter" und abschließend "Bestätigen". Schlägt fehl wenn der Dialog nicht erscheint.
 */
export async function confirmSaveReviewDialog(page: Page): Promise<void> {
  const dialog = page.getByTestId("dialog-appointment-save-review");
  await expect(dialog).toBeVisible();

  for (let step = 0; step < 5; step += 1) {
    const nextButton = dialog.getByTestId("button-appointment-save-review-next");
    if (await nextButton.isVisible().catch(() => false)) {
      await expect(nextButton).toBeEnabled();
      await nextButton.click();
      continue;
    }

    const confirmButton = dialog.getByTestId("button-appointment-save-review-confirm");
    if (await confirmButton.isVisible().catch(() => false)) {
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();
      return;
    }
  }

  throw new Error("Save-Review-Dialog: kein Bestätigen-Button gefunden.");
}

/** Bricht den Save-Review-Dialog ab. */
export async function cancelSaveReviewDialog(page: Page): Promise<void> {
  const dialog = page.getByTestId("dialog-appointment-save-review");
  await dialog.getByTestId("button-appointment-save-review-cancel").click();
  await expect(dialog).toBeHidden();
}
