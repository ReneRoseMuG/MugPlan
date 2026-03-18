/**
 * Test Scope:
 *
 * Feature: FT31 - Druckvorschau Wochenkalender fuer Tourmitarbeiter
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender oeffnet die Tour-Druckvorschau ueber die Footer-Steuerung.
 * - Die Vorschau blaettert zwischen Summary-Seite und Wochenblaettern mit Randnavigation.
 * - Wochenseiten zeigen Projektname, Kundendaten und druckbare Notizen mit Farbakzent.
 *
 * Fehlerfaelle:
 * - Die Vorschau zeigt wieder nur die erste Seite abgeschnitten ohne Navigation.
 * - Druckblaetter verlieren Notizinhalte oder druckrelevante Kartendarstellung.
 *
 * Ziel:
 * Die wesentlichen Browser-Workflows der Tour-Druckvorschau Ende-zu-Ende absichern.
 */
import { expect, test } from "@playwright/test";
import * as appointmentNotesService from "../../server/services/appointmentNotesService";
import { createAppointmentFixture, createProjectFixture, createTourFixture, getRelativeBerlinDate } from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("opens the print preview and navigates from summary to weekly pages", async ({ page }) => {
  const tour = await createTourFixture("#2266aa");
  const project = await createProjectFixture({ prefix: "FT31-BROWSER", name: "Print Browser Projekt" });
  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    endDate: getRelativeBerlinDate(2),
    tourId: tour.id,
  });

  await appointmentNotesService.createAppointmentNote(appointment!.id, {
    title: "Druckhinweis",
    body: "<p>Nur fuer Druck sichtbar</p>",
    print: true,
    cardColor: "#ffcc66",
  });

  await loginAsAdmin(page);
  await page.getByRole("button", { name: /Woche/i }).click();

  await page.getByTestId("select-tour-print-preview").click();
  await page.getByRole("option", { name: tour.name }).click();
  await page.getByTestId("input-tour-print-week-count").fill("2");
  await page.getByTestId("button-open-tour-print-preview").click();

  const activePageShell = page.getByTestId("tour-print-preview-active-page-shell");
  await expect(page.getByTestId("dialog-tour-print-preview")).toBeVisible();
  await expect(page.getByTestId("tour-print-preview-page-indicator")).toContainText("Seite 1 von 3");
  await expect(activePageShell.getByTestId("tour-print-summary-page")).toBeVisible();
  await expect(activePageShell.getByTestId("tour-print-summary-page").locator("h2").first()).toContainText(tour.name);

  await page.getByTestId("button-tour-print-preview-next").click();
  await expect(page.getByTestId("tour-print-preview-page-indicator")).toContainText("Seite 2 von 3");
  await expect(activePageShell.getByTestId("tour-print-week-page-1")).toBeVisible();

  await page.getByTestId("button-tour-print-preview-next").click();
  await expect(page.getByTestId("tour-print-preview-page-indicator")).toContainText("Seite 3 von 3");
  await expect(activePageShell.getByTestId("tour-print-week-page-2")).toBeVisible();
  await expect(activePageShell.getByTestId(`tour-print-appointment-card-${appointment!.id}`).first()).toContainText("Print Browser Projekt");
  await expect(activePageShell.getByTestId(`tour-print-day-${getRelativeBerlinDate(1)}`)).toContainText("Nur fuer Druck sichtbar");

  const noteStyles = await activePageShell.getByTestId(`tour-print-note-${appointment!.id}-0`).first().evaluate((element) => ({
    borderColor: window.getComputedStyle(element).borderColor,
    backgroundColor: window.getComputedStyle(element).backgroundColor,
  }));
  expect(noteStyles.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(noteStyles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

  await expect(page.getByTestId("button-tour-print-preview-next")).toBeDisabled();
});
