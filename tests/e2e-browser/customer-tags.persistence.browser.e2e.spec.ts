/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein neuer Kunde kann im Create-Formular vor dem ersten Save einen Draft-Tag erhalten.
 * - Der gewählte Kundentag wird beim ersten Save persistiert.
 * - Nach dem erneuten Öffnen bleibt derselbe Tag sichtbar.
 * - Der Kundenlisten-Tagfilter findet den getaggten Kunden wieder und schließt einen ähnlichen Fremdkunden aus.
 *
 * Fehlerfälle:
 * - Draft-Tags gehen beim ersten Save verloren.
 * - Persistierte Kundentags fehlen nach dem Reopen wieder.
 * - Der Kundenlisten-Tagfilter zeigt ungetaggte Konkurrenzdaten weiter an.
 *
 * Ziel:
 * Den echten Auswahl-, Speicher- und Wiederfinde-Pfad für Kundentags browserseitig regressionssicher absichern.
 */
import { expect, test, type Page } from "./fixtures";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createCustomerFixtureWithOverrides,
  createTagFixture,
} from "../helpers/testDataFactory";

test.describe.configure({ mode: "serial" });

async function openCustomers(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-kunden").click();
  await expect(page.getByTestId("button-new-customer")).toBeVisible();
}

async function findCustomerEntry(
  page: Page,
  customer: { id: number; customerNumber: string; lastName?: string | null },
) {
  await page.locator("#customer-filter-number").fill(customer.customerNumber);
  if (customer.lastName) {
    await page.locator("#customer-filter-last-name").fill(customer.lastName);
  }

  const tableRow = page.getByTestId("table-customers").locator("tbody tr")
    .filter({ hasText: customer.customerNumber })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  return page.getByTestId(`customer-card-${customer.id}`).first();
}

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/customer-tags.persistence.browser.e2e.spec.ts");
});

test("persists a draft customer tag on first save and refinds the customer through the tag filter", async ({ page }) => {
  const tag = await createTagFixture("FT28-CUSTOMER-TAG");
  const distractorCustomer = await createCustomerFixtureWithOverrides({
    prefix: "FT28-CUSTOMER-TAG-DISTRACTOR",
    firstName: "Dora",
    lastName: "Tagfluss",
    fullName: "Dora Tagfluss",
    company: "Tagfluss Fremd GmbH",
  });
  const createdCustomerInput = {
    customerNumber: "FT28-CUSTOMER-TAG-001",
    firstName: "Clara",
    lastName: "Tagfluss",
    company: "Tagfluss Ziel GmbH",
  };

  await openCustomers(page);
  await page.getByTestId("button-new-customer").click();
  await expect(page.getByTestId("button-save-customer")).toBeVisible();

  await page.getByTestId("input-customernumber").fill(createdCustomerInput.customerNumber);
  await page.getByTestId("input-firstname").fill(createdCustomerInput.firstName);
  await page.getByTestId("input-lastname").fill(createdCustomerInput.lastName);
  await page.getByTestId("input-company").fill(createdCustomerInput.company);

  await page.getByTestId("customer-tag-picker-button-add").click();
  await page.getByTestId(`customer-tag-picker-add-tag-${tag.id}-add`).click();
  await expect(page.getByTestId(`customer-tag-picker-tag-${tag.id}`)).toBeVisible();

  const createdCustomerResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/customers"
  ));
  await page.getByTestId("button-save-customer").click();
  const createdCustomerResponse = await createdCustomerResponsePromise;
  expect(createdCustomerResponse.ok(), await createdCustomerResponse.text()).toBeTruthy();

  const createdCustomer = (await createdCustomerResponse.json()) as { id: number };
  const createdCustomerId = Number(createdCustomer.id);
  expect(createdCustomerId).toBeGreaterThan(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/customers/${createdCustomerId}/tags`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { tag: { id: number } }) => item.tag.id);
  }).toEqual(expect.arrayContaining([tag.id]));

  await openCustomers(page);
  const createdEntry = await findCustomerEntry(page, {
    id: createdCustomerId,
    customerNumber: createdCustomerInput.customerNumber,
    lastName: createdCustomerInput.lastName,
  });
  await expect(createdEntry).toBeVisible();
  await createdEntry.dblclick();
  await expect(page.getByTestId(`customer-tag-picker-tag-${tag.id}`)).toBeVisible();

  await openCustomers(page);
  await page.locator("#customer-filter-last-name").fill(createdCustomerInput.lastName);
  const distractorEntry = await findCustomerEntry(page, distractorCustomer);
  await expect(distractorEntry).toBeVisible();

  await page.getByTestId("button-add-customer-tag-filter").click();
  await page.getByTestId(`customer-filter-tag-add-${tag.id}-add`).click();
  await expect(page.getByTestId(`customer-filter-tag-${tag.id}`)).toBeVisible();
  const filteredCreatedEntry = await findCustomerEntry(page, {
    id: createdCustomerId,
    customerNumber: createdCustomerInput.customerNumber,
    lastName: createdCustomerInput.lastName,
  });
  await expect(filteredCreatedEntry).toBeVisible();
  await expect(
    page.getByTestId("table-customers").locator("tbody tr").filter({ hasText: distractorCustomer.customerNumber }),
  ).toHaveCount(0);
  await expect(page.getByTestId(`customer-card-${distractorCustomer.id}`)).toHaveCount(0);
});
