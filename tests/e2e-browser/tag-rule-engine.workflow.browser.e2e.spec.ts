/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das direkte Hinzufügen des Reklamation-Tags an der Wochenkalender-Karte löst den Notiz-Vorschlag-Dialog aus.
 * - Der Notiz-Vorschlag-Dialog erstellt nach Bestätigung eine Notiz mit dem Template-Titel.
 * - Das Entfernen des Reklamation-Tags im Terminformular löst den Notiz-Entfernen-Dialog aus.
 * - Der Notiz-Entfernen-Dialog löscht nach Bestätigung die zugehörige Notiz.
 * - Das direkte Hinzufügen des Messe-Tags an der Wochenkalender-Karte löst ebenfalls den Notiz-Vorschlag-Dialog aus; Überspringen erstellt keine Notiz.
 * - Das direkte Hinzufügen eines regulären Custom-Tags an der Wochenkalender-Karte löst keinen Dialog aus.
 *
 * Fehlerfälle:
 * - Der Notiz-Vorschlag-Dialog erscheint nicht nach dem direkten Hinzufügen eines Managed-Tags im Wochenkalender.
 * - Der Dialog erscheint fälschlicherweise nach Hinzufügen eines regulären Tags.
 * - Nach Bestätigung des Vorschlag-Dialogs wird keine Notiz angelegt.
 * - Nach Überspringen des Vorschlag-Dialogs wird trotzdem eine Notiz angelegt.
 * - Der Entfernen-Dialog erscheint nicht, obwohl eine passende Notiz vorhanden ist.
 *
 * Ziel:
 * Den Tag-Rule-Engine-Workflow im Browser absichern: Vorschlag-Dialog und Entfernen-Dialog greifen korrekt
 * beim direkten Tag-Setzen im Wochenkalender sowie beim Entfernen im Terminformular.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_MESSE_TAG_NAME,
} from "../../shared/appointmentCancellation";
import {
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

async function readNoteTemplateByTitle(page: Page, title: string): Promise<{
  id: number;
  title: string;
  body: string;
  cardColor: string | null;
  print: boolean;
}> {
  const response = await page.request.get("/api/note-templates");
  expect(response.ok()).toBeTruthy();
  const templates = await response.json() as Array<{
    id: number;
    title: string;
    body: string;
    cardColor: string | null;
    print: boolean;
  }>;
  const template = templates.find((entry) => entry.title === title);
  expect(template).toBeTruthy();
  return template!;
}

async function openAppointmentInCalendar(page: Page, appointmentId: number): Promise<void> {
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  await expect(page.getByTestId(`week-appointment-panel-${appointmentId}`)).toBeVisible();
}

async function openAppointmentFormFromCalendar(page: Page, appointmentId: number): Promise<void> {
  await openAppointmentInCalendar(page, appointmentId);
  await page.getByTestId(`week-appointment-panel-${appointmentId}`).dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function addTagViaWeekCardPicker(page: Page, appointmentId: number, tagId: number): Promise<void> {
  await page.getByTestId(`week-appointment-tags-${appointmentId}-button`).click();
  await expect(page.getByTestId(`week-appointment-tags-${appointmentId}-dialog`)).toBeVisible();
  await page.getByTestId(`week-appointment-tags-${appointmentId}-add-${tagId}-add`).click();
}

async function addTagViaAppointmentFormPicker(page: Page, tagId: number): Promise<void> {
  await page.getByTestId("appointment-tag-picker-button-add").click();
  await expect(page.getByRole("heading", { name: "Tag hinzufügen" })).toBeVisible();
  await page.getByTestId(`appointment-tag-picker-add-tag-${tagId}-add`).click();
}

async function removeTagViaBadge(page: Page, tagId: number): Promise<void> {
  const removeButton = page.getByTestId(`appointment-tag-picker-tag-${tagId}`).getByRole("button");
  await expect(removeButton).toBeVisible();
  await removeButton.click();
}

async function readAppointmentNotes(page: Page, appointmentId: number): Promise<Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/notes`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>>;
}

async function readProjectNotes(page: Page, projectId: number): Promise<Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>> {
  const response = await page.request.get(`/api/projects/${projectId}/notes`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>>;
}

async function openProjectForm(page: Page, projectId: number): Promise<void> {
  await page.getByTestId("nav-projekte").click();
  await expect(page.getByTestId("button-new-project")).toBeVisible();
  await page.getByTestId("toggle-project-scope-no-appointments").click();
  await expect(page.getByTestId(`project-card-${projectId}`)).toBeVisible();
  await page.getByTestId(`project-card-${projectId}`).dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible();
}

async function delayNextGet(page: Page, urlPattern: string, delayMs: number): Promise<void> {
  let delayed = false;
  await page.route(urlPattern, async (route) => {
    if (!delayed && route.request().method() === "GET") {
      delayed = true;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.continue();
  });
}

function hexToRgb(hex: string): string {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgb(${red}, ${green}, ${blue})`;
}

test("adds Reklamation-Tag from the week calendar card and suggestion dialog creates note on confirm", async ({ page }) => {
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
  const reklamationTemplate = await readNoteTemplateByTitle(page, MANAGED_COMPLAINT_TAG_NAME);

  await openAppointmentInCalendar(page, appointment.id);
  await addTagViaWeekCardPicker(page, appointment.id, reklamationTag.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toContainText(MANAGED_COMPLAINT_TAG_NAME);

  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(reklamationTemplate.title);
  await expect(page.getByTestId("switch-note-print")).toHaveAttribute("data-state", reklamationTemplate.print ? "checked" : "unchecked");
  if (reklamationTemplate.cardColor) {
    await expect(page.getByTestId("button-note-card-color-picker-preview")).toHaveCSS("background-color", hexToRgb(reklamationTemplate.cardColor));
  }

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    const match = notes.find((n) => n.title === reklamationTemplate.title);
    return match
      ? {
          title: match.title,
          body: match.body,
          cardColor: match.cardColor,
          print: match.print,
        }
      : null;
  }).toEqual({
    title: reklamationTemplate.title,
    body: reklamationTemplate.body,
    cardColor: reklamationTemplate.cardColor,
    print: reklamationTemplate.print,
  });
});

