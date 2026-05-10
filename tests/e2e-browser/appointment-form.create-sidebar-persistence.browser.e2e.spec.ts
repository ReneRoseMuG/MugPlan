/**
 * Test Scope:
 *
 * Feature: FT01/FT04/FT13/FT24 - Neuer Termin mit Create/Edit-Workflow
 *
 * Abgedeckte Regeln:
 * - Ein neuer Eintagestermin kann im Browser aus dem Tour-Kontext mit Projekt-, Kunden- und Tourrelation angelegt werden.
 * - Das Terminformular rendert in Create und Edit innerhalb der EntityFormShell mit sichtbarer Sidebar.
 * - Die rechte Formular-Sidebar behaelt in Termin- und Projekt-Overlay-Formularen einen gedockten Footer mit eigenem Scroll-Abstand.
 * - Nach Save zeigt der Wochenkalender die stabil sichtbaren Projekt-, Kunden- und Tourwerte des angelegten Termins.
 * - Beim erneuten Oeffnen bleiben Startdatum, Projekt, Kunde und Tour im Edit-Formular korrekt geladen.
 * - Eine gesetzte Tour weist keine Mitarbeiter automatisch zu; die Mitarbeiterliste bleibt leer, bis Nutzer aktiv zuweisen.
 * - Der Create-Save auf `Tour Messe` oeffnet den FT06-Notizvorschlag und kann daraus eine Vorlagen-Notiz anlegen.
 * - Tags, Notizen und Terminanhaenge lassen sich im Neuer-Termin-Formular vor dem ersten Save bedienen.
 * - Nach dem ersten Save werden Tag, Notiz und Terminanhang dem erzeugten Termin korrekt zugeordnet.
 * - Eine aus der Dokumentextraktion uebernommene Datei wandert nach erfolgreicher Projektanlage in die Projektdokumente und nicht zusaetzlich in Terminanhaenge.
 * - Speichert das Overlay-Projekt eine sichtbare Beschreibung, traegt der Projekt-Save still das Tag `Anmerkungen` nach.
 * - Nach Save des neu angelegten Overlay-Projekts zeigt der Projektslot im Terminformular die persistierte Artikelliste statt des Fallbacktexts.
 * - Beim Abbrechen des aus der Dokumentextraktion geoeffneten Projektformulars bleibt die Datei als Termin-Draft sichtbar.
 * - Beim erneuten Oeffnen im Edit-Modus stehen dieselben Daten wieder in der Sidebar zur Verfuegung.
 * - Ungespeicherte Edit-Werte im Terminformular bleiben trotz Tag-Mutation im Sidebar-Picker erhalten.
 *
 * Fehlerfaelle:
 * - Die Create/Edit-Shell verliert Header-, Main-, Sidebar- oder Footer-Bereich.
 * - Ein aus der Tour-Lane gestarteter Termin verliert vor oder nach dem Save Projekt-, Kunden- oder Tour-Relationen.
 * - Das Formular weist durch eine gesetzte Tour unerwartet Mitarbeiter automatisch zu.
 * - Der Save auf `Tour Messe` setzt zwar das Tag, loest aber keinen Notizvorschlag aus.
 * - Draft-Tags, Draft-Notizen oder pending Terminanhaenge gehen beim ersten Save verloren.
 * - Die Overlay-Projektbeschreibung bleibt ohne das erwartete Projekt-Tag `Anmerkungen`.
 * - Der Projektslot faellt nach dem Overlay-Rueckweg auf `nicht hinterlegt` zurueck, obwohl Order-Items gespeichert wurden.
 * - Das Edit-Formular setzt lokales Startdatum oder Startzeit nach Tag-Auswahl wieder auf den Serverstand zurueck.
 *
 * Ziel:
 * Browser-E2E fuer den realen Create/Edit-Flow eines relationierten Eintagestermins, den Projekt-Overlay-Rueckweg inklusive stiller `Anmerkungen`-Regel und die Persistenz der Create-Sidebar-Daten bis zum Reopen absichern.
 */
