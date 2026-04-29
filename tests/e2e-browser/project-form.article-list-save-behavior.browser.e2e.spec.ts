/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Im Create-Modus erzeugt eine Dropdown-Auswahl in der Artikelliste keinen sofortigen DB-Schreibzugriff.
 * - Im Create-Modus werden alle gewählten Items erst beim Speichern in die DB geschrieben.
 * - Mehrfachwechsel im Create-Modus vor dem Speichern erzeugt kein Duplikat – nur das zuletzt gewählte Item landet in der DB.
 * - Im Edit-Modus erzeugt eine Dropdown-Auswahl keinen sofortigen PUT-Aufruf – die DB bleibt bis zum Speichern unverändert.
 * - Im Edit-Modus ersetzt Speichern das alte Item durch das neue – kein Leichen-Eintrag in der DB.
 * - Im Edit-Modus bleibt die DB nach Abbrechen ohne Speichern unverändert.
 * - Im Edit-Modus wird ein abgewähltes Item beim Speichern aus der DB entfernt.
 * - Der Dirty-Check greift nach einer Artikellisten-Änderung im Edit-Modus.
 *
 * Fehlerfälle:
 * - Sofortiger DB-Schreibzugriff bei Dropdown-Auswahl (würde als vorzeitiger API-Call sichtbar).
 * - Duplikate in der DB nach Mehrfachwechsel vor dem Speichern.
 * - Altes Item bleibt nach Save-Replace in der DB.
 * - Änderung persistiert trotz Abbrechen ohne Speichern.
 * - Dirty-Check schlägt nicht an nach Artikellisten-Änderung.
 *
 * Ziel:
 * Das neue Save-Event-Buffering der Artikelliste im Projektformular end-to-end absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  createComponentFixture,
  createCustomerFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

type ProjectOrderItemRow = {
  id: number;
  productId: number | null;
  componentId: number | null;
};

async function fetchOrderItems(page: Page, projectId: number): Promise<ProjectOrderItemRow[]> {
  const response = await page.request.get(`/api/projects/${projectId}/order-items`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<ProjectOrderItemRow[]>;
}

async function openProjectEditForm(
  page: Page,
  projectId: number,
  scope: "all" | "noAppointments" = "all",
) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  if (scope === "noAppointments") {
    await page.getByTestId("toggle-project-scope-no-appointments").click();
  } else {
    await page.getByTestId("toggle-project-scope-all").click();
  }
  await expect(page.getByTestId(`project-card-${projectId}`)).toBeVisible();
  await page.getByTestId(`project-card-${projectId}`).dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
}

async function openArticleListTab(page: Page) {
  await page.getByRole("tab", { name: "Artikelliste" }).click();
  await expect(page.getByTestId("project-product-fields")).toBeVisible();
}

async function openCustomerPickerAndSelect(page: Page, customerNumber: string) {
  await page.getByTestId("button-select-customer").click();
  await expect(page.getByTestId("table-customers")).toBeVisible();
  await page.locator("#customer-filter-number").fill(customerNumber.slice(-12));
  await page.getByTestId("table-customers").locator("tr").filter({ hasText: customerNumber }).first().dblclick();
}

async function selectSaunaModelAndAnswerProjectNamePrompt(
  page: Page,
  productId: number,
  answer: "accept" | "dismiss",
) {
  const dialogPromise = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      const message = dialog.message();
      if (answer === "accept") {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
      resolve(message);
    });
  });
  await page.getByTestId("select-project-product-saunaModel").selectOption(String(productId));
  expect(await dialogPromise).toBe("Sauna-Modell geändert, soll ich den Namen des Projekts anpassen?");
}

