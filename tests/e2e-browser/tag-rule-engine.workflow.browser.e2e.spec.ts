/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Reklamation-Aktion an der Wochenkalender-Karte löst den Notiz-Vorschlag-Dialog aus.
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
import { MANAGED_COMPLAINT_TAG_NAME } from "../../shared/appointmentCancellation";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createExactTagFixture,
  createProjectFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, loginAsRole, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

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

async function openSpanningAppointmentInCalendar(page: Page, appointmentId: number): Promise<void> {
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  await expect(page.getByTestId(`week-spanning-tile-${appointmentId}`).first()).toBeVisible();
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

async function setReklamationViaWeekCardAction(page: Page, appointmentId: number): Promise<void> {
  await page.getByTestId(`week-appointment-menu-trigger-${appointmentId}`).click();
  await page.getByTestId(`week-appointment-set-reklamation-${appointmentId}`).click();
}

async function removeReklamationViaWeekCardAction(page: Page, appointmentId: number): Promise<void> {
  await page.getByTestId(`week-appointment-menu-trigger-${appointmentId}`).click();
  await expect(page.getByTestId(`week-appointment-remove-reklamation-${appointmentId}`)).toBeVisible();
  await page.getByTestId(`week-appointment-remove-reklamation-${appointmentId}`).click();
}

async function setReklamationViaSpanningTileAction(page: Page, appointmentId: number): Promise<void> {
  await page.getByTestId(`week-spanning-tile-menu-trigger-${appointmentId}`).first().click();
  await page.getByTestId(`week-spanning-tile-set-reklamation-${appointmentId}`).click();
}

async function readAppointmentNotes(page: Page, appointmentId: number): Promise<Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/notes`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>>;
}

async function readAppointmentTagNames(page: Page, appointmentId: number): Promise<string[]> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/tags`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Array<{ tag: { name: string } }>;
  return body.map((item) => item.tag.name);
}

async function readProjectNotes(page: Page, projectId: number): Promise<Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>> {
  const response = await page.request.get(`/api/projects/${projectId}/notes`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Array<{ id: number; title: string; body: string; cardColor: string | null; print: boolean }>>;
}

async function readProjectTagNames(page: Page, projectId: number): Promise<string[]> {
  const response = await page.request.get(`/api/projects/${projectId}/tags`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Array<{ tag: { name: string } }>;
  return body.map((item) => item.tag.name);
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

test("sets Reklamation from the week calendar action and suggestion dialog opens the note editor", async ({ page }) => {
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
  const reklamationTemplate = await readNoteTemplateByTitle(page, MANAGED_COMPLAINT_TAG_NAME);

  await openAppointmentInCalendar(page, appointment.id);
  await setReklamationViaWeekCardAction(page, appointment.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toContainText(MANAGED_COMPLAINT_TAG_NAME);
  await expect(page.getByTestId("button-note-suggestion-skip")).toHaveText("Überspringen");

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

test("sets Reklamation from the appointment form action and opens the template-backed editor", async ({ page }) => {
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
  const reklamationTemplate = await readNoteTemplateByTitle(page, MANAGED_COMPLAINT_TAG_NAME);

  await openAppointmentFormFromCalendar(page, appointment.id);
  await page.getByTestId("button-set-appointment-reklamation").click();

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

test("dispatcher sets Reklamation from the appointment form and skips the note suggestion", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-DISP-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-DISP",
    customerId: customer.id,
    name: "FT06 Rule Engine Dispatcher",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(3),
  });

  await loginAsRole(page, "DISPATCHER");

  await openAppointmentFormFromCalendar(page, appointment.id);
  await page.getByTestId("button-set-appointment-reklamation").click();

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-skip").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readAppointmentTagNames(page, appointment.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);
  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);
});

test("sets Reklamation from a week spanning tile and opens the template-backed editor", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-SPAN-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-SPAN",
    customerId: customer.id,
    name: "FT06 Rule Engine Spanning",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(3),
    endDate: getRelativeBerlinDate(4),
  });

  await loginAsAdmin(page);
  const reklamationTemplate = await readNoteTemplateByTitle(page, MANAGED_COMPLAINT_TAG_NAME);

  await openSpanningAppointmentInCalendar(page, appointment.id);
  await setReklamationViaSpanningTileAction(page, appointment.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(reklamationTemplate.title);

  await expect.poll(async () => {
    const tagNames = await readAppointmentTagNames(page, appointment.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);
  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.some((note) => note.title === reklamationTemplate.title);
  }).toBe(true);
});

test("sets Reklamation from the project form action and creates a project note from the suggestion", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT06-RULE-PROJECT",
    name: "FT06 Rule Engine Projekt",
  });

  await loginAsAdmin(page);
  const reklamationTemplate = await readNoteTemplateByTitle(page, MANAGED_COMPLAINT_TAG_NAME);

  await openProjectForm(page, project.id);
  await page.getByTestId("button-set-project-reklamation").click();
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

test("project note suggestion dialog stays closed after the prefilled note dialog is canceled", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT06-RULE-PROJECT-CANCEL",
    name: "FT06 Rule Engine Projekt Cancel",
  });

  await loginAsAdmin(page);
  const reklamationTemplate = await readNoteTemplateByTitle(page, MANAGED_COMPLAINT_TAG_NAME);

  await openProjectForm(page, project.id);
  await page.getByTestId("button-set-project-reklamation").click();

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(reklamationTemplate.title);

  await page.getByTestId("button-cancel-note").click();
  await expect(page.getByTestId("input-note-title")).toHaveCount(0);
  await page.waitForTimeout(300);
  await expect(page.getByTestId("input-note-title")).toHaveCount(0);

  const notes = await readProjectNotes(page, project.id);
  expect(notes.map((note) => note.title)).not.toContain(reklamationTemplate.title);
});

