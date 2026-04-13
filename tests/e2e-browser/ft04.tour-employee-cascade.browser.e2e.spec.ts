/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Neue Touren zeigen die Wochenplanung erst nach dem ersten Speichern im Edit-Modus.
 * - Die KW-Unique-Regel blockiert Mehrfachzuordnungen desselben Mitarbeiters über zwei Touren hinweg.
 * - Wochenplan-Previews markieren Terminüberschneidungen sichtbar und übernehmen nur konfliktfreie Termine.
 *
 * Fehlerfälle:
 * - Der Wochenplanung-Tab erscheint bereits im Create-Modus.
 * - Mitarbeiter können trotz bestehender KW-Zuordnung still in eine zweite Tour eingeplant werden.
 * - Der Preview-Dialog unterscheidet Konflikttermine nicht mehr von konfliktfreien Terminen.
 *
 * Ziel:
 * Die neue FT04-Wochenplan-UX mit ihren wichtigsten Konfliktpfaden browserseitig absichern.
 */
import { expect, test } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import { db } from "../../server/db";
import { tourWeekEmployees } from "../../shared/schema";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

function resolveNextEditableWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const nextWeekStart = startOfISOWeek(addWeeks(today, 1));
  const secondDay = addDays(nextWeekStart, 1);
  return {
    weekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
    weekSecondDate: format(secondDay, "yyyy-MM-dd"),
    isoYear: getISOWeekYear(nextWeekStart),
    isoWeek: getISOWeek(nextWeekStart),
    maxIsoWeek: getISOWeek(new Date(getISOWeekYear(nextWeekStart), 11, 28)),
  };
}

async function openWeekPlanning(page: import("@playwright/test").Page, tourId: number) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId(`card-tour-${tourId}`).dblclick();
  await page.getByTestId("tab-tour-wochenplanung").click();
  await expect(page.getByTestId("tour-form-functions-panel")).toBeVisible();
  await expect(page.getByTestId("toggle-tour-week-picker")).toBeVisible();
  await expect(page.getByTestId("tour-form-functions-panel")).toContainText("Funktionen");
  await expect(page.getByTestId("tour-form-functions-panel")).toContainText("KW einfügen");
}

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("creates a new tour without a Wochenplanung tab in create mode", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByTestId("nav-touren").click();
  await page.getByTestId("button-new-tour").click();

  await expect(page.getByTestId("tab-tour-wochenplanung")).toHaveCount(0);
  await expect(page.getByTestId("grid-tour-week-planning")).toHaveCount(0);
  await expect(page.getByTestId("button-add-tour-member")).toHaveCount(0);

  await page.getByTestId("button-save-tour").click();
  await expect(page.getByTestId("button-new-tour")).toBeVisible();
});

test("blocks assigning the same employee to a second tour in the same ISO week", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const firstTour = await createTourFixture("#4477aa");
  const secondTour = await createTourFixture("#aa7744");
  const employee = await createEmployeeFixture("FT04-BROWSER-UNIQUE");

  await db.insert(tourWeekEmployees).values({
    tourId: firstTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: employee.id,
  });

  await openWeekPlanning(page, secondTour.id);

  await page.getByTestId("toggle-tour-week-picker").click();
  await page.getByTestId("input-tour-week").fill(String(nextWeek.isoWeek));
  await page.getByTestId("button-confirm-tour-week").click();
  await page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.isoWeek}`).getByTestId(
    `button-add-tour-week-member-${nextWeek.isoYear}-${nextWeek.isoWeek}`,
  ).click();
  await page.getByTestId(`employee-picker-card-${employee.id}`).dblclick();

  await expect(page.getByTestId("dialog-tour-employee-cascade")).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/tours/${secondTour.id}/week-employees`);
    return response.json();
  }).toEqual([]);
});

test("validates the footer week picker against min and max bounds", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const tour = await createTourFixture("#556677");

  await openWeekPlanning(page, tour.id);

  await page.getByTestId("toggle-tour-week-picker").click();
  await expect(page.getByTestId("text-tour-week-dialog-year")).toContainText(String(nextWeek.isoYear));

  await page.getByTestId("input-tour-week").fill(String(nextWeek.isoWeek - 1));
  await page.getByTestId("button-confirm-tour-week").click();
  await expect(page.getByText("Kalenderwoche zu klein")).toBeVisible();
  await expect(page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.isoWeek - 1}`)).toHaveCount(0);

  await page.getByTestId("input-tour-week").fill(String(nextWeek.maxIsoWeek + 1));
  await page.getByTestId("button-confirm-tour-week").click();
  await expect(page.getByText("Kalenderwoche zu groß", { exact: true })).toBeVisible();
  await expect(page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.maxIsoWeek + 1}`)).toHaveCount(0);

  await page.getByTestId("input-tour-week").fill(String(nextWeek.isoWeek));
  await page.getByTestId("button-confirm-tour-week").click();
  const insertedWeekCard = page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.isoWeek}`);
  await expect(insertedWeekCard).toBeVisible();
});

test("shows overlap conflicts in the week preview and only applies the selectable appointments", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const tour = await createTourFixture("#335577");
  const project = await createProjectFixture({ prefix: "FT04-BROWSER", name: "FT04 Browser Projekt" });
  const employee = await createEmployeeFixture("FT04-BROWSER-CONFLICT");

  const conflictAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekStartDate,
    tourId: tour.id,
  });
  const safeAppointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekSecondDate,
    tourId: tour.id,
  });

  await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekStartDate,
    employeeIds: [employee.id],
  });

  await openWeekPlanning(page, tour.id);

  await page.getByTestId("toggle-tour-week-picker").click();
  await page.getByTestId("input-tour-week").fill(String(nextWeek.isoWeek));
  await page.getByTestId("button-confirm-tour-week").click();
  await page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.isoWeek}`).getByTestId(
    `button-add-tour-week-member-${nextWeek.isoYear}-${nextWeek.isoWeek}`,
  ).click();
  await page.getByTestId(`employee-picker-card-${employee.id}`).dblclick();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Mitarbeiter in Wochenplanung aufnehmen");
  await expect(dialog.getByTestId(`tour-employee-cascade-status-${conflictAppointment.id}`)).toContainText(
    "Ueberschneidung mit bestehendem Termin",
  );
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${conflictAppointment.id}`)).not.toBeChecked();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${conflictAppointment.id}`)).toBeDisabled();
  await expect(dialog.getByTestId(`tour-employee-cascade-checkbox-${safeAppointment.id}`)).toBeChecked();

  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${conflictAppointment.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b);
  }).toEqual([]);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${safeAppointment.id}`);
    const payload = await response.json();
    return (payload.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b);
  }).toEqual([employee.id]);
});
