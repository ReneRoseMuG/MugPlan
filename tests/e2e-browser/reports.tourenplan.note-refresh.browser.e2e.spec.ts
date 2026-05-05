/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Eine zunaechst nicht druckbare Terminnotiz fehlt in der Tourenplan-Druckvorschau.
 * - Wird die `Drucken`-Flag im Termin gesetzt und sowohl Notiz als auch Termin gespeichert, erscheint die Notiz in der erneut geoeffneten Vorschau.
 *
 * Fehlerfaelle:
 * - Die Tourenplan-Vorschau bleibt nach dem Speichern eines Terminnotiz-Updates stale.
 * - Die UI speichert das print-Flag sichtbar, verwendet beim erneuten Oeffnen der Druckvorschau aber weiterhin alte Reportdaten.
 *
 * Ziel:
 * Den echten Browser-Workflow fuer nachtraeglich aktivierte Drucknotizen im Tourenplan regressionssicher absichern.
 */
import { expect, test, type Page } from "@playwright/test";

import * as appointmentNotesService from "../../server/services/appointmentNotesService";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createProjectFixtureWithOverrides,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function fillTourenplanDateRange(page: Page, fromDate: string, toDate = fromDate) {
  const dateToggle = page.getByTestId("toggle-reports-tourenplan-date");
  await expect(dateToggle).toBeVisible();
  if ((await dateToggle.getAttribute("data-state")) !== "on") {
    await dateToggle.click();
  }
  await page.getByTestId("reports-tourenplan-from-date").fill(fromDate);
  await page.getByTestId("reports-tourenplan-to-date").fill(toDate);
}

test("refreshes the Tourenplan preview after enabling print on an existing appointment note", async ({ page }) => {
  const longProjectDescription = [
    "Saunakorpus: ca. 2,45 m tiefes Saunafass aus Thermoholz.",
    "Standfuesse, Spannbaender, Belueftungsgitter und Dichtungen.",
    "Zwei Spots im Vordach inkl. Funktaster.",
    "Dach Runddach aus Aluminium in anthrazit/schwarz mit Abschlussblenden.",
    "Rueckwand geschlossen, Vorderwand mit Tuerausschnitt und Panoramafenster.",
  ].join(" ");
  const longPrintNoteBody = [
    "SONDERMASS 5 m breit, 2,23 m tief.",
    "Premium 4, Virta/Fenix, RAL schw.",
    "Panoramascheiben, Bose Musikbox, Innenausstattung Sonderanfertigung.",
    "Bitte vor Montage alle Massangaben an der Baustelle gegenpruefen.",
  ].join(" ");
  const tour = await createTourFixture("#2266aa");
  const employee = await createEmployeeFixtureWithOverrides({ firstName: "Lena", lastName: "Druck" });
  const fromDate = getRelativeBerlinDate(1);
  const toDate = getRelativeBerlinDate(1);

  const customer = await createCustomerFixtureWithOverrides({
    prefix: "TP-BROWSER-REFRESH",
    fullName: "Browser, Kunde",
    phone: "+49 341 7777",
    postalCode: "04109",
    city: "Leipzig",
    country: "Deutschland",
  });
  const project = await createProjectFixtureWithOverrides({
    prefix: "TP-BROWSER-REFRESH-PROJ",
    customerId: customer.id,
    name: "Browser Refresh Projekt",
    descriptionMd: `<p>${longProjectDescription}</p>`,
  });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: fromDate,
    endDate: toDate,
    tourId: tour.id,
    employeeIds: [employee.id],
  });

  if (!appointment) {
    throw new Error("Expected appointment fixture to be created.");
  }

  await appointmentNotesService.createAppointmentNote(appointment.id, {
    title: "Sonderanfertigung",
    body: `<p>${longPrintNoteBody}</p>`,
    print: false,
    cardColor: "#38bdf8",
  });

  await loginAsAdmin(page);

  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-tourenplan-config-panel")).toBeVisible();
  await page.getByTestId("checkbox-reports-tourenplan-all-tours").click();
  await page.getByTestId(`checkbox-reports-tourenplan-tour-${tour.id}`).click();
  await fillTourenplanDateRange(page, fromDate, toDate);
  await page.getByTestId("button-reports-tourenplan-preview").click();
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeVisible();

  const firstPreviewPage = page.getByTestId("tourenplan-print-preview-active-page-shell").getByTestId("tourenplan-print-page-1");
  await expect(firstPreviewPage).not.toContainText("Sonderanfertigung");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeHidden();

  await page.getByTestId("nav-wochenuebersicht").click();
  const appointmentPanel = page.getByTestId(`week-appointment-panel-${appointment.id}`);
  await expect(appointmentPanel).toBeVisible();
  await appointmentPanel.dblclick();

  const noteCard = page.getByTestId("list-notes").getByTestId(/note-card-/).filter({ hasText: "Sonderanfertigung" }).first();
  await expect(noteCard).toBeVisible();
  await noteCard.dblclick();

  const noteDialog = page.getByRole("dialog");
  const printSwitch = noteDialog.getByTestId("switch-note-print");
  await expect(printSwitch).toHaveAttribute("data-state", "unchecked");
  await printSwitch.click();
  await expect(printSwitch).toHaveAttribute("data-state", "checked");
  await noteDialog.getByTestId("button-save-note").click();

  await expect(noteCard.getByTestId(/badge-note-print-/)).toContainText("Drucken");
  await page.getByTestId("button-save-appointment").click();
  await expect(page.getByTestId(`week-appointment-panel-${appointment.id}`)).toBeVisible();

  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-tourenplan-config-panel")).toBeVisible();
  await page.getByTestId("checkbox-reports-tourenplan-all-tours").click();
  await page.getByTestId(`checkbox-reports-tourenplan-tour-${tour.id}`).click();
  await fillTourenplanDateRange(page, fromDate, toDate);
  await page.getByTestId("button-reports-tourenplan-preview").click();
  await expect(page.getByTestId("dialog-tourenplan-print-preview")).toBeVisible();

  const refreshedPreviewPage = page.getByTestId("tourenplan-print-preview-active-page-shell").getByTestId("tourenplan-print-page-1");
  await expect(refreshedPreviewPage).toContainText("Sonderanfertigung");

  const verticalOverflowPx = await refreshedPreviewPage.evaluate((element) => element.scrollHeight - element.clientHeight);
  expect(verticalOverflowPx).toBe(0);
});
