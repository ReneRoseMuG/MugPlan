/**
 * Test Scope:
 *
 * Bereich:
 * - Kalenderwochenweise Sammelverschiebung mehrerer Termine im Wochenkalender (UC-258).
 *
 * Abgedeckte Regeln:
 * - Der Zwischenreport zeigt verschiebbare Termine vorausgewählt und tag-blockierte Termine nicht auswählbar mit Begründung.
 * - Nach Bestätigung erscheinen die verschobenen Termine in der Ziel-KW und sind in der Quell-KW nicht mehr vorhanden.
 * - Ein tag-blockierter Termin bleibt unverändert in der Quell-KW.
 *
 * Fehlerfaelle:
 * - Verschobene Termine bleiben faelschlich in der Quell-KW sichtbar.
 * - Blockierte Termine werden mitverschoben.
 *
 * Isolation: Klasse A (voller DB-Reset je Suite ueber resetBrowserSuiteState). Baseline: core. Storage: none.
 *
 * Ziel:
 * Den sichtbaren Gesamtablauf der Sammelverschiebung inklusive Identitaets-, Ziel- und Ausschlussnachweis absichern.
 */
import { expect, test, type Page } from "./fixtures";
import { addDays, format, parseISO, startOfWeek } from "date-fns";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  attachAppointmentTagFixture,
  createAppointmentFixture,
  createCustomerFixture,
  createExactTagFixture,
  createTourFixture,
} from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

let tourId: number;
let sourceDate: string;
let targetDate: string;
let movableIdA: number;
let movableIdB: number;
let blockedId: number;

function weekMonday(dateString: string): string {
  return format(startOfWeek(parseISO(dateString), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

async function getAnchorWeekStart(page: Page) {
  const testId = await page.locator('[data-testid^="week-day-header-"]').first().getAttribute("data-testid");
  if (!testId) throw new Error("No visible week header found.");
  return testId.replace("week-day-header-", "");
}

/**
 * Richtet die Anker-Woche (erste sichtbare Wochenueberschrift = currentDate-Woche) auf die
 * Woche des Zieldatums aus. Die Sammelverschiebung nutzt die Anker-Woche als Ausgangswoche.
 */
async function navigateToAnchorWeekOf(page: Page, dateString: string) {
  const targetMonday = weekMonday(dateString);
  await page.getByTestId("nav-wochenuebersicht").click();
  for (let step = 0; step < 40; step += 1) {
    const anchorStart = await getAnchorWeekStart(page);
    if (anchorStart === targetMonday) {
      await expect(page.getByTestId(`week-day-header-${targetMonday}`).first()).toBeVisible();
      return;
    }
    await page.getByTestId(targetMonday < anchorStart ? "button-prev" : "button-next").click();
    await page.waitForTimeout(120);
  }
  throw new Error(`Anchor week for ${dateString} was not reachable within 40 steps.`);
}

test.beforeAll(async () => {
  await resetBrowserSuiteState();
  // shiftWeeks = 8 liegt ausserhalb des horizontalen Wochen-Scrollbereichs (Default 4 Zusatzwochen),
  // damit Quell- und Zielansicht disjunkt sind und der Ausschlussnachweis eindeutig bleibt.
  sourceDate = format(addDays(new Date(), 42), "yyyy-MM-dd");
  targetDate = format(addDays(new Date(), 42 + 56), "yyyy-MM-dd");

  const tour = await createTourFixture();
  tourId = tour.id;
  const customer = await createCustomerFixture("BULK-E2E");

  const movableA = await createAppointmentFixture({ customerId: customer.id, tourId, startDate: sourceDate });
  const movableB = await createAppointmentFixture({ customerId: customer.id, tourId, startDate: sourceDate });
  const blocked = await createAppointmentFixture({ customerId: customer.id, tourId, startDate: sourceDate });
  movableIdA = Number(movableA.id);
  movableIdB = Number(movableB.id);
  blockedId = Number(blocked.id);

  const fixTag = await createExactTagFixture("Fix");
  await attachAppointmentTagFixture(blockedId, fixTag.id);
});

test("verschiebt ausgewählte Termine in die Ziel-KW und schließt blockierte aus", async ({ page }) => {
  await loginAsAdmin(page);

  await navigateToAnchorWeekOf(page, sourceDate);
  await expect(page.getByTestId(`week-appointment-panel-${movableIdA}`).first()).toBeVisible();
  await expect(page.getByTestId(`week-appointment-panel-${blockedId}`).first()).toBeVisible();

  await page.getByTestId("button-open-bulk-week-move").click();
  await expect(page.getByTestId("dialog-bulk-week-move")).toBeVisible();

  // Quelltour auswaehlen; das Tag "Fix" ist bei Erstnutzung bereits vorausgewaehlt.
  await page.getByTestId(`bulk-week-move-tour-${tourId}`).click();
  await page.getByTestId("bulk-week-move-shift-weeks").fill("8");

  await page.getByTestId("button-bulk-week-move-preview").click();
  await expect(page.getByTestId("bulk-week-move-report")).toBeVisible();

  // Blockierter Termin ist nicht auswaehlbar und nennt die Begruendung.
  await expect(page.getByTestId(`bulk-week-move-item-${blockedId}`)).toBeDisabled();
  await expect(page.getByTestId(`bulk-week-move-block-${blockedId}`)).toBeVisible();

  await page.getByTestId("button-bulk-week-move-confirm").click();
  await expect(page.getByTestId("bulk-week-move-result-moved")).toContainText("2 Termine verschoben");
  await page.getByTestId("button-bulk-week-move-close").click();

  // In-place-Aktualisierung OHNE Navigation (Invalidierung): die verschobenen Termine verschwinden
  // sofort aus der Quell-KW, der blockierte Termin bleibt unveraendert sichtbar.
  await expect(page.getByTestId(`week-appointment-panel-${movableIdA}`)).toHaveCount(0);
  await expect(page.getByTestId(`week-appointment-panel-${movableIdB}`)).toHaveCount(0);
  await expect(page.getByTestId(`week-appointment-panel-${blockedId}`).first()).toBeVisible();

  // Ziel-KW: beide verschobenen Termine sind vorhanden.
  await navigateToAnchorWeekOf(page, targetDate);
  await expect(page.getByTestId(`week-appointment-panel-${movableIdA}`).first()).toBeVisible();
  await expect(page.getByTestId(`week-appointment-panel-${movableIdB}`).first()).toBeVisible();
});