test("wählt Produkt im Create-Modus – kein DB-Eintrag vor dem Speichern", async ({ page }) => {
  const customer = await createCustomerFixture("ALS-CREATE-NODB");
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Create NoDB Produkt",
    description: "Produkt fuer Create-NoDB-Test.",
  });

  const uniqueOrderNumber = "ALS-NDB-001";

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("button-new-project").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();

  await page.getByTestId("input-project-name").fill("ALS Create NoDB Projekt");
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await page.getByTestId("input-project-order-number").fill(uniqueOrderNumber);

  await openArticleListTab(page);
  await selectSaunaModelAndAnswerProjectNamePrompt(page, product.id, "dismiss");

  // Kein Projekt darf in der DB existieren – also kein Order-Item
  const projectsResponse = await page.request.get("/api/projects?scope=all");
  expect(projectsResponse.ok()).toBeTruthy();
  const projects = (await projectsResponse.json()) as Array<{ id: number; projectOrder?: { orderNumber?: string } }>;
  const matchingProject = projects.find(
    (p) => p.projectOrder?.orderNumber === uniqueOrderNumber,
  );
  expect(matchingProject, "Kein Projekt sollte vor dem Speichern in der DB existieren").toBeUndefined();
});

test("speichert Produkt und Komponente beim Create-Save", async ({ page }) => {
  const customer = await createCustomerFixture("ALS-CREATE-SAVE");
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Create Save Produkt",
    description: "Produkt fuer Create-Save-Test.",
  });
  const component = await createComponentFixture({
    categoryName: "Öfen",
    name: "ALS Create Save Ofen",
    description: "Komponente fuer Create-Save-Test.",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("button-new-project").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();

  await page.getByTestId("input-project-name").fill("ALS Create Save Projekt");
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await page.getByTestId("input-project-order-number").fill("ALS-SAVE-001");

  await openArticleListTab(page);
  await selectSaunaModelAndAnswerProjectNamePrompt(page, product.id, "dismiss");
  await page.getByTestId("select-project-product-oven").selectOption(String(component.id));

  const createdProjectResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST"
    && response.url().includes("/api/projects")
    && !response.url().includes("/order-items"),
  );
  await page.getByTestId("button-save-project").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok()).toBeTruthy();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  const createdProject = (await createdProjectResponse.json()) as { id: number };
  const projectId = Number(createdProject.id);
  expect(projectId).toBeGreaterThan(0);

  await expect.poll(async () => {
    const items = await fetchOrderItems(page, projectId);
    return items.length;
  }).toBe(2);

  const items = await fetchOrderItems(page, projectId);
  expect(items.some((i) => i.productId === product.id)).toBe(true);
  expect(items.some((i) => i.componentId === component.id)).toBe(true);
});

test("übernimmt den Projektnamen nach Bestätigung beim Sauna-Wechsel", async ({ page }) => {
  const customer = await createCustomerFixture("ALS-SAUNA-NAME-YES");
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Sauna Name Ja",
    description: "Produkt für die Namensübernahme nach Bestätigung.",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("button-new-project").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();

  await page.getByTestId("input-project-name").fill("Manueller Projektname");
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await page.getByTestId("input-project-order-number").fill("ALS-NAME-YES-001");

  await openArticleListTab(page);
  await selectSaunaModelAndAnswerProjectNamePrompt(page, product.id, "accept");

  await expect(page.getByTestId("input-project-name")).toHaveValue(product.name);
});

test("belässt den Projektnamen unverändert, wenn die Rückfrage abgelehnt wird", async ({ page }) => {
  const customer = await createCustomerFixture("ALS-SAUNA-NAME-NO");
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Sauna Name Nein",
    description: "Produkt für die abgelehnte Namensübernahme.",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("button-new-project").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();

  await page.getByTestId("input-project-name").fill("Manueller Projektname");
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await page.getByTestId("input-project-order-number").fill("ALS-NAME-NO-001");

  await openArticleListTab(page);
  await selectSaunaModelAndAnswerProjectNamePrompt(page, product.id, "dismiss");

  await expect(page.getByTestId("input-project-name")).toHaveValue("Manueller Projektname");
});

