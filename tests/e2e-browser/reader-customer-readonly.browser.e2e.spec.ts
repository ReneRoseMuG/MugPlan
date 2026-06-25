import { expect, test, type Page } from "./fixtures";

import * as customerAttachmentsService from "../../server/services/customerAttachmentsService";
import * as customerNotesService from "../../server/services/customerNotesService";
import {
  attachCustomerTagFixture,
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
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

function buildAttachmentPayload(prefix: string, label: string) {
  return {
    filename: `${prefix}.pdf`,
    originalName: `${label}-${prefix}.pdf`,
    mimeType: "application/pdf",
    fileSize: 128,
    storagePath: `reader-customer/${prefix}.pdf`,
    version: 1,
  };
}

test.describe("Reader customers readonly", () => {
  test.describe.configure({ mode: "serial" });

  let customer: Awaited<ReturnType<typeof createCustomerFixtureWithOverrides>>;
  let customerTag: Awaited<ReturnType<typeof createExactTagFixture>>;
  let customerProject: Awaited<ReturnType<typeof createProjectFixture>>;
  let customerAppointment: Awaited<ReturnType<typeof createAppointmentFixture>>;
  let customerAttachmentName: string;

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts");
    customer = await createCustomerFixtureWithOverrides({
      prefix: "READER-CUST",
      firstName: "Clara",
      lastName: "Readonly",
      fullName: "Clara Readonly",
      company: "Reader Kunden GmbH",
      city: "Bremen",
      country: "Deutschland",
    });
    customerProject = await createProjectFixture({
      prefix: "READER-CUST-PROJ",
      customerId: customer.id,
      name: "Reader Kundenprojekt",
    });
    customerAppointment = await createAppointmentFixture({
      projectId: customerProject.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(5),
    });
    customerTag = await createExactTagFixture("Reader Kunden Tag Fokus");
    await attachCustomerTagFixture(customer.id, customerTag.id);
    await customerNotesService.createCustomerNote(customer.id, {
      title: "Reader Kundennotiz Fokus",
      body: "<p>Kundennotiz bleibt lesbar.</p>",
      print: false,
      cardColor: null,
    });
    const attachment = buildAttachmentPayload("reader-customer-readonly", "kundendokument");
    customerAttachmentName = attachment.originalName;
    await customerAttachmentsService.createCustomerAttachment({ customerId: customer.id, ...attachment });
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
    await expect(page.getByTestId("button-add-document-header")).toHaveCount(0);
    await expect(page.getByTestId("input-firstname")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-lastname")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-company")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("billing-address-city")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("billing-address-country")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-firstname")).toHaveValue(customer.firstName ?? "");
    await expect(page.getByTestId("input-company")).toHaveValue(customer.company ?? "");
    await expect(page.getByTestId("billing-address-city")).toHaveValue(customer.city ?? "");
    await expect(page.getByTestId("billing-address-country")).toHaveValue(customer.country ?? "");
    await expect(page.getByTestId(`customer-tag-picker-tag-${customerTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Reader Kundennotiz Fokus");
    await expect(page.getByTestId("customer-form-sidebar")).toContainText(customerAttachmentName);
    await expect(page.getByTestId(`customer-appointment-${customerAppointment.id}`)).toBeVisible();
    await expect(page.getByTestId("list-linked-projects")).toContainText(customerProject.name);
  });
});
