import { expect, test } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import { db } from "../../server/db";
import { tourWeekEmployees } from "../../shared/schema";
import {
  createEmployeeFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

function resolveNextReadableWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const weekStart = startOfISOWeek(addWeeks(today, 3));
  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekEndDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
  };
}

test.describe("Reader tours readonly", () => {
  test.describe.configure({ mode: "serial" });

  let tour: Awaited<ReturnType<typeof createTourFixture>>;
  let employeeAssignmentId = 0;
  const week = resolveNextReadableWeek();

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-tours-readonly.browser.e2e.spec.ts");

    tour = await createTourFixture("#225588");
    const employee = await createEmployeeFixture("READER-TOUR-EMP");

    const insertResult = await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      employeeId: employee.id,
    });
    employeeAssignmentId = Number(
      (insertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
        ?? (insertResult as { insertId?: number }).insertId,
    );
  });

  test("hides the create entrypoint in tour management for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-touren").click();
    await expect(page.getByTestId("button-new-tour")).toHaveCount(0);
  });

  test("opens tour edit and tour week forms in readonly mode for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-touren").click();
    const tourCard = page.getByTestId(`card-tour-${tour.id}`);
    await expect(tourCard).toBeVisible();
    await tourCard.dblclick();

    await expect(page.getByTestId("tour-readonly-alert")).toBeVisible();
    await expect(page.getByTestId("button-save-tour")).toHaveCount(0);
    await expect(page.getByTestId("toggle-tour-week-picker")).toHaveCount(0);

    await page.getByTestId("tab-tour-wochenplanung").click();
    await expect(page.getByTestId(`button-add-tour-week-member-${week.isoYear}-${week.isoWeek}`)).toHaveCount(0);
    await expect(page.getByTestId(`button-tour-week-menu-${week.isoYear}-${week.isoWeek}`)).toHaveCount(0);

    const weekCard = page.getByTestId(`card-tour-week-${week.isoYear}-${week.isoWeek}`);
    await expect(weekCard).toBeVisible();
    await expect(page.getByTestId(`badge-tour-week-member-${employeeAssignmentId}`)).toBeVisible();
    await weekCard.dblclick();

    await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
    await expect(page.getByTestId("tour-week-form-functions-panel")).toHaveCount(0);
    await expect(page.getByTestId("button-open-tour-week-employee-picker")).toHaveCount(0);
    await expect(page.getByTestId("button-block-tour-week")).toHaveCount(0);
    await expect(page.getByTestId("button-unblock-tour-week")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
  });
});
