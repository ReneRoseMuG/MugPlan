/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ganztägiger Termin (kein startTime) überlappt mit einem anderen ganztägigen Termin am selben Tag.
 * - Mehrtägiger Termin: Überschneidung wird für alle Tage im Zeitraum erkannt.
 * - Mehrtägiger Termin: kein Konflikt wenn Zeiträume sich nicht überschneiden.
 * - Termin mit Zeitangabe (startTime): Tagesüberlappung reicht für Konflikt (keine stundenweise Prüfung).
 *
 * Fehlerfälle:
 * - Ganztägige Termine ohne Überschneidung werden als Konflikt gemeldet.
 * - Mehrtägiger Termin: Überschneidung an einem Mitteltag wird nicht erkannt.
 * - Termin mit Zeitangabe: kein Konflikt obwohl selber Tag belegt.
 *
 * Ziel:
 * Die Überschneidungslogik für ganztägige, mehrtägige und zeitscharfe Termine absichern.
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
  dismissFinalConflictDialog,
  dispatchWeekViewDrop,
  expectAppointmentUnchanged,
  expectFinalConflictDialog,
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
// OR-01: Zwei ganztägige Termine am selben Tag → Konflikt erkannt
// ─────────────────────────────────────────────────────────────────────────────

test("OR-01: Zwei ganztägige Termine selber Tag selber Mitarbeiter – Konflikt erkannt, Verschiebung blockiert", async ({ page }) => {
  const week = resolveWeek(1);
  const project = await createProjectFixture({ prefix: "OR-01" });
  const tour = await createTourFixture("#11aa99");
  const employee = await createEmployeeFixture("OR-01-EMP");

  // Bestehender ganztägiger Termin am Zieldatum
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Quelle: ganztägiger Termin am Startdatum
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const before = await snapshotAppointment(sourceAppointment.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 1);
  await expect(page.getByTestId(`week-appointment-panel-${sourceAppointment.id}`)).toBeVisible();

  await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekSecondDate, tour.id);

  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);

  await expectAppointmentUnchanged(sourceAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// OR-02: Mehrtägiger Termin — Überschneidung an Mitteltag erkannt
// ─────────────────────────────────────────────────────────────────────────────

test("OR-02: Mehrtägiger Termin — Konflikttermin an einem Mitteltag des Zielzeitraums – Verschiebung blockiert", async ({ page }) => {
  const week = resolveWeek(2);
  const project = await createProjectFixture({ prefix: "OR-02" });
  const tour = await createTourFixture("#22bb99");
  const employee = await createEmployeeFixture("OR-02-EMP");

  // Konflikttermin am Dienstag (Mitteltag des neuen Zeitraums Mo–Mi)
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Mehrtägiger Quelltermin: soll auf Mo→Mi verschoben werden
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
  await navigateWeekOffset(page, 2);

  // Verschieben auf Dienstag (Konflikttag liegt dort)
  await dispatchWeekViewDrop(page, multiDayAppointment.id, week.weekSecondDate, tour.id);

  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);

  await expectAppointmentUnchanged(multiDayAppointment.id, before);
});

// ─────────────────────────────────────────────────────────────────────────────
// OR-03: Mehrtägige Termine ohne Überschneidung → kein Konflikt
// ─────────────────────────────────────────────────────────────────────────────

test("OR-03: Mehrtägige Termine ohne Zeitraumüberschneidung – kein Konflikt, Verschiebung erfolgreich", async ({ page }) => {
  const week = resolveWeek(3);
  const project = await createProjectFixture({ prefix: "OR-03" });
  const tour = await createTourFixture("#33cc99");
  const employee = await createEmployeeFixture("OR-03-EMP");

  // Bestehender Termin: nur am Montag
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Quelltermin: soll auf Mittwoch verschoben werden (kein Überschneidungsbereich)
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    endDate: week.weekStartDate,
    tourId: tour.id,
    employeeIds: [],
  });

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 3);

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/appointments/${sourceAppointment.id}`) &&
      response.request().method() === "PATCH",
    { timeout: 10_000 },
  );

  // Auf Mittwoch verschieben — kein Konflikt erwartet
  await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekEndDate, tour.id);

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.status()).toBe(200);

  // Kein Konfliktdialog
  await expect(page.getByTestId("dialog-appointment-final-conflict")).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// OR-04: Termin mit startTime — Tagesüberlappung reicht für Konflikt
// ─────────────────────────────────────────────────────────────────────────────

test("OR-04: Termin mit Zeitangabe selber Tag belegt – Tagesüberlappung reicht für Konflikt, keine stundenweise Prüfung", async ({ page }) => {
  const week = resolveWeek(4);
  const project = await createProjectFixture({ prefix: "OR-04" });
  const tour = await createTourFixture("#44dd99");
  const employee = await createEmployeeFixture("OR-04-EMP");

  // Bestehender Termin am Zieldatum (mit Zeitangabe — frühmorgens)
  await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekSecondDate,
    startTime: "07:00",
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  // Quelltermin mit späterer Uhrzeit am selben Zieltag
  const sourceAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: week.weekStartDate,
    startTime: "14:00",
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  const before = await snapshotAppointment(sourceAppointment.id);

  await loginAsAdmin(page);
  await navigateToWeekView(page);
  await navigateWeekOffset(page, 4);

  await dispatchWeekViewDrop(page, sourceAppointment.id, week.weekSecondDate, tour.id);

  // Tagesüberlappung reicht — Konflikt trotz unterschiedlicher Uhrzeit
  await expectFinalConflictDialog(page, [employee.id]);
  await dismissFinalConflictDialog(page);

  await expectAppointmentUnchanged(sourceAppointment.id, before);
});
