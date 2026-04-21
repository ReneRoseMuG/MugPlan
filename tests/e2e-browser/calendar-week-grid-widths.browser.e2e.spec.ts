/**
 * Test Scope:
 *
 * Bereich:
 * - Wochenkalender Grid-Breiten und Wochenend-Sonderregel
 *
 * Isolation:
 * - Klasse: B
 * - Baseline: seeded
 * - Storage: none
 *
 * Abgedeckte Regeln:
 * - Alle Ein-Tagestermine derselben Woche behalten dieselbe Breite.
 * - Ein belegter Samstag oder Sonntag wird fuer die Kartenbreite wie ein Werktag behandelt.
 * - Alle Zwei-Tagestermine derselben Woche behalten dieselbe Breite und liegen ungefaehr bei der doppelten Ein-Tages-Breite.
 * - Alle Drei-Tagestermine derselben Woche behalten dieselbe Breite und liegen ungefaehr bei der dreifachen Ein-Tages-Breite.
 *
 * Fehlerfaelle:
 * - Wochenendtermine bleiben trotz Belegung schmaler als Werktagstermine.
 * - Zwei- oder Drei-Tagestermine derselben Woche unterscheiden sich in ihrer Breite.
 * - Die Kartenbreite wird vom Inhalt oder vom Body-Modus beeinflusst statt nur vom Tagesraster.
 *
 * Ziel:
 * Die sichtbaren Breitenregeln des Wochenkalenders im echten Browser regressionssicher absichern.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { addDays, format, parseISO, startOfWeek } from "date-fns";

import { createAppointmentBrowserFixture, createAppointmentFixture } from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import { getBerlinTodayDateString } from "../../client/src/lib/project-appointments";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await resetBrowserSuiteState();
});

function getNextWeekDate(offsetFromMonday: number) {
  const monday = addDays(startOfWeek(parseISO(getBerlinTodayDateString()), { weekStartsOn: 1 }), 7);
  return format(addDays(monday, offsetFromMonday), "yyyy-MM-dd");
}

async function openWeek(page: Page, tileBodyMode: "collapsed" | "semiexpanded" | "expanded" = "semiexpanded") {
  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();
  await page.getByTestId("button-next").click();

  if (tileBodyMode !== "semiexpanded") {
    await page.getByTestId(`toggle-week-tile-body-mode-${tileBodyMode}`).click();
  }
}

async function readWidth(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return Math.round((box?.width ?? 0) * 10) / 10;
}

async function readLeft(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return Math.round((box?.x ?? 0) * 10) / 10;
}

async function readRight(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return Math.round(((box?.x ?? 0) + (box?.width ?? 0)) * 10) / 10;
}

async function readBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return {
    left: Math.round((box?.x ?? 0) * 10) / 10,
    width: Math.round((box?.width ?? 0) * 10) / 10,
    right: Math.round(((box?.x ?? 0) + (box?.width ?? 0)) * 10) / 10,
  };
}

async function expectWidthsClose(left: Locator, right: Locator, tolerancePx = 4) {
  const leftWidth = await readWidth(left);
  const rightWidth = await readWidth(right);
  expect(Math.abs(leftWidth - rightWidth)).toBeLessThanOrEqual(tolerancePx);
}

async function expectWidthMultiple(span: Locator, single: Locator, factor: number, tolerancePx = 8) {
  const spanWidth = await readWidth(span);
  const singleWidth = await readWidth(single);
  const expectedWidth = (singleWidth * factor) + ((factor - 1) * 16);
  expect(Math.abs(spanWidth - expectedWidth)).toBeLessThanOrEqual(tolerancePx);
}

async function expectAlignedDayEdges(top: Locator, bottom: Locator, tolerancePx = 3) {
  const leftDelta = Math.abs((await readLeft(top)) - (await readLeft(bottom)));
  const rightDelta = Math.abs((await readRight(top)) - (await readRight(bottom)));
  expect(leftDelta).toBeLessThanOrEqual(tolerancePx);
  expect(rightDelta).toBeLessThanOrEqual(tolerancePx);
}

async function expectBoundaryAlignment(leftBoundary: Locator, rightBoundary: Locator, tolerancePx = 3) {
  const delta = Math.abs((await readLeft(leftBoundary)) - (await readLeft(rightBoundary)));
  expect(delta).toBeLessThanOrEqual(tolerancePx);
}

async function expectInternalHalfBoundary(tile: Locator, secondSegment: Locator, tolerancePx = 3) {
  const tileBox = await readBox(tile);
  const segmentBox = await readBox(secondSegment);
  const expectedSecondSegmentLeft = tileBox.left + (tileBox.width / 2);
  expect(Math.abs(segmentBox.left - expectedSecondSegmentLeft)).toBeLessThanOrEqual(tolerancePx);
}

test("keeps one-day and two-day widths stable when the weekend is occupied in compact mode", async ({ page }) => {
  const singleFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-SINGLE", employeeCount: 1 });
  const spanningFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-SPAN2", employeeCount: 1 });

  const monday = getNextWeekDate(0);
  const tuesday = getNextWeekDate(1);
  const saturday = getNextWeekDate(5);
  const sunday = getNextWeekDate(6);

  const weekdaySingle = await createAppointmentFixture({
    projectId: singleFixture.project.id,
    customerId: singleFixture.customer.id,
    startDate: monday,
    tourId: singleFixture.tour.id,
    employeeIds: [singleFixture.employees[0].id],
  });
  const weekendSingle = await createAppointmentFixture({
    projectId: singleFixture.project.id,
    customerId: singleFixture.customer.id,
    startDate: saturday,
    tourId: singleFixture.tour.id,
    employeeIds: [singleFixture.employees[0].id],
  });
  const weekdayTwoDay = await createAppointmentFixture({
    projectId: spanningFixture.project.id,
    customerId: spanningFixture.customer.id,
    startDate: monday,
    endDate: tuesday,
    tourId: spanningFixture.tour.id,
    employeeIds: [spanningFixture.employees[0].id],
  });
  const weekendTwoDay = await createAppointmentFixture({
    projectId: spanningFixture.project.id,
    customerId: spanningFixture.customer.id,
    startDate: saturday,
    endDate: sunday,
    tourId: spanningFixture.tour.id,
    employeeIds: [spanningFixture.employees[0].id],
  });

  await openWeek(page, "collapsed");

  const weekdaySinglePanel = page.getByTestId(`week-appointment-panel-${weekdaySingle.id}`).first();
  const weekendSinglePanel = page.getByTestId(`week-appointment-panel-${weekendSingle.id}`).first();
  const weekdayTwoDayTile = page.getByTestId(`week-spanning-tile-${weekdayTwoDay.id}`).first();
  const weekendTwoDayTile = page.getByTestId(`week-spanning-tile-${weekendTwoDay.id}`).first();

  await expect(weekdaySinglePanel).toBeVisible();
  await expect(weekendSinglePanel).toBeVisible();
  await expect(weekdayTwoDayTile).toBeVisible();
  await expect(weekendTwoDayTile).toBeVisible();

  await expectWidthsClose(weekdaySinglePanel, weekendSinglePanel, 4);
  await expectWidthsClose(weekdayTwoDayTile, weekendTwoDayTile, 6);
  await expectWidthMultiple(weekdayTwoDayTile, weekdaySinglePanel, 2, 10);
  await expectWidthMultiple(weekendTwoDayTile, weekendSinglePanel, 2, 10);
});

test("keeps three-day widths stable across weekday and weekend spans", async ({ page }) => {
  const singleFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-SINGLE3", employeeCount: 1 });
  const spanningFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-SPAN3", employeeCount: 1 });

  const monday = getNextWeekDate(0);
  const tuesday = getNextWeekDate(1);
  const wednesday = getNextWeekDate(2);
  const friday = getNextWeekDate(4);
  const saturday = getNextWeekDate(5);
  const sunday = getNextWeekDate(6);

  const weekdaySingle = await createAppointmentFixture({
    projectId: singleFixture.project.id,
    customerId: singleFixture.customer.id,
    startDate: tuesday,
    tourId: singleFixture.tour.id,
    employeeIds: [singleFixture.employees[0].id],
  });
  const weekdayThreeDay = await createAppointmentFixture({
    projectId: spanningFixture.project.id,
    customerId: spanningFixture.customer.id,
    startDate: monday,
    endDate: wednesday,
    tourId: spanningFixture.tour.id,
    employeeIds: [spanningFixture.employees[0].id],
  });
  const weekendThreeDay = await createAppointmentFixture({
    projectId: spanningFixture.project.id,
    customerId: spanningFixture.customer.id,
    startDate: friday,
    endDate: sunday,
    tourId: spanningFixture.tour.id,
    employeeIds: [spanningFixture.employees[0].id],
  });

  await openWeek(page);

  const weekdaySinglePanel = page.getByTestId(`week-appointment-panel-${weekdaySingle.id}`).first();
  const weekdayThreeDayTile = page.getByTestId(`week-spanning-tile-${weekdayThreeDay.id}`).first();
  const weekendThreeDayTile = page.getByTestId(`week-spanning-tile-${weekendThreeDay.id}`).first();

  await expect(weekdaySinglePanel).toBeVisible();
  await expect(weekdayThreeDayTile).toBeVisible();
  await expect(weekendThreeDayTile).toBeVisible();

  await expectWidthsClose(weekdayThreeDayTile, weekendThreeDayTile, 8);
  await expectWidthMultiple(weekdayThreeDayTile, weekdaySinglePanel, 3, 12);
  await expectWidthMultiple(weekendThreeDayTile, weekdaySinglePanel, 3, 12);
});

test("keeps the same Thursday day edges across tours in standard mode", async ({ page }) => {
  const tourOneFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-XTOUR-STD-A", employeeCount: 1 });
  const tourTwoFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-XTOUR-STD-B", employeeCount: 1 });

  const thursday = getNextWeekDate(3);

  const topThursdayAppointment = await createAppointmentFixture({
    projectId: tourOneFixture.project.id,
    customerId: tourOneFixture.customer.id,
    startDate: thursday,
    startTime: "08:00:00",
    tourId: tourOneFixture.tour.id,
    employeeIds: [tourOneFixture.employees[0].id],
  });
  const bottomThursdayAppointment = await createAppointmentFixture({
    projectId: tourTwoFixture.project.id,
    customerId: tourTwoFixture.customer.id,
    startDate: thursday,
    tourId: tourTwoFixture.tour.id,
    employeeIds: [tourTwoFixture.employees[0].id],
  });

  await openWeek(page);

  const topThursdayPanel = page.getByTestId(`week-appointment-panel-${topThursdayAppointment.id}`).first();
  const bottomThursdayPanel = page.getByTestId(`week-appointment-panel-${bottomThursdayAppointment.id}`).first();

  await expect(topThursdayPanel).toBeVisible();
  await expect(bottomThursdayPanel).toBeVisible();

  await expectAlignedDayEdges(topThursdayPanel, bottomThursdayPanel, 3);
});

test("keeps the same two-day span edges across tours in detail mode", async ({ page }) => {
  const tourOneFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-XTOUR-DET-A", employeeCount: 1 });
  const tourTwoFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-XTOUR-DET-B", employeeCount: 1 });

  const monday = getNextWeekDate(0);
  const tuesday = getNextWeekDate(1);
  const wednesday = getNextWeekDate(2);
  const thursday = getNextWeekDate(3);

  const topTwoDayAppointment = await createAppointmentFixture({
    projectId: tourOneFixture.project.id,
    customerId: tourOneFixture.customer.id,
    startDate: monday,
    endDate: tuesday,
    tourId: tourOneFixture.tour.id,
    employeeIds: [tourOneFixture.employees[0].id],
  });
  const bottomTwoDayAppointment = await createAppointmentFixture({
    projectId: tourTwoFixture.project.id,
    customerId: tourTwoFixture.customer.id,
    startDate: wednesday,
    endDate: thursday,
    tourId: tourTwoFixture.tour.id,
    employeeIds: [tourTwoFixture.employees[0].id],
  });

  await openWeek(page, "expanded");

  const topTwoDayTile = page.getByTestId(`week-spanning-tile-${topTwoDayAppointment.id}`).first();
  const bottomTwoDayTile = page.getByTestId(`week-spanning-tile-${bottomTwoDayAppointment.id}`).first();

  await expect(topTwoDayTile).toBeVisible();
  await expect(bottomTwoDayTile).toBeVisible();

  await expectWidthsClose(topTwoDayTile, bottomTwoDayTile, 4);
});

test("aligns the internal Thursday boundary of a two-day tile with a Thursday single-day card in standard mode", async ({ page }) => {
  const singleFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-BOUNDARY-STD-A", employeeCount: 1 });
  const spanFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-BOUNDARY-STD-B", employeeCount: 1 });

  const wednesday = getNextWeekDate(2);
  const thursday = getNextWeekDate(3);

  const thursdaySingleAppointment = await createAppointmentFixture({
    projectId: singleFixture.project.id,
    customerId: singleFixture.customer.id,
    startDate: thursday,
    tourId: singleFixture.tour.id,
    employeeIds: [singleFixture.employees[0].id],
  });
  const wednesdayThursdayAppointment = await createAppointmentFixture({
    projectId: spanFixture.project.id,
    customerId: spanFixture.customer.id,
    startDate: wednesday,
    endDate: thursday,
    tourId: spanFixture.tour.id,
    employeeIds: [spanFixture.employees[0].id],
  });

  await openWeek(page);

  const thursdaySinglePanel = page.getByTestId(`week-appointment-panel-${thursdaySingleAppointment.id}`).first();
  const wednesdayThursdayTile = page.getByTestId(`week-spanning-tile-${wednesdayThursdayAppointment.id}`).first();
  const thursdayHalfOfSpan = page
    .getByTestId(`week-spanning-tile-header-${wednesdayThursdayAppointment.id}`)
    .locator("> div")
    .nth(1);

  await expect(thursdaySinglePanel).toBeVisible();
  await expect(wednesdayThursdayTile).toBeVisible();
  await expect(thursdayHalfOfSpan).toBeVisible();

  await expectWidthMultiple(wednesdayThursdayTile, thursdaySinglePanel, 2, 10);
  await expectInternalHalfBoundary(wednesdayThursdayTile, thursdayHalfOfSpan, 3);
});

test("aligns the internal Thursday boundary of a two-day tile with a Thursday single-day card in detail mode", async ({ page }) => {
  const singleFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-BOUNDARY-DET-A", employeeCount: 1 });
  const spanFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-BOUNDARY-DET-B", employeeCount: 1 });

  const wednesday = getNextWeekDate(2);
  const thursday = getNextWeekDate(3);

  const thursdaySingleAppointment = await createAppointmentFixture({
    projectId: singleFixture.project.id,
    customerId: singleFixture.customer.id,
    startDate: thursday,
    startTime: "08:00:00",
    tourId: singleFixture.tour.id,
    employeeIds: [singleFixture.employees[0].id],
  });
  const wednesdayThursdayAppointment = await createAppointmentFixture({
    projectId: spanFixture.project.id,
    customerId: spanFixture.customer.id,
    startDate: wednesday,
    endDate: thursday,
    tourId: spanFixture.tour.id,
    employeeIds: [spanFixture.employees[0].id],
  });

  await openWeek(page, "expanded");

  const thursdaySinglePanel = page.getByTestId(`week-appointment-panel-${thursdaySingleAppointment.id}`).first();
  const wednesdayThursdayTile = page.getByTestId(`week-spanning-tile-${wednesdayThursdayAppointment.id}`).first();
  const thursdayHalfOfSpan = page
    .getByTestId(`week-spanning-tile-header-${wednesdayThursdayAppointment.id}`)
    .locator("> div")
    .nth(1);

  await expect(thursdaySinglePanel).toBeVisible();
  await expect(wednesdayThursdayTile).toBeVisible();
  await expect(thursdayHalfOfSpan).toBeVisible();

  await expectWidthMultiple(wednesdayThursdayTile, thursdaySinglePanel, 2, 10);
  await expectInternalHalfBoundary(wednesdayThursdayTile, thursdayHalfOfSpan, 3);
});

test("keeps the lower overflow monday card aligned with the regular monday column in standard mode", async ({ page }) => {
  const mixedLaneFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-OVERFLOW-A", employeeCount: 1 });
  const referenceLaneFixture = await createAppointmentBrowserFixture({ prefix: "WEEK-GRID-OVERFLOW-B", employeeCount: 1 });

  const monday = getNextWeekDate(0);
  const tuesday = getNextWeekDate(1);

  const topMondayTuesdayAppointment = await createAppointmentFixture({
    projectId: mixedLaneFixture.project.id,
    customerId: mixedLaneFixture.customer.id,
    startDate: monday,
    endDate: tuesday,
    tourId: mixedLaneFixture.tour.id,
    employeeIds: [mixedLaneFixture.employees[0].id],
  });
  const lowerMondayAppointment = await createAppointmentFixture({
    projectId: mixedLaneFixture.project.id,
    customerId: mixedLaneFixture.customer.id,
    startDate: monday,
    startTime: "16:00:00",
    tourId: mixedLaneFixture.tour.id,
    employeeIds: [mixedLaneFixture.employees[0].id],
  });
  const referenceMondayAppointment = await createAppointmentFixture({
    projectId: referenceLaneFixture.project.id,
    customerId: referenceLaneFixture.customer.id,
    startDate: monday,
    tourId: referenceLaneFixture.tour.id,
    employeeIds: [referenceLaneFixture.employees[0].id],
  });

  await openWeek(page);

  const topMondayTuesdayTile = page.getByTestId(`week-spanning-tile-${topMondayTuesdayAppointment.id}`).first();
  const lowerMondayPanel = page.getByTestId(`week-appointment-panel-${lowerMondayAppointment.id}`).first();
  const referenceMondayPanel = page.getByTestId(`week-appointment-panel-${referenceMondayAppointment.id}`).first();

  await expect(topMondayTuesdayTile).toBeVisible();
  await expect(lowerMondayPanel).toBeVisible();
  await expect(referenceMondayPanel).toBeVisible();

  await expectWidthsClose(lowerMondayPanel, referenceMondayPanel, 4);
  await expectAlignedDayEdges(lowerMondayPanel, referenceMondayPanel, 3);
});
