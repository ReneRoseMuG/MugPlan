/**
 * Test Scope:
 *
 * Feature: FT03/FT04 - Tourfarben im Kalender
 *
 * Abgedeckte Regeln:
 * - Eine geänderte Tourfarbe aktualisiert die sichtbare Termindarstellung im Wochenkalender.
 * - Eine geänderte Tourfarbe aktualisiert die sichtbare Termindarstellung in der Monatsübersicht.
 * - Der Farbwechsel wird über den realen Tour-Bearbeiten-Flow im Browser ausgelöst.
 *
 * Fehlerfaelle:
 * - Nach dem Speichern einer Tourfarbe bleiben Wochen- oder Monatskalender auf der alten Farbe stehen.
 * - Der Tour-Edit-Flow speichert die Farbe, aber die Kalender-Queries werden nicht frisch gezogen.
 *
 * Ziel:
 * Den sichtbaren Farb-Refresh von Touränderungen in Woche und Monat browserseitig regressionssicher absichern.
 */
import { expect, test, type Locator, type Page } from "./fixtures";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import { createAppointmentFixture, createProjectFixture, createTourFixture, getRelativeBerlinDate } from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

function hexToRgbString(hexColor: string) {
  const normalized = hexColor.startsWith("#") ? hexColor.slice(1) : hexColor;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgb(${red}, ${green}, ${blue})`;
}

async function setTourColor(page: Page, color: string) {
  await page.getByTestId("button-tour-color-picker-input").evaluate((element, nextColor) => {
    const input = element as HTMLInputElement;
    input.value = String(nextColor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, color);
}

async function openTourEditor(page: Page, tourId: number) {
  await page.getByTestId("nav-touren").click();
  await expect(page.getByTestId(`card-tour-${tourId}`)).toBeVisible();
  await page.getByTestId(`card-tour-${tourId}`).dblclick();
  await expect(page.getByTestId("button-save-tour")).toBeVisible();
}

async function saveTourColor(page: Page, tourId: number, color: string) {
  await openTourEditor(page, tourId);
  await setTourColor(page, color);
  await page.getByTestId("button-save-tour").click();
  await expect(page.getByTestId("button-new-tour")).toBeVisible();
}

async function readWeekAppointmentBorderColor(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element as HTMLElement).borderColor);
}

async function readMonthAppointmentBarColor(locator: Locator) {
  return locator.evaluate((element) => {
    const bar = element.firstElementChild as HTMLElement | null;
    return bar ? getComputedStyle(bar).backgroundColor : "";
  });
}

test("refreshes the edited tour color in the week calendar", async ({ page }) => {
  const initialColor = "#226688";
  const updatedColor = "#cc5533";
  const tour = await createTourFixture(initialColor);
  const project = await createProjectFixture({ prefix: "FT03-WEEK-COLOR", name: "FT03 Woche Farbe" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();

  const weekAppointment = page.getByTestId(`week-appointment-panel-${appointment!.id}`).first();
  await expect(weekAppointment).toBeVisible();
  await expect.poll(() => readWeekAppointmentBorderColor(weekAppointment)).toBe(hexToRgbString(initialColor));

  await saveTourColor(page, tour.id, updatedColor);

  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(weekAppointment).toBeVisible();
  await expect.poll(() => readWeekAppointmentBorderColor(weekAppointment)).toBe(hexToRgbString(updatedColor));
});

test("refreshes the edited tour color in the month overview", async ({ page }) => {
  const initialColor = "#335577";
  const updatedColor = "#118844";
  const tour = await createTourFixture(initialColor);
  const project = await createProjectFixture({ prefix: "FT03-MONTH-COLOR", name: "FT03 Monat Farbe" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    tourId: tour.id,
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-monatsuebersicht").click();

  const monthAppointment = page.getByTestId(`appointment-bar-${appointment!.id}`).first();
  await expect(monthAppointment).toBeVisible();
  await expect.poll(() => readMonthAppointmentBarColor(monthAppointment)).toBe(hexToRgbString(initialColor));

  await saveTourColor(page, tour.id, updatedColor);

  await page.getByTestId("nav-monatsuebersicht").click();
  await expect(monthAppointment).toBeVisible();
  await expect.poll(() => readMonthAppointmentBarColor(monthAppointment)).toBe(hexToRgbString(updatedColor));
});
