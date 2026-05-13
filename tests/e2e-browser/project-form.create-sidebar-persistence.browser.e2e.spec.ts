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
 * - Auftragsdaten lassen sich auch ohne vorgewaehlten Kunden in das Projektformular uebernehmen.
 * - Die Dokumentextraktion fuellt die strukturierte Artikelliste nicht automatisch mit Produktselektionen vor.
 * - Sichtbare Projektbeschreibung setzt beim Save still das Projekt-Tag `Anmerkungen`.
 * - Auch ein nachtraeglich im Edit-Modus gepflegter Beschreibungstext setzt das Projekt-Tag `Anmerkungen`.
 * - Beim erneuten Oeffnen im Edit-Modus stehen dieselben Daten wieder in der Sidebar zur Verfuegung.
 * - Ungespeicherte Edit-Werte im Projektformular bleiben trotz Tag-Mutation im Sidebar-Picker erhalten.
 *
 * Fehlerfaelle:
 * - Die Create-Sidebar fehlt im Projektformular.
 * - Draft-Tags, Draft-Notizen oder pending Projektanhaenge gehen beim ersten Save verloren.
 * - Die Extraktionsdatei landet nicht im Projekt-Dokumentenpanel.
 * - Der Projekt-Extract bleibt bei fehlendem Kunden oder teilweiser Kundenlesbarkeit unbenutzbar.
 * - Beschreibungstext bleibt ohne das erwartete Projekt-Tag `Anmerkungen`.
 * - Das Edit-Formular setzt lokale Feldwerte nach Tag-Auswahl wieder auf den Serverstand zurueck.
 *
 * Ziel:
 * Browser-E2E fuer die angeglichene Create-UX des Projektformulars, die stille `Anmerkungen`-Regel beim Speichern und die Persistenz der Create-Sidebar-Daten bis zum Reopen absichern.
 */
