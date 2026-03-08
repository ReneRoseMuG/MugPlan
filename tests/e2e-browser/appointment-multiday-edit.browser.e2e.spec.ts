/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein bestehender Eintagestermin kann im Browser auf einen Mehrtagestermin erweitert werden.
 * - Nach dem Speichern rendert der Wochenkalender die Mehrtageskachel sichtbar als Spanning Tile.
 * - Beim erneuten Oeffnen bleiben Start- und Enddatum eines Mehrtagestermins korrekt im Formular gesetzt.
 * - Eine weitere Enddatum-Erweiterung bleibt nach erneutem Speichern und Wiederoeffnen stabil.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine zeigen nach Save keine Spanning-Tile-Kachel im Wochenkalender.
 * - Edit-Formulare verlieren oder verfaelschen das gespeicherte Enddatum.
 *
 * Ziel:
 * Den Mehrtages-Edit-Flow im Wochenkalender Ende-zu-Ende gegen Datumsverlust und Render-Regressions absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { resetDatabase } from "../helpers/resetDatabase";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  getRelativeBerlinDate,
  resetTestDataFactoryState,
} from "../helpers/testDataFactory";

test.beforeEach(async () => {
  resetTestDataFactoryState();
  await resetDatabase();
});

async function loginAsAdmin(page: Page) {
  await page.goto("/");
  await expect(page.getByLabel("Benutzername oder E-Mail")).toBeVisible();
  await page.getByLabel("Benutzername oder E-Mail").fill("test-admin");
  await page.getByLabel("Passwort").fill("test-admin-password");
  await page.getByRole("button", { name: "Anmelden" }).click();
}

async function openWeekAppointment(page: Page, appointmentId: number, kind: "single" | "spanning") {
  const target = kind === "single"
    ? page.getByTestId(`week-appointment-panel-${appointmentId}`).first()
    : page.getByTestId(`week-spanning-tile-${appointmentId}`).filter({ hasText: "Tag 2" }).first();
  await expect(target).toBeVisible();
  await target.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function saveAppointment(page: Page) {
  await page.getByTestId("button-save-appointment").click();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);
}

test("keeps multi-day start and end dates stable across repeated edits", async ({ page }) => {
  const customer = await createCustomerFixture("FT01-BROWSER-MULTIDAY-CUST");
  const project = await createProjectFixture({
    prefix: "FT01-BROWSER-MULTIDAY-PROJ",
    customerId: customer.id,
    name: "FT01 Browser Mehrtagesprojekt",
  });
  const employee = await createEmployeeFixture("FT01-BROWSER-MULTIDAY-EMP");

  const startDate = getRelativeBerlinDate(0);
  const firstEndDate = getRelativeBerlinDate(1);
  const secondEndDate = getRelativeBerlinDate(2);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate,
    employeeIds: [employee.id],
  });

  await loginAsAdmin(page);

  await openWeekAppointment(page, appointment.id, "single");
  await page.getByTestId("button-enable-end-date").click();
  await page.getByTestId("input-end-date").fill(firstEndDate);
  await saveAppointment(page);

  const spanningTile = page.getByTestId(`week-spanning-tile-${appointment.id}`).filter({ hasText: "Tag 2" }).first();
  await expect(spanningTile).toBeVisible();
  await expect(spanningTile).toContainText("Tag 2");

  await openWeekAppointment(page, appointment.id, "spanning");
  await expect(page.getByTestId("input-start-date")).toHaveValue(startDate);
  await expect(page.getByTestId("input-end-date")).toHaveValue(firstEndDate);
  await page.getByTestId("input-end-date").fill(secondEndDate);
  await saveAppointment(page);

  await openWeekAppointment(page, appointment.id, "spanning");
  await expect(page.getByTestId("input-start-date")).toHaveValue(startDate);
  await expect(page.getByTestId("input-end-date")).toHaveValue(secondEndDate);
});
