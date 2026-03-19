/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projektanlage im Browser validiert Pflichtfelder und erzeugt nach Kundenauswahl einen neuen Datensatz.
 * - Projektliste schaltet stabil zwischen Grundmengen um und filtert innerhalb der gewaehlten Menge.
 * - Produkt- und Komponenten-Dialoge im Projektformular bleiben fuer neue und bestehende Projekte sofort sichtbar, persistent und nach Reopen abrufbar.
 * - Projektnotizen lassen sich im Browser anlegen und loeschen.
 * - Projektloeschung ist ohne Termine erfolgreich und mit Terminen fachlich blockiert.
 *
 * Fehlerfaelle:
 * - Speichern ohne Kunde oder Titel bleibt im Formular blockiert.
 * - Scope-Wechsel vermischt kommende Projekte und Projekte ohne Termine nicht.
 * - Neu angelegte Produkt- oder Komponentenwerte verschwinden nach dem Speichern oder beim erneuten Oeffnen des Formulars.
 * - Loeschen eines Projekts mit Termin entfernt den Datensatz nicht.
 *
 * Ziel:
 * Eine reduzierte, belastbare FT02-Browser-Suite fuer die realen Projekt-Workflows des Ist-Stands absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  getRelativeBerlinDate,
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

type NamedMasterDataRow = {
  id: number;
  name: string;
};

type ProjectOrderItemRow = {
  id: number;
  productId: number | null;
  componentId: number | null;
};

async function openProjectArticleList(page: Page) {
  await page.getByRole("tab", { name: "Artikelliste" }).click();
  await expect(page.getByTestId("project-product-fields")).toBeVisible();
}

async function waitForNamedMasterDataId(page: Page, url: string, expectedName: string): Promise<number> {
  let resolvedId = 0;
  await expect.poll(async () => {
    const response = await page.request.get(url);
    if (!response.ok()) return 0;
    const rows = (await response.json()) as NamedMasterDataRow[];
    resolvedId = rows.find((row) => row.name === expectedName)?.id ?? 0;
    return resolvedId;
  }).toBeGreaterThan(0);
  return resolvedId;
}

async function createProductViaProjectDialog(page: Page, params: {
  baseProductId: number;
  name: string;
  shortCode: string;
  description: string;
}): Promise<number> {
  await openProjectArticleList(page);
  await page.getByTestId("select-project-product-saunaModel").selectOption(String(params.baseProductId));
  await page.getByTestId("button-create-project-product-saunaModel").click();

  const dialog = page.getByRole("dialog").filter({ hasText: "Neues Produkt" });
  await expect(dialog.getByText("Neues Produkt \u2014 Fass Saunen")).toBeVisible();
  await dialog.locator("#product-details-short-code").fill(params.shortCode);
  await dialog.locator("#product-details-name").fill(params.name);
  await dialog.locator("#product-details-description").fill(params.description);
  await dialog.getByRole("button", { name: /Best/ }).click();

  const createdProductId = await waitForNamedMasterDataId(page, "/api/admin/master-data/products?active=all", params.name);
  await expect(page.getByTestId("select-project-product-saunaModel")).toHaveValue(String(createdProductId));
  return createdProductId;
}

async function createComponentViaProjectDialog(page: Page, params: {
  name: string;
  shortCode: string;
  description: string;
}): Promise<number> {
  await openProjectArticleList(page);
  await page.getByTestId("button-create-project-product-oven").click();

  const dialog = page.getByRole("dialog").filter({ hasText: "Neue Komponente" });
  await expect(dialog.getByText("Neue Komponente \u2014 \u00d6fen")).toBeVisible();
  await dialog.locator("#component-details-short-code").fill(params.shortCode);
  await dialog.locator("#component-details-name").fill(params.name);
  await dialog.locator("#component-details-description").fill(params.description);
  await dialog.getByRole("button", { name: /Best/ }).click();

  const createdComponentId = await waitForNamedMasterDataId(page, "/api/admin/master-data/components?active=all", params.name);
  await expect(page.getByTestId("select-project-product-oven")).toHaveValue(String(createdComponentId));
  return createdComponentId;
}

