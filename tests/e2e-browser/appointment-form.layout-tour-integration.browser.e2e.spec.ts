/**
 * Test Scope:
 *
 * Feature: FT01/FT04 - Terminformular Layout + Tour-Integration
 *
 * Abgedeckte Regeln:
 * - Termine ohne Tour zeigen den Tour-Picker im Mitarbeiterpanel.
 * - Die Tour-Auswahl erscheint nach dem Hinzufügen als separate Vollbreiten-Badge über dem Mitarbeiterpanel.
 * - Termine mit bestehender Tour können die Tour im Formular wieder entfernen.
 * - Team-Badges und Mitarbeiter-Header-Aktion bleiben im neuen Layout sichtbar.
 * - Neue Tour-/KW-Vorschauen übernehmen Wochenplan-Mitarbeiter für neue Termine.
 * - Bestehende Termine können beim Tour-Wechsel per Ersetzen auf die Wochenplanung umgestellt werden.
 * - Konfliktfälle werden im Terminformular sichtbar als nicht übernehmbare Mitarbeiter markiert.
 *
 * Fehlerfälle:
 * - Der Tour-Picker bleibt nach einer Auswahl sichtbar oder verschwindet an der falschen Stelle.
 * - Die Vollbreiten-Tour-Badge fehlt trotz selektierter Tour.
 * - Team-Badges oder Mitarbeiter-Aktionen gehen durch die Layout-Umsortierung verloren.
 * - Der neue Vorschau-Dialog erscheint nicht bei Touren mit Wochenplanung.
 * - Ersetzen lässt alte Termin-Mitarbeiter trotz Tour-Wechsel stehen.
 * - Konflikt-Mitarbeiter werden im Dialog nicht deaktiviert.
 *
 * Ziel:
 * Die neue Tour-Integration inklusive Wochenplan-Preview im echten Browser für Kern- und Konfliktpfade absichern.
 */
