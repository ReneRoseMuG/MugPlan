import { expect, test } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import { db } from "../../server/db";
import * as employeeAttachmentsService from "../../server/services/employeeAttachmentsService";
import * as employeeNotesService from "../../server/services/employeeNotesService";
import { tourWeekEmployees } from "../../shared/schema";
import {
  attachEmployeeTagFixture,
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixtureWithOverrides,
  createExactTagFixture,
  createEmployeeFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

function getCompactEmployeeLabel(employee: { firstName?: string | null; lastName?: string | null }) {
  const fullName = (employee as { fullName?: string | null }).fullName?.trim() ?? "";
  const firstName = employee.firstName?.trim() ?? "";
  const lastNameInitial = employee.lastName?.trim()?.[0]?.toUpperCase() ?? "";
  if (firstName && lastNameInitial) {
    return `${firstName} ${lastNameInitial}.`;
  }
  if (fullName.includes(",")) {
    const [lastNamePart, firstNamePart] = fullName.split(",", 2);
    const compactFirstName = firstNamePart?.trim() ?? "";
    const compactLastInitial = lastNamePart?.trim()?.[0]?.toUpperCase() ?? "";
    return compactFirstName && compactLastInitial
      ? `${compactFirstName} ${compactLastInitial}.`
      : compactFirstName || compactLastInitial;
  }
  return firstName || lastNameInitial || fullName;
}

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

function buildAttachmentPayload(prefix: string, label: string) {
  return {
    filename: `${prefix}.pdf`,
    originalName: `${label}-${prefix}.pdf`,
    mimeType: "application/pdf",
    fileSize: 128,
    storagePath: `reader-employee/${prefix}.pdf`,
    version: 1,
  };
}

test.describe("Reader employees readonly", () => {
  test.describe.configure({ mode: "serial" });

  let employee: Awaited<ReturnType<typeof createEmployeeFixtureWithOverrides>>;
  let appointment: Awaited<ReturnType<typeof createAppointmentFixture>>;
  let weekAssignmentId = 0;
  let employeeTagId = 0;
  let employeeAttachmentName = "";
  let colleagueFullName = "";
  let customerNumber = "";
  let tourName = "";

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-employee-readonly.browser.e2e.spec.ts");

    const customer = await createCustomerFixture("READER-EMP-CUST");
    employee = await createEmployeeFixtureWithOverrides({
      prefix: "READER-EMP",
      firstName: "Erik",
      lastName: "Einsatz",
      email: "erik.einsatz@example.test",
      phone: "0123456",
    });
    appointment = await createAppointmentFixture({
      customerId: customer.id,
      employeeIds: [employee.id],
      startDate: getRelativeBerlinDate(7),
    });
    customerNumber = customer.customerNumber;
    const employeeTag = await createExactTagFixture("Reader Mitarbeiter Tag Fokus");
    await attachEmployeeTagFixture(employee.id, employeeTag.id);
    await employeeNotesService.createEmployeeNote(employee.id, {
      title: "Reader Mitarbeiternotiz Fokus",
      body: "<p>Mitarbeiternotiz sichtbar.</p>",
      print: false,
      cardColor: null,
    }, "ADMIN");
    const employeeAttachment = buildAttachmentPayload("reader-employee-readonly", "mitarbeiterdokument");
    employeeAttachmentName = employeeAttachment.originalName;
    await employeeAttachmentsService.createEmployeeAttachment({ employeeId: employee.id, ...employeeAttachment });

    const week = resolveNextReadableWeek();
    const tour = await createTourFixture("#225588");
    const colleague = await createEmployeeFixture("READER-EMP-KOLLEGE");
    const insertResult = await db.insert(tourWeekEmployees).values([
      {
        tourId: tour.id,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        employeeId: employee.id,
      },
      {
        tourId: tour.id,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        employeeId: colleague.id,
      },
    ]);
    weekAssignmentId = Number(
      (insertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
        ?? (insertResult as { insertId?: number }).insertId,
    );
    employeeTagId = employeeTag.id;
    colleagueFullName = colleague.fullName;
    tourName = tour.name;
  });

  test("hides the create entrypoint in the employee list for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.goto("/standalone/employees");
    await expect(page.getByTestId("button-new-employee")).toHaveCount(0);
  });

  test("opens employee forms in readonly mode for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.goto("/standalone/employees");
    const entry = await findEmployeeEntry(page, employee);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("employee-readonly-alert")).toHaveCount(0);
    await expect(page.getByTestId("button-save-employee")).toHaveCount(0);
    await expect(page.getByTestId("employee-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
    await expect(page.getByTestId("button-add-document-header")).toHaveCount(0);
    await expect(page.getByTestId("input-employee-firstname")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-employee-lastname")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-employee-email")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-employee-phone")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-employee-firstname")).toHaveValue(employee.firstName);
    await expect(page.getByTestId("input-employee-email")).toHaveValue(employee.email ?? "");
    await expect(page.getByTestId(`employee-tag-picker-tag-${employeeTagId}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Reader Mitarbeiternotiz Fokus");
    await expect(page.getByTestId("employee-form-sidebar")).toContainText(employeeAttachmentName);

    await page.getByTestId("tab-employee-termine").click();
    await expect(page.getByTestId(`button-remove-employee-from-appointment-${appointment.id}`)).toHaveCount(0);
    await expect(page.getByTestId("table-appointments-list")).toContainText(customerNumber);

    await page.getByTestId("tab-employee-wochenplanung").click();
    const weekCard = page.getByTestId(`card-employee-week-plan-${weekAssignmentId}`);
    await expect(weekCard).toBeVisible();
    await expect(weekCard).toContainText(tourName);
    await expect(weekCard.getByTestId(`badge-employee-week-plan-member-${weekAssignmentId}`)).toContainText(
      getCompactEmployeeLabel(employee),
    );
    await expect(weekCard).toContainText(getCompactEmployeeLabel({ fullName: colleagueFullName } as {
      fullName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    }));
    await weekCard.dblclick();
    await expect(page.getByTestId("tour-week-form-overlay")).toHaveCount(0);
  });
});