import { Buffer } from "node:buffer";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../server/db";
import { MANAGED_COMPLAINT_TAG_NAME, MANAGED_MESSE_TAG_NAME } from "../../shared/appointmentCancellation";
import { tags, tours } from "../../shared/schema";
import {
  createAppointmentFixture,
  createAppointmentBrowserFixture,
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

type AppointmentBrowserFixture = Awaited<ReturnType<typeof createAppointmentBrowserFixture>>;

async function openNewAppointmentFromTourLane(page: Page, tourId: number, targetDate: string) {
  await loginAsAdmin(page);
  const button = page.getByTestId(`button-new-appointment-week-${targetDate}-lane-tour-${tourId}`);
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function openNewAppointmentFromWeek(page: Page) {
  await loginAsAdmin(page);
  const button = page.locator('[data-testid^="button-new-appointment-week-"]').first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function openCustomerPickerAndSelect(page: Page, customerNumber: string) {
  await page.getByTestId("slot-customer-relation-action-add").click();
  await expect(page.getByTestId("table-customers")).toBeVisible();
  await page.locator("#customer-filter-last-name").fill(customerNumber.slice(-12));
  await page.getByTestId("table-customers").locator("tr").filter({ hasText: customerNumber }).first().dblclick();
}

async function createNoteViaDialog(page: Page, input: { title: string; body: string }) {
  await page.getByTestId("button-new-note").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("input-note-title").fill(input.title);
  await dialog.getByTestId("richtext-editor").fill(input.body);
  await dialog.getByTestId("button-save-note").click();
}

async function readAppointmentNotes(page: Page, appointmentId: number): Promise<Array<{ title: string }>> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/notes`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Array<{ title: string }>>;
}

async function readAppointmentTagNames(page: Page, appointmentId: number): Promise<string[]> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/tags`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Array<{ tag: { name: string } }>;
  return body.map((item) => item.tag.name);
}

async function mockAppointmentDocumentExtraction(page: Page, customerNumber: string, options?: {
  saunaModel?: string;
  orderNumber?: string;
  amount?: string;
}) {
  await page.route("**/api/document-extraction/extract?scope=appointment_form", async (route) => {
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
        orderNumber: options?.orderNumber ?? `AO-${customerNumber}`,
        amount: options?.amount ?? "14700.00",
        saunaModel: options?.saunaModel ?? `Doc Projekt ${customerNumber}`,
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

async function assertAppointmentFormShell(page: Page) {
  const shell = page.getByTestId("entity-form-shell");
  await expect(shell).toBeVisible();
  await expect(shell.getByTestId("entity-form-shell-header")).toBeVisible();
  await expect(shell.getByTestId("entity-form-shell-middle")).toBeVisible();
  await expect(shell.getByTestId("entity-form-shell-main")).toBeVisible();
  await expect(shell.getByTestId("entity-form-shell-main-inner")).toBeVisible();
  await expect(shell.getByTestId("entity-form-shell-sidebar")).toBeVisible();
  await expect(shell.getByTestId("entity-form-shell-sidebar-scroll")).toBeVisible();
  await expect(shell.getByTestId("entity-form-shell-footer")).toBeVisible();
  await expectDockedEntityFormSidebarFooter(shell);
}

async function expectDockedEntityFormSidebarFooter(shell: Locator) {
  const footerLayout = await shell.getByTestId("entity-form-shell-footer").evaluate((footer) => {
    if (!(footer instanceof HTMLElement)) return null;
    const sidebar = footer.closest('[data-testid="entity-form-shell-sidebar"]');
    const sidebarScroll = sidebar?.querySelector('[data-testid="entity-form-shell-sidebar-scroll"]');
    if (!(sidebar instanceof HTMLElement) || !(sidebarScroll instanceof HTMLElement)) return null;

    const footerRect = footer.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const sidebarScrollStyle = window.getComputedStyle(sidebarScroll);

    return {
      footerBottom: Math.round(footerRect.bottom),
      sidebarBottom: Math.round(sidebarRect.bottom),
      footerHeight: Math.round(footerRect.height),
      viewportHeight: window.innerHeight,
      overflowY: sidebarScrollStyle.overflowY,
      paddingBottom: Math.round(Number.parseFloat(sidebarScrollStyle.paddingBottom || "0")),
    };
  });

  expect(footerLayout).not.toBeNull();
  expect(footerLayout?.overflowY).toBe("auto");
  expect(Math.abs((footerLayout?.sidebarBottom ?? 0) - (footerLayout?.footerBottom ?? 0))).toBeLessThanOrEqual(2);
  expect(footerLayout?.footerBottom ?? 0).toBeLessThanOrEqual((footerLayout?.viewportHeight ?? 0) + 1);
  expect(footerLayout?.paddingBottom ?? 0).toBeGreaterThanOrEqual((footerLayout?.footerHeight ?? 0) - 2);
}

async function assertAppointmentSidebar(page: Page) {
  await expect(page.getByTestId("appointment-form-sidebar")).toBeVisible();
  await expect(page.getByTestId("button-add-document-header")).toBeVisible();
  await expect(page.getByTestId("appointment-tag-picker-button-add")).toBeVisible();
  await expect(page.getByTestId("button-new-note")).toBeVisible();
  await expect(page.getByTestId("appointment-form-sidebar")).toContainText("Dokumente");
  await expect(page.getByTestId("appointment-form-sidebar")).toContainText("Tags");
  await expect(page.getByTestId("appointment-form-sidebar")).toContainText("Notizen");
}

async function assertAppointmentFormLoaded(page: Page, fixture: AppointmentBrowserFixture, params: {
  startDate: string;
  endDate?: string;
  relationsLoaded?: boolean;
}) {
  await assertAppointmentFormShell(page);
  await assertAppointmentSidebar(page);
  await expect(page.getByTestId("input-start-date")).toHaveValue(params.startDate);
  if (params.endDate) {
    await expect(page.getByTestId("input-end-date")).toHaveValue(params.endDate);
  } else {
    await expect(page.getByTestId("button-enable-end-date")).toBeVisible();
  }
  await expect(page.getByTestId("slot-project-relation")).toBeVisible();
  await expect(page.getByTestId("slot-customer-relation")).toBeVisible();
  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.getByTestId("badge-tour-remove")).toBeVisible();
  await expect(page.locator('[data-testid="section-tour-picker"]')).toHaveCount(0);
  await expect(page.getByTestId("slot-appointment-employees")).toBeVisible();
  await expect(page.getByTestId("button-add-employee")).toBeVisible();
  await expect(page.getByText("Keine Mitarbeiter zugewiesen")).toBeVisible();
  for (const employee of fixture.employees) {
    await expect(page.getByTestId(`badge-employee-${employee.id}`)).toHaveCount(0);
  }
  if (params.relationsLoaded === false) {
    await expect(page.getByTestId("slot-project-relation")).toContainText("Kein Projekt ausgewählt");
    await expect(page.getByTestId("slot-customer-relation")).toContainText("Kein Kunde ausgewählt");
    await expect(page.getByTestId("badge-project")).toHaveCount(0);
    await expect(page.getByTestId("badge-customer")).toHaveCount(0);
    return;
  }
  await expect(page.getByTestId("badge-project")).toBeVisible();
  await expect(page.getByTestId("badge-project-name")).toContainText(fixture.project.name);
  await expect(page.getByTestId("badge-project-order-number")).toContainText(fixture.project.orderNumber ?? "");
  await expect(page.getByTestId("badge-customer-number")).toContainText(fixture.customer.customerNumber.slice(0, 10));
  await expect(page.getByTestId("badge-customer-first-name")).toContainText(fixture.customer.firstName ?? "");
  await expect(page.getByTestId("badge-customer-last-name")).toContainText(fixture.customer.lastName ?? "");
  await expect(page.getByTestId("badge-customer-postal-code")).toContainText(fixture.customer.postalCode ?? "");
  await expect(page.getByTestId("badge-customer-city")).toContainText(fixture.customer.city ?? "");
}

async function selectProjectWithoutAppointments(page: Page, fixture: AppointmentBrowserFixture) {
  await page.getByTestId("button-select-project").click();
  const table = page.getByTestId("table-projects");
  await expect(table).toBeVisible();
  await expect(page.getByTestId("toggle-project-scope-all")).toHaveAttribute("data-state", "on");
  await page.locator("#project-filter-order-number").fill(fixture.project.orderNumber ?? "");
  await page.locator("#project-filter-title").fill(fixture.project.name);
  const row = table.locator("tbody tr")
    .filter({ hasText: fixture.project.orderNumber ?? "" })
    .filter({ hasText: fixture.project.name })
    .filter({ hasText: fixture.customer.customerNumber })
    .first();
  await expect(row).toBeVisible();
  await row.dblclick();
  await expect(page.getByTestId("badge-project")).toBeVisible();
}

async function saveNewAppointmentAndResolveId(page: Page) {
  const createAppointmentResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/appointments"
  ));
  await page.getByTestId("button-save-appointment").click();
  const confirmSaveButton = page.getByRole("button", { name: "Trotzdem speichern" });
  if (await confirmSaveButton.isVisible().catch(() => false)) {
    await confirmSaveButton.click();
  }
  const response = await createAppointmentResponsePromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { id: number };
  expect(Number(body.id)).toBeGreaterThan(0);
  return Number(body.id);
}

async function renameTourToMesse(tourId: number) {
  await db
    .update(tours)
    .set({ name: "Tour Messe" })
    .where(eq(tours.id, tourId));
}

async function readSystemTagIdByName(name: string): Promise<number> {
  const [tag] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);
  expect(tag?.id).toBeTruthy();
  return tag!.id;
}

test("creates a relation-complete single-day appointment from a tour lane and reloads the same values in edit mode", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "FT01-CREATE-EDIT", targetDayOffset: 2 });

  await openNewAppointmentFromTourLane(page, fixture.tour.id, fixture.targetDate);
  await assertAppointmentFormLoaded(page, fixture, { startDate: fixture.targetDate, relationsLoaded: false });

  await selectProjectWithoutAppointments(page, fixture);
  await assertAppointmentFormLoaded(page, fixture, { startDate: fixture.targetDate });

  const createdAppointmentId = await saveNewAppointmentAndResolveId(page);

  const appointmentPanel = page.getByTestId(`week-appointment-panel-${createdAppointmentId}`);
  await expect(appointmentPanel).toBeVisible();
  await expect(appointmentPanel.getByTestId("week-project-header")).toContainText(fixture.project.orderNumber ?? "");
  await expect(appointmentPanel.getByTestId("week-project-header")).toContainText(fixture.project.name);
  await expect(appointmentPanel).toContainText(fixture.customer.fullName ?? "");
  await expect(appointmentPanel).toContainText(`K: ${fixture.customer.customerNumber}`);
  await expect(appointmentPanel).toContainText(`PLZ: ${fixture.customer.postalCode}`);
  await expect(appointmentPanel.getByText("Keine MA")).toBeVisible();

  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await assertAppointmentFormLoaded(page, fixture, { startDate: fixture.targetDate });
});

