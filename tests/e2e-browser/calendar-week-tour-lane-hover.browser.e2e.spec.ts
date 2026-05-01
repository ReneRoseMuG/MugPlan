/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Tour-Tageshover im Wochenkalender zeigt Wochenplan-Mitarbeiter und zusätzliche Tageszuweisungen getrennt.
 * - Tage ohne Termin, aber mit Wochenplanung, zeigen weiterhin den Wochenplan-Block.
 *
 * Fehlerfaelle:
 * - Die Tagesvorschau fehlt auf der Tour-Header-Bar.
 * - Zusätzliche Tageszuweisungen werden nicht getrennt von der Wochenplanung gezeigt.
 * - Tage ohne Termine verlieren den Wochenplan-Hover.
 *
 * Ziel:
 * Das sichtbare Hover-Verhalten der neuen Tour-Lane-Tagesvorschau im echten Browser absichern.
 */
import { expect, test } from "@playwright/test";
import { addDays, format, getISOWeek, getISOWeekYear, parseISO, startOfWeek } from "date-fns";

import { db } from "../../server/db";
import { tourWeekEmployees } from "../../shared/schema";
import { getBerlinTodayDateString } from "../../client/src/lib/project-appointments";
import { createAppointmentBrowserFixture, createAppointmentFixture } from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

function getNextWeekDate(offsetFromMonday: number) {
  const monday = addDays(startOfWeek(parseISO(getBerlinTodayDateString()), { weekStartsOn: 1 }), 7);
  return format(addDays(monday, offsetFromMonday), "yyyy-MM-dd");
}

function getCompactEmployeeLabel(employee: { firstName?: string | null; lastName?: string | null }) {
  const firstName = employee.firstName?.trim() ?? "";
  const lastNameInitial = employee.lastName?.trim()?.[0]?.toUpperCase() ?? "";
  return firstName && lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName || lastNameInitial;
}

test("shows week employees and additional day employees in the lane header hover", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "WEEK-LANE-HOVER", employeeCount: 2 });
  const monday = getNextWeekDate(0);
  const tuesday = getNextWeekDate(1);
  const mondayDate = parseISO(monday);

  await db.insert(tourWeekEmployees).values({
    tourId: fixture.tour.id,
    isoYear: getISOWeekYear(mondayDate),
    isoWeek: getISOWeek(mondayDate),
    employeeId: fixture.employees[0].id,
  });

  await createAppointmentFixture({
    projectId: fixture.project.id,
    customerId: fixture.customer.id,
    startDate: monday,
    tourId: fixture.tour.id,
    employeeIds: [fixture.employees[0].id, fixture.employees[1].id],
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();
  await page.getByTestId("button-next").click();

  const mondayTrigger = page.getByTestId(`week-tour-lane-day-hover-trigger-tour-${fixture.tour.id}-${monday}`);
  await expect(mondayTrigger).toBeVisible();
  await mondayTrigger.evaluate((element) => {
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, cancelable: true }));
  });

  const preview = page.getByTestId("week-tour-lane-day-hover-preview").last();
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Aus Wochenplanung");
  await expect(preview).toContainText(getCompactEmployeeLabel(fixture.employees[0]));
  await expect(preview).toContainText("Zusätzliche Tageszuweisungen");
  await expect(preview).toContainText(getCompactEmployeeLabel(fixture.employees[1]));

  const tuesdayTrigger = page.getByTestId(`week-tour-lane-day-hover-trigger-tour-${fixture.tour.id}-${tuesday}`);
  await expect(tuesdayTrigger).toBeVisible();
  await tuesdayTrigger.evaluate((element) => {
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, cancelable: true }));
  });

  const tuesdayPreview = page.getByTestId("week-tour-lane-day-hover-preview").last();
  await expect(tuesdayPreview).toBeVisible();
  await expect(tuesdayPreview).toContainText(getCompactEmployeeLabel(fixture.employees[0]));
  await expect(tuesdayPreview.getByTestId("week-tour-lane-day-hover-additional-employees")).toContainText("Keine zusätzlichen Tageszuweisungen.");
});