test("adds Reklamation-Tag from the appointment form picker and opens the template-backed editor", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-FORM-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-FORM",
    customerId: customer.id,
    name: "FT06 Rule Engine Formular",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(3),
  });

  await loginAsAdmin(page);
  const reklamationTag = await readSystemTagByName(page, MANAGED_COMPLAINT_TAG_NAME);
  const reklamationTemplate = await readNoteTemplateByTitle(page, MANAGED_COMPLAINT_TAG_NAME);

  await openAppointmentFormFromCalendar(page, appointment.id);
  await addTagViaAppointmentFormPicker(page, reklamationTag.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(reklamationTemplate.title);
  await expect(page.getByTestId("switch-note-print")).toHaveAttribute("data-state", reklamationTemplate.print ? "checked" : "unchecked");
  if (reklamationTemplate.cardColor) {
    await expect(page.getByTestId("button-note-card-color-picker-preview")).toHaveCSS("background-color", hexToRgb(reklamationTemplate.cardColor));
  }

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    const match = notes.find((n) => n.title === reklamationTemplate.title);
    return match
      ? {
          title: match.title,
          body: match.body,
          cardColor: match.cardColor,
          print: match.print,
        }
      : null;
  }).toEqual({
    title: reklamationTemplate.title,
    body: reklamationTemplate.body,
    cardColor: reklamationTemplate.cardColor,
    print: reklamationTemplate.print,
  });
});

test("adds Reklamation-Tag from the project form picker and creates a project note from the suggestion", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT06-RULE-PROJECT",
    name: "FT06 Rule Engine Projekt",
  });

  await loginAsAdmin(page);
  const reklamationTag = await readSystemTagByName(page, MANAGED_COMPLAINT_TAG_NAME);
  const reklamationTemplate = await readNoteTemplateByTitle(page, MANAGED_COMPLAINT_TAG_NAME);

  await openProjectForm(page, project.id);
  await page.getByTestId("project-tag-picker-button-add").click();
  await expect(page.getByRole("heading", { name: "Tag hinzufügen" })).toBeVisible();
  await page.getByTestId(`project-tag-picker-add-tag-${reklamationTag.id}-add`).click();

  await expect(page.getByRole("heading", { name: "Tag hinzufügen" })).toHaveCount(0);
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toContainText(MANAGED_COMPLAINT_TAG_NAME);

  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(reklamationTemplate.title);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, project.id);
    return notes.map((note) => note.title);
  }).not.toEqual(expect.arrayContaining([reklamationTemplate.title]));

  await page.getByTestId("button-save-note").click();
  await expect(page.getByTestId("input-note-title")).toHaveCount(0);

  await expect.poll(async () => {
    const notes = await readProjectNotes(page, project.id);
    const match = notes.find((n) => n.title === reklamationTemplate.title);
    return match
      ? {
          title: match.title,
          body: match.body,
          cardColor: match.cardColor,
          print: match.print,
        }
      : null;
  }).toEqual({
    title: reklamationTemplate.title,
    body: reklamationTemplate.body,
    cardColor: reklamationTemplate.cardColor,
    print: reklamationTemplate.print,
  });
});