test("creates a new appointment on Tour Messe, persists the managed Messe tag and follows the note suggestion", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "FT06-CREATE-MESSE", targetDayOffset: 3 });
  await renameTourToMesse(fixture.tour.id);
  const messeTagId = await readSystemTagIdByName(MANAGED_MESSE_TAG_NAME);

  await openNewAppointmentFromTourLane(page, fixture.tour.id, fixture.targetDate);
  await selectProjectWithoutAppointments(page, fixture);

  const createdAppointmentId = await saveNewAppointmentAndResolveId(page);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_MESSE_TAG_NAME);
  await page.getByTestId("button-cancel-note").click();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${createdAppointmentId}/tags`);
    if (!response.ok()) return false;
    const body = await response.json() as Array<{ tag: { name: string } }>;
    return body.some((item) => item.tag.name === MANAGED_MESSE_TAG_NAME);
  }).toBe(true);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, createdAppointmentId);
    return notes.some((note) => note.title === MANAGED_MESSE_TAG_NAME);
  }).toBe(true);

  await page.getByTestId(`week-appointment-panel-${createdAppointmentId}`).dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId(`appointment-tag-picker-tag-${messeTagId}`)).toBeVisible();
});

test("persists Reklamation workflow from the new appointment form with a template note draft", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "FT01-CREATE-REKLAMATION", targetDayOffset: 4 });

  await openNewAppointmentFromTourLane(page, fixture.tour.id, fixture.targetDate);
  await selectProjectWithoutAppointments(page, fixture);
  await expect(page.getByTestId("appointment-form-functions-panel")).toBeVisible();
  await expect(page.getByTestId("button-set-appointment-reklamation")).toBeVisible();

  await page.getByTestId("button-set-appointment-reklamation").click();
  await expect(page.getByTestId("button-remove-appointment-reklamation")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_COMPLAINT_TAG_NAME);

  await page.getByTestId("button-save-note").click();
  await expect(page.getByTestId("input-note-title")).toHaveCount(0);
  await expect(
    page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: MANAGED_COMPLAINT_TAG_NAME }).first(),
  ).toBeVisible();

  const createdAppointmentId = await saveNewAppointmentAndResolveId(page);

  await expect.poll(async () => readAppointmentTagNames(page, createdAppointmentId)).toContain(MANAGED_COMPLAINT_TAG_NAME);
  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, createdAppointmentId);
    return notes.map((note) => note.title);
  }).toContain(MANAGED_COMPLAINT_TAG_NAME);
});

test("does not reopen the Reklamation note suggestion on new appointment save after skip", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "FT01-CREATE-REKLAMATION-SKIP", targetDayOffset: 5 });

  await openNewAppointmentFromTourLane(page, fixture.tour.id, fixture.targetDate);
  await selectProjectWithoutAppointments(page, fixture);
  await expect(page.getByTestId("button-set-appointment-reklamation")).toBeVisible();

  await page.getByTestId("button-set-appointment-reklamation").click();
  await expect(page.getByTestId("button-remove-appointment-reklamation")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-skip").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  const createdAppointmentId = await saveNewAppointmentAndResolveId(page);
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await expect.poll(async () => readAppointmentTagNames(page, createdAppointmentId)).toContain(MANAGED_COMPLAINT_TAG_NAME);
  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, createdAppointmentId);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);
});

test("persists tag, note and appointment attachment from the new appointment form and restores them on reopen", async ({ page }) => {
  const customer = await createCustomerFixture("FT01-CREATE-SIDEBAR");
  const tag = await createTagFixture("FT01-CREATE-TAG");
  const note = {
    title: "Create Sidebar Notiz",
    body: "Notiz aus dem Neuer-Termin-Formular",
  };
  const attachmentName = "create-sidebar-attachment.txt";

  await openNewAppointmentFromWeek(page);
  await openCustomerPickerAndSelect(page, customer.customerNumber);

  await expect(page.getByTestId("appointment-form-sidebar")).toBeVisible();
  await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);

  await page.getByTestId("appointment-tag-picker-button-add").click();
  await page.getByTestId(`appointment-tag-picker-add-tag-${tag.id}-add`).click();
  await expect(page.getByTestId(`appointment-tag-picker-tag-${tag.id}`)).toBeVisible();

  await createNoteViaDialog(page, note);
  await expect(
    page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first(),
  ).toBeVisible();

  const fileInput = page.locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: attachmentName,
    mimeType: "text/plain",
    buffer: Buffer.from("terminanhang aus create sidebar", "utf8"),
  });
  await expect(page.getByTestId("appointment-form-sidebar").getByText(attachmentName)).toBeVisible();

  await page.getByTestId("button-save-appointment").click();
  const confirmSaveButton = page.getByRole("button", { name: "Trotzdem speichern" });
  if (await confirmSaveButton.isVisible().catch(() => false)) {
    await confirmSaveButton.click();
  }

  await expect.poll(async () => {
    const response = await page.request.get(`/api/customers/${customer.id}/appointments?scope=all`);
    if (!response.ok()) return 0;
    const body = await response.json();
    return Array.isArray(body) ? body.length : 0;
  }).toBe(1);

  const appointmentsResponse = await page.request.get(`/api/customers/${customer.id}/appointments?scope=all`);
  const appointments = await appointmentsResponse.json();
  const createdAppointmentId = Number(appointments[0]?.id);
  expect(createdAppointmentId).toBeGreaterThan(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${createdAppointmentId}/tags`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { tag: { id: number } }) => item.tag.id);
  }).toEqual(expect.arrayContaining([tag.id]));

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${createdAppointmentId}/notes`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { title: string }) => item.title);
  }).toEqual(expect.arrayContaining([note.title]));

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${createdAppointmentId}/attachment-context`);
    if (!response.ok()) return [];
    const body = await response.json();
    return Array.isArray(body?.appointmentAttachments)
      ? body.appointmentAttachments.map((item: { originalName: string }) => item.originalName)
      : [];
  }).toEqual(expect.arrayContaining([attachmentName]));

  await page.getByTestId("nav-wochenuebersicht").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${createdAppointmentId}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();

  await expect(page.getByTestId(`appointment-tag-picker-tag-${tag.id}`)).toBeVisible();
  await expect(
    page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first(),
  ).toBeVisible();
  await expect(page.getByTestId("appointment-form-sidebar").getByText(attachmentName)).toBeVisible();
});

