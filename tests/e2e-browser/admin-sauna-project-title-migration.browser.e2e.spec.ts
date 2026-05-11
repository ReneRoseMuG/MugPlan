/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein Admin kann den Migrationsview unter Backup & Dump -> Migrationen im echten Browser öffnen.
 * - Die Vorschau zeigt echte sichtbare Ausgangsdaten aus Projekt, Auftrag und Sauna-Artikelposition.
 * - Die Ergebnismenge enthält den sichtbaren Ziel-Projekttitel aus dem Sauna-Modell.
 * - Der Apply-Einstieg wird nach erfolgreicher Vorschau freigeschaltet.
 *
 * Fehlerfälle:
 * - Der Migrationstab fehlt oder der Preview-Klickpfad liefert keine sichtbaren Daten.
 *
 * Ziel:
 * Die Browser-UI des Admin-Korrekturworkflows bis zur Preview absichern.
 * Der Apply-Contract bleibt serverseitig über den Integrationstest abgedeckt, weil der fachliche
 * Sauna-Titel-Nutzerflow inzwischen im Projekt-Speichern-Review liegt.
 */
import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import {
  createCustomerFixture,
  createProductFixture,
  createProjectFixtureWithOverrides,
  createProjectOrderItemFixture,
} from "../helpers/testDataFactory";

const suitePath = "tests/e2e-browser/admin-sauna-project-title-migration.browser.e2e.spec.ts";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState(suitePath);
});

async function openMigrationPane(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-einstellungen").click();
  await expect(page.getByTestId("settings-landing-page")).toBeVisible();
  await page.getByTestId("nav-item-backup").click();
  await expect(page.getByTestId("settings-pane-backup")).toBeVisible();
  await page.getByTestId("backup-inner-tab-migrationen").click();
  await expect(page.getByTestId("correction-workflow-admin-panel")).toBeVisible();
}

test("zeigt echte Migrationsdaten und schaltet den Apply-Einstieg frei", async ({ page }) => {
  const oldProjectName = "E2E Sauna Migration Alter Titel";
  const targetProjectName = "E2E Sauna Modell Ziel Titel";
  const orderNumber = "E2E-SAUNA-001";

  const customer = await createCustomerFixture("E2E-SAUNA-MIG-CUST");
  const product = await createProductFixture({
    categoryName: "Fass Saunen",
    name: targetProjectName,
    description: "Sichtbares Sauna-Modell für die Admin-Migration.",
  });
  const project = await createProjectFixtureWithOverrides({
    prefix: "E2E-SAUNA-MIG-PROJ",
    customerId: customer.id,
    name: oldProjectName,
    orderNumber,
  });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    productId: product.id,
  });

  await openMigrationPane(page);

  const panel = page.getByTestId("correction-workflow-admin-panel");
  await expect(page.getByTestId("button-apply-sauna-project-title-migration")).toBeDisabled();

  await Promise.all([
    page.waitForResponse((response) => (
      response.url().includes("/api/admin/correction-workflows/sauna-project-title/preview")
      && response.request().method() === "POST"
      && response.ok()
    )),
    page.getByTestId("button-preview-sauna-project-title-migration").click(),
  ]);

  await expect(page.getByTestId("sauna-project-title-migration-preview")).toBeVisible();
  await expect(panel).toContainText("Ausgangsmenge");
  await expect(panel).toContainText("Ergebnismenge");
  await expect(panel).toContainText(orderNumber);
  await expect(panel).toContainText(String(project.id));
  await expect(panel).toContainText(oldProjectName);
  await expect(panel).toContainText(targetProjectName);
  await expect(page.getByTestId("button-apply-sauna-project-title-migration")).toBeEnabled();

});