test("sets project Reklamation and skips the note suggestion without creating a note", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT06-RULE-PROJECT-SKIP",
    name: "FT06 Rule Engine Projekt Skip",
  });

  await loginAsAdmin(page);

  await openProjectForm(page, project.id);
  await page.getByTestId("button-set-project-reklamation").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-skip").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readProjectTagNames(page, project.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, project.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);
});

test("sets project Reklamation without suggestion when a matching project note already exists", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT06-RULE-PROJECT-DUP",
    name: "FT06 Rule Engine Projekt Duplikat",
  });

  await loginAsAdmin(page);
  const noteCreateResponse = await page.request.post(`/api/projects/${project.id}/notes`, {
    data: { title: MANAGED_COMPLAINT_TAG_NAME, body: "", print: false },
  });
  expect(noteCreateResponse.ok(), await noteCreateResponse.text()).toBeTruthy();

  await openProjectForm(page, project.id);
  await page.getByTestId("button-set-project-reklamation").click();

  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect.poll(async () => {
    const tagNames = await readProjectTagNames(page, project.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, project.id);
    return notes.filter((note) => note.title === MANAGED_COMPLAINT_TAG_NAME).length;
  }).toBe(1);
});

test("sets Reklamation from the appointment action and skips the note suggestion without creating a note", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-REKL-SKIP-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-REKL-SKIP",
    customerId: customer.id,
    name: "FT06 Rule Engine Reklamation Skip",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(4),
  });

  await loginAsAdmin(page);

  await openAppointmentFormFromCalendar(page, appointment.id);
  await page.getByTestId("button-set-appointment-reklamation").click();

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await expect(page.getByTestId("dialog-note-suggestion")).toContainText(MANAGED_COMPLAINT_TAG_NAME);

  await page.getByTestId("button-note-suggestion-skip").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readAppointmentTagNames(page, appointment.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);
});