async function fetchProjectOrderItems(page: Page, projectId: number): Promise<ProjectOrderItemRow[]> {
  const response = await page.request.get(`/api/projects/${projectId}/order-items`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ProjectOrderItemRow[];
}

async function expectPersistedOrderItems(page: Page, params: {
  projectId: number;
  productId: number;
  componentId: number;
  excludedProductId?: number;
  excludedComponentId?: number;
}) {
  await expect.poll(async () => {
    const items = await fetchProjectOrderItems(page, params.projectId);
    const hasProduct = items.some((item) => item.productId === params.productId);
    const hasComponent = items.some((item) => item.componentId === params.componentId);
    return Number(hasProduct) + Number(hasComponent);
  }).toBe(2);

  const items = await fetchProjectOrderItems(page, params.projectId);
  expect(items).toHaveLength(2);
  expect(items.some((item) => item.productId === params.productId)).toBe(true);
  expect(items.some((item) => item.componentId === params.componentId)).toBe(true);
  if (params.excludedProductId != null) {
    expect(items.some((item) => item.productId === params.excludedProductId)).toBe(false);
  }
  if (params.excludedComponentId != null) {
    expect(items.some((item) => item.componentId === params.excludedComponentId)).toBe(false);
  }
}

test("creates a project via UI after customer selection and keeps validation errors in the form", async ({ page }) => {
  const customer = await createCustomerFixture("FT02-BROWSER-CREATE");

  await openProjects(page);
  await page.getByTestId("button-new-project").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();

  await page.getByTestId("button-save-project").click();
  await expect(page.getByText("Projektname ist erforderlich")).toBeVisible();

  await page.getByTestId("input-project-name").fill("FT02 Browser Projekt");
  await page.getByTestId("button-save-project").click();
  await expect(page.getByText("Kunde muss ausgewählt werden", { exact: true })).toBeVisible();

  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);

  await page.getByTestId("input-project-order-number").fill("FT02-ORD-001");
  await page.getByTestId("button-save-project").click();

  await expect(page.getByTestId("button-new-project")).toBeVisible();
  await page.getByLabel("Ohne Termine").click();
  await expect(page.getByTestId("list-projects")).toContainText("FT02 Browser Projekt");
});

test("creates product and component entries in a new project form and restores them after reopen", async ({ page }) => {
  const customer = await createCustomerFixture("FT02-BROWSER-ARTICLES-NEW-CUST");
  const baseProduct = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "FT02 Browser Base Sauna",
    description: "Basisprodukt fuer die vorbelegte Produktkategorie.",
  });
  await createComponentFixture({
    categoryName: "\u00d6fen",
    name: "FT02 Browser Base Oven",
    description: "Basiskomponente fuer die Ofenkategorie.",
  });

  const orderNumber = "FT02-ART-NEW-001";
  const createdProductName = "FT02 Browser New Dialog Product";
  const createdComponentName = "FT02 Browser New Dialog Component";

  await openProjects(page);
  await page.getByTestId("button-new-project").click();
  await page.getByTestId("input-project-name").fill("FT02 Browser Projekt Artikelliste Neu");
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await page.getByTestId("input-project-order-number").fill(orderNumber);

  const createdProductId = await createProductViaProjectDialog(page, {
    baseProductId: baseProduct.id,
    name: createdProductName,
    shortCode: "FT02NP",
    description: "Neues Produkt ueber den Projektformular-Dialog.",
  });
  const createdComponentId = await createComponentViaProjectDialog(page, {
    name: createdComponentName,
    shortCode: "FT02NC",
    description: "Neue Komponente ueber den Projektformular-Dialog.",
  });

  const createdProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && response.url().includes("/api/projects")
    && !response.url().includes("/order-items")
  ));
  await page.getByTestId("button-save-project").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok()).toBeTruthy();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  const createdProject = (await createdProjectResponse.json()) as { id: number };
  const createdProjectId = Number(createdProject.id);
  await expectPersistedOrderItems(page, {
    projectId: createdProjectId,
    productId: createdProductId,
    componentId: createdComponentId,
  });

  await openProjectById(page, createdProjectId, "noAppointments");
  await openProjectArticleList(page);
  await expect(page.getByTestId("select-project-product-saunaModel")).toHaveValue(String(createdProductId));
  await expect(page.getByTestId("select-project-product-oven")).toHaveValue(String(createdComponentId));
});

test("switches project list scopes and keeps filters inside the selected ground set", async ({ page }) => {
  const customer = await createCustomerFixture("FT02-BROWSER-SCOPE-CUST");
  const upcomingProject = await createProjectFixture({
    prefix: "FT02-BROWSER-UPCOMING",
    customerId: customer.id,
    name: "FT02 Upcoming Scope Project",
  });
  const noAppointmentProject = await createProjectFixture({
    prefix: "FT02-BROWSER-NONE",
    customerId: customer.id,
    name: "FT02 No Appointment Project",
  });

  await createAppointmentFixture({
    projectId: upcomingProject.id,
    startDate: getRelativeBerlinDate(3),
  });

  await openProjects(page);
  await expect(page.getByTestId("list-projects")).toContainText(upcomingProject.name);
  await expect(page.getByTestId("list-projects")).not.toContainText(noAppointmentProject.name);

  await page.getByLabel("Ohne Termine").click();
  await expect(page.getByTestId("list-projects")).toContainText(noAppointmentProject.name);
  await expect(page.getByTestId("list-projects")).not.toContainText(upcomingProject.name);

  await page.locator("#project-filter-title").fill("Kein Treffer");
  await expect(page.getByText("Keine Treffer gefunden.")).toBeVisible();
});