test("wechselt Produkt dreimal im Create-Modus – nach Save nur ein Item", async ({ page }) => {
  const customer = await createCustomerFixture("ALS-CREATE-MULTI");
  const productA = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Multi A",
    description: "Produkt A fuer Multi-Wechsel-Test.",
  });
  const productB = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Multi B",
    description: "Produkt B fuer Multi-Wechsel-Test.",
  });
  const productC = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Multi C",
    description: "Produkt C fuer Multi-Wechsel-Test.",
  });

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId("button-new-project").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();

  await page.getByTestId("input-project-name").fill("ALS Multi Wechsel Projekt");
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await page.getByTestId("input-project-order-number").fill("ALS-MULTI-001");

  await openArticleListTab(page);
  await selectSaunaModelAndAnswerProjectNamePrompt(page, productA.id, "dismiss");
  await selectSaunaModelAndAnswerProjectNamePrompt(page, productB.id, "dismiss");
  await selectSaunaModelAndAnswerProjectNamePrompt(page, productC.id, "dismiss");

  const createdProjectResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST"
    && response.url().includes("/api/projects")
    && !response.url().includes("/order-items"),
  );
  await page.getByTestId("button-save-project").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok()).toBeTruthy();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  const createdProject = (await createdProjectResponse.json()) as { id: number };
  const projectId = Number(createdProject.id);

  await expect.poll(async () => {
    const items = await fetchOrderItems(page, projectId);
    return items.length;
  }).toBe(1);

  const items = await fetchOrderItems(page, projectId);
  expect(items).toHaveLength(1);
  expect(items[0].productId).toBe(productC.id);
  expect(items.some((i) => i.productId === productA.id)).toBe(false);
  expect(items.some((i) => i.productId === productB.id)).toBe(false);
});

test("ändert Produkt im Edit-Modus – kein PUT vor dem Speichern", async ({ page }) => {
  const productA = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Edit NoDB A",
    description: "Produkt A – ursprüngliches Item.",
  });
  const productB = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Edit NoDB B",
    description: "Produkt B – neue Auswahl ohne Speichern.",
  });
  const project = await createProjectFixture({ prefix: "ALS-EDIT-NODB" });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber: project.projectOrder?.orderNumber ?? project.orderNumber ?? "",
    productId: productA.id,
    quantity: 1,
  });

  await openProjectEditForm(page, project.id, "noAppointments");
  await openArticleListTab(page);
  await selectSaunaModelAndAnswerProjectNamePrompt(page, productB.id, "dismiss");

  // DB muss noch das ursprüngliche Produkt A enthalten
  const items = await fetchOrderItems(page, project.id);
  expect(items.some((i) => i.productId === productA.id), "Produkt A muss noch in DB stehen").toBe(true);
  expect(items.some((i) => i.productId === productB.id), "Produkt B darf noch nicht in DB stehen").toBe(false);
});

test("ersetzt Produkt im Edit-Modus nach Save – kein Leichen-Eintrag in DB", async ({ page }) => {
  const productA = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Edit Replace A",
    description: "Altes Produkt – wird durch B ersetzt.",
  });
  const productB = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Edit Replace B",
    description: "Neues Produkt – ersetzt A nach Save.",
  });
  const project = await createProjectFixture({ prefix: "ALS-EDIT-REPLACE" });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber: project.projectOrder?.orderNumber ?? project.orderNumber ?? "",
    productId: productA.id,
    quantity: 1,
  });

  await openProjectEditForm(page, project.id, "noAppointments");
  await openArticleListTab(page);
  await selectSaunaModelAndAnswerProjectNamePrompt(page, productB.id, "dismiss");
  await page.getByTestId("button-save-project").click();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  await expect.poll(async () => {
    const items = await fetchOrderItems(page, project.id);
    return items.some((i) => i.productId === productB.id);
  }).toBe(true);

  const items = await fetchOrderItems(page, project.id);
  expect(items).toHaveLength(1);
  expect(items[0].productId).toBe(productB.id);
  expect(items.some((i) => i.productId === productA.id)).toBe(false);

  // Formular erneut öffnen – Dropdown zeigt Produkt B
  await openProjectEditForm(page, project.id, "noAppointments");
  await openArticleListTab(page);
  await expect(page.getByTestId("select-project-product-saunaModel")).toHaveValue(String(productB.id));
});