test("shows an extracted document only as project attachment after successful project save", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-EXTRACT-SAVE");
  const saunaProduct = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "FT24 Overlay Rueckweg Sauna",
  });
  const extractionFileName = "ft24-extract-project-only.pdf";

  await mockAppointmentDocumentExtraction(page, customer.customerNumber, {
    saunaModel: "FT24 Projekt Save",
    orderNumber: "AO-FT24-SAVE",
  });

  await openNewAppointmentFromWeek(page);
  await uploadExtractionPdf(page, extractionFileName);

  await expect(page.getByTestId("button-doc-extract-apply-data")).toBeVisible();
  await page.getByTestId("button-doc-extract-apply-data").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
  await page.getByRole("tab", { name: "Anmerkungen" }).click();
  await page.getByTestId("project-description-editor-panel").getByTestId("richtext-editor").fill("Extrahierte Projektbeschreibung fuer den Overlay-Save");
  await page.getByRole("tab", { name: "Artikelliste" }).click();
  await page.getByTestId("select-project-product-saunaModel").selectOption(String(saunaProduct.id));

  const createdProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/projects"
  ));
  await page.getByTestId("button-save-project").click();
  await expect(page.getByTestId("dialog-project-save-review")).toBeVisible();
  while (await page.getByTestId("button-project-save-review-next").isVisible().catch(() => false)) {
    const adoptCheckbox = page.getByTestId("checkbox-project-save-review-adopt-sauna-title");
    if (await adoptCheckbox.isVisible().catch(() => false) && await adoptCheckbox.isChecked()) {
      await adoptCheckbox.uncheck();
    }
    await page.getByTestId("button-project-save-review-next").click();
  }
  const adoptCheckbox = page.getByTestId("checkbox-project-save-review-adopt-sauna-title");
  if (await adoptCheckbox.isVisible().catch(() => false) && await adoptCheckbox.isChecked()) {
    await adoptCheckbox.uncheck();
  }
  await page.getByTestId("button-project-save-review-confirm").click();
  const createdProjectResponse = await createdProjectResponsePromise;
  expect(createdProjectResponse.ok(), await createdProjectResponse.text()).toBeTruthy();
  const createdProject = (await createdProjectResponse.json()) as { id: number };
  const createdProjectId = Number(createdProject.id);
  expect(createdProjectId).toBeGreaterThan(0);
  await expect(page.getByTestId("button-save-project")).toHaveCount(0);
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(
    page.getByTestId("appointment-form-sidebar").getByText(extractionFileName, { exact: true }),
  ).toHaveCount(1);
  await expect(page.getByTestId("badge-project-project-content-articles")).toContainText("Sauna");
  await expect(page.getByTestId("badge-project-project-content-articles")).toContainText(saunaProduct.name);
  await expect(page.getByTestId("badge-project-description")).not.toContainText("nicht hinterlegt");
  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${createdProjectId}/tags`);
    if (!response.ok()) return [];
    const body = await response.json();
    return body.map((item: { tag: { name: string } }) => item.tag.name);
  }).toEqual(expect.arrayContaining(["Anmerkungen"]));

  const createdAppointmentId = await saveNewAppointmentAndResolveId(page);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/customers/${customer.id}/appointments?scope=all`);
    if (!response.ok()) return [];
    const body = await response.json();
    return Array.isArray(body) ? body.map((item: { id: number }) => item.id) : [];
  }).toEqual(expect.arrayContaining([createdAppointmentId]));

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${createdAppointmentId}/attachment-context`);
    if (!response.ok()) {
      return { project: [], appointment: [] };
    }
    const body = await response.json();
    return {
      project: Array.isArray(body?.projectAttachments)
        ? body.projectAttachments.map((item: { originalName: string }) => item.originalName)
        : [],
      appointment: Array.isArray(body?.appointmentAttachments)
        ? body.appointmentAttachments.map((item: { originalName: string }) => item.originalName)
        : [],
    };
  }).toEqual({
    project: expect.arrayContaining([extractionFileName]),
    appointment: [],
  });
});

test("keeps the extracted document as appointment draft when the project form is canceled", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-EXTRACT-CANCEL");
  const extractionFileName = "ft24-extract-cancel-keeps-draft.pdf";

  await mockAppointmentDocumentExtraction(page, customer.customerNumber, {
    saunaModel: "FT24 Projekt Cancel",
    orderNumber: "AO-FT24-CANCEL",
  });

  await openNewAppointmentFromWeek(page);
  await uploadExtractionPdf(page, extractionFileName);

  await expect(page.getByTestId("button-doc-extract-apply-data")).toBeVisible();
  await page.getByTestId("button-doc-extract-apply-data").click();
  await expect(page.getByTestId("button-save-project")).toBeVisible();

  await page.getByTestId("button-cancel-project").click();
  const discardProjectButton = page.getByRole("button", { name: "Verwerfen und schließen" });
  if (await discardProjectButton.isVisible().catch(() => false)) {
    await discardProjectButton.click();
  }
  await expect(page.getByTestId("button-save-project")).toHaveCount(0);
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("appointment-form-sidebar").getByText(extractionFileName)).toBeVisible();
});

test("opens an existing project overlay for duplicate order numbers and links it back to the appointment", async ({ page }) => {
  const customer = await createCustomerFixture("FT24-EXISTING-PROJECT");
  const existingProject = await createProjectFixture({
    prefix: "FT24-EXISTING-PROJECT",
    customerId: customer.id,
    name: "FT24 Bestehendes Terminprojekt",
    orderNumber: "AO-FT24-EXISTING-001",
  });
  const tour = await createTourFixture("#3377aa");
  await createAppointmentFixture({
    projectId: existingProject.id,
    customerId: customer.id,
    startDate: "2099-05-04",
    startTime: "09:00:00",
    tourId: tour.id,
  });
  const extractionFileName = "ft24-existing-project-overlay.pdf";

  await mockAppointmentDocumentExtraction(page, customer.customerNumber, {
    saunaModel: "FT24 Duplikat Terminprojekt",
    orderNumber: existingProject.orderNumber ?? "AO-FT24-EXISTING-001",
  });

  await openNewAppointmentFromWeek(page);
  await uploadExtractionPdf(page, extractionFileName);

  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.getByTestId("document-extraction-overlay")).toBeVisible();
  await page.getByTestId("button-doc-extract-apply-data").click();
  await expect(page.getByTestId("project-duplicate-resolution-dialog")).toBeVisible();
  await expect(page.getByTestId("project-duplicate-resolution-latest-appointment")).toContainText("09:00 - 04.05.99");
  await expect(page.getByTestId("project-duplicate-resolution-latest-appointment")).toContainText(tour.name);
  await page.getByTestId("button-project-duplicate-confirm").click();

  await expect(page.getByTestId("document-extraction-overlay")).toHaveCount(0);
  await expect(page.getByTestId("appointment-project-overlay")).toBeVisible();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
  await expect(page.getByText("Projekt bearbeiten")).toBeVisible();
  await expectDockedEntityFormSidebarFooter(
    page.getByTestId("appointment-project-overlay").getByTestId("entity-form-shell"),
  );

  const updateProjectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PATCH"
    && new URL(response.url()).pathname === `/api/projects/${existingProject.id}`
  ));
  await page.getByTestId("button-save-project").click();
  const updateProjectResponse = await updateProjectResponsePromise;
  expect(updateProjectResponse.ok(), await updateProjectResponse.text()).toBeTruthy();

  await expect(page.getByTestId("appointment-project-overlay")).toHaveCount(0);
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId("badge-project-name")).toContainText(existingProject.name);
  await expect(page.getByTestId("badge-project-order-number")).toContainText(existingProject.orderNumber ?? "");

  await page.getByTestId("button-save-appointment").click();
  const confirmSaveButton = page.getByRole("button", { name: "Trotzdem speichern" });
  if (await confirmSaveButton.isVisible().catch(() => false)) {
    await confirmSaveButton.click();
  }

  await expect.poll(async () => {
    const response = await page.request.get(`/api/customers/${customer.id}/appointments?scope=all`);
    if (!response.ok()) return 0;
    const body = await response.json();
    return Array.isArray(body) ? body.length : 0;
  }).toBe(1);

  const appointmentsResponse = await page.request.get(`/api/customers/${customer.id}/appointments?scope=all`);
  const appointments = await appointmentsResponse.json();
  const createdAppointmentId = Number(appointments[0]?.id);
  expect(createdAppointmentId).toBeGreaterThan(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${createdAppointmentId}/attachment-context`);
    if (!response.ok()) {
      return { project: [], appointment: [] };
    }
    const body = await response.json();
    return {
      project: Array.isArray(body?.projectAttachments)
        ? body.projectAttachments.map((item: { originalName: string }) => item.originalName)
        : [],
      appointment: Array.isArray(body?.appointmentAttachments)
        ? body.appointmentAttachments.map((item: { originalName: string }) => item.originalName)
        : [],
    };
  }).toEqual({
    project: expect.arrayContaining([extractionFileName]),
    appointment: [],
  });
});