import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";
import { MANAGED_COMPLAINT_TAG_NAME } from "../../shared/appointmentCancellation";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createProductFixture,
  createProjectFixture,
  createTagFixture,
  createTourFixture,
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
    await page.getByTestId("toggle-project-scope-no-appointments").click();
  } else {
    await page.getByTestId("toggle-project-scope-all").click();
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
  customer?: Partial<{
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
  }>;
  fieldReport?: {
    recognized: Array<{ key: string; label: string; section: "customer" | "project"; value: string }>;
    missing: Array<{ key: string; label: string; section: "customer" | "project"; reason: string }>;
    issues?: Array<{ key: string; label: string; section: "customer" | "project"; severity: "warning" | "error"; reason: string }>;
  };
  articleItems?: Array<{ quantity: string; description: string; category: string }>;
  categorizedItems?: Array<{ category: string; items: Array<{ quantity: string; description: string; category: string }> }>;
  articleListHtml?: string;
  documentText?: string;
  warnings?: string[];
}) {
  const articleItems = options?.articleItems ?? [{ quantity: "1", description: "Extrahierter Artikel", category: "Artikel" }];
  const categorizedItems = options?.categorizedItems ?? [{ category: "Artikel", items: articleItems }];
  await page.route("**/api/document-extraction/extract?scope=project_form", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        customer: {
          customerNumber,
          firstName: options?.customer?.firstName ?? "Doc",
          lastName: options?.customer?.lastName ?? "Extract",
          company: options?.customer?.company ?? null,
          email: options?.customer?.email ?? null,
          phone: options?.customer?.phone ?? null,
          addressLine1: options?.customer?.addressLine1 ?? "Testweg 1",
          addressLine2: options?.customer?.addressLine2 ?? null,
          postalCode: options?.customer?.postalCode ?? "12345",
          city: options?.customer?.city ?? "Berlin",
        },
        orderNumber: options?.orderNumber ?? `PRJ-${customerNumber}`,
        amount: options?.amount ?? "14700.00",
        saunaModel: options?.saunaModel ?? `Projekt ${customerNumber}`,
        articleItems,
        categorizedItems,
        articleListHtml: options?.articleListHtml ?? "<p>Extrahierte Artikelliste</p>",
        fieldReport: options?.fieldReport
          ? { ...options.fieldReport, issues: options.fieldReport.issues ?? [] }
          : { recognized: [], missing: [], issues: [] },
        warnings: options?.warnings ?? [],
        documentText: options?.documentText ?? "Extrahierter PDF-Volltext",
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

async function uploadExtractionFixturePdf(page: Page, fixturePath: string) {
  const fileInput = page.locator('[data-testid="dropzone-document-extraction"] input[type="file"]');
  await fileInput.setInputFiles(fixturePath);
}

async function completeProjectDocumentExtractionWorkflow(page: Page, options: { acceptReklamation?: boolean } = {}) {
  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await page.getByTestId("button-project-doc-extract-next").click();
  await expect(page.getByTestId("button-doc-extract-resolve-customer")).toHaveCount(0);
  await page.getByTestId("button-project-doc-extract-next").click();
  const reklamoCheckbox = page.getByTestId("checkbox-doc-extract-accept-reklamation");
  if (await reklamoCheckbox.isVisible().catch(() => false)) {
    const shouldAccept = options.acceptReklamation === true;
    const isChecked = await reklamoCheckbox.isChecked();
    if (shouldAccept !== isChecked) await reklamoCheckbox.click();
  }
  await page.getByTestId("button-project-doc-extract-next").click();
  await page.getByTestId("button-doc-extract-apply-data").click();
}

async function readCustomerByNumber(page: Page, customerNumber: string) {
  const response = await page.request.post("/api/document-extraction/resolve-customer-by-number", {
    data: { customerNumber },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<{
    resolution: "none" | "single" | "multiple";
    customer: null | {
      customerNumber: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      addressLine1: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
    };
  }>;
}

async function readProjectTagNames(page: Page, projectId: number) {
  try {
    const response = await page.request.get(`/api/projects/${projectId}/tags`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { tag: { name: string } }) => item.tag.name);
  } catch {
    return [];
  }
}

async function readProjectNotes(page: Page, projectId: number): Promise<Array<{ title: string }>> {
  const response = await page.request.get(`/api/projects/${projectId}/notes`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Array<{ title: string }>>;
}

type ProjectDocExtractFixtureDialogCase = {
  file: string;
  project: {
    saunaModel: string;
    orderNumber: string;
    amount: string;
  };
  customer: {
    customerNumber: string;
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    addressLine1: string;
    postalCode: string;
    city: string;
    country: string;
  };
  missingLabels?: string[];
  issueTexts?: string[];
};

const projectDocExtractFixtureDialogCases: ProjectDocExtractFixtureDialogCase[] = [
  {
    file: "BSP CompanyName Only.pdf",
    project: {
      saunaModel: "Projektinformationen aus Dokument",
      orderNumber: "A0218253A",
      amount: "6264.50",
    },
    customer: {
      customerNumber: "161979",
      firstName: "",
      lastName: "",
      company: "B&E Wohnprojekte GmbH",
      phone: "01520-5613413",
      addressLine1: "Carl-Reuther-Str. 1",
      postalCode: "68305",
      city: "Mannheim",
      country: "Deutschland",
    },
    missingLabels: ["Vorname", "Nachname"],
    issueTexts: ["Artikelliste"],
  },
  {
    file: "BSP Country.pdf",
    project: {
      saunaModel: "Exklusiv Sauna",
      orderNumber: "A0218277A",
      amount: "19515.00",
    },
    customer: {
      customerNumber: "160673",
      firstName: "Tom",
      lastName: "Voosen",
      company: "",
      phone: "00352-621222479",
      addressLine1: "1 Tommesknapp",
      postalCode: "7419",
      city: "Brouch",
      country: "Luxemburg",
    },
    missingLabels: ["Firma"],
  },
  {
    file: "BSP Customer CompanyName.pdf",
    project: {
      saunaModel: "Projektinformationen aus Dokument",
      orderNumber: "BE19322",
      amount: "54.40",
    },
    customer: {
      customerNumber: "163180",
      firstName: "Lars",
      lastName: "Bartilla",
      company: "Fahrrad Meinhold GmbH",
      phone: "",
      addressLine1: "Hannoversche Straße 164",
      postalCode: "30823",
      city: "Garbsen",
      country: "Deutschland",
    },
    missingLabels: ["Telefon"],
    issueTexts: ["Artikelliste"],
  },
  {
    file: "BSP Customer.pdf",
    project: {
      saunaModel: "Suuri Sauna",
      orderNumber: "A0118067A",
      amount: "8850.00",
    },
    customer: {
      customerNumber: "163033",
      firstName: "Leif",
      lastName: "Döpking",
      company: "",
      phone: "0152-53500769",
      addressLine1: "Ellerdamm 28",
      postalCode: "27339",
      city: "Riede, Kreis Verden",
      country: "Deutschland",
    },
    missingLabels: ["Firma"],
  },
  {
    file: "BSP default.pdf",
    project: {
      saunaModel: "FassSauna",
      orderNumber: "A0117990A",
      amount: "7000.00",
    },
    customer: {
      customerNumber: "163059",
      firstName: "Holger",
      lastName: "Haake",
      company: "",
      phone: "0172-4540748",
      addressLine1: "Uhlhornskamp 12",
      postalCode: "27243",
      city: "Harpstedt",
      country: "Deutschland",
    },
    missingLabels: ["Firma"],
  },
  {
    file: "BSP Mobil.pdf",
    project: {
      saunaModel: "FassSauna",
      orderNumber: "A0117990A",
      amount: "7000.00",
    },
    customer: {
      customerNumber: "163059",
      firstName: "Holger",
      lastName: "Haake",
      company: "",
      phone: "0172-4540748",
      addressLine1: "Uhlhornskamp 12",
      postalCode: "27243",
      city: "Harpstedt",
      country: "Deutschland",
    },
    missingLabels: ["Firma"],
  },
  {
    file: "BSP PLZ.pdf",
    project: {
      saunaModel: "Projektinformationen aus Dokument",
      orderNumber: "A0418684A",
      amount: "150.00",
    },
    customer: {
      customerNumber: "160521",
      firstName: "Swen",
      lastName: "Wischnowsky",
      company: "",
      phone: "0172-7940641",
      addressLine1: "Ulmenweg 8",
      postalCode: "989610",
      city: "Sömmerda",
      country: "Deutschland",
    },
    missingLabels: ["Firma"],
    issueTexts: ["PLZ", "989610", "Artikelliste"],
  },
  {
    file: "BSP Tel.pdf",
    project: {
      saunaModel: "FassSauna",
      orderNumber: "A0118045A",
      amount: "7600.00",
    },
    customer: {
      customerNumber: "163053",
      firstName: "Christoph",
      lastName: "Becker",
      company: "",
      phone: "024614068760",
      addressLine1: "Vogelsangstr. 5 a",
      postalCode: "52428",
      city: "Jülich",
      country: "Deutschland",
    },
    missingLabels: ["Firma"],
  },
];

async function expectProjectExtractionFixtureDialog(page: Page, fixture: ProjectDocExtractFixtureDialogCase) {
  await openNewProject(page);
  await uploadExtractionFixturePdf(page, `tests/fixtures/Doc Extract/${fixture.file}`);

  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await expect(page.getByTestId("input-doc-extract-sauna-model")).toHaveValue(fixture.project.saunaModel);
  await expect(page.getByTestId("input-doc-extract-order-number")).toHaveValue(fixture.project.orderNumber);
  await expect(page.getByTestId("input-doc-extract-amount")).toHaveValue(fixture.project.amount);
  await expect(page.getByTestId("doc-extract-project-step-panel")).toHaveClass(/grid-rows-\[minmax\(0,1fr\)_auto\]/);
  await expect(page.getByTestId("doc-extract-document-text-option")).toBeVisible();

  await page.getByTestId("button-project-doc-extract-next").click();
  await expect(page.getByTestId("button-doc-extract-resolve-customer")).toHaveCount(0);
  await expect(page.getByTestId("input-doc-extract-customer-number")).toHaveValue(fixture.customer.customerNumber);
  await expect(page.getByTestId("input-doc-extract-phone")).toHaveValue(fixture.customer.phone);
  await expect(page.getByTestId("input-doc-extract-first-name")).toHaveValue(fixture.customer.firstName);
  await expect(page.getByTestId("input-doc-extract-last-name")).toHaveValue(fixture.customer.lastName);
  await expect(page.getByTestId("input-doc-extract-company")).toHaveValue(fixture.customer.company);
  await expect(page.getByTestId("input-doc-extract-address-line-1")).toHaveValue(fixture.customer.addressLine1);
  await expect(page.getByTestId("input-doc-extract-postal-code")).toHaveValue(fixture.customer.postalCode);
  await expect(page.getByTestId("input-doc-extract-city")).toHaveValue(fixture.customer.city);
  await expect(page.getByTestId("input-doc-extract-country")).toHaveValue(fixture.customer.country);

  await page.getByTestId("button-project-doc-extract-next").click();
  const missingLabels = fixture.missingLabels ?? [];
  if (missingLabels.length > 0) {
    const missingReport = page.getByTestId("document-extraction-report-missing");
    await expect(missingReport).toBeVisible();
    for (const label of missingLabels) {
      await expect(missingReport).toContainText(label);
    }
  } else {
    await expect(page.getByTestId("document-extraction-report-missing")).toHaveCount(0);
  }

  const issueTexts = fixture.issueTexts ?? [];
  if (issueTexts.length > 0) {
    const issuesReport = page.getByTestId("document-extraction-report-issues");
    await expect(issuesReport).toBeVisible();
    for (const text of issueTexts) {
      await expect(issuesReport).toContainText(text);
    }
  } else {
    await expect(page.getByTestId("document-extraction-report-issues")).toHaveCount(0);
  }

  await page.getByTestId("button-project-doc-extract-cancel").click();
  await expect(page.getByTestId("document-extraction-overlay")).toHaveCount(0);
}

for (const fixture of projectDocExtractFixtureDialogCases) {
  test(`renders Doc Extract result dialog fields for ${fixture.file}`, async ({ page }) => {
    await expectProjectExtractionFixtureDialog(page, fixture);
  });
}

test("persists Reklamation workflow from the new project form with a template note draft", async ({ page }) => {
  const customer = await createCustomerFixture("FT02-CREATE-REKLAMATION");

  await openNewProject(page);
  await expect(page.getByTestId("project-form-functions-panel")).toBeVisible();
  await expect(page.getByTestId("button-set-project-reklamation")).toBeVisible();

  await page.getByTestId("input-project-name").fill("FT02 Browser Projekt Reklamation");
  await page.getByTestId("input-project-order-number").fill("RKL-PRJ-01");
  await openCustomerPickerAndSelect(page, customer.customerNumber);

  await page.getByTestId("button-set-project-reklamation").click();
  await expect(page.getByTestId("button-remove-project-reklamation")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await page.getByTestId("button-save-project").click();
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_COMPLAINT_TAG_NAME);

  await page.getByTestId("button-save-note").click();
  await expect(page.getByTestId("input-note-title")).toHaveCount(0);
  await expect(
    page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: MANAGED_COMPLAINT_TAG_NAME }).first(),
  ).toBeVisible();

  const createdProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/projects"
  ));
  await page.getByTestId("button-save-project").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok(), await createdProjectResponse.text()).toBeTruthy();
  const createdProject = await createdProjectResponse.json() as { id: number };

  await expect.poll(async () => readProjectTagNames(page, createdProject.id)).toContain(MANAGED_COMPLAINT_TAG_NAME);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, createdProject.id);
    return notes.map((note) => note.title);
  }).toContain(MANAGED_COMPLAINT_TAG_NAME);
});

