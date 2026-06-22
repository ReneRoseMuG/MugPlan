/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E (Playwright)
 *
 * Realitätsgrad:
 * - Echte Browserinteraktion, echte Routen, echte API-Antworten, echte Testdaten.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Browser / Baseline core / Storage none. Eindeutige Tokens (ABI-E2E-...) gegen Restdaten.
 *
 * Abgedeckte Regeln:
 * - „Liste öffnen" an einer Produktionsplanungs-Gruppe öffnet einen neuen Browser-Tab mit der gefilterten Auftragsliste.
 * - Der neue Tab zeigt das Projekt mit dem Ziel-Item und blendet ein Projekt mit anderem Item aus (Identität, Negativbeispiel).
 *
 * Fehlerfälle:
 * - Der Absprung öffnet keinen Tab oder zeigt das falsche/zusätzliche Projekt.
 *
 * Ziel:
 * Den sichtbaren Absprung von der Produktionsplanung in die item-gefilterte Auftragsliste Ende-zu-Ende absichern.
 */
import { expect, test, type Page } from "./fixtures";
import { eq } from "drizzle-orm";

import { db } from "../../server/db";
import { productCategories } from "../../shared/schema";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/reports.itemAuftragsliste.browser.e2e.spec.ts");
});

async function openReports(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
}

async function fillProduktionsplanungDateRange(page: Page, fromDate: string, toDate: string) {
  const dateToggle = page.getByTestId("toggle-reports-produktionsplanung-date");
  await expect(dateToggle).toBeVisible();
  if ((await dateToggle.getAttribute("data-state")) !== "on") {
    await dateToggle.click();
  }
  await page.getByTestId("reports-produktionsplanung-from-date").fill(fromDate);
  await page.getByTestId("reports-produktionsplanung-to-date").fill(toDate);
}

async function createItemProjectFixture(params: {
  prefix: string;
  date: string;
  productId: number;
  customerName: string;
}) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${params.prefix}-CUST`,
    fullName: params.customerName,
  });
  const project = await createProjectFixture({
    prefix: `${params.prefix}-PROJ`,
    customerId: customer.id,
    name: `${params.prefix} Projekt`,
  });
  const orderNumber = project.orderNumber;
  if (!orderNumber) {
    throw new Error("Expected order number for item project fixture.");
  }
  await createAppointmentFixture({ projectId: project.id, startDate: params.date });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    productId: params.productId,
    quantity: 1,
  });
  return { customer, project };
}

test("opens the filtered Auftragsliste for a production-planning group in a new browser tab", async ({ page }) => {
  const date = getRelativeBerlinDate(2);
  const targetProduct = await createProductFixture({ categoryName: "Absprung Saunen", name: "Absprung Ziel Sauna" });
  const otherProduct = await createProductFixture({ categoryName: "Absprung Saunen", name: "Absprung Andere Sauna" });

  await db
    .update(productCategories)
    .set({ isDefault: true, isActive: true })
    .where(eq(productCategories.id, targetProduct.categoryId));

  await createItemProjectFixture({ prefix: "ABI-E2E-TARGET", date, productId: targetProduct.id, customerName: "Absprung Ziel Kunde" });
  await createItemProjectFixture({ prefix: "ABI-E2E-OTHER", date, productId: otherProduct.id, customerName: "Absprung Andere Kunde" });

  await openReports(page);
  await fillProduktionsplanungDateRange(page, date, date);
  await page.getByTestId("button-reports-produktionsplanung-generate").click();

  await expect(page.getByTestId("reports-produktionsplanung-overlay")).toBeVisible();
  const categories = page.getByTestId("reports-produktionsplanung-categories");
  await expect(categories).toContainText("Absprung Ziel Sauna");

  const openListButton = page.getByTestId(
    `reports-produktionsplanung-categories-open-list-${targetProduct.categoryId}-${targetProduct.name}`,
  );
  await expect(openListButton).toBeVisible();

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    openListButton.click(),
  ]);
  await popup.waitForLoadState();

  const popupCards = popup.getByTestId("reports-auftragsliste-project-cards");
  // Filtert über die Item-Identität: nur das Projekt mit dem Ziel-Produkt erscheint.
  await expect(popupCards).toContainText("Absprung Ziel Sauna");
  await expect(popupCards).toContainText("ABI-E2E-TARGET Projekt");
  await expect(popupCards).not.toContainText("Absprung Andere Sauna");
  await expect(popupCards).not.toContainText("ABI-E2E-OTHER Projekt");
});
