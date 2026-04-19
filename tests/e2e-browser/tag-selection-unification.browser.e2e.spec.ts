/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein Edit-Formular zeigt im Tag-Picker alle Tags außer "Storniert" und rendert Picker-Optionen als `Shortcode (Vollname)`.
 * - Eine Listen-View mit Tag-Filter nutzt dieselbe Popover-Hülle und denselben vereinheitlichten Tag-Katalog.
 * - Wochen-Terminkarten rendern ihre sichtbaren Tag-Zeilen weiter auf den regulären und mehrtägigen Karten.
 *
 * Fehlerfaelle:
 * - Picker oder Filter behalten alte domänenspezifische Managed-Tag-Ausschlüsse bei.
 * - Der reservierte Storno-Tag taucht in Picker oder Filter wieder als auswählbare Option auf.
 * - Die sichtbaren Tag-Zeilen der Wochenkarten verschwinden auf regulären oder mehrtägigen Terminkarten.
 *
 * Ziel:
 * Die vereinheitlichte Tag-Auswahl browserseitig an einem Edit-Formular, einer Listen-View mit Tag-Filter und den Wochen-Terminkarten regressionssicher absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../shared/appointmentCancellation";
import { trimTagLabel } from "../../client/src/lib/tag-utils";
import {
  attachAppointmentTagFixture,
  attachCustomerTagFixture,
  attachProjectTagFixture,
  createAppointmentFixture,
  createCustomerFixture,
  createExactTagFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts");
});

async function readSystemTags(page: Page) {
  const tagsResponse = await page.request.get("/api/admin/master-data/tags");
  expect(tagsResponse.ok()).toBeTruthy();
  const allTags = await tagsResponse.json() as Array<{ id: number; name: string }>;
  const reportExclusionTag = allTags.find((tag) => tag.name === MANAGED_COMPLAINT_TAG_NAME);
  const specialMeasureTag = allTags.find((tag) => tag.name === MANAGED_SPECIAL_MEASURE_TAG_NAME);
  const cancellationTag = allTags.find((tag) => tag.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);

  expect(reportExclusionTag?.id).toBeTruthy();
  expect(specialMeasureTag?.id).toBeTruthy();
  expect(cancellationTag?.id).toBeTruthy();

  return {
    reportExclusionTag: reportExclusionTag!,
    specialMeasureTag: specialMeasureTag!,
    cancellationTag: cancellationTag!,
  };
}

async function openProject(page: Page, projectId: number) {
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("toggle-project-scope-no-appointments").click();
  await expect(page.getByTestId(`project-card-${projectId}`)).toBeVisible();
  await page.getByTestId(`project-card-${projectId}`).dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
}

async function openCustomers(page: Page) {
  await page.getByTestId("nav-kunden").click();
  await expect(page.getByTestId("button-new-customer")).toBeVisible();
}

async function openWeekOverview(page: Page) {
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
}

test("shows the unified picker catalog and shortcode-first labels in a project edit form", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT28-UNIFIED-PROJECT",
    name: "FT28 Einheitlicher Picker",
  });
  const customTag = await createExactTagFixture("Montage Premium");

  await loginAsAdmin(page);
  const { reportExclusionTag, specialMeasureTag, cancellationTag } = await readSystemTags(page);

  await openProject(page, project.id);
  await page.getByTestId("project-tag-picker-button-add").click();

  await expect(page.getByRole("heading", { name: "Tag hinzufügen" })).toBeVisible();

  const customOption = page.getByTestId(`project-tag-picker-add-tag-${customTag.id}`);
  await expect(customOption).toBeVisible();
  await expect(customOption).toContainText(trimTagLabel(customTag.name));
  await expect(customOption).toContainText(`(${customTag.name})`);

  await expect(page.getByTestId(`project-tag-picker-add-tag-${reportExclusionTag.id}`)).toBeVisible();
  await expect(page.getByTestId(`project-tag-picker-add-tag-${specialMeasureTag.id}`)).toBeVisible();
  await expect(page.getByTestId(`project-tag-picker-add-tag-${cancellationTag.id}`)).toHaveCount(0);
});

