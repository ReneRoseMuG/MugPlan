import { expect, test, type Page } from "@playwright/test";

import { createCustomerFixture } from "../helpers/testDataFactory";
import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

async function findCustomerEntry(
  page: Page,
  customer: { id: number; customerNumber: string; firstName?: string | null; lastName?: string | null; company?: string | null },
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

test.describe("Reader customers readonly", () => {
  test.describe.configure({ mode: "serial" });

  let customer: Awaited<ReturnType<typeof createCustomerFixture>>;

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts");
    customer = await createCustomerFixture("READER-CUST");
  });

  test("hides the create entrypoint in the customer list for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-kunden").click();
    await expect(page.getByTestId("button-new-customer")).toHaveCount(0);
  });

  test("opens customer forms in readonly mode for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-kunden").click();
    const entry = await findCustomerEntry(page, customer);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("customer-readonly-alert")).toHaveCount(0);
    await expect(page.getByTestId("button-save-customer")).toHaveCount(0);
    await expect(page.getByTestId("customer-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
    await expect(page.getByTestId("input-firstname")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-company")).toHaveAttribute("readonly", "");
  });
});
