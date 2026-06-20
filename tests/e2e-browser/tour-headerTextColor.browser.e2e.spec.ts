/**
 * Test Scope:
 *
 * Feature: Kopfzeilen-Textfarbe pro Tour (USER-Setting)
 *
 * Abgedeckte Regeln:
 * - Eine gesetzte Kopfzeilen-Textfarbe erscheint sichtbar in den Terminkartenköpfen im Wochenkalender.
 * - Eine gesetzte Kopfzeilen-Textfarbe erscheint sichtbar in den Terminbalken im Monatskalender.
 * - Die Einstellung bleibt nach einem Seiten-Reload erhalten.
 * - Nach dem Zurücksetzen greift der Luminanz-Fallback wieder.
 *
 * Fehlerfälle:
 * - Die Textfarbe wird zwar gespeichert, aber im Kalender nicht angezeigt.
 * - Die Einstellung geht nach einem Reload verloren.
 * - Zurücksetzen lässt die Benutzerfarbe bestehen.
 *
 * Ziel:
 * Den vollständigen Lebensweg der Kopfzeilen-Textfarbe — setzen, sehen, persistieren, zurücksetzen —
 * browserseitig regressionssicher absichern.
 */
import { expect, test, type Locator, type Page } from "./fixtures";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createAppointmentFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

function hexToRgbString(hex: string): string {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

async function openTourEditor(page: Page, tourId: number) {
  await page.getByTestId("nav-touren").click();
  await expect(page.getByTestId(`card-tour-${tourId}`)).toBeVisible();
  await page.getByTestId(`card-tour-${tourId}`).dblclick();
  await expect(page.getByTestId("button-save-tour")).toBeVisible();
}

async function setHeaderTextColor(page: Page, color: string) {
  await page.getByTestId("button-tour-header-text-color-enable").click();
  await expect(page.getByTestId("button-tour-header-text-color-picker")).toBeVisible();
  await page.getByTestId("button-tour-header-text-color-picker-input").evaluate(
    (element, nextColor) => {
      const input = element as HTMLInputElement;
      input.value = String(nextColor);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    color,
  );
}

async function resetHeaderTextColor(page: Page) {
  await page.getByTestId("button-tour-header-text-color-reset").click();
  await expect(page.getByTestId("button-tour-header-text-color-enable")).toBeVisible();
}

async function readWeekAppointmentHeaderTextColor(locator: Locator): Promise<string> {
  return locator.evaluate((element) => {
    const header = element.firstElementChild as HTMLElement | null;
    return header ? getComputedStyle(header).color : "";
  });
}

async function readMonthAppointmentBarTextColor(locator: Locator): Promise<string> {
  return locator.evaluate((element) => {
    const inner = element.querySelector<HTMLElement>(".h-6");
    return inner ? getComputedStyle(inner).color : "";
  });
}

test("setzt Kopfzeilen-Textfarbe im Wochenkalender und Monatskalender sichtbar um", async ({ page }) => {
  const textColor = "#ee2200";
  const tour = await createTourFixture("#225577");
  const project = await createProjectFixture({ prefix: "THTC-BOTH", name: "THTC Farbe Test" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    tourId: tour.id,
  });

  await loginAsAdmin(page);

  // Textfarbe setzen
  await openTourEditor(page, tour.id);
  await setHeaderTextColor(page, textColor);
  await page.getByTestId("button-save-tour").click();
  await expect(page.getByTestId("button-new-tour")).toBeVisible();

  // Wochenkalender prüfen
  await page.getByTestId("nav-wochenuebersicht").click();
  const weekPanel = page.getByTestId(`week-appointment-panel-${appointment!.id}`).first();
  await expect(weekPanel).toBeVisible();
  await expect
    .poll(() => readWeekAppointmentHeaderTextColor(weekPanel))
    .toBe(hexToRgbString(textColor));

  // Monatskalender prüfen
  await page.getByTestId("nav-monatsuebersicht").click();
  const monthBar = page.getByTestId(`appointment-bar-${appointment!.id}`).first();
  await expect(monthBar).toBeVisible();
  await expect
    .poll(() => readMonthAppointmentBarTextColor(monthBar))
    .toBe(hexToRgbString(textColor));
});

test("Kopfzeilen-Textfarbe bleibt nach Seiten-Reload erhalten", async ({ page }) => {
  const textColor = "#1155cc";
  const tour = await createTourFixture("#335577");
  const project = await createProjectFixture({ prefix: "THTC-RELOAD", name: "THTC Reload Test" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(3),
    tourId: tour.id,
  });

  await loginAsAdmin(page);

  // Farbe setzen und speichern
  await openTourEditor(page, tour.id);
  await setHeaderTextColor(page, textColor);
  await page.getByTestId("button-save-tour").click();
  await expect(page.getByTestId("button-new-tour")).toBeVisible();

  // Seite neu laden
  await page.reload();

  // Nach Reload im Wochenkalender prüfen
  await page.getByTestId("nav-wochenuebersicht").click();
  const weekPanel = page.getByTestId(`week-appointment-panel-${appointment!.id}`).first();
  await expect(weekPanel).toBeVisible();
  await expect
    .poll(() => readWeekAppointmentHeaderTextColor(weekPanel))
    .toBe(hexToRgbString(textColor));
});

test("Zurücksetzen der Textfarbe stellt den Luminanz-Fallback wieder her", async ({ page }) => {
  const tourColor = "#225577"; // dunkel → Luminanz-Fallback #ffffff
  const textColor = "#ee2200";
  const tour = await createTourFixture(tourColor);
  const project = await createProjectFixture({ prefix: "THTC-RESET", name: "THTC Reset Test" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(4),
    tourId: tour.id,
  });

  await loginAsAdmin(page);

  // Farbe setzen, dann zurücksetzen und speichern
  await openTourEditor(page, tour.id);
  await setHeaderTextColor(page, textColor);
  await resetHeaderTextColor(page);
  await page.getByTestId("button-save-tour").click();
  await expect(page.getByTestId("button-new-tour")).toBeVisible();

  // Nach Reset: Luminanz-Fallback (#ffffff für dunkles #225577)
  await page.getByTestId("nav-wochenuebersicht").click();
  const weekPanel = page.getByTestId(`week-appointment-panel-${appointment!.id}`).first();
  await expect(weekPanel).toBeVisible();
  await expect
    .poll(() => readWeekAppointmentHeaderTextColor(weekPanel))
    .toBe(hexToRgbString("#ffffff"));
});