test("ändert Komponente im Edit-Modus, bricht ab – DB bleibt unverändert", async ({ page }) => {
  const componentX = await createComponentFixture({
    categoryName: "Öfen",
    name: "ALS Edit Cancel X",
    description: "Ursprüngliche Komponente X.",
  });
  const componentY = await createComponentFixture({
    categoryName: "Öfen",
    name: "ALS Edit Cancel Y",
    description: "Neue Komponente Y – wird nicht gespeichert.",
  });
  const project = await createProjectFixture({ prefix: "ALS-EDIT-CANCEL" });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber: project.projectOrder?.orderNumber ?? project.orderNumber ?? "",
    componentId: componentX.id,
    quantity: 1,
  });

  await openProjectEditForm(page, project.id, "noAppointments");
  await openArticleListTab(page);
  await page.getByTestId("select-project-product-oven").selectOption(String(componentY.id));

  await page.getByTestId("button-close-project").click();
  // Dirty-Confirm bestätigen
  await page.getByRole("button", { name: /verwerfen/i }).click();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  const items = await fetchOrderItems(page, project.id);
  expect(items.some((i) => i.componentId === componentX.id), "Komponente X muss noch in DB stehen").toBe(true);
  expect(items.some((i) => i.componentId === componentY.id), "Komponente Y darf nicht in DB stehen").toBe(false);

  // Formular erneut öffnen – Dropdown zeigt Komponente X
  await openProjectEditForm(page, project.id, "noAppointments");
  await openArticleListTab(page);
  await expect(page.getByTestId("select-project-product-oven")).toHaveValue(String(componentX.id));
});

test("wählt Produkt ab (leer) und speichert – Item in DB entfernt", async ({ page }) => {
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Edit Deselect Produkt",
    description: "Produkt das abgewählt wird.",
  });
  const project = await createProjectFixture({ prefix: "ALS-EDIT-DESELECT" });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber: project.projectOrder?.orderNumber ?? project.orderNumber ?? "",
    productId: product.id,
    quantity: 1,
  });

  await openProjectEditForm(page, project.id, "noAppointments");
  await openArticleListTab(page);
  await page.getByTestId("select-project-product-saunaModel").selectOption("");
  await page.getByTestId("button-save-project").click();
  await expect(page.getByTestId("button-new-project")).toBeVisible();

  await expect.poll(async () => {
    const items = await fetchOrderItems(page, project.id);
    return items.length;
  }).toBe(0);

  const items = await fetchOrderItems(page, project.id);
  expect(items).toHaveLength(0);
});

test("Dirty-Check erscheint nach Artikellisten-Änderung ohne Save", async ({ page }) => {
  const productA = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Dirty A",
    description: "Produkt A – initiale Auswahl.",
  });
  const productB = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "ALS Dirty B",
    description: "Produkt B – Auswahl für Dirty-Check.",
  });
  const project = await createProjectFixture({ prefix: "ALS-DIRTY" });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber: project.projectOrder?.orderNumber ?? project.orderNumber ?? "",
    productId: productA.id,
    quantity: 1,
  });

  await openProjectEditForm(page, project.id, "noAppointments");
  await openArticleListTab(page);

  // Warten bis der initiale Snapshot gesetzt ist – Dropdown zeigt Produkt A
  await expect(page.getByTestId("select-project-product-saunaModel")).toHaveValue(String(productA.id));

  await selectSaunaModelAndAnswerProjectNamePrompt(page, productB.id, "dismiss");

  await page.getByTestId("button-close-project").click();
  await expect(page.getByRole("alertdialog").getByText(/[Ää]nderungen verwerfen/)).toBeVisible();
});