test("does not reopen the Reklamation note suggestion on new project save after skip", async ({ page }) => {
  const customer = await createCustomerFixture("FT02-CREATE-REKLAMATION-SKIP");

  await openNewProject(page);
  await expect(page.getByTestId("project-form-functions-panel")).toBeVisible();
  await expect(page.getByTestId("button-set-project-reklamation")).toBeVisible();

  await page.getByTestId("input-project-name").fill("FT02 Browser Projekt Reklamation Skip");
  await page.getByTestId("input-project-order-number").fill("RKL-PRJ-SKIP-01");
  await openCustomerPickerAndSelect(page, customer.customerNumber);

  await page.getByTestId("button-set-project-reklamation").click();
  await expect(page.getByTestId("button-remove-project-reklamation")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await page.getByTestId("button-save-project").click();
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_COMPLAINT_TAG_NAME);
  await page.getByTestId("button-cancel-note").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  const createdProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/projects"
  ));
  await page.getByTestId("button-save-project").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok(), await createdProjectResponse.text()).toBeTruthy();
  const createdProject = await createdProjectResponse.json() as { id: number };
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await expect.poll(async () => readProjectTagNames(page, createdProject.id)).toContain(MANAGED_COMPLAINT_TAG_NAME);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, createdProject.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);
});

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

