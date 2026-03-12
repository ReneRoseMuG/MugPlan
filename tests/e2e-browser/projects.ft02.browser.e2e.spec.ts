/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projektanlage im Browser validiert Pflichtfelder und erzeugt nach Kundenauswahl einen neuen Datensatz.
 * - Projektliste schaltet stabil zwischen Grundmengen um und filtert innerhalb der gewaehlten Menge.
 * - Projektnotizen lassen sich im Browser anlegen und loeschen.
 * - Projektloeschung ist ohne Termine erfolgreich und mit Terminen fachlich blockiert.
 *
 * Fehlerfaelle:
 * - Speichern ohne Kunde oder Titel bleibt im Formular blockiert.
 * - Scope-Wechsel vermischt kommende Projekte und Projekte ohne Termine nicht.
 * - Loeschen eines Projekts mit Termin entfernt den Datensatz nicht.
 *
 * Ziel:
 * Eine reduzierte, belastbare FT02-Browser-Suite fuer die realen Projekt-Workflows des Ist-Stands absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createProjectFixture,
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
  await page.locator("tr").filter({ hasText: customerNumber }).first().dblclick();
}

async function openProjectById(page: Page, projectId: number) {
  await openProjects(page);
  await page.getByLabel("Alle Projekte").click();
  await page.getByTestId(`project-card-${projectId}`).dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
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
  await expect(page.getByText(/Kunde muss ausgew/)).toBeVisible();

  await openCustomerPickerAndSelect(page, customer.customerNumber);
  await expect(page.getByTestId("badge-customer")).toContainText(customer.customerNumber);

  await page.getByTestId("input-project-order-number").fill("FT02-ORD-001");
  await page.getByTestId("button-save-project").click();

  await expect(page.getByTestId("button-new-project")).toBeVisible();
  await page.getByLabel("Alle Projekte").click();
  await expect(page.getByTestId("list-projects")).toContainText("FT02 Browser Projekt");
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

  await page.getByPlaceholder("Suche: Projekttitel").fill("Kein Treffer");
  await expect(page.getByText("Keine Treffer gefunden.")).toBeVisible();
});

test("creates and deletes a project note in the edit form", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT02-BROWSER-NOTES",
    name: "FT02 Browser Notes Project",
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
  await page.getByLabel("Alle Projekte").click();
  await page.getByTestId(`project-card-${deletableProject.id}`).dblclick();
  await page.getByTestId("button-delete-project").click();
  await page.getByTestId("button-confirm-delete-project").click();

  await expect(page.getByTestId("button-new-project")).toBeVisible();
  await expect.poll(async () => {
    const response = await page.request.get(`/api/projects/${deletableProject.id}`);
    return response.status();
  }).toBe(404);
});
