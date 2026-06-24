/**
 * Test Scope:
 *
 * Abgedeckte Regeln (MS-68, FT 09):
 * - Konsumenten von Adressdaten (Terminkarte der Wochenuebersicht, Kundenkarte) zeigen die
 *   WIRKSAME LIEFERADRESSE: ohne abweichende Lieferadresse die Rechnungsadresse (Fallback),
 *   mit abweichender Lieferadresse diese - und schliessen die Rechnungsadresse nachweislich aus.
 * - Das Anlegen einer abweichenden Lieferadresse ueber die Adress-Tabs wirkt nach dem
 *   gemeinsamen Speichern: die Konsumenten zeigen den neuen Stand (Cache-Invalidierung).
 * - Die Tab-Benennung wechselt von "Rechnungs- und Lieferadresse" zu "Rechnungsadresse",
 *   sobald eine separate Lieferadresse angelegt ist.
 *
 * Fehlerfaelle:
 * - Eine Terminkarte zeigt weiter die Rechnungsadresse, obwohl eine Lieferadresse gesetzt ist.
 * - Eine Aenderung der Lieferadresse erscheint nicht im naechsten View-Aufruf.
 *
 * Ziel:
 * Browserseitig beweisen, dass alle gezeigten Adress-Konsumenten die wirksame Lieferadresse
 * darstellen und auf Aenderungen reagieren.
 *
 * Isolation: Klasse B (eigene, eindeutig getokte Testdaten; Assertion ueber IDs und
 * eindeutige PLZ-Token mit Ausschlussnachweis), Baseline core, Storage none.
 */
import { expect, test } from "./fixtures";

import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createFilledProjectArticleListFixture,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function buildScenario(prefix: string, billingPostalCode: string) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${prefix}-CUST`,
    firstName: "Liefer",
    lastName: prefix,
    fullName: `Liefer ${prefix}`,
    addressLine1: "Rechnungsweg 1",
    postalCode: billingPostalCode,
    city: "Billtown",
    country: "Deutschland",
  });
  const project = await createProjectFixtureWithOverrides({
    prefix: `${prefix}-PROJ`,
    customerId: customer.id,
    name: `${prefix} Projekt`,
    orderNumber: `${prefix}-ORD-1`,
    descriptionMd: `${prefix} Beschreibung`,
    projectOrder: {
      amount: "1000.00",
      plannedDateText: "KW 18 / Montag",
      plannedWeek: "2099-W18",
    },
  });
  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? `${prefix}-ORD-1`,
    prefix,
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });
  return { customer, project, appointment };
}

test("Terminkarte und Kundenkarte zeigen die abweichende Lieferadresse statt der Rechnungsadresse", async ({ page }) => {
  const { customer, appointment } = await buildScenario("E2E-MS68-API", "11111");

  await loginAsAdmin(page);

  const categoriesResponse = await page.request.get("/api/address-categories");
  const categories = (await categoriesResponse.json()) as Array<{ id: number; roleKey: string | null }>;
  const deliveryCategory = categories.find((category) => category.roleKey === "DELIVERY");
  expect(deliveryCategory, "Lieferadress-Kategorie fehlt").toBeTruthy();

  // Ausgangslage: ohne Lieferadresse zeigt die Terminkarte die Rechnungsadresse (Fallback).
  await page.getByTestId("nav-wochenuebersicht").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await expect(appointmentPanel).toContainText("11111");

  // Abweichende Lieferadresse setzen.
  await page.request.post(`/api/customers/${customer.id}/addresses`, {
    data: {
      categoryId: deliveryCategory!.id,
      addressLine1: "Lieferstrasse 9",
      postalCode: "22222",
      city: "Deliverytown",
      country: "Deutschland",
    },
  });

  await page.reload();
  await loginAsAdmin(page);

  // Terminkarte zeigt nun die Lieferadresse und NICHT mehr die Rechnungsadresse.
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await expect(appointmentPanel).toContainText("22222");
  await expect(appointmentPanel).not.toContainText("11111");

  // Kundenkarte (Listenprojektion) zeigt ebenfalls die wirksame Lieferadresse.
  await page.getByTestId("nav-kunden").click();
  const customerCard = page.getByTestId(`customer-card-${customer.id}`);
  await expect(customerCard).toBeVisible({ timeout: 10_000 });
  await expect(customerCard).toContainText("22222");
  await expect(customerCard).not.toContainText("11111");
});

test("Setzen der Lieferadresse im Kundenformular wirkt sofort auf die Terminkarte", async ({ page }) => {
  const { customer, appointment } = await buildScenario("E2E-MS68-UI", "31111");

  await loginAsAdmin(page);

  // Fallback in der Terminkarte.
  await page.getByTestId("nav-wochenuebersicht").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await expect(appointmentPanel).toContainText("31111");

  // Kunden oeffnen und abweichende Lieferadresse ueber die Adress-Tabs anlegen.
  await page.getByTestId("nav-kunden").click();
  const customerCard = page.getByTestId(`customer-card-${customer.id}`);
  await expect(customerCard).toBeVisible({ timeout: 10_000 });
  await customerCard.dblclick();

  await expect(page.getByTestId("customer-addresses-panel")).toBeVisible({ timeout: 10_000 });
  // Ohne separate Lieferadresse traegt der erste Tab den kombinierten Namen.
  await expect(page.getByTestId("address-tab-billing")).toHaveText("Rechnungs- und Lieferadresse");

  await page.getByTestId("add-customer-address-button").click();
  await page.getByTestId("address-category-select").selectOption({ label: "Lieferadresse" });
  await page.getByTestId("extra-address-line1").fill("Lieferstrasse 9");
  await page.getByTestId("extra-address-postalcode").fill("32222");
  await page.getByTestId("extra-address-city").fill("Deliverytown");
  await page.getByTestId("extra-address-country").fill("Deutschland");

  // Sobald eine Lieferadresse existiert, heisst der erste Tab nur noch "Rechnungsadresse".
  await expect(page.getByTestId("address-tab-billing")).toHaveText("Rechnungsadresse");

  // Variante A: alle Adressen werden gemeinsam mit dem grossen Speichern uebernommen.
  await page.getByTestId("button-save-customer").click();

  // Konsument reagiert: Terminkarte zeigt die Lieferadresse, nicht mehr die Rechnungsadresse.
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await expect(appointmentPanel).toContainText("32222");
  await expect(appointmentPanel).not.toContainText("31111");
});

test("Bearbeiten der Rechnungsadresse im Tab wirkt über das Adressobjekt auf die Terminkarte", async ({ page }) => {
  const { customer, appointment } = await buildScenario("E2E-MS68-BILL", "41111");

  await loginAsAdmin(page);

  await page.getByTestId("nav-wochenuebersicht").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await expect(appointmentPanel).toContainText("41111");

  await page.getByTestId("nav-kunden").click();
  const customerCard = page.getByTestId(`customer-card-${customer.id}`);
  await expect(customerCard).toBeVisible({ timeout: 10_000 });
  await customerCard.dblclick();

  // Der Rechnungsadress-Tab ist an die Adresszeile gebunden (kein flacher Kundenpfad mehr):
  // die geaenderte PLZ wird ueber die Adress-API gespeichert und in die Konsumenten gespiegelt.
  await expect(page.getByTestId("customer-addresses-panel")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("billing-address-postalcode").fill("42222");
  await page.getByTestId("button-save-customer").click();

  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(appointmentPanel).toBeVisible({ timeout: 10_000 });
  await expect(appointmentPanel).toContainText("42222");
  await expect(appointmentPanel).not.toContainText("41111");
});