test("sets the Anmerkungen tag when a new project is saved with visible description text", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-PROJECT-REMARKS-CREATE");

  await openNewProject(page);
  await page.getByTestId("input-project-name").fill("FT06 Browser Projekt Beschreibung");
  await page.getByTestId("input-project-order-number").fill("FT06-PROJECT-REMARKS-CREATE-001");
  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await page.getByRole("tab", { name: "Anmerkungen" }).click();
  await page.getByTestId("richtext-editor").fill("Sichtbare Projektbeschreibung aus dem Browsertest");

  const createdProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/projects"
  ));
  await page.getByTestId("button-save-project").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok(), await createdProjectResponse.text()).toBeTruthy();

  const createdProject = (await createdProjectResponse.json()) as { id: number };
  const createdProjectId = Number(createdProject.id);
  expect(createdProjectId).toBeGreaterThan(0);

  await expect.poll(async () => {
    return readProjectTagNames(page, createdProjectId);
  }).toEqual(expect.arrayContaining(["Anmerkungen"]));
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

  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await expect(page.getByTestId("project-form-sidebar").getByText(extractionFileName)).toBeVisible();
  await expect(page.getByTestId("button-open-extraction-pdf-tab")).toBeVisible();
  await completeProjectDocumentExtractionWorkflow(page);
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

