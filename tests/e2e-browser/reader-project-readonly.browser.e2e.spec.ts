/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Leser sehen in der Projektliste keinen Create-Einstieg.
 * - Leser können bestehende Projekte weiter öffnen.
 * - Das Projektformular bleibt für Leser rein lesend ohne Save/Delete-, Relations-, Termin-, Tag- und Notiz-Mutationen.
 *
 * Fehlerfälle:
 * - Die Projektliste zeigt für Leser weiterhin den Button zur Projektanlage.
 * - Bestehende Projekte lassen sich für Leser nicht mehr öffnen.
 * - Das Projektformular zeigt für Leser weiterhin mutierende Aktionen.
 *
 * Ziel:
 * Die Leser-Readonly-Regeln für Projektliste und Projektformular browserseitig absichern.
 */
import { expect, test, type Page } from "@playwright/test";

import * as customerAttachmentsService from "../../server/services/customerAttachmentsService";
import * as projectAttachmentsService from "../../server/services/projectAttachmentsService";
import * as projectNotesService from "../../server/services/projectNotesService";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProjectFixtureWithOverrides,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

async function findProjectEntry(page: Page, project: { id: number; orderNumber?: string | null; name: string }) {
  if (project.orderNumber) {
    await page.locator("#project-filter-order-number").fill(project.orderNumber);
  }
  await page.locator("#project-filter-title").fill(project.name);

  const tableRow = page.getByTestId("table-projects").locator("tbody tr")
    .filter({ hasText: project.name })
    .filter({ hasText: project.orderNumber ?? "" })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  return page.getByTestId(`project-card-${project.id}`).first();
}

function buildAttachmentPayload(prefix: string, label: string) {
  return {
    filename: `${prefix}.pdf`,
    originalName: `${label}-${prefix}.pdf`,
    mimeType: "application/pdf",
    fileSize: 128,
    storagePath: `reader-project/${prefix}.pdf`,
    version: 1,
  };
}

test.describe("Reader projects readonly", () => {
  test.describe.configure({ mode: "serial" });

  let customer: Awaited<ReturnType<typeof createCustomerFixtureWithOverrides>>;
  let project: Awaited<ReturnType<typeof createProjectFixtureWithOverrides>>;
  let projectTag: Awaited<ReturnType<typeof createExactTagFixture>>;
  let projectAppointment: Awaited<ReturnType<typeof createAppointmentFixture>>;
  let projectAttachmentName: string;
  let customerAttachmentName: string;

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-project-readonly.browser.e2e.spec.ts");
    customer = await createCustomerFixtureWithOverrides({
      prefix: "READER-PROJ-CUST",
      firstName: "Paula",
      lastName: "Projektkunde",
      fullName: "Paula Projektkunde",
      company: "Reader Projekt AG",
    });
    project = await createProjectFixtureWithOverrides({
      prefix: "READER-PROJ",
      customerId: customer.id,
      name: "Reader Projekt Readonly",
      descriptionMd: "<p>Readonly project body</p>",
    });
    projectAppointment = await createAppointmentFixture({
      projectId: project.id,
      customerId: customer.id,
      startDate: getRelativeBerlinDate(4),
    });
    projectTag = await createExactTagFixture("Reader Projekt Tag Fokus");
    await attachProjectTagFixture(project.id, projectTag.id);
    await projectNotesService.createProjectNote(project.id, {
      title: "Reader Projektnotiz Fokus",
      body: "<p>Projekt bleibt sichtbar.</p>",
      print: false,
      cardColor: null,
    });
    const projectAttachment = buildAttachmentPayload("reader-project-readonly", "projektdokument");
    projectAttachmentName = projectAttachment.originalName;
    await projectAttachmentsService.createProjectAttachment({ projectId: project.id, ...projectAttachment });
    const customerAttachment = buildAttachmentPayload("reader-project-customer", "kundendokument");
    customerAttachmentName = customerAttachment.originalName;
    await customerAttachmentsService.createCustomerAttachment({ customerId: customer.id, ...customerAttachment });
  });

  test("hides the create entrypoint in the project list for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-projekte").click();
    await expect(page.getByTestId("button-new-project")).toHaveCount(0);
  });

  test("opens project forms in readonly mode for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-projekte").click();
    const entry = await findProjectEntry(page, project);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("project-readonly-alert")).toHaveCount(0);
    await expect(page.getByTestId("button-save-project")).toHaveCount(0);
    await expect(page.getByTestId("button-delete-project")).toHaveCount(0);
    await expect(page.getByTestId("button-select-customer")).toHaveCount(0);
    await expect(page.getByTestId("button-new-appointment-from-project")).toHaveCount(0);
    await expect(page.getByTestId("project-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
    await expect(page.getByTestId("button-add-document-header")).toHaveCount(0);
    await expect(page.getByTestId("input-project-name")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-project-order-number")).toHaveAttribute("readonly", "");
    await expect(page.getByTestId("input-project-name")).toHaveValue(project.name);
    await expect(page.getByTestId("input-project-order-number")).toHaveValue(project.orderNumber ?? "");
    await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);
    await expect(page.getByTestId(`project-tag-picker-tag-${projectTag.id}`)).toBeVisible();
    await expect(page.getByTestId("list-notes")).toContainText("Reader Projektnotiz Fokus");
    await expect(page.getByTestId("project-form-sidebar")).toContainText(projectAttachmentName);
    await expect(page.getByTestId("project-form-sidebar")).toContainText(customerAttachmentName);
    await expect(page.getByTestId(`project-appointment-${projectAppointment.id}`)).toBeVisible();
  });
});
