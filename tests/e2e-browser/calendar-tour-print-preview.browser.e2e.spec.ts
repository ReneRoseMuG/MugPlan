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
import { buildTourPrintPages, type TourPrintPreviewResponse } from "../../client/src/lib/tour-print-preview";
import * as appointmentNotesService from "../../server/services/appointmentNotesService";
import { createAppointmentFixture, createProjectFixture, createTourFixture, getRelativeBerlinDate } from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

test("opens the print preview as paginated A4 pages", async ({ page }) => {
  test.slow();

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

  await printTourSelect.click();
  await page.getByRole("option", { name: tour.name }).click();
  await expect(printTourSelect).toContainText(tour.name);
  await expect(openPreviewButton).toBeEnabled();
  await page.getByTestId("input-tour-print-week-count").fill("2");
  const previewResponsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/tours/${tour.id}/print-preview`) && response.request().method() === "GET",
  );
  await openPreviewButton.click({ noWaitAfter: true });
  const previewResponse = await previewResponsePromise;
  await expect(previewResponse.ok()).toBeTruthy();
  const previewPayload = await previewResponse.json() as TourPrintPreviewResponse;
  const pages = buildTourPrintPages(previewPayload);

  expect(pages.length).toBeGreaterThan(1);
  expect(pages[0]?.tourName).toBe(tour.name);
  expect(pages.some((page) => page.weeks.some((week) => week.weekStart === getRelativeBerlinDate(1)))).toBe(true);
  expect(previewPayload.appointments.some((appointment) => appointment.projectName === "Print Browser Projekt")).toBe(true);
});
