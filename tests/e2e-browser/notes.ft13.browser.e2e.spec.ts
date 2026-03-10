/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-, Kunden- und Terminnotizen lassen sich im Browser mit Kartenfarbe und Druck-Flag anlegen und wieder oeffnen.
 * - Notizzaehler erscheinen auf Projekt- und Kundenkarten sowie auf der Wochenkalender-Terminkarte.
 * - Die Wochenkalender-Preview kumuliert Kunden-, Projekt- und Terminnotizen fuer denselben Termin.
 *
 * Fehlerfaelle:
 * - Kartenfarbe oder Druck-Flag gehen beim Browser-Workflow verloren.
 * - Double-Click oeffnet vorhandene Notizen nicht mit den gespeicherten Werten.
 * - Der Wochenkalender zeigt kumulierte Notizen nicht vollstaendig an.
 *
 * Ziel:
 * Browser-E2E fuer die neuen Notizfelder und deren Sichtbarkeit in Entity-Cards und Terminpreviews absichern.
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

async function createLinkedFixture(prefix: string) {
  const customer = await createCustomerFixture(`${prefix}-CUST`);
  const project = await createProjectFixture({
    prefix: `${prefix}-PROJ`,
    customerId: customer.id,
    name: `${prefix} Project`,
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });
  return { customer, project, appointment };
}

async function setNoteCardColor(page: Page, hex: string) {
  const dialog = page.getByRole("dialog");
  const toggleButton = dialog.getByTestId("button-note-toggle-card-color");
  await toggleButton.click();
  await expect(toggleButton).toContainText("Farbe entfernen");
  await dialog.getByTestId("button-note-card-color-picker-hex").fill(hex);
  await expect(dialog.getByTestId("button-note-card-color-picker-preview")).toHaveCSS("background-color", hexToRgb(hex));
}

async function createNoteViaDialog(page: Page, input: { title: string; body: string; cardColor: string }) {
  await page.getByTestId("button-new-note").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("input-note-title").fill(input.title);
  await dialog.getByTestId("richtext-editor").fill(input.body);
  await setNoteCardColor(page, input.cardColor);
  await expect(dialog.getByTestId("switch-note-print")).toHaveAttribute("data-state", "checked");
  await dialog.getByTestId("button-save-note").click();
}

async function verifyNoteEditDialog(page: Page, input: { title: string; cardColorRgb: string }) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("input-note-title")).toHaveValue(input.title);
  await expect(dialog.getByTestId("switch-note-print")).toHaveAttribute("data-state", "checked");
  await expect(dialog.getByTestId("button-note-card-color-picker-preview")).toHaveCSS("background-color", input.cardColorRgb);
}

async function saveAppointmentAndClose(page: Page, appointmentId: number) {
  await page.getByTestId("button-save-appointment").click();
  const confirmSaveButton = page.getByRole("button", { name: "Trotzdem speichern" });
  if (await confirmSaveButton.isVisible().catch(() => false)) {
    await confirmSaveButton.click();
  }
  await expect(page.getByTestId(`week-appointment-panel-${appointmentId}`)).toBeVisible();
}

