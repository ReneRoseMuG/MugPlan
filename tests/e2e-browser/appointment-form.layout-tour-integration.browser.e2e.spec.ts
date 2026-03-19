/**
 * Test Scope:
 *
 * Feature: FT01/FT04 - Terminformular Layout + Tour-Integration
 *
 * Abgedeckte Regeln:
 * - Termine ohne Tour zeigen den Tour-Picker im Mitarbeiterpanel.
 * - Die Tour-Auswahl erscheint nach dem Hinzufuegen als separate Vollbreiten-Badge ueber dem Mitarbeiterpanel.
 * - Termine mit bestehender Tour koennen die Tour im Formular wieder entfernen.
 * - Team-Badges und Mitarbeiter-Header-Aktion bleiben im neuen Layout sichtbar.
 *
 * Fehlerfaelle:
 * - Der Tour-Picker bleibt nach einer Auswahl sichtbar oder verschwindet an der falschen Stelle.
 * - Die Vollbreiten-Tour-Badge fehlt trotz selektierter Tour.
 * - Team-Badges oder Mitarbeiter-Aktionen gehen durch die Layout-Umsortierung verloren.
 *
 * Ziel:
 * Die neue Tour-Integration im echten Browser fuer beide Kernzustaende mit und ohne selektierte Tour absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createTeamFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function openExistingAppointment(page: Page, appointmentId: number) {
  await loginAsAdmin(page);
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

test("shows the tour picker inside the employee panel and persists a newly selected tour", async ({ page }) => {
  const customer = await createCustomerFixture("FT01-LAYOUT-CUST");
  const team = await createTeamFixture("#7c3aed");
  const tour = await createTourFixture("#226688");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: getRelativeBerlinDate(2),
  });

  await openExistingAppointment(page, appointment.id);

  await expect(page.getByTestId("slot-appointment-employees")).toBeVisible();
  await expect(page.getByTestId(`badge-team-${team.id}`)).toBeVisible();
  await expect(page.getByTestId("button-add-employee")).toBeVisible();
  await expect(page.getByTestId("section-tour-picker")).toBeVisible();
  await expect(page.getByTestId(`badge-tour-select-${tour.id}`)).toBeVisible();

  await page.getByTestId(`badge-tour-select-${tour.id}-add`).click();

  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.locator('[data-testid="section-tour-picker"]')).toHaveCount(0);

  await page.getByTestId("button-save-appointment").click();
  await page.getByRole("button", { name: "Trotzdem speichern" }).click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    if (!response.ok()) return null;
    const body = await response.json();
    return body.tourId;
  }).toBe(tour.id);
});

test("renders an existing tour as a separate badge and restores the picker after removal", async ({ page }) => {
  const customer = await createCustomerFixture("FT01-LAYOUT-CUST-TOUR");
  const team = await createTeamFixture("#0f766e");
  const tour = await createTourFixture("#1d4ed8");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: getRelativeBerlinDate(3),
    tourId: tour.id,
  });

  await openExistingAppointment(page, appointment.id);

  await expect(page.getByTestId(`badge-team-${team.id}`)).toBeVisible();
  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.locator('[data-testid="section-tour-picker"]')).toHaveCount(0);

  await page.getByTestId("badge-tour-remove").click();

  await expect(page.getByTestId("section-tour-picker")).toBeVisible();
  await expect(page.getByTestId(`badge-tour-select-${tour.id}`)).toBeVisible();
  await expect(page.locator('[data-testid="badge-tour"]')).toHaveCount(0);

  await page.getByTestId("button-save-appointment").click();
  await page.getByRole("button", { name: "Trotzdem speichern" }).click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    if (!response.ok()) return "missing";
    const body = await response.json();
    return body.tourId;
  }).toBe(null);
});
