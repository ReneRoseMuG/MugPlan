/**
 * Test Scope:
 *
 * Feature: FT02/FT13/FT24 - Neues Projekt mit Sidebar-Drafts
 *
 * Abgedeckte Regeln:
 * - Ein neues Projekt zeigt die rechte Sidebar bereits vor dem ersten Save.
 * - Tags, Notizen und Projektanhaenge lassen sich im Neuer-Projekt-Formular vor dem ersten Save bedienen.
 * - Nach dem ersten Save werden Tag, Notiz und Projektanhang dem erzeugten Projekt korrekt zugeordnet.
 * - Eine aus der Dokumentextraktion uebernommene Datei erscheint vor dem Save als pending Projektanhang und nach dem Save als echter Projektanhang.
 * - Beim erneuten Oeffnen im Edit-Modus stehen dieselben Daten wieder in der Sidebar zur Verfuegung.
 *
 * Fehlerfaelle:
 * - Die Create-Sidebar fehlt im Projektformular.
 * - Draft-Tags, Draft-Notizen oder pending Projektanhaenge gehen beim ersten Save verloren.
 * - Die Extraktionsdatei landet nicht im Projekt-Dokumentenpanel.
 *
 * Ziel:
 * Browser-E2E fuer die angeglichene Create-UX des Projektformulars und die Persistenz der Create-Sidebar-Daten bis zum Reopen absichern.
 */
import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";
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

async function openProjects(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await expect(page.getByTestId("button-new-project")).toBeVisible();
}

async function openNewProject(page: Page) {
  await openProjects(page);
  await page.getByTestId("button-new-project").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
}

async function openCustomerPickerAndSelect(page: Page, customerNumber: string) {
  await page.getByTestId("button-select-customer").click();
  await expect(page.getByTestId("table-customers")).toBeVisible();
  await page.locator("#customer-filter-last-name").fill(customerNumber.slice(-12));
  await page.getByTestId("table-customers").locator("tr").filter({ hasText: customerNumber }).first().dblclick();
}

async function openProjectById(page: Page, projectId: number, scope: "all" | "noAppointments" = "all") {
  await openProjects(page);
  if (scope === "noAppointments") {
    await page.getByLabel("Ohne Termine").click();
  } else {
    await page.getByLabel("Alle Projekte").click();
  }
  await expect(page.getByTestId(`project-card-${projectId}`)).toBeVisible();
  await page.getByTestId(`project-card-${projectId}`).dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
}

async function createNoteViaDialog(page: Page, input: { title: string; body: string }) {
  await page.getByTestId("button-new-note").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("input-note-title").fill(input.title);
  await dialog.getByTestId("richtext-editor").fill(input.body);
  await dialog.getByTestId("button-save-note").click();
}

async function mockProjectDocumentExtraction(page: Page, customerNumber: string, options?: {
  saunaModel?: string;
  orderNumber?: string;
  amount?: string;
}) {
  await page.route("**/api/document-extraction/extract?scope=project_form", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        customer: {
          customerNumber,
          firstName: "Doc",
          lastName: "Extract",
          company: null,
          email: null,
          phone: null,
          addressLine1: "Testweg 1",
          addressLine2: null,
          postalCode: "12345",
          city: "Berlin",
        },
        orderNumber: options?.orderNumber ?? `PRJ-${customerNumber}`,
        amount: options?.amount ?? "14700.00",
        saunaModel: options?.saunaModel ?? `Projekt ${customerNumber}`,
        articleItems: [],
        categorizedItems: [],
        articleListHtml: "<p>Extrahierte Artikelliste</p>",
        fieldReport: {
          recognized: [],
          missing: [],
        },
        warnings: [],
      }),
    });
  });
}

async function uploadExtractionPdf(page: Page, fileName: string) {
  const fileInput = page.locator('[data-testid="dropzone-document-extraction"] input[type="file"]');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF", "utf8"),
  });
}