test("extracts BSP PLZ fixture into the project dialog and creates the customer with the suspicious PLZ", async ({ page }) => {
  await openNewProject(page);
  await uploadExtractionFixturePdf(page, "tests/fixtures/Doc Extract/BSP PLZ.pdf");

  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await page.getByTestId("button-project-doc-extract-next").click();

  await expect(page.getByTestId("input-doc-extract-customer-number")).toHaveValue("160521");
  await expect(page.getByTestId("input-doc-extract-phone")).toHaveValue("0172-7940641");
  await expect(page.getByTestId("input-doc-extract-first-name")).toHaveValue("Swen");
  await expect(page.getByTestId("input-doc-extract-last-name")).toHaveValue("Wischnowsky");
  await expect(page.getByTestId("input-doc-extract-address-line-1")).toHaveValue("Ulmenweg 8");
  await expect(page.getByTestId("input-doc-extract-postal-code")).toHaveValue("989610");
  await expect(page.getByTestId("input-doc-extract-city")).toHaveValue("Sömmerda");
  await expect(page.getByTestId("input-doc-extract-country")).toHaveValue("Deutschland");

  await page.getByTestId("button-project-doc-extract-next").click();
  await expect(page.getByTestId("document-extraction-report-issues")).toContainText("PLZ");
  await expect(page.getByTestId("document-extraction-report-issues")).toContainText("989610");
  await expect(page.getByTestId("document-extraction-report-issues")).toContainText("Artikelliste");

  const noteCheckbox = page.getByTestId("checkbox-doc-extract-create-reklamation-note");
  if (await noteCheckbox.isVisible().catch(() => false)) {
    const checked = await noteCheckbox.isChecked();
    if (checked) await noteCheckbox.click();
  }

  await page.getByTestId("button-project-doc-extract-next").click();
  const createCustomerResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/customers"
  ));
  await page.getByTestId("button-doc-extract-apply-data").click();
  const createCustomerResponse = await createCustomerResponsePromise;
  expect(createCustomerResponse.ok(), await createCustomerResponse.text()).toBeTruthy();
  const createdCustomer = await createCustomerResponse.json() as {
    customerNumber: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    addressLine1: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
  };

  expect(createdCustomer).toMatchObject({
    customerNumber: "160521",
    firstName: "Swen",
    lastName: "Wischnowsky",
    phone: "0172-7940641",
    addressLine1: "Ulmenweg 8",
    postalCode: "989610",
    city: "Sömmerda",
    country: "Deutschland",
  });
  await expect(page.getByTestId("document-extraction-overlay")).toHaveCount(0);
  await expect(page.getByTestId("badge-customer")).toContainText("160521");

  await expect.poll(async () => {
    const result = await readCustomerByNumber(page, "160521");
    return result.customer;
  }).toMatchObject({
    customerNumber: "160521",
    firstName: "Swen",
    lastName: "Wischnowsky",
    phone: "0172-7940641",
    addressLine1: "Ulmenweg 8",
    postalCode: "989610",
    city: "Sömmerda",
    country: "Deutschland",
  });
});

