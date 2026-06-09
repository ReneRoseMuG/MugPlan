/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Mitarbeiterformular zeigt im Edit-Modus einen read-only Tab fuer Wochenplanung.
 * - Wochenplanungskarten erscheinen nur fuer echte Tour/KW-Zuordnungen des Mitarbeiters.
 * - Die Karte zeigt die beteiligten Mitarbeiter derselben Tour/KW-Kombination sichtbar an.
 * - Ein Doppelklick auf die Wochenplanungskarte oeffnet das gemeinsame Wochenformular im Mitarbeiter-Scope.
 *
 * Fehlerfaelle:
 * - Der Wochenplanung-Tab fehlt trotz bestehender Tour/KW-Zuordnung.
 * - Die Wochenplanungskarte wird nicht aus echten Daten aufgebaut.
 * - Beteiligte Mitarbeiter erscheinen nicht sichtbar in der Wochenplanungskarte.
 * - Das gemeinsame Wochenformular wird aus dem Mitarbeiter-Scope nicht geoeffnet.
 *
 * Ziel:
 * Browser-E2E-Nachweis fuer die sichtbare Mitarbeiter-Wochenplanung und das gemeinsame Wochenformular im Mitarbeiterformular.
 */
import { expect, test } from "./fixtures";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

import { db } from "../../server/db";
import { tourWeekEmployees } from "../../shared/schema";
import {
  createEmployeeFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

function getCompactEmployeeLabel(employee: { firstName?: string | null; lastName?: string | null }) {
  const firstName = employee.firstName?.trim() ?? "";
  const lastNameInitial = employee.lastName?.trim()?.[0]?.toUpperCase() ?? "";
  return firstName && lastNameInitial ? `${firstName} ${lastNameInitial}.` : firstName || lastNameInitial;
}

function resolveNextEditableWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const weekStart = startOfISOWeek(addWeeks(today, 3));
  return {
    isoYear: getISOWeekYear(weekStart),
    isoWeek: getISOWeek(weekStart),
    weekStartDate: format(weekStart, "yyyy-MM-dd"),
    weekEndDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
  };
}

test.beforeEach(async () => {
  await resetBrowserSuiteState();
});

test("employee form shows week-planning cards with visible assigned members", async ({ page }) => {
  const targetWeek = resolveNextEditableWeek();
  const tour = await createTourFixture("#225588");
  const employee = await createEmployeeFixture("EMP-WEEK-PLAN");
  const colleague = await createEmployeeFixture("EMP-WEEK-PLAN-COLLEAGUE");

  const ownInsertResult = await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: employee.id,
  });
  const ownAssignmentId = Number((ownInsertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
    ?? (ownInsertResult as { insertId?: number }).insertId);

  const colleagueInsertResult = await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: targetWeek.isoYear,
    isoWeek: targetWeek.isoWeek,
    employeeId: colleague.id,
  });
  const colleagueAssignmentId = Number(
    (colleagueInsertResult as { insertId?: number }[] | { insertId?: number })?.[0]?.insertId
      ?? (colleagueInsertResult as { insertId?: number }).insertId,
  );

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-wochenplanung").click();

  const weekCard = page.getByTestId(`card-employee-week-plan-${ownAssignmentId}`);
  await expect(weekCard).toBeVisible();
  await expect(weekCard).toContainText(`KW ${String(targetWeek.isoWeek).padStart(2, "0")} / ${targetWeek.isoYear}`);
  await expect(weekCard).toContainText(tour.name);
  await expect(weekCard).toContainText(" - ");

  await expect(weekCard.getByTestId(`badge-employee-week-plan-member-${ownAssignmentId}`)).toContainText(
    getCompactEmployeeLabel(employee),
  );
  await expect(weekCard.getByTestId(`badge-employee-week-plan-member-${colleagueAssignmentId}`)).toContainText(
    getCompactEmployeeLabel(colleague),
  );

  await weekCard.dblclick();
  await expect(page.getByTestId("tour-week-form-overlay")).toBeVisible();
  await expect(page.getByTestId("tab-tour-week-stammdaten")).toBeVisible();
  await expect(page.getByTestId("button-open-tour-week-employee-picker")).toHaveCount(0);
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(employee));
  await expect(page.getByTestId("list-tour-week-members")).toContainText(getCompactEmployeeLabel(colleague));
});