test("creates product and component entries while editing an existing project and restores replacements after reopen", async ({ page }) => {
  const baseProduct = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "FT02 Browser Existing Base Sauna",
    description: "Vorhandenes Basisprodukt im Bearbeitungspfad.",
  });
  const baseComponent = await createComponentFixture({
    categoryName: "\u00d6fen",
    name: "FT02 Browser Existing Base Oven",
    description: "Vorhandene Basiskomponente im Bearbeitungspfad.",
  });
  const project = await createProjectFixture({
    prefix: "FT02-BROWSER-ARTICLES-EDIT",
    name: "FT02 Browser Projekt Artikelliste Edit",
  });

  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? "",
    productId: baseProduct.id,
  });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? "",
    componentId: baseComponent.id,
  });

  const createdProductName = "FT02 Browser Existing Dialog Product";
  const createdComponentName = "FT02 Browser Existing Dialog Component";

  await openProjectById(page, project.id, "noAppointments");
  const createdProductId = await createProductViaProjectDialog(page, {
    baseProductId: baseProduct.id,
    name: createdProductName,
    shortCode: "FT02EP",
    description: "Neu angelegtes Produkt im Bearbeitungsdialog.",
  });
  const createdComponentId = await createComponentViaProjectDialog(page, {
    name: createdComponentName,
    shortCode: "FT02EC",
    description: "Neu angelegte Komponente im Bearbeitungsdialog.",
  });

  await page.getByTestId("button-save-project").click();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  await expectPersistedOrderItems(page, {
    projectId: project.id,
    productId: createdProductId,
    componentId: createdComponentId,
    excludedProductId: baseProduct.id,
    excludedComponentId: baseComponent.id,
  });

  await openProjectById(page, project.id, "noAppointments");
  await openProjectArticleList(page);
  await expect(page.getByTestId("select-project-product-saunaModel")).toHaveValue(String(createdProductId));
  await expect(page.getByTestId("select-project-product-oven")).toHaveValue(String(createdComponentId));
});

test("creates and deletes a project note in the edit form", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT02-BROWSER-NOTES",
    name: "FT02 Browser Notes Project",
  });
  await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  await openProjectById(page, project.id);
  await page.getByTestId("button-new-note").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("button-save-note")).toBeDisabled();

  await dialog.getByTestId("input-note-title").fill("Browser Notiz");
  await dialog.getByTestId("richtext-editor").fill("Notizinhalt aus dem Browsertest");
  await dialog.getByTestId("button-save-note").click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${project.id}/notes`);
    if (!response.ok()) return 0;
    const notes = (await response.json()) as Array<{ id: number; title: string }>;
    return notes.filter((entry) => entry.title === "Browser Notiz").length;
  }).toBe(1);

  const notesResponse = await page.request.get(`/api/projects/${project.id}/notes`);
  const notes = (await notesResponse.json()) as Array<{ id: number; title: string }>;
  const resolvedNoteId = Number(notes.find((entry) => entry.title === "Browser Notiz")?.id);
  await expect(page.getByTestId(`note-card-${resolvedNoteId}`)).toBeVisible();
  await expect(page.getByTestId(`text-note-title-${resolvedNoteId}`)).toContainText("Browser Notiz");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId(`button-delete-note-${resolvedNoteId}`).click();
  await expect(page.getByText("Keine Notizen vorhanden")).toBeVisible();
});

test("deletes projects without appointments and keeps projects with appointments blocked", async ({ page }) => {
  const blockedProject = await createProjectFixture({
    prefix: "FT02-BROWSER-DELETE-BLOCKED",
    name: "FT02 Browser Delete Blocked",
  });
  await createAppointmentFixture({
    projectId: blockedProject.id,
    startDate: getRelativeBerlinDate(2),
  });

  const deletableProject = await createProjectFixture({
    prefix: "FT02-BROWSER-DELETE-OK",
    name: "FT02 Browser Delete Ok",
  });

  await openProjectById(page, blockedProject.id);
  await page.getByTestId("button-delete-project").click();
  await page.getByTestId("button-confirm-delete-project").click();
  await expect(page.getByText("Projekt kann nicht geloescht werden", { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${blockedProject.id}`);
    return response.status();
  }).toBe(200);

  await openProjects(page);
  await page.getByLabel("Ohne Termine").click();
  await page.getByTestId(`project-card-${deletableProject.id}`).dblclick();
  await page.getByTestId("button-delete-project").click();
  await page.getByTestId("button-confirm-delete-project").click();

  await expect(page.getByTestId("button-new-project")).toBeVisible();
  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${deletableProject.id}`);
    return response.status();
  }).toBe(404);
});