test("keeps unsaved appointment edit values after selecting a tag in edit mode", async ({ page }) => {
  const fixture = await createAppointmentBrowserFixture({ prefix: "FT01-TAG-EDIT", targetDayOffset: 2, employeeCount: 1 });
  const appointment = await createAppointmentFixture({
    projectId: fixture.project.id,
    customerId: fixture.customer.id,
    startDate: fixture.targetDate,
    startTime: "08:00:00",
    tourId: fixture.tour.id,
  });
  const tag = await createTagFixture("FT01-EDIT-TAG-PERSIST");
  const editedStartDate = fixture.nextDate;
  const editedStartTime = "09:30";

  await loginAsAdmin(page);
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment!.id}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();

  await page.getByTestId("input-start-date").fill(editedStartDate);
  await page.getByTestId("input-start-time").fill(editedStartTime);

  await page.getByTestId("appointment-tag-picker-button-add").click();
  await page.getByTestId(`appointment-tag-picker-add-tag-${tag.id}-add`).click();
  await expect(page.getByTestId(`appointment-tag-picker-tag-${tag.id}`)).toBeVisible();

  await expect(page.getByTestId("input-start-date")).toHaveValue(editedStartDate);
  await expect(page.getByTestId("input-start-time")).toHaveValue(editedStartTime);
});