test("week card tag picker closes after successful custom tag add while calendar refetch is slow", async ({ page }) => {
  const customTag = await createExactTagFixture("FT06 Slow Custom Tag");
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
  await openAppointmentInCalendar(page, appointment.id);
  await delayNextGet(page, "**/api/calendar/appointments?**", 1_500);
  const tagResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/appointments/${appointment.id}/tags`
  ));
  await addTagViaWeekCardPicker(page, appointment.id, customTag.id);
  const tagResponse = await tagResponsePromise;
  expect(tagResponse.ok(), await tagResponse.text()).toBeTruthy();

  await expect(page.getByTestId(`week-appointment-tags-${appointment.id}-dialog`)).toHaveCount(0, { timeout: 750 });
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
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
  await openAppointmentInCalendar(page, appointment.id);
  await setReklamationViaWeekCardAction(page, appointment.id);
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
  await openAppointmentFormFromCalendar(page, appointment.id);

  await page.getByTestId("button-set-appointment-reklamation").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await page.getByTestId("button-cancel-note").click();

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.map((n) => n.title);
  }).toEqual(expect.arrayContaining([MANAGED_COMPLAINT_TAG_NAME]));

  await page.getByTestId("button-remove-appointment-reklamation").click();

  await expect(page.getByTestId("dialog-note-removal")).toBeVisible();
  await expect(page.getByTestId("dialog-note-removal")).toContainText(MANAGED_COMPLAINT_TAG_NAME);

  await page.getByTestId("button-note-removal-confirm").click();
  await expect(page.getByTestId("dialog-note-removal")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readAppointmentTagNames(page, appointment.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.map((n) => n.title);
  }).not.toEqual(expect.arrayContaining([MANAGED_COMPLAINT_TAG_NAME]));
});

test("removes Reklamation from the week calendar action and keeps the existing note when requested", async ({ page }) => {
  const customer = await createCustomerFixture("FT06-RULE-WEEK-KEEP-CUST");
  const project = await createProjectFixture({
    prefix: "FT06-RULE-WEEK-KEEP",
    customerId: customer.id,
    name: "FT06 Rule Engine Woche Behalten",
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    customerId: customer.id,
    startDate: getRelativeBerlinDate(5),
  });

  await loginAsAdmin(page);
  await openAppointmentInCalendar(page, appointment.id);
  await setReklamationViaWeekCardAction(page, appointment.id);
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_COMPLAINT_TAG_NAME);
  await page.getByTestId("button-cancel-note").click();

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);

  await removeReklamationViaWeekCardAction(page, appointment.id);

  await expect(page.getByTestId("dialog-note-removal")).toBeVisible();
  await expect(page.getByTestId("dialog-note-removal")).toContainText(MANAGED_COMPLAINT_TAG_NAME);
  await page.getByTestId("button-note-removal-keep").click();
  await expect(page.getByTestId("dialog-note-removal")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readAppointmentTagNames(page, appointment.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);
});

test("removes project Reklamation and deletes the matching project note on confirm", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT06-RULE-PROJECT-REMOVE",
    name: "FT06 Rule Engine Projekt Entfernen",
  });

  await loginAsAdmin(page);
  await openProjectForm(page, project.id);
  await page.getByTestId("button-set-project-reklamation").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_COMPLAINT_TAG_NAME);
  await page.getByTestId("button-save-note").click();

  await expect.poll(async () => {
    const tagNames = await readProjectTagNames(page, project.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, project.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);

  await expect(page.getByTestId("button-remove-project-reklamation")).toBeVisible();
  await page.getByTestId("button-remove-project-reklamation").click();
  await expect(page.getByTestId("dialog-note-removal")).toBeVisible();
  await page.getByTestId("button-note-removal-confirm").click();
  await expect(page.getByTestId("dialog-note-removal")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readProjectTagNames(page, project.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, project.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);
});

test("removes project Reklamation and keeps the matching project note when requested", async ({ page }) => {
  const project = await createProjectFixture({
    prefix: "FT06-RULE-PROJECT-KEEP",
    name: "FT06 Rule Engine Projekt Behalten",
  });

  await loginAsAdmin(page);
  await openProjectForm(page, project.id);
  await page.getByTestId("button-set-project-reklamation").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_COMPLAINT_TAG_NAME);
  await page.getByTestId("button-save-note").click();

  await expect(page.getByTestId("button-remove-project-reklamation")).toBeVisible();
  await page.getByTestId("button-remove-project-reklamation").click();
  await expect(page.getByTestId("dialog-note-removal")).toBeVisible();
  await page.getByTestId("button-note-removal-keep").click();
  await expect(page.getByTestId("dialog-note-removal")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readProjectTagNames(page, project.id);
    return tagNames.includes(MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(false);
  await expect.poll(async () => {
    const notes = await readProjectNotes(page, project.id);
    return notes.some((note) => note.title === MANAGED_COMPLAINT_TAG_NAME);
  }).toBe(true);
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
  const noteCreateResponse = await page.request.post(`/api/appointments/${appointment.id}/notes`, {
    data: { title: MANAGED_COMPLAINT_TAG_NAME, body: "", print: false },
  });
  expect(noteCreateResponse.ok()).toBeTruthy();

  await openAppointmentInCalendar(page, appointment.id);
  await setReklamationViaWeekCardAction(page, appointment.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
});