test("adds Messe-Tag from the week calendar card and suggestion dialog is dismissed with skip so no note is created", async ({ page }) => {
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
  const messeTemplate = await readNoteTemplateByTitle(page, MANAGED_MESSE_TAG_NAME);

  await openAppointmentInCalendar(page, appointment.id);
  await addTagViaWeekCardPicker(page, appointment.id, messeTag.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toContainText(MANAGED_MESSE_TAG_NAME);

  await page.getByTestId("button-note-suggestion-skip").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  const notes = await readAppointmentNotes(page, appointment.id);
  const messeNote = notes.find((n) => n.title === messeTemplate.title);
  expect(messeNote).toBeUndefined();
});

test("week card tag picker closes after successful add while calendar refetch is slow", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-SLOW-TAG-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-SLOW-TAG",
    customerId: customer.id,
    name: "FT06 Rule Engine Slow Tag",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(4),
  });

  await loginAsAdmin(page);
  const reklamationTag = await readSystemTagByName(page, MANAGED_COMPLAINT_TAG_NAME);

  await openAppointmentInCalendar(page, appointment.id);
  await delayNextGet(page, "**/api/calendar/appointments?**", 1_500);
  const tagResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/appointments/${appointment.id}/tags`
  ));
  await addTagViaWeekCardPicker(page, appointment.id, reklamationTag.id);
  const tagResponse = await tagResponsePromise;
  expect(tagResponse.ok(), await tagResponse.text()).toBeTruthy();

  await expect(page.getByTestId(`week-appointment-tags-${appointment.id}-dialog`)).toHaveCount(0, { timeout: 750 });
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
});

test("week card template note editor closes after successful save while notes refetch is slow", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-SLOW-NOTE-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-SLOW-NOTE",
    customerId: customer.id,
    name: "FT06 Rule Engine Slow Note",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(4),
  });

  await loginAsAdmin(page);
  const reklamationTag = await readSystemTagByName(page, MANAGED_COMPLAINT_TAG_NAME);

  await openAppointmentInCalendar(page, appointment.id);
  await addTagViaWeekCardPicker(page, appointment.id, reklamationTag.id);
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_COMPLAINT_TAG_NAME);

  await delayNextGet(page, `**/api/appointments/${appointment.id}/notes`, 1_500);
  const noteUpdateResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PUT"
    && /^\/api\/notes\/\d+$/.test(new URL(response.url()).pathname)
  ));
  await page.getByTestId("button-save-note").click();
  const noteUpdateResponse = await noteUpdateResponsePromise;
  expect(noteUpdateResponse.ok(), await noteUpdateResponse.text()).toBeTruthy();

  await expect(page.getByTestId("input-note-title")).toHaveCount(0, { timeout: 750 });
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

  await openAppointmentFormFromCalendar(page, appointment.id);

  await addTagViaAppointmentFormPicker(page, reklamationTag.id);
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await page.getByTestId("button-cancel-note").click();

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.map((n) => n.title);
  }).toEqual(expect.arrayContaining([MANAGED_COMPLAINT_TAG_NAME]));

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

test("adding a regular custom tag from the week calendar card creates no dialog", async ({ page }) => {
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
  await addTagViaWeekCardPicker(page, appointment.id, customTag.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("dialog-note-removal")).toHaveCount(0);
});

test("adding Reklamation from the week calendar card when a matching note already exists skips the suggestion dialog", async ({ page }) => {
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

  const noteCreateResponse = await page.request.post(`/api/appointments/${appointment.id}/notes`, {
    data: { title: MANAGED_COMPLAINT_TAG_NAME, body: "", print: false },
  });
  expect(noteCreateResponse.ok()).toBeTruthy();

  await openAppointmentInCalendar(page, appointment.id);
  await addTagViaWeekCardPicker(page, appointment.id, reklamationTag.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
});
