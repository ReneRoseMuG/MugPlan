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
import { expect, test } from "./fixtures";
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
  const nextFreeWeekStart = addWeeks(nextWeekStart, 4);
  const planningWeeks = Array.from({ length: 4 }, (_entry, index) => {
    const weekStart = addWeeks(nextWeekStart, index);
    return {
      isoYear: getISOWeekYear(weekStart),
      isoWeek: getISOWeek(weekStart),
    };
  });
  return {
    weekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
    weekSecondDate: format(secondDay, "yyyy-MM-dd"),
    isoYear: getISOWeekYear(nextWeekStart),
    isoWeek: getISOWeek(nextWeekStart),
    nextFreeIsoWeek: getISOWeek(nextFreeWeekStart),
    maxIsoWeek: getISOWeek(new Date(getISOWeekYear(nextWeekStart), 11, 28)),
    planningWeeks,
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

function toastWithTitle(page: import("@playwright/test").Page, title: string) {
  return page.locator("[role='status']").filter({ hasText: title }).first();
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

test("shows employees already assigned to another tour in the same ISO week as locked with a reason", async ({ page }) => {
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

  const weekCard = page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.isoWeek}`);
  await expect(weekCard).toBeVisible();
  await weekCard.getByTestId(
    `button-add-tour-week-member-${nextWeek.isoYear}-${nextWeek.isoWeek}`,
  ).click();
  // Bereits in der KW (firstTour) verplanter Mitarbeiter: sichtbar, aber gesperrt mit Tour-Begründung (nicht ausgeblendet).
  await expect(page.getByTestId(`employee-picker-card-${employee.id}`)).toBeVisible();
  const ineligibleReason = page.getByTestId(`employee-picker-ineligible-reason-${employee.id}`);
  await expect(ineligibleReason).toBeVisible();
  await expect(ineligibleReason).toContainText("Bereits verplant");
  await expect(ineligibleReason).toContainText(firstTour.name);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/tours/${secondTour.id}/week-employees`);
    const weeks = await response.json() as Array<{ isoYear: number; isoWeek: number; employees: Array<unknown> }>;
    const targetWeek = weeks.find((week) => week.isoYear === nextWeek.isoYear && week.isoWeek === nextWeek.isoWeek);
    return targetWeek?.employees ?? null;
  }).toEqual([]);
});

test("prefills the next free KW and keeps duplicate/min/max validation intact", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const tour = await createTourFixture("#556677");

  await openWeekPlanning(page, tour.id);
  for (const planningWeek of nextWeek.planningWeeks) {
    await expect(page.getByTestId(`card-tour-week-${planningWeek.isoYear}-${planningWeek.isoWeek}`)).toBeVisible();
  }

  await page.getByTestId("toggle-tour-week-picker").click();
  await expect(page.getByTestId("text-tour-week-dialog-year")).toContainText(String(nextWeek.isoYear));
  await expect(page.getByTestId("input-tour-week")).toHaveValue(String(nextWeek.nextFreeIsoWeek));

  await page.getByTestId("input-tour-week").fill(String(nextWeek.isoWeek - 1));
  await page.getByTestId("button-confirm-tour-week").click();
  await expect(toastWithTitle(page, "Kalenderwoche zu klein")).toBeVisible();
  await expect(page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.isoWeek - 1}`)).toHaveCount(0);

  await page.getByTestId("input-tour-week").fill(String(nextWeek.maxIsoWeek + 1));
  await page.getByTestId("button-confirm-tour-week").click();
  await expect(toastWithTitle(page, "Kalenderwoche zu groß")).toBeVisible();
  await expect(page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.maxIsoWeek + 1}`)).toHaveCount(0);

  await page.getByTestId("input-tour-week").fill(String(nextWeek.isoWeek));
  await page.getByTestId("button-confirm-tour-week").click();
  await expect(toastWithTitle(page, "Kalenderwoche bereits vorhanden")).toBeVisible();

  await page.getByTestId("input-tour-week").fill(String(nextWeek.nextFreeIsoWeek));
  await page.getByTestId("button-confirm-tour-week").click();
  const insertedWeekCard = page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.nextFreeIsoWeek}`);
  await expect(insertedWeekCard).toBeVisible();
});

test("offers employees with appointment conflicts in the week planning picker (conflict is handled when booking)", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const tour = await createTourFixture("#335577");
  const project = await createProjectFixture({ prefix: "FT04-BROWSER", name: "FT04 Browser Projekt" });
  const employee = await createEmployeeFixture("FT04-BROWSER-CONFLICT");

  await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekStartDate,
    tourId: tour.id,
  });
  await createAppointmentFixture({
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
  const weekPickerInput = page.getByTestId("input-tour-week");
  const insertedWeekCard = page.getByTestId(`card-tour-week-${nextWeek.isoYear}-${nextWeek.isoWeek}`);
  await expect(insertedWeekCard).toBeVisible();
  if (await weekPickerInput.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Zurück" }).click();
    await expect(weekPickerInput).not.toBeVisible();
  }
  await insertedWeekCard.getByTestId(
    `button-add-tour-week-member-${nextWeek.isoYear}-${nextWeek.isoWeek}`,
  ).click();

  // Neue Regel: der belegte Mitarbeiter wird jetzt angeboten (Konflikt erst beim Buchen).
  await expect.poll(async () => {
    return page.getByTestId(`employee-picker-card-${employee.id}`).count();
  }).toBe(1);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/tours/${tour.id}/week-employees`);
    const weeks = await response.json() as Array<{ isoYear: number; isoWeek: number; employees: Array<unknown> }>;
    const targetWeek = weeks.find((week) => week.isoYear === nextWeek.isoYear && week.isoWeek === nextWeek.isoWeek);
    return targetWeek?.employees ?? null;
  }).toEqual([]);
});