test("persists tag, note and project attachment from the new project form and restores them on reopen", async ({ page }) => {
  const customer = await createCustomerFixture("FT02-CREATE-SIDEBAR");
  const tag = await createTagFixture("FT02-PROJECT-CREATE-TAG");
  const note = {
    title: "Create Sidebar Projektnotiz",
    body: "Notiz aus dem Neuer-Projekt-Formular",
  };
  const attachmentName = "create-project-sidebar-attachment.txt";

  await openNewProject(page);
  await expect(page.getByTestId("project-form-sidebar")).toBeVisible();

  await page.getByTestId("input-project-name").fill("FT02 Browser Projekt Sidebar");
  await page.getByTestId("input-project-order-number").fill("FT02-PROJECT-SIDEBAR-001");
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);

  await page.getByTestId("project-tag-picker-button-add").click();
  await page.getByTestId(`project-tag-picker-add-tag-${tag.id}-add`).click();
  await expect(page.getByTestId(`project-tag-picker-tag-${tag.id}`)).toBeVisible();

  await createNoteViaDialog(page, note);
  await expect(
    page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first(),
  ).toBeVisible();

  const fileInput = page.getByTestId("project-form-sidebar").locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: attachmentName,
    mimeType: "text/plain",
    buffer: Buffer.from("projektanhang aus create sidebar", "utf8"),
  });
  await expect(page.getByTestId("project-form-sidebar").getByText(attachmentName)).toBeVisible();

  const createdProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/projects"
  ));
  await page.getByTestId("button-save-project").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok(), await createdProjectResponse.text()).toBeTruthy();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  const createdProject = (await createdProjectResponse.json()) as { id: number };
  const createdProjectId = Number(createdProject.id);
  expect(createdProjectId).toBeGreaterThan(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${createdProjectId}/tags`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { tag: { id: number } }) => item.tag.id);
  }).toEqual(expect.arrayContaining([tag.id]));

  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${createdProjectId}/notes`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { title: string }) => item.title);
  }).toEqual(expect.arrayContaining([note.title]));

  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${createdProjectId}/attachments`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { originalName: string }) => item.originalName);
  }).toEqual(expect.arrayContaining([attachmentName]));

  await openProjectById(page, createdProjectId, "noAppointments");
  await expect(page.getByTestId("project-form-sidebar")).toBeVisible();
  await expect(page.getByTestId(`project-tag-picker-tag-${tag.id}`)).toBeVisible();
  await expect(
    page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first(),
  ).toBeVisible();
  await expect(page.getByTestId("project-form-sidebar").getByText(attachmentName)).toBeVisible();
});

test("shows an extracted document as pending project attachment before save and restores it after reopen", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-PROJECT-EXTRACT");
  const extractionFileName = "ft24-project-create-sidebar.pdf";

  await mockProjectDocumentExtraction(page, customer.customerNumber, {
    saunaModel: "FT24 Browser Projekt Sidebar",
    orderNumber: "FT24-PROJECT-SIDEBAR-001",
  });

  await openNewProject(page);
  await uploadExtractionPdf(page, extractionFileName);

  await expect(page.getByTestId("button-doc-extract-apply-data")).toBeVisible();
  await expect(page.getByTestId("project-form-sidebar").getByText(extractionFileName)).toBeVisible();
  await page.getByTestId("button-doc-extract-apply-data").click();
  await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);

  const createdProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/projects"
  ));
  await page.getByTestId("button-save-project").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok(), await createdProjectResponse.text()).toBeTruthy();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  const createdProject = (await createdProjectResponse.json()) as { id: number };
  const createdProjectId = Number(createdProject.id);
  expect(createdProjectId).toBeGreaterThan(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${createdProjectId}/attachments`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { originalName: string }) => item.originalName);
  }).toEqual(expect.arrayContaining([extractionFileName]));

  await openProjectById(page, createdProjectId, "noAppointments");
  await expect(page.getByTestId("project-form-sidebar").getByText(extractionFileName)).toBeVisible();
});

test("keeps the sidebar visible for existing project edit", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT02-PROJECT-SIDEBAR-EDIT",
    name: "FT02 Sidebar Edit Projekt",
  });

  await openProjectById(page, project.id, "noAppointments");

  await expect(page.getByTestId("project-form-sidebar")).toBeVisible();
  await expect(page.getByTestId("button-add-document-header")).toBeVisible();
  await expect(page.getByTestId("project-tag-picker-assigned-list")).toBeVisible();
  await expect(page.getByTestId("button-new-note")).toBeVisible();
});
