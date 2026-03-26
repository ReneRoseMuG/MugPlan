/**
 * Test Scope:
 *
 * Bereich:
 * - Wochenkalender Lane-Platzierung für Mehrtagestermine
 *
 * Abgedeckte Regeln:
 * - Nicht überlappende Zweitagestermine derselben Tour-Lane bleiben in derselben oberen Zeile.
 * - Ein dazwischen liegender Eintagestermin mit Uhrzeit verdrängt nachfolgende Mehrtagestermine nicht in eine tiefere Zeile.
 *
 * Fehlerfälle:
 * - Back-to-back Mehrtagestermine erhalten trotz freier oberer Zeile unterschiedliche vertikale Positionen.
 * - Ein Sandwich aus Mehrtagetermin, Eintagetermin und erneutem Mehrtagetermin driftet in mehrere Lane-Zeilen auseinander.
 *
 * Ziel:
 * Das gewünschte Wochen-Lane-Zielverhalten für kompakte Mehrtages-Platzierung im echten Browser regressionssicher absichern.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { addDays, format, parseISO, startOfWeek } from "date-fns";

import { createAppointmentBrowserFixture, createAppointmentFixture } from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import { getBerlinTodayDateString } from "../../client/src/lib/project-appointments";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

function getNextWeekDate(offsetFromMonday: number) {
  const monday = addDays(startOfWeek(parseISO(getBerlinTodayDateString()), { weekStartsOn: 1 }), 7);
  return format(addDays(monday, offsetFromMonday), "yyyy-MM-dd");
}

async function expectSameTopRow(...locators: Locator[]) {
  const boxes = await Promise.all(locators.map((locator) => locator.boundingBox()));
  for (const box of boxes) {
    expect(box).not.toBeNull();
  }
  const tops = boxes.map((box) => Math.round((box?.y ?? 0) * 10) / 10);
  const baseline = tops[0];
  tops.forEach((top) => {
    expect(Math.abs(top - baseline)).toBeLessThanOrEqual(1.5);
  });
}

async function openWeek(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();
  await page.getByTestId("button-next").click();
}

test("keeps back-to-back two-day appointments in the same top lane row", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "WEEK-LANE-B2B", employeeCount: 1 });
  const monday = getNextWeekDate(0);
  const tuesday = getNextWeekDate(1);
  const thursday = getNextWeekDate(3);
  const friday = getNextWeekDate(4);

  const firstAppointment = await createAppointmentFixture({
    projectId: fixture.project.id,
    customerId: fixture.customer.id,
    startDate: monday,
    endDate: tuesday,
    tourId: fixture.tour.id,
    employeeIds: [fixture.employees[0].id],
  });
  const secondAppointment = await createAppointmentFixture({
    projectId: fixture.project.id,
    customerId: fixture.customer.id,
    startDate: thursday,
    endDate: friday,
    tourId: fixture.tour.id,
    employeeIds: [fixture.employees[0].id],
  });

  await openWeek(page);

  const firstTile = page.getByTestId(`week-spanning-tile-${firstAppointment.id}`).first();
  const secondTile = page.getByTestId(`week-spanning-tile-${secondAppointment.id}`).first();

  await expect(firstTile).toBeVisible();
  await expect(secondTile).toBeVisible();
  await expectSameTopRow(firstTile, secondTile);
});

test("keeps multi-day appointments aligned in the top row around a timed single-day gap", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "WEEK-LANE-SANDWICH", employeeCount: 1 });
  const monday = getNextWeekDate(0);
  const tuesday = getNextWeekDate(1);
  const wednesday = getNextWeekDate(2);
  const thursday = getNextWeekDate(3);
  const friday = getNextWeekDate(4);

  const firstAppointment = await createAppointmentFixture({
    projectId: fixture.project.id,
    customerId: fixture.customer.id,
    startDate: monday,
    endDate: tuesday,
    tourId: fixture.tour.id,
    employeeIds: [fixture.employees[0].id],
  });
  const middleAppointment = await createAppointmentFixture({
    projectId: fixture.project.id,
    customerId: fixture.customer.id,
    startDate: wednesday,
    startTime: "08:00:00",
    tourId: fixture.tour.id,
    employeeIds: [fixture.employees[0].id],
  });
  const secondAppointment = await createAppointmentFixture({
    projectId: fixture.project.id,
    customerId: fixture.customer.id,
    startDate: thursday,
    endDate: friday,
    tourId: fixture.tour.id,
    employeeIds: [fixture.employees[0].id],
  });

  await openWeek(page);

  const firstTile = page.getByTestId(`week-spanning-tile-${firstAppointment.id}`).first();
  const middlePanel = page.getByTestId(`week-appointment-panel-${middleAppointment.id}`).first();
  const secondTile = page.getByTestId(`week-spanning-tile-${secondAppointment.id}`).first();

  await expect(firstTile).toBeVisible();
  await expect(middlePanel).toBeVisible();
  await expect(secondTile).toBeVisible();
  await expectSameTopRow(firstTile, middlePanel, secondTile);
});
