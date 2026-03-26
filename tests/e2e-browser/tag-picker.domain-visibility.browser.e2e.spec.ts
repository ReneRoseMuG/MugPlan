/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-Tag-Picker zeigt benutzerdefinierte Tags sowie die erlaubten System-Tags Reklamation und Sondermass.
 * - Termin-Tag-Picker zeigt benutzerdefinierte Tags sowie die erlaubten System-Tags Reklamation und Sondermaß, blendet aber Storniert aus.
 *
 * Fehlerfaelle:
 * - Projekt- und Termin-Picker teilen weiterhin denselben ungefilterten Tag-Katalog.
 * - Der reservierte Storno-Tag erscheint in einem Tag-Picker.
 *
 * Ziel:
 * Die differenzierte Picker-Sichtbarkeit fuer FT28 im echten Browser-Flow sichtbar absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../shared/appointmentCancellation";
import {
  createCustomerFixture,
  createProjectFixture,
  createTagFixture,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function openProject(page: Page, projectId: number) {
  await page.getByTestId("nav-projekte").click();
  await page.getByLabel("Ohne Termine").click();
  await expect(page.getByTestId(`project-card-${projectId}`)).toBeVisible();
  await page.getByTestId(`project-card-${projectId}`).dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
}

async function openNewAppointment(page: Page) {
  await page.getByTestId("nav-wochenuebersicht").click();
  const button = page.locator('[data-testid^="button-new-appointment-week-"]').first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function selectCustomer(page: Page, customerNumber: string) {
  await page.getByTestId("slot-customer-relation-action-add").click();
  await expect(page.getByTestId("table-customers")).toBeVisible();
  await page.locator("#customer-filter-last-name").fill(customerNumber.slice(-12));
  await page.getByTestId("table-customers").locator("tr").filter({ hasText: customerNumber }).first().dblclick();
}

test("shows system tags only in the allowed project picker domain", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT28-PICKER-PROJECT",
    name: "FT28 Picker Projekt",
  });
  const customer = await createCustomerFixture("FT28-PICKER-CUST");
  const customTag = await createTagFixture("FT28-PICKER-TAG");

  await loginAsAdmin(page);
  const tagsResponse = await page.request.get("/api/admin/master-data/tags");
  expect(tagsResponse.ok()).toBeTruthy();
  const allTags = await tagsResponse.json() as Array<{ id: number; name: string }>;
  const reportExclusionTag = allTags.find((tag) => tag.name === MANAGED_REPORT_EXCLUSION_TAG_NAME);
  const specialMeasureTag = allTags.find((tag) => tag.name === MANAGED_SPECIAL_MEASURE_TAG_NAME);
  const cancellationTag = allTags.find((tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);

  expect(reportExclusionTag?.id).toBeTruthy();
  expect(specialMeasureTag?.id).toBeTruthy();
  expect(cancellationTag?.id).toBeTruthy();

  await openProject(page, project.id);
  await page.getByTestId("project-tag-picker-button-add").click();

  const projectDialog = page.getByTestId("project-tag-picker-available-list");
  await expect(projectDialog.getByTestId(`project-tag-picker-add-tag-${customTag.id}`)).toBeVisible();
  await expect(projectDialog.getByTestId(`project-tag-picker-add-tag-${reportExclusionTag!.id}`)).toBeVisible();
  await expect(projectDialog.getByTestId(`project-tag-picker-add-tag-${specialMeasureTag!.id}`)).toBeVisible();
  await expect(projectDialog.getByTestId(`project-tag-picker-add-tag-${cancellationTag!.id}`)).toHaveCount(0);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  await openNewAppointment(page);
  await selectCustomer(page, customer.customerNumber);
  await page.getByTestId("appointment-tag-picker-button-add").click();

  const appointmentDialog = page.getByTestId("appointment-tag-picker-available-list");
  await expect(appointmentDialog.getByTestId(`appointment-tag-picker-add-tag-${customTag.id}`)).toBeVisible();
  await expect(appointmentDialog.getByTestId(`appointment-tag-picker-add-tag-${reportExclusionTag!.id}`)).toBeVisible();
  await expect(appointmentDialog.getByTestId(`appointment-tag-picker-add-tag-${specialMeasureTag!.id}`)).toBeVisible();
  await expect(appointmentDialog.getByTestId(`appointment-tag-picker-add-tag-${cancellationTag!.id}`)).toHaveCount(0);
});
