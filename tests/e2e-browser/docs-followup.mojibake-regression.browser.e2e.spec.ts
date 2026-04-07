/**
 * Test Scope:
 *
 * Feature: Docs Follow-up 2026-03-11
 *
 * Abgedeckte Regeln:
 * - Die geaenderten UI-Pfade fuer Kalenderfilter, Projektfilter und Projektformular zeigen korrekt kodierte Labels.
 * - Die sichtbaren Ziel-Labels der geaenderten Bereiche erscheinen korrekt und nicht als Mojibake.
 *
 * Fehlerfaelle:
 * - Umlaute oder Bezeichner werden in den geaenderten Bereichen fehlerhaft kodiert dargestellt.
 * - Relevante Labels in Kalender-, Projektlisten- oder Projektformular-Pfaden regressieren sichtbar.
 *
 * Ziel:
 * Die geaenderten UI-Pfade browserseitig gegen erneute Mojibake-Regressions absichern.
 */
import { expect, test } from "@playwright/test";

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

test("keeps changed calendar and project labels free of mojibake", async ({ page }) => {
  const customer = await createCustomerFixture("FT02-BROWSER-MOJIBAKE");
  const project = await createProjectFixture({
    prefix: "FT02-BROWSER-MOJIBAKE",
    customerId: customer.id,
    name: "FT02 Mojibake Projekt",
  });
  await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
  });

  await loginAsAdmin(page);

  await expect(page.getByText("Planung drucken")).toBeVisible();
  await expect(page.getByTestId("input-tour-print-week-count")).toBeVisible();
  await expect(page.getByText("Nächste Woche")).toBeVisible();

  await page.getByTestId("nav-projekte").click();
  await expect(page.getByText("Kunde Nr.")).toBeVisible();
  await expect(page.getByText("Auftrag Nr.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Kunde Nr." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Auftrag Nr." })).toBeVisible();

  await page.getByTestId(`project-card-${project.id}`).dblclick();
  await expect(page.getByTestId("project-description-tabs")).toBeVisible();
  await expect(page.getByText("Anmerkungen")).toBeVisible();
});
