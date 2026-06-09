/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Kunden- und Projekt-Boards rendern unter hoher Menge nur die aktuelle Seite statt der Vollmenge.
 * - Paging im Board wechselt zwischen Seitenausschnitten.
 * - Filterwechsel setzen das Board-Paging auf Seite 1 zurueck.
 *
 * Fehlerfaelle:
 * - Das Board rendert unter Last weiterhin die Vollmenge.
 * - Seitenwechsel aktualisieren die Kartenmenge nicht.
 * - Filter lassen die Ansicht auf einer alten Seite stehen.
 *
 * Ziel:
 * Browser-E2E-Nachweis fuer belastbares Board-Paging in Kunden- und Projektlisten.
 */
import { expect, test } from "./fixtures";

import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";
import { createAppointmentFixture, createCustomerFixture, createProjectFixture } from "../helpers/testDataFactory";

test.describe("board paging under load", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetBrowserSuiteState();
  });

  test("customers board paginates large result sets and resets on filter", async ({ page }) => {
    for (let index = 0; index < 55; index += 1) {
      await createCustomerFixture(`FT30-BROWSER-CUST-${String(index).padStart(3, "0")}`);
    }

    await loginAsAdmin(page);
    await page.getByTestId("nav-kunden").click();

    const board = page.getByTestId("list-customers");
    const customerCards = board.locator(':scope > [data-testid^="customer-card-"]');
    await expect(customerCards).toHaveCount(50);
    await expect(page.getByTestId("text-customers-page-state")).toContainText("Seite 1 von 2");

    await page.getByTestId("button-customers-page-next").click();
    await expect(page.getByTestId("text-customers-page-state")).toContainText("Seite 2 von 2");
    await expect.poll(async () => customerCards.count()).toBeGreaterThan(0);
    await expect.poll(async () => customerCards.count()).toBeLessThanOrEqual(10);

    await page.locator("#customer-filter-last-name").fill("FT30-BROWSER-CUST-054");
    await expect(page.getByTestId("text-customers-page-state")).toContainText("Seite 1 von 1");
    await expect(customerCards).toHaveCount(1);
  });

  test("projects board paginates large result sets and resets on filter", async ({ page }) => {
    for (let index = 0; index < 55; index += 1) {
      const project = await createProjectFixture({
        prefix: `FT30-BROWSER-PROJ-${String(index).padStart(3, "0")}`,
        name: `FT30 Browser Project ${String(index).padStart(3, "0")}`,
      });
      await createAppointmentFixture({
        projectId: project.id,
        startDate: "2099-12-10",
      });
    }

    await loginAsAdmin(page);
    await page.getByTestId("nav-projekte").click();

    const board = page.getByTestId("list-projects");
    const projectCards = board.locator(':scope > [data-testid^="project-card-"]');
    await expect(projectCards).toHaveCount(50);
    await expect(page.getByTestId("text-projects-page-state")).toContainText("Seite 1 von 2");

    await page.getByTestId("button-projects-page-next").click();
    await expect(page.getByTestId("text-projects-page-state")).toContainText("Seite 2 von 2");
    await expect.poll(async () => projectCards.count()).toBeGreaterThan(0);
    await expect.poll(async () => projectCards.count()).toBeLessThanOrEqual(10);

    await page.locator("#project-filter-title").fill("Project 054");
    await expect(page.getByTestId("text-projects-page-state")).toContainText("Seite 1 von 1");
    await expect(projectCards).toHaveCount(1);
  });
});