test("opens the prepared Reklamation note editor after accepting a missing article list from Doc Extract", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-DOC-REKLAMATION-NOTE");

  await mockProjectDocumentExtraction(page, customer.customerNumber, {
    saunaModel: "FT24 Reklamation ohne Artikelliste",
    orderNumber: "FT24-DOC-REKLAMATION-NOTE-001",
    articleItems: [],
    categorizedItems: [],
    articleListHtml: "",
    fieldReport: {
      recognized: [
        { key: "customerNumber", label: "Kundennummer", section: "customer", value: customer.customerNumber },
        { key: "orderNumber", label: "Auftragsnummer", section: "project", value: "FT24-DOC-REKLAMATION-NOTE-001" },
      ],
      missing: [],
      issues: [
        {
          key: "articleListMissing",
          label: "Artikelliste",
          section: "project",
          severity: "warning",
          reason: "Es konnte keine Artikelliste erkannt werden.",
        },
      ],
    },
  });

  await openNewProject(page);
  await uploadExtractionPdf(page, "ft24-doc-reklamation-note.pdf");
  await completeProjectDocumentExtractionWorkflow(page, { acceptReklamation: true });

  await expect(page.getByTestId("document-extraction-overlay")).toHaveCount(0);
  const noteDialog = page.getByRole("dialog", { name: "Notiz anlegen" });
  await expect(noteDialog.getByTestId("input-note-title")).toHaveValue(MANAGED_COMPLAINT_TAG_NAME);
  await expect(noteDialog.getByTestId("select-note-template")).toContainText(MANAGED_COMPLAINT_TAG_NAME);
  await noteDialog.getByTestId("button-cancel-note").click();
});

test("sets the Anmerkungen tag when an existing project is saved with a newly added description", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-PROJECT-REMARKS-EDIT");
  const project = await createProjectFixture({
    prefix: "FT06-PROJECT-REMARKS-EDIT",
    customerId: customer.id,
    name: "FT06 Edit Beschreibung",
    orderNumber: "FT06-PROJECT-REMARKS-EDIT-001",
    descriptionMd: null,
  });

  await openProjectById(page, project.id, "noAppointments");
  await page.getByRole("tab", { name: "Anmerkungen" }).click();
  await page.getByTestId("richtext-editor").fill("Nachtraeglich gepflegte Projektbeschreibung");

  const updateProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PATCH"
    && new URL(response.url()).pathname === `/api/projects/${project.id}`
  ));
  await page.getByTestId("button-save-project").click();
  const updateProjectResponse = await updateProjectResponsePromise;
  expect(updateProjectResponse.ok(), await updateProjectResponse.text()).toBeTruthy();

  await expect.poll(async () => {
    return readProjectTagNames(page, project.id);
  }).toEqual(expect.arrayContaining(["Anmerkungen"]));
});

