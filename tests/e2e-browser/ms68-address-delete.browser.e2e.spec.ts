/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E (Playwright, echte UI, echte Routen, echte Test-API)
 *
 * Realitätsgrad:
 * - Echte App-Instanz, echte Test-DB, echte Adress-API; Login als Admin.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Klasse B (eigene, eindeutig getokte Testdaten; Nachweis über IDs und eindeutige
 *   PLZ-Token mit Ausschluss/Count), Baseline core, Storage none.
 *
 * Abgedeckte Regeln (MS-68, FT 09):
 * - Eine zuvor angelegte, gespeicherte Lieferadresse kann über die Adress-Tabs entfernt
 *   und gemeinsam mit dem Kunden gespeichert werden (Variante A). Nach dem Speichern ist
 *   die Adresse tatsächlich gelöscht: sie fehlt auf der Adressliste (Count + Identity) und
 *   ihr Tab erscheint nicht mehr; der erste Tab trägt wieder den kombinierten Namen.
 * - Die systemgepflegte Rechnungsadresse (Standardadresse) ist über die UI nicht löschbar:
 *   Solange der Rechnungsadress-Tab aktiv ist, existiert kein "Adresse entfernen"-Button.
 *
 * Fehlerfälle / Gegenbeispiele:
 * - Ein Lösch-Button am Rechnungsadress-Tab würde das Löschen der Standardadresse erlauben.
 * - Eine nach dem Speichern noch vorhandene Lieferadress-Zeile würde belegen, dass das
 *   Entfernen nicht persistiert wurde.
 *
 * Ziel:
 * - Browserseitig beweisen, dass der UI-Löschpfad eine gespeicherte Zusatzadresse wirklich
 *   entfernt und die Standardadresse vor dem Löschen geschützt bleibt.
 */
import { expect, test } from "./fixtures";

import { createCustomerFixtureWithOverrides } from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("entfernt eine gespeicherte Lieferadresse über die UI und schützt die Rechnungsadresse vor dem Löschen", async ({ page }) => {
  const billingPostalCode = "51111";
  const deliveryPostalCode = "52222";
  const customer = await createCustomerFixtureWithOverrides({
    prefix: "E2E-MS68-DEL-CUST",
    firstName: "Loesch",
    lastName: "MS68DEL",
    fullName: "Loesch MS68DEL",
    addressLine1: "Rechnungsweg 1",
    postalCode: billingPostalCode,
    city: "Billtown",
    country: "Deutschland",
  });

  await loginAsAdmin(page);

  // Ausgangszustand herstellen: eine gespeicherte (id != null) Lieferadresse anlegen,
  // damit der echte pendingDelete-Pfad (markieren + gemeinsames Speichern) durchlaufen wird.
  const categoriesResponse = await page.request.get("/api/address-categories");
  const categories = (await categoriesResponse.json()) as Array<{ id: number; roleKey: string | null }>;
  const deliveryCategory = categories.find((category) => category.roleKey === "DELIVERY");
  expect(deliveryCategory, "Lieferadress-Kategorie fehlt").toBeTruthy();

  const createResponse = await page.request.post(`/api/customers/${customer.id}/addresses`, {
    data: {
      categoryId: deliveryCategory!.id,
      addressLine1: "Lieferstrasse 9",
      postalCode: deliveryPostalCode,
      city: "Deliverytown",
      country: "Deutschland",
    },
  });
  expect(createResponse.status()).toBe(201);
  const deliveryAddressId = (await createResponse.json()).id as number;

  // Vorzustand auf der API: genau zwei Adressen, die Lieferadresse ist vorhanden.
  const beforeAddresses = (await (await page.request.get(`/api/customers/${customer.id}/addresses`)).json()) as Array<{
    id: number;
    roleKey: string | null;
  }>;
  expect(beforeAddresses).toHaveLength(2);
  expect(beforeAddresses.some((a) => a.id === deliveryAddressId)).toBe(true);

  // Kunden im Formular öffnen.
  await page.getByTestId("nav-kunden").click();
  const customerCard = page.getByTestId(`customer-card-${customer.id}`);
  await expect(customerCard).toBeVisible({ timeout: 10_000 });
  await customerCard.dblclick();

  await expect(page.getByTestId("customer-addresses-panel")).toBeVisible({ timeout: 10_000 });

  // Mit separater Lieferadresse heißt der erste Tab nur noch "Rechnungsadresse" und es gibt
  // einen zweiten Tab "Lieferadresse".
  await expect(page.getByTestId("address-tab-billing")).toHaveText("Rechnungsadresse");
  const deliveryTab = page.getByRole("tab", { name: "Lieferadresse", exact: true });
  await expect(deliveryTab).toBeVisible();

  // Schutz der Standardadresse: am aktiven Rechnungsadress-Tab gibt es keinen Lösch-Button.
  await page.getByTestId("address-tab-billing").click();
  await expect(page.locator('[data-testid^="delete-customer-address-"]')).toHaveCount(0);

  // Lieferadresse auswählen und entfernen (markiert pendingDelete, da bereits gespeichert).
  await deliveryTab.click();
  const deleteButton = page.locator('[data-testid^="delete-customer-address-"]');
  await expect(deleteButton).toHaveCount(1);
  await deleteButton.click();

  // Nach dem Entfernen ist die Lieferadresse aus der Tab-Leiste verschwunden und der erste
  // Tab trägt wieder den kombinierten Namen.
  await expect(page.getByRole("tab", { name: "Lieferadresse", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("address-tab-billing")).toHaveText("Rechnungs- und Lieferadresse");

  // Variante A: gemeinsames Speichern persistiert die Entfernung.
  await page.getByTestId("button-save-customer").click();

  // Reopen-Nachweis in der UI: nur noch ein Tab, kein Lieferadress-Tab.
  await page.getByTestId("nav-kunden").click();
  await expect(customerCard).toBeVisible({ timeout: 10_000 });
  await customerCard.dblclick();
  await expect(page.getByTestId("customer-addresses-panel")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("address-tab-billing")).toHaveText("Rechnungs- und Lieferadresse");
  await expect(page.getByRole("tab", { name: "Lieferadresse", exact: true })).toHaveCount(0);

  // Harter Persistenz-Nachweis über die API: die Lieferadresse ist tatsächlich gelöscht
  // (Count + Identity), nur die Rechnungsadresse bleibt übrig.
  const afterAddresses = (await (await page.request.get(`/api/customers/${customer.id}/addresses`)).json()) as Array<{
    id: number;
    roleKey: string | null;
    isSystemManaged: boolean;
  }>;
  expect(afterAddresses).toHaveLength(1);
  expect(afterAddresses.some((a) => a.id === deliveryAddressId)).toBe(false);
  expect(afterAddresses[0]).toMatchObject({ roleKey: "BILLING", isSystemManaged: true });
});
