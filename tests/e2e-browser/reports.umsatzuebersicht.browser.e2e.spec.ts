/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E (Playwright)
 *
 * Realitätsgrad:
 * - Echte Browserinteraktion, echte Routen, echte API-Antworten, echte Testdaten, echte USER-Settings-Persistenz.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Browser / Baseline core / Storage none. Eindeutige Tokens (UEB-E2E-...) gegen Restdaten.
 *
 * Abgedeckte Regeln:
 * - Der Umsatzübersicht-Report erzeugt je ausgewähltem Mitarbeiter genau einen Tab mit dessen Zahlen.
 * - Die Mitarbeiterauswahl bleibt nach Reload erhalten (USER-Setting-Persistenz).
 * - „Aufträge zeigen" je Wochenzeile öffnet den Termin-Dialog.
 *
 * Fehlerfälle:
 * - Fehlende/zusätzliche Tabs, falsche Zahlen je Tab.
 * - Auswahl geht nach Reload verloren.
 *
 * Ziel:
 * Den sichtbaren Umsatz-Report-Fluss (Mehrfachauswahl, Tabs, Persistenz, Dialog) Ende-zu-Ende absichern.
 */
import { expect, test, type Page } from "./fixtures";
import { addWeeks, format, parseISO, startOfISOWeek } from "date-fns";

import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/reports.umsatzuebersicht.browser.e2e.spec.ts");
});

async function openReports(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
}

test("renders a tab per selected employee, keeps the selection after reload and opens the appointments dialog", async ({ page }) => {
  const weekStart = startOfISOWeek(addWeeks(parseISO(getRelativeBerlinDate(0)), 2));
  const appointmentDate = format(weekStart, "yyyy-MM-dd");

  const employeeA = await createEmployeeFixture("UEB-E2E-A");
  const employeeB = await createEmployeeFixture("UEB-E2E-B");

  const projectA = await createProjectFixtureWithOverrides({
    prefix: "UEB-E2E-PA",
    orderNumber: "UEB-E2E-001",
    name: "Umsatz E2E Projekt A",
    projectOrder: { amount: "111.00" },
  });
  const projectB = await createProjectFixtureWithOverrides({
    prefix: "UEB-E2E-PB",
    orderNumber: "UEB-E2E-002",
    name: "Umsatz E2E Projekt B",
    projectOrder: { amount: "222.00" },
  });

  await createAppointmentFixture({
    projectId: projectA.id,
    customerId: projectA.customerId,
    employeeIds: [employeeA.id],
    startDate: appointmentDate,
    startTime: "08:00",
  });
  await createAppointmentFixture({
    projectId: projectB.id,
    customerId: projectB.customerId,
    employeeIds: [employeeB.id],
    startDate: appointmentDate,
    startTime: "09:00",
  });

  await openReports(page);

  await page.getByTestId(`checkbox-reports-umsatzuebersicht-employee-${employeeA.id}`).click();
  await page.getByTestId(`checkbox-reports-umsatzuebersicht-employee-${employeeB.id}`).click();
  await page.getByTestId("button-reports-umsatzuebersicht-generate").click();

  await expect(page.getByTestId("reports-umsatzuebersicht-overlay")).toBeVisible();
  await expect(page.getByTestId(`tab-reports-umsatzuebersicht-employee-${employeeA.id}`)).toBeVisible();
  await expect(page.getByTestId(`tab-reports-umsatzuebersicht-employee-${employeeB.id}`)).toBeVisible();

  const tabAContent = page.getByTestId(`tab-content-reports-umsatzuebersicht-employee-${employeeA.id}`);
  await expect(tabAContent).toContainText("111,00");

  // Termin-Dialog aus der Wochenzeile heraus.
  await tabAContent.getByTestId(/employee-revenue-overview-show-orders-/).first().click();
  await expect(page.getByTestId("revenue-week-appointments-dialog")).toBeVisible();
  await expect(page.getByTestId("revenue-week-appointments-dialog")).toContainText("Umsatz E2E Projekt A");
  await page.getByTestId("revenue-week-appointments-dialog-close").click();

  // Auswahl ist pro Benutzer persistent: nach Reload bleiben beide Checkboxen gewählt.
  await page.getByTestId("button-reports-umsatzuebersicht-back").click();
  await page.reload();
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
  await expect(page.getByTestId(`checkbox-reports-umsatzuebersicht-employee-${employeeA.id}`)).toBeChecked();
  await expect(page.getByTestId(`checkbox-reports-umsatzuebersicht-employee-${employeeB.id}`)).toBeChecked();
});
