/**
 * Test Scope:
 *
 * Feature: FT31 - Druckvorschau Wochenkalender fuer Tourmitarbeiter
 *
 * Abgedeckte Regeln:
 * - Der Wochenkalender oeffnet die Tour-Druckvorschau ueber die Footer-Steuerung.
 * - Die Vorschau zeigt mehrere physische A4-Seiten mit Seitennavigation.
 * - Die aktive Seite bleibt sichtbar und der Browser-Druckpfad wird generisch getrennt.
 *
 * Fehlerfaelle:
 * - Die Vorschau zeigt wieder nur einen langen Scrollblock mit "Seite 1 von 1".
 * - Die Seitennavigation oder die paginierte Seitentrennung geht verloren.
 *
 * Ziel:
 * Den paginierten Browser-Workflow der Tour-Druckvorschau Ende-zu-Ende absichern.
 */
import { expect, test } from "@playwright/test";
import * as appointmentNotesService from "../../server/services/appointmentNotesService";
import { createAppointmentFixture, createProjectFixture, createTourFixture, getRelativeBerlinDate } from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("opens the print preview as paginated A4 pages", async ({ page }) => {
  const tour = await createTourFixture("#2266aa");
  const project = await createProjectFixture({ prefix: "FT31-BROWSER", name: "Print Browser Projekt" });

  for (let index = 0; index < 14; index += 1) {
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      endDate: getRelativeBerlinDate(2),
      tourId: tour.id,
    });

    await appointmentNotesService.createAppointmentNote(appointment!.id, {
      title: `Druckhinweis ${index + 1}`,
      body: "<p>Nur fuer Druck sichtbar</p>",
      print: true,
      cardColor: "#ffcc66",
    });
  }

  await loginAsAdmin(page);
  await page.getByRole("button", { name: /Woche/i }).click();

  const printTourSelect = page.getByTestId("select-tour-print-preview");
  const openPreviewButton = page.getByTestId("button-open-tour-print-preview");
  const previewDialog = page.getByTestId("dialog-tour-print-preview");
  const pageIndicator = page.getByTestId("tour-print-preview-page-indicator");
  const pageTitle = page.getByTestId("tour-print-preview-page-title");
  const nextPageButton = page.getByTestId("button-tour-print-preview-next");
  const prevPageButton = page.getByTestId("button-tour-print-preview-prev");

  await printTourSelect.click();
  await page.getByRole("option", { name: tour.name }).click();
  await expect(printTourSelect).toContainText(tour.name);
  await expect(openPreviewButton).toBeEnabled();
  await page.getByTestId("input-tour-print-week-count").fill("2");

  await openPreviewButton.click();
  await expect(previewDialog).toBeVisible();
  await expect(pageIndicator).toContainText(/Seite 1 von [2-9]\d*/, { timeout: 30_000 });
  await expect(pageTitle).toContainText(tour.name);
  await expect(page.getByTestId("tour-print-preview-active-page-shell")).toContainText("Print Browser Projekt");
  await expect(nextPageButton).toBeEnabled();
  await expect(prevPageButton).toBeDisabled();

  await nextPageButton.click();
  await expect(pageIndicator).toContainText(/Seite 2 von [2-9]\d*/);
  await expect(pageTitle).toContainText("Seite 2");
  await expect(prevPageButton).toBeEnabled();
  await expect(previewDialog).toContainText("Zusatzinformationen");
  await expect(previewDialog).toContainText("Druckhinweis 1");
});
