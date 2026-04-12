/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Hinzufügen des Reklamation-Tags an einem gespeicherten Termin löst den Notiz-Vorschlag-Dialog aus.
 * - Der Notiz-Vorschlag-Dialog erstellt nach Bestätigung eine Notiz mit dem Template-Titel.
 * - Das Entfernen des Reklamation-Tags (wenn eine passende Notiz vorhanden ist) löst den Notiz-Entfernen-Dialog aus.
 * - Der Notiz-Entfernen-Dialog löscht nach Bestätigung die zugehörige Notiz.
 * - Das Hinzufügen des Messe-Tags löst ebenfalls den Notiz-Vorschlag-Dialog aus; Überspringen erstellt keine Notiz.
 * - Das Hinzufügen eines regulären Custom-Tags löst keinen Dialog aus.
 *
 * Fehlerfälle:
 * - Der Notiz-Vorschlag-Dialog erscheint nicht nach dem Hinzufügen eines Managed-Tags.
 * - Der Dialog erscheint fälschlicherweise nach Hinzufügen eines regulären Tags.
 * - Nach Bestätigung des Vorschlag-Dialogs wird keine Notiz angelegt.
 * - Nach Überspringen des Vorschlag-Dialogs wird trotzdem eine Notiz angelegt.
 * - Der Entfernen-Dialog erscheint nicht, obwohl eine passende Notiz vorhanden ist.
 *
 * Ziel:
 * Den Tag-Rule-Engine-Workflow im Browser absichern: Vorschlag-Dialog und Entfernen-Dialog greifen korrekt
 * beim Hinzufügen und Entfernen von Reklamation- und Messe-Tags am gespeicherten Termin.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_MESSE_TAG_NAME,
} from "../../shared/appointmentCancellation";
import {
  attachAppointmentTagFixture,
  createAppointmentFixture,
  createCustomerFixture,
  createExactTagFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function readSystemTagByName(page: Page, name: string): Promise<{ id: number; name: string }> {
  const response = await page.request.get("/api/admin/master-data/tags");
  expect(response.ok()).toBeTruthy();
  const allTags = await response.json() as Array<{ id: number; name: string }>;
  const tag = allTags.find((t) => t.name === name);
  expect(tag?.id).toBeTruthy();
  return tag!;
}

async function openAppointmentInCalendar(page: Page, appointmentId: number): Promise<void> {
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  const panel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(panel).toBeVisible();
  await panel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function addTagViaPickerAndClose(page: Page, tagId: number): Promise<void> {
  await page.getByTestId("appointment-tag-picker-button-add").click();
  await expect(page.getByRole("heading", { name: "Tag hinzufügen" })).toBeVisible();
  await page.getByTestId(`appointment-tag-picker-add-tag-${tagId}`).click();
}

async function removeTagViaBadge(page: Page, tagId: number): Promise<void> {
  const removeButton = page.getByTestId(`appointment-tag-picker-tag-${tagId}`).getByRole("button");
  await expect(removeButton).toBeVisible();
  await removeButton.click();
}

async function readAppointmentNotes(page: Page, appointmentId: number): Promise<Array<{ id: number; title: string }>> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/notes`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Array<{ id: number; title: string }>>;
}

test("adds Reklamation-Tag and suggestion dialog creates note on confirm", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-REKL-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-REKL",
    customerId: customer.id,
    name: "FT06 Rule Engine Reklamation",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(3),
  });

  await loginAsAdmin(page);
  const reklamationTag = await readSystemTagByName(page, MANAGED_COMPLAINT_TAG_NAME);

  await openAppointmentInCalendar(page, appointment.id);
  await addTagViaPickerAndClose(page, reklamationTag.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toContainText(MANAGED_COMPLAINT_TAG_NAME);

  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.map((n) => n.title);
  }).toEqual(expect.arrayContaining([MANAGED_COMPLAINT_TAG_NAME]));
});

test("adds Messe-Tag and suggestion dialog is dismissed with skip — no note created", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-MESSE-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-MESSE",
    customerId: customer.id,
    name: "FT06 Rule Engine Messe",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(4),
  });

  await loginAsAdmin(page);
  const messeTag = await readSystemTagByName(page, MANAGED_MESSE_TAG_NAME);

  await openAppointmentInCalendar(page, appointment.id);
  await addTagViaPickerAndClose(page, messeTag.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toContainText(MANAGED_MESSE_TAG_NAME);

  await page.getByTestId("button-note-suggestion-skip").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  const notes = await readAppointmentNotes(page, appointment.id);
  const messeNote = notes.find((n) => n.title === MANAGED_MESSE_TAG_NAME);
  expect(messeNote).toBeUndefined();
});

test("removes Reklamation-Tag when note exists and removal dialog deletes note on confirm", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-REMOVE-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-REMOVE",
    customerId: customer.id,
    name: "FT06 Rule Engine Entfernen",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(5),
  });

  await loginAsAdmin(page);
  const reklamationTag = await readSystemTagByName(page, MANAGED_COMPLAINT_TAG_NAME);

  await openAppointmentInCalendar(page, appointment.id);

  // Reklamation-Tag hinzufügen und Notiz per Suggestion-Dialog anlegen
  await addTagViaPickerAndClose(page, reklamationTag.id);
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.map((n) => n.title);
  }).toEqual(expect.arrayContaining([MANAGED_COMPLAINT_TAG_NAME]));

  // Tag entfernen — Entfernen-Dialog soll erscheinen
  await removeTagViaBadge(page, reklamationTag.id);

  await expect(page.getByTestId("dialog-note-removal")).toBeVisible();
  await expect(page.getByTestId("dialog-note-removal")).toContainText(MANAGED_COMPLAINT_TAG_NAME);

  await page.getByTestId("button-note-removal-confirm").click();
  await expect(page.getByTestId("dialog-note-removal")).toHaveCount(0);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.map((n) => n.title);
  }).not.toEqual(expect.arrayContaining([MANAGED_COMPLAINT_TAG_NAME]));
});

test("adding a regular custom tag creates no dialog", async ({ page }) => {
  const customTag = await createExactTagFixture("FT06 Kein Dialog Tag");
  const customer = await createCustomerFixture("FT06-RULE-REGULAR-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-REGULAR",
    customerId: customer.id,
    name: "FT06 Rule Engine Regular Tag",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(6),
  });

  await loginAsAdmin(page);

  await openAppointmentInCalendar(page, appointment.id);
  await addTagViaPickerAndClose(page, customTag.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("dialog-note-removal")).toHaveCount(0);
});

test("adding Reklamation-Tag when matching note already exists skips the suggestion dialog", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-DUP-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-DUP",
    customerId: customer.id,
    name: "FT06 Rule Engine Duplikat",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(7),
  });

  await loginAsAdmin(page);
  const reklamationTag = await readSystemTagByName(page, MANAGED_COMPLAINT_TAG_NAME);

  // Notiz vorab per API anlegen
  const noteCreateResponse = await page.request.post(`/api/appointments/${appointment.id}/notes`, {
    data: { title: MANAGED_COMPLAINT_TAG_NAME, body: "", print: false },
  });
  expect(noteCreateResponse.ok()).toBeTruthy();

  await openAppointmentInCalendar(page, appointment.id);
  await addTagViaPickerAndClose(page, reklamationTag.id);

  // Kein Dialog soll erscheinen — Notiz existiert bereits
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
});