test("keeps article dropdown selections stable in create mode after document extraction", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-PROJECT-EXTRACT-SELECT");
  const saunaProduct = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "FT24 Create Dropdown Sauna",
  });

  await mockProjectDocumentExtraction(page, customer.customerNumber, {
    saunaModel: saunaProduct.name,
    orderNumber: "FT24-PROJECT-SELECT-001",
  });

  await openNewProject(page);
  await uploadExtractionPdf(page, "ft24-project-create-selection.pdf");

  await completeProjectDocumentExtractionWorkflow(page);
  await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);

  await page.getByRole("tab", { name: "Artikelliste" }).click();
  await expect(page.getByTestId("project-product-fields")).toBeVisible();
  await expect(page.getByTestId("select-project-product-saunaModel")).toHaveValue("");
  await page.getByTestId("select-project-product-saunaModel").selectOption(String(saunaProduct.id));
  await expect(page.getByTestId("select-project-product-saunaModel")).toHaveValue(String(saunaProduct.id));

  await page.getByRole("tab", { name: "Anmerkungen" }).click();
  await page.getByRole("tab", { name: "Artikelliste" }).click();
  await expect(page.getByTestId("select-project-product-saunaModel")).toHaveValue(String(saunaProduct.id));
});

test("links recognized customer data from project extraction and keeps partial issues visible", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-PROJECT-PARTIAL");

  await mockProjectDocumentExtraction(page, customer.customerNumber, {
    saunaModel: "FT24 Partieller Auftrag",
    orderNumber: "FT24-PROJECT-PARTIAL-001",
    customer: {
      firstName: "Tom",
      lastName: "Voosen",
      addressLine1: null,
      postalCode: "7419",
      city: "Brouch",
    },
    fieldReport: {
      recognized: [
        { key: "customerNumber", label: "Kundennummer", section: "customer", value: customer.customerNumber },
        { key: "postalCode", label: "PLZ", section: "customer", value: "7419" },
        { key: "orderNumber", label: "Auftragsnummer", section: "project", value: "FT24-PROJECT-PARTIAL-001" },
      ],
      missing: [
        { key: "addressLine1", label: "Strasse", section: "customer", reason: "Keine Strassenzeile erkannt." },
      ],
    },
    warnings: [
      "Kundendaten konnten nur teilweise erkannt werden. Projektdaten koennen trotzdem uebernommen werden.",
    ],
  });

  await openNewProject(page);
  await uploadExtractionPdf(page, "ft24-project-partial-customer.pdf");

  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await page.getByTestId("button-project-doc-extract-next").click();
  await expect(page.getByTestId("button-doc-extract-resolve-customer")).toHaveCount(0);
  await expect(page.getByTestId("doc-extract-customer-resolution-single")).toContainText(customer.customerNumber);
  await page.getByTestId("button-project-doc-extract-next").click();
  await expect(page.getByText("Kundendaten konnten nur teilweise erkannt werden. Projektdaten koennen trotzdem uebernommen werden.")).toBeVisible();
  await expect(page.getByText("Keine Strassenzeile erkannt.")).toBeVisible();
  await page.getByTestId("button-project-doc-extract-next").click();
  await page.getByTestId("button-doc-extract-apply-data").click();

  await expect(page.getByTestId("document-extraction-overlay")).toHaveCount(0);
  await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);
  await expect(page.getByTestId("input-project-name")).toHaveValue("FT24 Partieller Auftrag");
  await expect(page.getByTestId("input-project-order-number")).toHaveValue("FT24-PROJECT-PARTIAL-001");
  await page.getByTestId("button-save-project").click();
  await expect(page.getByText("Kunde muss ausgewählt werden", { exact: true })).toHaveCount(0);
});