test("uses the same picker shell and unified catalog in the customer list view", async ({ page }) => {
  const taggedCustomer = await createCustomerFixture("FT28-FILTER-TAGGED");
  const otherCustomer = await createCustomerFixture("FT28-FILTER-OTHER");

  await loginAsAdmin(page);
  const { reportExclusionTag, specialMeasureTag, cancellationTag } = await readSystemTags(page);
  await attachCustomerTagFixture(taggedCustomer.id, reportExclusionTag.id);

  await openCustomers(page);

  await page.getByTestId("button-add-customer-tag-filter").click();
  await expect(page.getByText("Tag hinzufügen", { exact: true })).toBeVisible();
  await expect(page.getByTestId(`customer-filter-tag-add-${reportExclusionTag.id}`)).toBeVisible();
  await expect(page.getByTestId(`customer-filter-tag-add-${specialMeasureTag.id}`)).toBeVisible();
  await expect(page.getByTestId(`customer-filter-tag-add-${cancellationTag.id}`)).toHaveCount(0);
  await expect(page.getByTestId(`customer-filter-tag-add-${reportExclusionTag.id}`)).toContainText(trimTagLabel(reportExclusionTag.name));
  await expect(page.getByTestId(`customer-filter-tag-add-${reportExclusionTag.id}`)).toContainText(`(${reportExclusionTag.name})`);

  await page.getByTestId(`customer-filter-tag-add-${reportExclusionTag.id}-add`).click();
  await expect(page.getByTestId(`customer-filter-tag-${reportExclusionTag.id}`)).toBeVisible();
  await expect(page.getByTestId(`customer-card-${taggedCustomer.id}`)).toBeVisible();
  await expect(page.getByTestId(`customer-card-${otherCustomer.id}`)).toHaveCount(0);
});

test("keeps visible tag rows on regular and spanning week appointment cards", async ({ page }) => {
  const customer = await createCustomerFixture("FT28-WEEK-TAGS");
  const project = await createProjectFixture({
    prefix: "FT28-WEEK-TAGS",
    customerId: customer.id,
    name: "FT28 Wochenkarten Tags",
  });
  const tour = await createTourFixture("#2266aa");
  const projectTag = await createExactTagFixture("Projekt Marker");
  const customerTag = await createExactTagFixture("Kunden Hinweis");
  const appointmentTag = await createExactTagFixture("Termin Fokus");

  await attachProjectTagFixture(project.id, projectTag.id);
  await attachCustomerTagFixture(customer.id, customerTag.id);

  const regularAppointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(1),
    startTime: "08:00:00",
    tourId: tour.id,
  });
  const spanningAppointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(1),
    endDate: getRelativeBerlinDate(2),
    tourId: tour.id,
  });

  await attachAppointmentTagFixture(regularAppointment.id, appointmentTag.id);
  await attachAppointmentTagFixture(spanningAppointment.id, appointmentTag.id);

  await loginAsAdmin(page);
  await openWeekOverview(page);

  await expect(page.getByTestId(`week-appointment-tags-${regularAppointment.id}-badges-tag-${appointmentTag.id}`)).toBeVisible();
  await expect(page.getByTestId(`week-appointment-tags-${regularAppointment.id}-badges-tag-${customerTag.id}`)).toBeVisible();
  await expect(page.getByTestId(`week-appointment-tags-${regularAppointment.id}-badges-tag-${projectTag.id}`)).toBeVisible();

  await expect(page.getByTestId(`week-spanning-tile-tags-${spanningAppointment.id}-badges-tag-${appointmentTag.id}`).first()).toBeVisible();
  await expect(page.getByTestId(`week-spanning-tile-tags-${spanningAppointment.id}-badges-tag-${customerTag.id}`).first()).toBeVisible();
  await expect(page.getByTestId(`week-spanning-tile-tags-${spanningAppointment.id}-badges-tag-${projectTag.id}`).first()).toBeVisible();
});
