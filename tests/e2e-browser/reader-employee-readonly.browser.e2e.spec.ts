import { expect, test } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import { db } from "../../server/db";
import { tourWeekEmployees } from "../../shared/schema";
import {
  createAppointmentFixture,
  createCustomerFixture,
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

async function findEmployeeEntry(page: import("@playwright/test").Page, targetEmployee: { id: number; lastName: string }) {
  await page.locator("#employee-filter-last-name").fill(targetEmployee.lastName);

  const tableRow = page.getByTestId("table-employees").locator("tbody tr")
    .filter({ hasText: targetEmployee.lastName })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  return page.getByTestId(`employee-card-${targetEmployee.id}`).first();
}

test.describe("Reader employees readonly", () => {
  test.describe.configure({ mode: "serial" });

  let employee: Awaited<ReturnType<typeof createEmployeeFixture>>;
  let appointment: Awaited<ReturnType<typeof createAppointmentFixture>>;
  let weekAssignmentId = 0;

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-employee-readonly.browser.e2e.spec.ts");

    const customer = await createCustomerFixture("READER-EMP-CUST");
    employee = await createEmployeeFixture("READER-EMP");
    appointment = await createAppointmentFixture({
      customerId: customer.id,
      employeeIds: [employee.id],
      startDate: getRelativeBerlinDate(7),
    });

    const week = resolveNextReadableWeek();
    const tour = await createTourFixture("#225588");
    const insertResult = await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      employeeId: employee.id,
    });
    weekAssignmentId = Number(
      (insertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
        ?? (insertResult as { insertId?: number }).insertId,
    );
  });

  test("hides the create entrypoint in the employee list for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-mitarbeiter").click();
    await expect(page.getByTestId("button-new-employee")).toHaveCount(0);
  });

  test("opens employee forms in readonly mode for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-mitarbeiter").click();
    const entry = await findEmployeeEntry(page, employee);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("employee-readonly-alert")).toBeVisible();
    await expect(page.getByTestId("button-save-employee")).toHaveCount(0);
    await expect(page.getByTestId("employee-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
    await expect(page.getByTestId("input-employee-firstname")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-employee-email")).toHaveAttribute("readonly", "");

    await page.getByTestId("tab-employee-termine").click();
    await expect(page.getByTestId(`button-remove-employee-from-appointment-${appointment.id}`)).toHaveCount(0);

    await page.getByTestId("tab-employee-wochenplanung").click();
    const weekCard = page.getByTestId(`card-employee-week-plan-${weekAssignmentId}`);
    await expect(weekCard).toBeVisible();
    await weekCard.dblclick();
    await expect(page.getByTestId("tour-week-form-overlay")).toHaveCount(0);
  });
});