/**
 * Test Scope Update:
 *
 * Abgedeckte Regeln:
 * - Das Setzen einer Tour ohne Wochenplanung laesst bestehende Termin-Mitarbeiter unveraendert.
 * - Das Setzen der Tour `Tour Messe` traegt still den Termin-Tag `Messe Aufbau/Abbau` nach.
 * - Das Entfernen oder Wechseln weg von `Tour Messe` entfernt den Termin-Tag `Messe Aufbau/Abbau` wieder.
 * - Der Formular-Save fuer `Tour Messe` nutzt den FT06-Notizvorschlag auch im echten Save-Pfad.
 * - Eine Datumsverschiebung in eine andere ISO-KW bewertet die Wochenplanung derselben Tour neu.
 * - Das manuelle Hinzufuegen eines Mitarbeiters zu einem bestehenden Termin bleibt ueber den echten Formular-Speicherpfad versioniert konsistent.
 *
 * Fehlerfaelle:
 * - Eine Tour ohne Wochenplanung loest trotzdem einen Preview-Dialog oder eine automatische Uebernahme aus.
 * - Die stille Messe-Tag-Regel greift zwar serverseitig, aber der Save-Pfad zeigt keinen Folge-Dialog.
 * - Ein KW-Wechsel auf derselben Tour verwendet weiter die alte Wochenplanung.
 * - Ein manuell hinzugefuegter Mitarbeiter wird im Formular sichtbar, aber nicht persistent gespeichert.
 *
 * Ziel:
 * Die neuen FT01/FT04-Ergaenzungen fuer Tour-Setzen ohne Wochenplanung, KW-Wechsel und manuelle Mitarbeiter-Ergaenzungen im Browser sichtbar absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { eq } from "drizzle-orm";

import { db } from "../../server/db";
import { MANAGED_MESSE_TAG_NAME } from "../../shared/appointmentCancellation";
import { tags, tourWeekEmployees, tours } from "../../shared/schema";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTeamFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

function resolveNextEditableWeek() {
  const today = parseISO(getRelativeBerlinDate(0));
  const nextWeekStart = startOfISOWeek(addWeeks(today, 1));
  const secondDay = addDays(nextWeekStart, 1);
  return {
    weekStartDate: format(nextWeekStart, "yyyy-MM-dd"),
    weekSecondDate: format(secondDay, "yyyy-MM-dd"),
    isoYear: getISOWeekYear(nextWeekStart),
    isoWeek: getISOWeek(nextWeekStart),
  };
}

async function openExistingAppointment(page: Page, appointmentId: number) {
  await loginAsAdmin(page);
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function openNewAppointmentFromNextWeekTourLane(page: Page, targetDate: string, tourId: number) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  await page.getByTestId("button-next").click();
  const button = page.getByTestId(`button-new-appointment-week-${targetDate}-lane-tour-${tourId}`);
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function openExistingAppointmentInNextWeek(page: Page, appointmentId: number) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-wochenuebersicht").click();
  await expect(page.getByTestId("calendar-week-view")).toBeVisible();
  await page.getByTestId("button-next").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointmentId}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
}

async function selectProject(page: Page, project: Awaited<ReturnType<typeof createProjectFixture>>) {
  await page.getByTestId("button-select-project").click();
  const table = page.getByTestId("table-projects");
  await expect(table).toBeVisible();
  await page.locator("#project-filter-order-number").fill(project.orderNumber ?? "");
  await page.locator("#project-filter-title").fill(project.name);
  const row = table.locator("tbody tr")
    .filter({ hasText: project.orderNumber ?? "" })
    .filter({ hasText: project.name })
    .first();
  await expect(row).toBeVisible();
  await row.dblclick();
  await expect(page.getByTestId("badge-project")).toBeVisible();
}

async function saveAppointmentAndResolveId(page: Page) {
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
  return Number(body.id);
}

async function saveExistingAppointment(page: Page, appointmentId: number) {
  const saveResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PATCH"
    && new URL(response.url()).pathname === `/api/appointments/${appointmentId}`
  ));
  await page.getByTestId("button-save-appointment").click();
  const confirmSaveButton = page.getByRole("button", { name: "Trotzdem speichern" });
  if (await confirmSaveButton.isVisible().catch(() => false)) {
    await confirmSaveButton.click();
  }
  const response = await saveResponsePromise;
  expect(response.ok()).toBeTruthy();
}

async function renameTourToMesse(tourId: number) {
  await db
    .update(tours)
    .set({ name: "Tour Messe" })
    .where(eq(tours.id, tourId));
}

async function ensureMesseTour(color = "#3465A4") {
  const [existing] = await db
    .select({ id: tours.id, name: tours.name, color: tours.color, version: tours.version })
    .from(tours)
    .where(eq(tours.name, "Tour Messe"))
    .limit(1);
  if (existing) {
    return existing;
  }

  const createdTour = await createTourFixture(color);
  await renameTourToMesse(createdTour.id);
  return {
    ...createdTour,
    name: "Tour Messe",
  };
}

async function readAppointmentTagNames(page: Page, appointmentId: number): Promise<string[]> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/tags`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Array<{ tag: { name: string } }>;
  return body.map((item) => item.tag.name);
}

async function readAppointmentNotes(page: Page, appointmentId: number): Promise<Array<{ title: string }>> {
  const response = await page.request.get(`/api/appointments/${appointmentId}/notes`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Array<{ title: string }>>;
}

async function createAppointmentNoteViaDialog(page: Page, input: { title: string; body: string }) {
  await page.getByTestId("button-new-note").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("input-note-title").fill(input.title);
  await dialog.getByTestId("richtext-editor").fill(input.body);
  await dialog.getByTestId("button-save-note").click();
  const templateEditorCancelButton = page.getByTestId("button-cancel-note");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const count = await templateEditorCancelButton.count();
    if (count === 0) break;
    await expect(templateEditorCancelButton.last()).toBeVisible();
    await templateEditorCancelButton.last().click({ force: true });
  }
  await expect.poll(async () => templateEditorCancelButton.count()).toBe(0);
}

async function readSystemTagIdByName(name: string): Promise<number> {
  const [tag] = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);
  expect(tag?.id).toBeTruthy();
  return tag!.id;
}

async function seedAppointmentFormNoise(prefix: string, referenceDate: string) {
  const noiseCustomer = await createCustomerFixture(`${prefix}-NOISE-CUST`);
  const noiseProject = await createProjectFixture({
    prefix: `${prefix}-NOISE-PROJ`,
    customerId: noiseCustomer.id,
    name: `${prefix} Noise Projekt`,
  });
  const noiseTour = await createTourFixture("#64748b");
  const noiseEmployeeA = await createEmployeeFixture(`${prefix}-NOISE-A`);
  const noiseEmployeeB = await createEmployeeFixture(`${prefix}-NOISE-B`);

  await createAppointmentFixture({
    projectId: noiseProject.id,
    startDate: referenceDate,
    tourId: noiseTour.id,
    employeeIds: [noiseEmployeeA.id],
  });
  await createAppointmentFixture({
    projectId: noiseProject.id,
    startDate: getRelativeBerlinDate(35),
    tourId: null,
    employeeIds: [noiseEmployeeB.id],
  });
}

test("shows the tour picker inside the employee panel and persists a newly selected tour", async ({ page }) => {
  const customer = await createCustomerFixture("FT01-LAYOUT-CUST");
  const team = await createTeamFixture("#7c3aed");
  const tour = await createTourFixture("#226688");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: getRelativeBerlinDate(2),
  });
  await seedAppointmentFormNoise("FT01-LAYOUT-CUST", getRelativeBerlinDate(2));

  await openExistingAppointment(page, appointment.id);

  await expect(page.getByTestId("slot-appointment-employees")).toBeVisible();
  await expect(page.getByTestId(`badge-team-${team.id}`)).toBeVisible();
  await expect(page.getByTestId("button-add-employee")).toBeVisible();
  await expect(page.getByTestId("section-tour-picker")).toBeVisible();
  await expect(page.getByTestId(`badge-tour-select-${tour.id}`)).toBeVisible();

  await page.getByTestId(`badge-tour-select-${tour.id}-add`).click();

  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.locator('[data-testid="section-tour-picker"]')).toHaveCount(0);

  await page.getByTestId("button-save-appointment").click();
  await page.getByRole("button", { name: "Trotzdem speichern" }).click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    if (!response.ok()) return null;
    const body = await response.json();
    return body.tourId;
  }).toBe(tour.id);
});

test("renders an existing tour as a separate badge and restores the picker after removal", async ({ page }) => {
  const customer = await createCustomerFixture("FT01-LAYOUT-CUST-TOUR");
  const team = await createTeamFixture("#0f766e");
  const tour = await createTourFixture("#1d4ed8");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: getRelativeBerlinDate(3),
    tourId: tour.id,
  });
  await seedAppointmentFormNoise("FT01-LAYOUT-CUST-TOUR", getRelativeBerlinDate(3));

  await openExistingAppointment(page, appointment.id);

  await expect(page.getByTestId(`badge-team-${team.id}`)).toBeVisible();
  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.locator('[data-testid="section-tour-picker"]')).toHaveCount(0);

  await page.getByTestId("badge-tour-remove").click();

  await expect(page.getByTestId("section-tour-picker")).toBeVisible();
  await expect(page.getByTestId(`badge-tour-select-${tour.id}`)).toBeVisible();
  await expect(page.locator('[data-testid="badge-tour"]')).toHaveCount(0);

  await page.getByTestId("button-save-appointment").click();
  await page.getByRole("button", { name: "Trotzdem speichern" }).click();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    if (!response.ok()) return "missing";
    const body = await response.json();
    return body.tourId;
  }).toBe(null);
});

test("assigns a tour without week planning and keeps the existing employees unchanged", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const customer = await createCustomerFixture("FT04-NO-WEEKPLAN-CUST");
  const tour = await createTourFixture("#225566");
  const existingEmployee = await createEmployeeFixture("FT04-NO-WEEKPLAN-EMP");
  const sideEmployee = await createEmployeeFixture("FT04-NO-WEEKPLAN-SIDE");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: nextWeek.weekSecondDate,
    employeeIds: [existingEmployee.id, sideEmployee.id],
  });
  await seedAppointmentFormNoise("FT04-NO-WEEKPLAN", nextWeek.weekSecondDate);

  await openExistingAppointmentInNextWeek(page, appointment.id);

  await expect(page.getByTestId(`badge-employee-${existingEmployee.id}`)).toBeVisible();
  await expect(page.getByTestId(`badge-employee-${sideEmployee.id}`)).toBeVisible();
  await page.getByTestId(`badge-tour-select-${tour.id}-add`).click();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toHaveCount(0);

  await saveExistingAppointment(page, appointment.id);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json();
    return {
      tourId: body.tourId,
      employeeIds: (body.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b),
    };
  }).toEqual({
    tourId: tour.id,
    employeeIds: [existingEmployee.id, sideEmployee.id].sort((a, b) => a - b),
  });
});

test("adds the managed Messe tag when an appointment is switched to Tour Messe", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const customer = await createCustomerFixture("FT06-MESSE-BROWSER-CUST");
  const messeTour = await ensureMesseTour("#3465A4");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: nextWeek.weekSecondDate,
  });
  await seedAppointmentFormNoise("FT06-MESSE-BROWSER", nextWeek.weekSecondDate);

  await openExistingAppointmentInNextWeek(page, appointment.id);
  await page.getByTestId(`badge-tour-select-${messeTour.id}-add`).click();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toHaveCount(0);

  await saveExistingAppointment(page, appointment.id);

  await expect(page.getByTestId("dialog-note-suggestion")).toBeVisible();
  await page.getByTestId("button-note-suggestion-confirm").click();
  await expect(page.getByTestId("dialog-note-suggestion")).toHaveCount(0);
  await expect(page.getByTestId("input-note-title")).toHaveValue(MANAGED_MESSE_TAG_NAME);
  await page.getByTestId("button-cancel-note").click();
  await expect(page.getByTestId("button-save-appointment")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readAppointmentTagNames(page, appointment.id);
    return tagNames.includes(MANAGED_MESSE_TAG_NAME);
  }).toBe(true);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.some((note) => note.title === MANAGED_MESSE_TAG_NAME);
  }).toBe(true);

  await expect(page.getByRole("alertdialog", { name: "Dem Termin folgen?" })).toHaveCount(0);

  await page.getByTestId(`week-appointment-panel-${appointment.id}`).dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId(`appointment-tag-picker-tag-${await readSystemTagIdByName(MANAGED_MESSE_TAG_NAME)}`)).toBeVisible();
});

test("removes the managed Messe tag when an appointment leaves Tour Messe", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const customer = await createCustomerFixture("FT06-MESSE-REMOVE-CUST");
  const messeTour = await ensureMesseTour("#3465A4");
  const regularTour = await createTourFixture("#006B6F");
  const messeTagId = await readSystemTagIdByName(MANAGED_MESSE_TAG_NAME);
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: nextWeek.weekSecondDate,
    tourId: messeTour.id,
  });
  await seedAppointmentFormNoise("FT06-MESSE-REMOVE", nextWeek.weekSecondDate);

  await openExistingAppointmentInNextWeek(page, appointment.id);
  await createAppointmentNoteViaDialog(page, {
    title: MANAGED_MESSE_TAG_NAME,
    body: "",
  });
  await page.getByTestId("badge-tour-remove").click();
  await page.getByTestId(`badge-tour-select-${regularTour.id}-add`).click();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toHaveCount(0);

  await saveExistingAppointment(page, appointment.id);

  await expect(page.getByTestId("dialog-note-removal")).toBeVisible();
  await page.getByTestId("button-note-removal-confirm").click();
  await expect(page.getByTestId("dialog-note-removal")).toHaveCount(0);

  await expect.poll(async () => {
    const tagNames = await readAppointmentTagNames(page, appointment.id);
    return tagNames.includes(MANAGED_MESSE_TAG_NAME);
  }).toBe(false);

  await expect.poll(async () => {
    const notes = await readAppointmentNotes(page, appointment.id);
    return notes.some((note) => note.title === MANAGED_MESSE_TAG_NAME);
  }).toBe(false);

  await expect(page.getByRole("alertdialog", { name: "Dem Termin folgen?" })).toHaveCount(0);

  await page.getByTestId(`week-appointment-panel-${appointment.id}`).dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();
  await expect(page.getByTestId(`appointment-tag-picker-tag-${messeTagId}`)).toHaveCount(0);
});

test("opens the week preview for a new next-week appointment and applies the planned employee", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "FT04-APPT-NEW", name: "FT04 Appointment New" });
  const tour = await createTourFixture("#225588");
  const weekEmployee = await createEmployeeFixture("FT04-APPT-WEEK");
  await seedAppointmentFormNoise("FT04-APPT-NEW", nextWeek.weekStartDate);

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  await openNewAppointmentFromNextWeekTourLane(page, nextWeek.weekStartDate, tour.id);

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Wochenplanung fuer Termin uebernehmen");
  await expect(dialog.getByTestId(`appointment-week-preview-row-${weekEmployee.id}`)).toBeVisible();
  await expect(dialog.getByTestId(`appointment-week-preview-checkbox-${weekEmployee.id}`)).toBeChecked();
  await expect(page.getByTestId("button-appointment-week-mode-additive")).toBeVisible();

  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(dialog).toHaveCount(0);

  await selectProject(page, project);
  const createdAppointmentId = await saveAppointmentAndResolveId(page);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${createdAppointmentId}`);
    const body = await response.json();
    return {
      tourId: body.tourId,
      employeeIds: (body.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b),
    };
  }).toEqual({
    tourId: tour.id,
    employeeIds: [weekEmployee.id],
  });
});

test("keeps the selected tour but no employees when the week preview is canceled for a new lane appointment", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "FT04-APPT-CANCEL", name: "FT04 Appointment Cancel" });
  const tour = await createTourFixture("#0f766e");
  const weekEmployee = await createEmployeeFixture("FT04-APPT-CANCEL-WEEK");
  await seedAppointmentFormNoise("FT04-APPT-CANCEL", nextWeek.weekStartDate);

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  await openNewAppointmentFromNextWeekTourLane(page, nextWeek.weekStartDate, tour.id);

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId(`appointment-week-preview-checkbox-${weekEmployee.id}`)).toBeChecked();
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.getByTestId(`badge-employee-${weekEmployee.id}`)).toHaveCount(0);

  await selectProject(page, project);
  const createdAppointmentId = await saveAppointmentAndResolveId(page);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${createdAppointmentId}`);
    const body = await response.json();
    return {
      tourId: body.tourId,
      employeeIds: (body.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b),
    };
  }).toEqual({
    tourId: tour.id,
    employeeIds: [],
  });
});

test("marks conflicting week employees as non-selectable for new appointments", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "FT04-APPT-CONFLICT", name: "FT04 Appointment Conflict" });
  const tour = await createTourFixture("#1d4ed8");
  const weekEmployee = await createEmployeeFixture("FT04-APPT-CONFLICT-EMP");
  await seedAppointmentFormNoise("FT04-APPT-CONFLICT", nextWeek.weekStartDate);

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekStartDate,
    employeeIds: [weekEmployee.id],
  });

  await openNewAppointmentFromNextWeekTourLane(page, nextWeek.weekStartDate, tour.id);

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId(`appointment-week-preview-status-${weekEmployee.id}`)).toContainText(
    "Ueberschneidung mit bestehendem Termin",
  );
  await expect(dialog.getByTestId(`appointment-week-preview-checkbox-${weekEmployee.id}`)).not.toBeChecked();
  await expect(dialog.getByTestId(`appointment-week-preview-checkbox-${weekEmployee.id}`)).toBeDisabled();
});

test("uses the already confirmed preview decision when an existing appointment changes to another tour with week planning", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "FT04-APPT-REPLACE", name: "FT04 Appointment Replace" });
  const sourceTour = await createTourFixture("#0f766e");
  const targetTour = await createTourFixture("#7c3aed");
  const currentEmployee = await createEmployeeFixture("FT04-APPT-CURRENT");
  const weekEmployee = await createEmployeeFixture("FT04-APPT-REPLACE-WEEK");
  const sideEmployee = await createEmployeeFixture("FT04-APPT-REPLACE-SIDE");
  await seedAppointmentFormNoise("FT04-APPT-REPLACE", nextWeek.weekSecondDate);

  await db.insert(tourWeekEmployees).values({
    tourId: targetTour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekSecondDate,
    tourId: sourceTour.id,
    employeeIds: [currentEmployee.id, sideEmployee.id],
  });

  await openExistingAppointmentInNextWeek(page, appointment.id);

  await page.getByTestId("badge-tour-remove").click();
  await expect(page.getByTestId("section-tour-picker")).toBeVisible();
  await page.getByTestId(`badge-tour-select-${targetTour.id}-add`).click();

  const immediateDialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(immediateDialog).toBeVisible();
  await expect(immediateDialog.getByTestId(`appointment-week-preview-status-${currentEmployee.id}`)).toContainText(
    "Bleibt nur durch aktuelle Terminzuweisung erhalten",
  );
  await expect(immediateDialog.getByTestId(`appointment-week-preview-status-${sideEmployee.id}`)).toContainText(
    "Bleibt nur durch aktuelle Terminzuweisung erhalten",
  );
  await expect(immediateDialog.getByTestId(`appointment-week-preview-status-${weekEmployee.id}`)).toContainText(
    "Kann aus der Wochenplanung uebernommen werden",
  );
  await page.getByTestId("button-appointment-week-mode-replace").click();
  await immediateDialog.getByTestId("button-tour-employee-cascade-confirm").click();
  await expect(immediateDialog).toHaveCount(0);

  await page.getByTestId("button-save-appointment").click();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toHaveCount(0);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json();
    return {
      tourId: body.tourId,
      employeeIds: (body.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b),
    };
  }).toEqual({
    tourId: targetTour.id,
    employeeIds: [weekEmployee.id],
  });
});

test("rechecks week planning when the start date moves into another ISO week on the same tour", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const targetWeekStart = startOfISOWeek(addWeeks(parseISO(nextWeek.weekStartDate), 1));
  const targetWeekSecondDate = format(addDays(targetWeekStart, 1), "yyyy-MM-dd");
  const project = await createProjectFixture({ prefix: "FT04-APPT-DATE-KW", name: "FT04 Appointment Date Shift" });
  const tour = await createTourFixture("#336688");
  const currentEmployee = await createEmployeeFixture("FT04-APPT-DATE-CURRENT");
  const plannedEmployee = await createEmployeeFixture("FT04-APPT-DATE-WEEK");
  await seedAppointmentFormNoise("FT04-APPT-DATE-KW", targetWeekSecondDate);

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: getISOWeekYear(targetWeekStart),
    isoWeek: getISOWeek(targetWeekStart),
    employeeId: plannedEmployee.id,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekSecondDate,
    tourId: tour.id,
    employeeIds: [currentEmployee.id],
  });

  await openExistingAppointmentInNextWeek(page, appointment.id);
  await page.getByTestId("input-start-date").fill(targetWeekSecondDate);

  const saveResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "PATCH"
    && new URL(response.url()).pathname === `/api/appointments/${appointment.id}`
  ));
  await page.getByTestId("button-save-appointment").click();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Wochenplanung vor dem Speichern prüfen");
  await expect(dialog.getByTestId(`appointment-week-preview-status-${currentEmployee.id}`)).toContainText(
    "Bleibt nur durch aktuelle Terminzuweisung erhalten",
  );
  await expect(dialog.getByTestId(`appointment-week-preview-status-${plannedEmployee.id}`)).toContainText(
    "Kann aus der Wochenplanung uebernommen werden",
  );
  await page.getByTestId("button-appointment-week-mode-replace").click();
  await dialog.getByTestId("button-tour-employee-cascade-confirm").click();

  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok()).toBeTruthy();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json();
    return {
      startDate: body.startDate,
      tourId: body.tourId,
      employeeIds: (body.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b),
    };
  }).toEqual({
    startDate: targetWeekSecondDate,
    tourId: tour.id,
    employeeIds: [plannedEmployee.id],
  });
});

test("allows manually adding an employee to an existing appointment through the appointment form", async ({ page }) => {
  const customer = await createCustomerFixture("FT01-MANUAL-SWAP-CUST");
  const replacementEmployee = await createEmployeeFixture("FT01-MANUAL-SWAP-B");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: getRelativeBerlinDate(4),
    employeeIds: [],
  });
  await seedAppointmentFormNoise("FT01-MANUAL-SWAP", getRelativeBerlinDate(4));

  await openExistingAppointment(page, appointment.id);

  const detailBefore = await page.request.get(`/api/appointments/${appointment.id}`);
  expect(detailBefore.ok()).toBeTruthy();
  const beforePayload = await detailBefore.json() as { version: number };
  await expect(page.getByText("Keine Mitarbeiter zugewiesen")).toBeVisible();

  await page.getByTestId("button-add-employee").click();
  await expect(page.getByTestId("list-employee-picker")).toBeVisible();
  await page.getByLabel("Nachname").fill(replacementEmployee.lastName);
  await expect(page.locator('[data-testid^="employee-picker-card-"]')).toHaveCount(1);
  await page.getByTestId(`employee-picker-card-${replacementEmployee.id}`).dblclick();
  await expect(page.getByTestId(`badge-employee-${replacementEmployee.id}`)).toBeVisible();

  await saveExistingAppointment(page, appointment.id);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json();
    return {
      version: body.version,
      employeeIds: (body.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b),
    };
  }).toEqual({
    version: beforePayload.version + 1,
    employeeIds: [replacementEmployee.id],
  });
});

test("keeps existing employees when removing the tour from an existing appointment", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const customer = await createCustomerFixture("FT04-REMOVE-TOUR-CUST");
  const tour = await createTourFixture("#7c3aed");
  const employeeA = await createEmployeeFixture("FT04-REMOVE-TOUR-A");
  const employeeB = await createEmployeeFixture("FT04-REMOVE-TOUR-B");
  const appointment = await createAppointmentFixture({
    customerId: customer.id,
    startDate: nextWeek.weekSecondDate,
    tourId: tour.id,
    employeeIds: [employeeA.id, employeeB.id],
  });
  await seedAppointmentFormNoise("FT04-REMOVE-TOUR", nextWeek.weekSecondDate);

  await openExistingAppointmentInNextWeek(page, appointment.id);
  await expect(page.getByTestId(`badge-employee-${employeeA.id}`)).toBeVisible();
  await expect(page.getByTestId(`badge-employee-${employeeB.id}`)).toBeVisible();

  await page.getByTestId("badge-tour-remove").click();
  await expect(page.getByTestId("dialog-tour-employee-cascade")).toHaveCount(0);
  await saveExistingAppointment(page, appointment.id);

  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json();
    return {
      tourId: body.tourId,
      employeeIds: (body.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b),
    };
  }).toEqual({
    tourId: null,
    employeeIds: [employeeA.id, employeeB.id].sort((a, b) => a - b),
  });
});

test("opens the week preview when an existing appointment without tour later gets a tour with week planning and keeps employees empty after cancel", async ({ page }) => {
  const nextWeek = resolveNextEditableWeek();
  const project = await createProjectFixture({ prefix: "FT04-NO-LANE", name: "FT04 No Lane Projekt" });
  const tour = await createTourFixture("#2563eb");
  const weekEmployee = await createEmployeeFixture("FT04-NO-LANE-WEEK");
  await seedAppointmentFormNoise("FT04-NO-LANE", nextWeek.weekSecondDate);

  await db.insert(tourWeekEmployees).values({
    tourId: tour.id,
    isoYear: nextWeek.isoYear,
    isoWeek: nextWeek.isoWeek,
    employeeId: weekEmployee.id,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: nextWeek.weekSecondDate,
    tourId: null,
    employeeIds: [],
  });

  await openExistingAppointmentInNextWeek(page, appointment.id);
  await page.getByTestId(`badge-tour-select-${tour.id}-add`).click();

  const dialog = page.getByTestId("dialog-tour-employee-cascade");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Wochenplanung fuer Termin uebernehmen");
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.getByTestId(`badge-employee-${weekEmployee.id}`)).toHaveCount(0);

  await saveExistingAppointment(page, appointment.id);
  await expect.poll(async () => {
    const response = await page.request.get(`/api/appointments/${appointment.id}`);
    const body = await response.json();
    return {
      tourId: body.tourId,
      employeeIds: (body.employees as Array<{ id: number }>).map((entry) => entry.id).sort((a, b) => a - b),
    };
  }).toEqual({
    tourId: tour.id,
    employeeIds: [],
  });
});
