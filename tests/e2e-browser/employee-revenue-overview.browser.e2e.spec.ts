/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Mitarbeiterformular zeigt im Edit-Modus das Tab `Umsatz Übersicht`.
 * - Die Tabelle rendert aggregierte Wochenwerte und blendet Reklamationen/Dubletten sichtbar aus.
 * - KW-Filter und Hover-Preview funktionieren über den echten Browserpfad.
 *
 * Fehlerfälle:
 * - Das neue Tab fehlt oder zeigt falsche Wochen-/Summenwerte.
 * - Reklamationen oder Dubletten tauchen in Tabelle oder Preview wieder auf.
 * - Hover-Preview oder KW-Filter reagieren im echten UI-Fluss nicht.
 *
 * Ziel:
 * Den sichtbaren Nutzerfluss der Mitarbeiter-Umsatzübersicht Ende-zu-Ende absichern.
 */
import { expect, test } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { MANAGED_COMPLAINT_TAG_NAME } from "../../shared/appointmentCancellation";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createEmployeeFixture,
  createExactTagFixture,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

function resolveRevenueWeeks() {
  const today = parseISO(getRelativeBerlinDate(0));
  const firstWeekStart = startOfISOWeek(addWeeks(today, 2));
  const secondWeekStart = addWeeks(firstWeekStart, 1);

  return {
    first: {
      isoYear: getISOWeekYear(firstWeekStart),
      isoWeek: getISOWeek(firstWeekStart),
      firstDate: format(firstWeekStart, "yyyy-MM-dd"),
      secondDate: format(addDays(firstWeekStart, 2), "yyyy-MM-dd"),
    },
    second: {
      isoYear: getISOWeekYear(secondWeekStart),
      isoWeek: getISOWeek(secondWeekStart),
      firstDate: format(secondWeekStart, "yyyy-MM-dd"),
      secondDate: format(addDays(secondWeekStart, 1), "yyyy-MM-dd"),
    },
  };
}

test.beforeEach(async () => {
  await resetBrowserSuiteState();
});

test("employee revenue overview renders filtered weekly revenue with hover preview", async ({ page }) => {
  const revenueWeeks = resolveRevenueWeeks();
  const complaintTag = await createExactTagFixture(MANAGED_COMPLAINT_TAG_NAME, "#ff011b");
  const employee = await createEmployeeFixture("EMP-REV-BROWSER");

  const primaryProject = await createProjectFixtureWithOverrides({
    prefix: "REV-BROWSER-A",
    orderNumber: "REV-BROWSER-001",
    name: "Browser Umsatz Projekt A",
    projectOrder: { amount: "100.00" },
  });
  const followUpProject = await createProjectFixtureWithOverrides({
    prefix: "REV-BROWSER-B",
    orderNumber: "REV-BROWSER-002",
    name: "Browser Umsatz Projekt B",
    projectOrder: { amount: "250.50" },
  });
  const complaintProject = await createProjectFixtureWithOverrides({
    prefix: "REV-BROWSER-C",
    orderNumber: "REV-BROWSER-999",
    name: "Browser Reklamation",
    projectOrder: { amount: "999.99" },
  });

  await attachProjectTagFixture(complaintProject.id, complaintTag.id);

  await createAppointmentFixture({
    projectId: primaryProject.id,
    customerId: primaryProject.customerId,
    employeeIds: [employee.id],
    startDate: revenueWeeks.first.firstDate,
    startTime: "08:00",
  });
  await createAppointmentFixture({
    projectId: primaryProject.id,
    customerId: primaryProject.customerId,
    employeeIds: [employee.id],
    startDate: revenueWeeks.first.secondDate,
    startTime: "10:00",
  });
  await createAppointmentFixture({
    projectId: followUpProject.id,
    customerId: followUpProject.customerId,
    employeeIds: [employee.id],
    startDate: revenueWeeks.second.firstDate,
    startTime: "09:00",
  });
  await createAppointmentFixture({
    projectId: complaintProject.id,
    customerId: complaintProject.customerId,
    employeeIds: [employee.id],
    startDate: revenueWeeks.second.secondDate,
    startTime: "11:00",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-mitarbeiter").click();
  await page.getByTestId(`employee-card-${employee.id}`).dblclick();
  await page.getByTestId("tab-employee-umsatz-uebersicht").click();

  const table = page.getByTestId("employee-revenue-overview-table");
  await expect(table).toBeVisible();

  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(`KW ${String(revenueWeeks.first.isoWeek).padStart(2, "0")} / ${revenueWeeks.first.isoYear}`);
  await expect(rows.nth(0)).toContainText("1");
  await expect(rows.nth(0)).toContainText("100,00");
  await expect(rows.nth(1)).toContainText(`KW ${String(revenueWeeks.second.isoWeek).padStart(2, "0")} / ${revenueWeeks.second.isoYear}`);
  await expect(rows.nth(1)).toContainText("250,50");
  await expect(table).not.toContainText("Browser Reklamation");
  await expect(table).not.toContainText("999,99");

  await rows.nth(0).hover();
  const preview = page.getByTestId("employee-revenue-overview-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(employee.fullName);
  await expect(preview).toContainText(`KW ${String(revenueWeeks.first.isoWeek).padStart(2, "0")} / ${revenueWeeks.first.isoYear}`);
  await expect(preview).toContainText("Browser Umsatz Projekt A");
  await expect(preview).not.toContainText("Dublette");
  await expect(preview).not.toContainText("Browser Reklamation");

  await page.locator("#employee-revenue-week-filter").fill(`${revenueWeeks.second.isoWeek}/${revenueWeeks.second.isoYear}`);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(`KW ${String(revenueWeeks.second.isoWeek).padStart(2, "0")} / ${revenueWeeks.second.isoYear}`);
});
