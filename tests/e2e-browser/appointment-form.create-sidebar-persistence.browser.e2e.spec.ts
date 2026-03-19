/**
 * Test Scope:
 *
 * Feature: FT01/FT04/FT13/FT24 - Neuer Termin mit Sidebar-Drafts
 *
 * Abgedeckte Regeln:
 * - Ein neuer Termin aus dem Tour-Kontext zeigt die rechte Sidebar, die selektierte Tour und vorbefuellte Tour-Mitarbeiter.
 * - Tags, Notizen und Terminanhaenge lassen sich im Neuer-Termin-Formular vor dem ersten Save bedienen.
 * - Nach dem ersten Save werden Tag, Notiz und Terminanhang dem erzeugten Termin korrekt zugeordnet.
 * - Beim erneuten Oeffnen im Edit-Modus stehen dieselben Daten wieder in der Sidebar zur Verfuegung.
 *
 * Fehlerfaelle:
 * - Die Create-Sidebar fehlt im Tour- oder Projektkontext.
 * - Tour-Mitarbeiter werden trotz initialTourId nicht vorbefuellt.
 * - Draft-Tags, Draft-Notizen oder pending Terminanhaenge gehen beim ersten Save verloren.
 *
 * Ziel:
 * Browser-E2E fuer die angeglichene Create-UX und die Persistenz der Create-Sidebar-Daten bis zum Reopen absichern.
 */
import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";
import {
  assignEmployeesToTourFixture,
  createCustomerFixture,
  createEmployeeFixture,
  createTagFixture,
  createTourFixture,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function openNewAppointmentFromTourLane(page: Page, tourId: number) {
  await loginAsAdmin(page);
  const button = page.locator(`[data-testid^="button-new-appointment-week-"][data-testid$="-lane-tour-${tourId}"]`).first();
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

test("shows sidebar and prefilled tour employees for a new appointment opened from a tour lane", async ({ page }) => {
  const tour = await createTourFixture("#226688");
  const employee = await createEmployeeFixture("FT01-CREATE-TOUR");
  await assignEmployeesToTourFixture(tour.id, [employee]);

  await openNewAppointmentFromTourLane(page, tour.id);

  await expect(page.getByTestId("appointment-form-sidebar")).toBeVisible();
  await expect(page.getByTestId("badge-tour")).toBeVisible();
  await expect(page.getByTestId(`badge-employee-${employee.id}`)).toBeVisible();
  await expect(page.locator('[data-testid="section-tour-picker"]')).toHaveCount(0);
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
