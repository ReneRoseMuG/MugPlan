/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Leser sehen in der Projektliste keinen Create-Einstieg.
 * - Leser können bestehende Projekte weiter öffnen.
 * - Das Projektformular bleibt für Leser rein lesend ohne Save/Delete-, Relations-, Termin-, Tag- und Notiz-Mutationen.
 *
 * Fehlerfälle:
 * - Die Projektliste zeigt für Leser weiterhin den Button zur Projektanlage.
 * - Bestehende Projekte lassen sich für Leser nicht mehr öffnen.
 * - Das Projektformular zeigt für Leser weiterhin mutierende Aktionen.
 *
 * Ziel:
 * Die Leser-Readonly-Regeln für Projektliste und Projektformular browserseitig absichern.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  createCustomerFixture,
  createProjectFixture,
} from "../helpers/testDataFactory";
import { loginAsReader, resetBrowserSuiteState } from "../helpers/browserE2e";

async function findProjectEntry(page: Page, project: { id: number; orderNumber?: string | null; name: string }) {
  if (project.orderNumber) {
    await page.locator("#project-filter-order-number").fill(project.orderNumber);
  }
  await page.locator("#project-filter-title").fill(project.name);

  const tableRow = page.getByTestId("table-projects").locator("tbody tr")
    .filter({ hasText: project.name })
    .filter({ hasText: project.orderNumber ?? "" })
    .first();

  if (await tableRow.isVisible().catch(() => false)) {
    return tableRow;
  }

  return page.getByTestId(`project-card-${project.id}`).first();
}

test.describe("Reader projects readonly", () => {
  test.describe.configure({ mode: "serial" });

  let project: Awaited<ReturnType<typeof createProjectFixture>>;

  test.beforeAll(async () => {
    await resetBrowserSuiteState("tests/e2e-browser/reader-project-readonly.browser.e2e.spec.ts");

    const customer = await createCustomerFixture("READER-PROJ-CUST");
    project = await createProjectFixture({
      prefix: "READER-PROJ",
      customerId: customer.id,
      name: "Reader Projekt Readonly",
    });
  });

  test("hides the create entrypoint in the project list for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-projekte").click();
    await expect(page.getByTestId("button-new-project")).toHaveCount(0);
  });

  test("opens project forms in readonly mode for readers", async ({ page }) => {
    await loginAsReader(page);

    await page.getByTestId("nav-projekte").click();
    const entry = await findProjectEntry(page, project);
    await expect(entry).toBeVisible();
    await entry.dblclick();

    await expect(page.getByTestId("project-readonly-alert")).toHaveCount(0);
    await expect(page.getByTestId("button-save-project")).toHaveCount(0);
    await expect(page.getByTestId("button-delete-project")).toHaveCount(0);
    await expect(page.getByTestId("button-select-customer")).toHaveCount(0);
    await expect(page.getByTestId("button-new-appointment-from-project")).toHaveCount(0);
    await expect(page.getByTestId("project-tag-picker-button-add")).toHaveCount(0);
    await expect(page.getByTestId("button-new-note")).toHaveCount(0);
  });
});
