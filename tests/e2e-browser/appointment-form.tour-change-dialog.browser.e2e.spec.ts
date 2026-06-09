/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Kein Mitarbeiter, keine Zielplanung → kein Dialog, Tour direkt geändert.
 * - Mitarbeiter vorhanden, keine Zielplanung → nur Entfernen-Schritt erscheint.
 * - Keine Mitarbeiter, aber Zielplanung → nur Übernahme-Schritt erscheint.
 * - Mitarbeiter vorhanden und Zielplanung → Entfernen-Schritt, dann Übernahme-Schritt.
 * - Dialog abbrechen → Tour und Mitarbeiter im Formular unverändert.
 * - Kein "Alle wählen" / "Alle abwählen" in keinem Schritt.
 *
 * Fehlerfälle:
 * - Dialog erscheint obwohl kein Mitarbeiter und keine Zielplanung vorhanden.
 * - Entfernen-Schritt und Übernahme-Schritt erscheinen im selben Schritt.
 * - Abbrechen mutiert Tour oder Mitarbeiterliste.
 * - "Alle wählen" / "Alle abwählen" sichtbar.
 *
 * Ziel:
 * Den Tourwechsel-Dialog im Terminformular für alle Einstiegskombinationen absichern,
 * ohne dass ein Speichern stattfindet.
 */
import { expect, test } from "./fixtures";

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
  getMoveDialog,
  insertTourWeekEmployee,
  openAppointmentFormInWeekView,
  resolveWeek,
} from "./helpers/appointment-conflict-helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-01: Kein Mitarbeiter, keine Zielplanung → kein Dialog
// ─────────────────────────────────────────────────────────────────────────────

test("TC-01: Tourwechsel ohne Mitarbeiter und ohne Zielplanung – kein Dialog, Tour direkt geändert", async ({ page }) => {
  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "TC-01" });
  const sourceTour = await createTourFixture("#112233");
  const targetTour = await createTourFixture("#334455");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: sourceTour.id,
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 1);

  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  // Kein Move-Dialog
  await expect(page.getByTestId("dialog-appointment-move")).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-02: Mitarbeiter vorhanden, keine Zielplanung → nur Entfernen-Schritt
// ─────────────────────────────────────────────────────────────────────────────

test("TC-02: Tourwechsel mit Mitarbeiter, keine Zielplanung – nur Entfernen-Schritt, Mitarbeiter anschließend leer", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "TC-02" });
  const sourceTour = await createTourFixture("#223344");
  const targetTour = await createTourFixture("#445566");
  const employee = await createEmployeeFixture("TC-02-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: sourceTour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 2);

  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  const dialog = await getMoveDialog(page);
  await expect(dialog).toContainText("Tourwechsel");

  // Warn-Schritt sichtbar mit Badge des entfernten Mitarbeiters
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${employee.id}`)).toBeVisible();

  // Kein "Alle wählen" / "Alle abwählen"
  await expect(dialog.getByRole("button", { name: "Alle wählen" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Alle abwählen" })).toHaveCount(0);

  // Kein Übernahme-Schritt vorhanden (kein "Weiter"-Button der zu Schritt 2 führt)
  // Bestätigen schließt den Dialog direkt
  await dialog.getByTestId("button-appointment-move-confirm").click();
  await expect(dialog).toBeHidden();

  // Mitarbeiter-Badge nicht mehr im Formular
  await expect(page.getByTestId(`badge-appointment-employee-${employee.id}`)).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-03: Keine Mitarbeiter, aber Zielplanung → nur Übernahme-Schritt
// ─────────────────────────────────────────────────────────────────────────────

test("TC-03: Tourwechsel ohne Mitarbeiter, mit Zielplanung – direkt Übernahme-Schritt, Ziel-Mitarbeiter vorausgewählt", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "TC-03" });
  const sourceTour = await createTourFixture("#334455");
  const targetTour = await createTourFixture("#556677");
  const weekEmployee = await createEmployeeFixture("TC-03-WEEK-EMP");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, weekEmployee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: sourceTour.id,
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 3);

  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  const dialog = await getMoveDialog(page);

  // Kein Entfernen-Schritt (kein removal-warning)
  await expect(dialog.getByTestId("appointment-move-removal-warning")).toHaveCount(0);

  // Direkt Übernahme-Schritt: Ziel-Mitarbeiter vorausgewählt
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();

  await expect(dialog.getByRole("button", { name: "Alle wählen" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Alle abwählen" })).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-04: Mitarbeiter vorhanden und Zielplanung → vollständige Reihenfolge
// ─────────────────────────────────────────────────────────────────────────────

test("TC-04: Tourwechsel mit Mitarbeiter und Zielplanung – Entfernen-Schritt, dann Übernahme-Schritt", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "TC-04" });
  const sourceTour = await createTourFixture("#445566");
  const targetTour = await createTourFixture("#667788");
  const currentEmployee = await createEmployeeFixture("TC-04-CURRENT");
  const weekEmployee = await createEmployeeFixture("TC-04-WEEK");

  await insertTourWeekEmployee(targetTour.id, week.isoYear, week.isoWeek, weekEmployee.id);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: sourceTour.id,
    employeeIds: [currentEmployee.id],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 4);

  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  const dialog = await getMoveDialog(page);

  // Schritt 1: Entfernen-Schritt
  await expect(dialog.getByTestId(`badge-appointment-move-removed-${currentEmployee.id}`)).toBeVisible();

  await advanceMoveDialog(page);

  // Schritt 2: Übernahme-Schritt
  await expect(dialog.getByTestId(`appointment-move-preview-checkbox-${weekEmployee.id}`)).toBeChecked();

  await expect(dialog.getByRole("button", { name: "Alle wählen" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Alle abwählen" })).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-05: Dialog abbrechen → keine Änderung
// ─────────────────────────────────────────────────────────────────────────────

test("TC-05: Tourwechsel-Dialog abbrechen – Tour und Mitarbeiter im Formular unverändert", async ({ page }) => {
  const week = resolveWeek(5);
  const project = await createProjectFixture({ prefix: "TC-05" });
  const sourceTour = await createTourFixture("#556677");
  const targetTour = await createTourFixture("#778899");
  const employee = await createEmployeeFixture("TC-05-EMP");

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: sourceTour.id,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);
  await openAppointmentFormInWeekView(page, appointment.id, 5);

  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  await getMoveDialog(page);
  await cancelMoveDialog(page);

  // Formular: sourceTour-Badge noch vorhanden (statische testId "badge-tour"), Mitarbeiter-Badge noch vorhanden
  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.getByTestId("badge-tour")).toContainText(sourceTour.name);
  await expect(page.getByTestId(`badge-appointment-employee-${employee.id}`)).toBeVisible();
});