test("opens an existing project in edit mode for duplicate order numbers and keeps the overlay path stable", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-PROJECT-DUPLICATE");
  const existingProject = await createProjectFixture({
    prefix: "FT24-PROJECT-DUPLICATE",
    customerId: customer.id,
    name: "FT24 Bestehendes Projekt",
    orderNumber: "FT24-PROJECT-DUP-001",
  });
  const tour = await createTourFixture("#1188aa");
  await createAppointmentFixture({
    projectId: existingProject.id,
    customerId: customer.id,
    startDate: "2099-05-03",
    startTime: "14:00:00",
    tourId: tour.id,
  });
  const extractionFileName = "ft24-project-duplicate-existing.pdf";

  await mockProjectDocumentExtraction(page, customer.customerNumber, {
    saunaModel: "FT24 Duplikat aus PDF",
    orderNumber: existingProject.orderNumber ?? "FT24-PROJECT-DUP-001",
  });

  await openNewProject(page);
  await uploadExtractionPdf(page, extractionFileName);

  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await completeProjectDocumentExtractionWorkflow(page);
  await expect(page.getByTestId("project-duplicate-resolution-dialog")).toBeVisible();
  await expect(page.getByTestId("project-duplicate-resolution-latest-appointment")).toContainText("14:00 - 03.05.99");
  await expect(page.getByTestId("project-duplicate-resolution-latest-appointment")).toContainText(tour.name);
  await page.getByTestId("button-project-duplicate-confirm").click();

  await expect(page.getByTestId("document-extraction-overlay")).toHaveCount(0);
  await expect(page.getByTestId("button-save-project")).toBeVisible();
  await expect(page.getByText("Projekt bearbeiten")).toBeVisible();
  await expect(page.getByTestId("project-form-sidebar").getByText(extractionFileName)).toBeVisible();

  const updateProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PATCH"
    && new URL(response.url()).pathname === `/api/projects/${existingProject.id}`
  ));
  await page.getByTestId("button-save-project").click();
  const updateProjectResponse = await updateProjectResponsePromise;
  expect(updateProjectResponse.ok(), await updateProjectResponse.text()).toBeTruthy();
  await expect(page.getByTestId("button-save-project")).toHaveCount(0);

  await openProjectById(page, existingProject.id, "all");
  await expect(page.getByTestId("project-form-sidebar").getByText(extractionFileName)).toBeVisible();
});

test("keeps the extraction overlay open when a duplicate project without appointments is canceled", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-PROJECT-DUPLICATE-CANCEL");
  const existingProject = await createProjectFixture({
    prefix: "FT24-PROJECT-DUPLICATE-CANCEL",
    customerId: customer.id,
    name: "FT24 Projekt ohne Termin",
    orderNumber: "FT24-PROJECT-DUP-CANCEL-001",
  });

  await mockProjectDocumentExtraction(page, customer.customerNumber, {
    saunaModel: "FT24 Duplikat Abbruch",
    orderNumber: existingProject.orderNumber ?? "FT24-PROJECT-DUP-CANCEL-001",
  });

  await openNewProject(page);
  await uploadExtractionPdf(page, "ft24-project-duplicate-cancel.pdf");

  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await completeProjectDocumentExtractionWorkflow(page);
  await expect(page.getByTestId("project-duplicate-resolution-dialog")).toBeVisible();
  await expect(page.getByTestId("project-duplicate-resolution-no-appointment")).toContainText("noch keine Terminplanung");
  await page.getByTestId("button-project-duplicate-cancel").click();

  await expect(page.getByTestId("project-duplicate-resolution-dialog")).toHaveCount(0);
  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await expect(page.getByText("Projekt bearbeiten")).toHaveCount(0);
  await expect(page.getByTestId("button-save-project")).toBeVisible();
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

test("keeps unsaved project edit values after selecting a tag in edit mode", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT02-PROJECT-TAG-EDIT",
    name: "FT02 Tag Edit Projekt",
    orderNumber: "FT02-TAG-001",
  });
  const tag = await createTagFixture("FT02-EDIT-TAG-PERSIST");
  const editedName = "FT02 Tag Edit Projekt geändert";
  const editedAmount = "98765.43";
  const editedPlannedWeek = "KW 52";

  await openProjectById(page, project.id, "noAppointments");

  await page.getByTestId("input-project-name").fill(editedName);
  await page.getByTestId("input-project-amount").fill(editedAmount);
  await page.getByTestId("input-project-planned-week").fill(editedPlannedWeek);

  await page.getByTestId("project-tag-picker-button-add").click();
  await page.getByTestId(`project-tag-picker-add-tag-${tag.id}-add`).click();
  await expect(page.getByTestId(`project-tag-picker-tag-${tag.id}`)).toBeVisible();

  await expect(page.getByTestId("input-project-name")).toHaveValue(editedName);
  await expect(page.getByTestId("input-project-amount")).toHaveValue(editedAmount);
  await expect(page.getByTestId("input-project-planned-week")).toHaveValue(editedPlannedWeek);
});