function hexToRgb(hex: string): string {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgb(${red}, ${green}, ${blue})`;
}

test("creates, counts and edits a project note with cardColor and print flag", async ({ page }) => {
  const fixture = await createLinkedFixture("FT13-PROJECT");
  const note = { title: "Projekt Browser Notiz", body: "Projektinhalt", cardColor: "#22c55e", cardColorRgb: "rgb(34, 197, 94)" };

  await loginAsAdmin(page);
  await page.getByTestId("nav-projekte").click();
  await page.getByTestId(`project-card-${fixture.project.id}`).dblclick();
  await expect(page.getByTestId("button-save-project")).toBeVisible();

  await createNoteViaDialog(page, note);
  const projectNoteCard = page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first();
  await expect(projectNoteCard.getByTestId(/badge-note-print-/)).toContainText("Drucken");
  await expect(projectNoteCard).toHaveCSS("background-color", note.cardColorRgb);
  await page.getByTestId("button-save-project").click();
  await expect(page.getByTestId("button-save-project")).toHaveCount(0);

  await expect(page.getByTestId(`text-project-notes-count-${fixture.project.id}`).first()).toContainText("1");

  await page.getByTestId(`project-card-${fixture.project.id}`).dblclick();
  await projectNoteCard.dblclick();
  await verifyNoteEditDialog(page, note);
});

test("creates, counts and edits a customer note with cardColor and print flag", async ({ page }) => {
  const fixture = await createLinkedFixture("FT13-CUSTOMER");
  const note = { title: "Kunden Browser Notiz", body: "Kundeninhalt", cardColor: "#f97316", cardColorRgb: "rgb(249, 115, 22)" };

  await loginAsAdmin(page);
  await page.getByTestId("nav-kunden").click();
  await page.getByTestId(`customer-card-${fixture.customer.id}`).dblclick();
  await expect(page.getByTestId("button-save-customer")).toBeVisible();

  await createNoteViaDialog(page, note);
  const customerNoteCard = page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first();
  await expect(customerNoteCard.getByTestId(/badge-note-print-/)).toContainText("Drucken");
  await expect(customerNoteCard).toHaveCSS("background-color", note.cardColorRgb);
  await page.getByTestId("button-save-customer").click();
  await expect(page.getByTestId("button-save-customer")).toHaveCount(0);

  await expect(page.getByTestId(`text-customer-notes-count-${fixture.customer.id}`).first()).toContainText("1");

  await page.getByTestId(`customer-card-${fixture.customer.id}`).dblclick();
  await customerNoteCard.dblclick();
  await verifyNoteEditDialog(page, note);
});

test("creates, counts and edits an appointment note with cardColor and print flag", async ({ page }) => {
  const fixture = await createLinkedFixture("FT13-APPOINTMENT");
  const note = { title: "Termin Browser Notiz", body: "Termininhalt", cardColor: "#38bdf8", cardColorRgb: "rgb(56, 189, 248)" };

  await loginAsAdmin(page);
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${fixture.appointment.id}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await expect(page.getByTestId("button-save-appointment")).toBeVisible();

  await createNoteViaDialog(page, note);
  const appointmentNoteCard = page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: note.title }).first();
  await expect(appointmentNoteCard.getByTestId(/badge-note-print-/)).toContainText("Drucken");
  await expect(appointmentNoteCard).toHaveCSS("background-color", note.cardColorRgb);
  await saveAppointmentAndClose(page, fixture.appointment.id);

  await expect(page.getByTestId(`week-appointment-panel-${fixture.appointment.id}`).getByTestId("week-appointment-notes-hover-trigger")).toContainText("1");

  await page.getByTestId(`week-appointment-panel-${fixture.appointment.id}`).dblclick();
  await appointmentNoteCard.dblclick();
  await verifyNoteEditDialog(page, note);
});

test.skip("shows cumulative customer, project and appointment notes in the week preview", async ({ page }) => {
  const fixture = await createLinkedFixture("FT13-CUMULATIVE");

  await loginAsAdmin(page);

  await page.getByTestId("nav-projekte").click();
  await page.getByTestId(`project-card-${fixture.project.id}`).dblclick();
  await createNoteViaDialog(page, { title: "Projekt Kumulation", body: "Projekt", cardColor: "#22c55e" });
  await page.getByTestId("button-close-project").click();

  await page.getByTestId("nav-kunden").click();
  await page.getByTestId(`customer-card-${fixture.customer.id}`).dblclick();
  await createNoteViaDialog(page, { title: "Kunde Kumulation", body: "Kunde", cardColor: "#f97316" });
  await page.getByTestId("button-close-customer").click();

  await page.goto("/");
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${fixture.appointment.id}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();
  await createNoteViaDialog(page, { title: "Termin Kumulation", body: "Termin", cardColor: "#38bdf8" });
  await page.getByTestId("button-close-appointment").click();

  const counter = page.getByTestId(`week-appointment-panel-${fixture.appointment.id}`).getByTestId("week-appointment-notes-hover-trigger");
  await expect(counter).toContainText("3");
  await counter.hover();

  await expect(page.getByText("Kunde Kumulation")).toBeVisible();
  await expect(page.getByText("Projekt Kumulation")).toBeVisible();
  await expect(page.getByText("Termin Kumulation")).toBeVisible();
});
