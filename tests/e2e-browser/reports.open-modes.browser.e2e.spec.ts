/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Jeder Report laesst sich sowohl im aktuellen Tab als auch isoliert im neuen Tab oeffnen.
 * - Beide Oeffnungsvarianten zeigen jeweils echte Reportdaten statt nur Container oder Popup-Chrome.
 * - Die Standalone-Reports rendern ohne Sidebar, aber mit Standalone-Header.
 *
 * Fehlerfaelle:
 * - Der neue Tab oeffnet ohne passenden Report oder ohne die ausgewaehlten Filter.
 * - Die gleiche Reportkonfiguration zeigt im Overlay und im neuen Tab unterschiedliche Ergebnisse.
 * - Browser-Tests wuerden nur den Overlay-Container oder einen Popup-Wechsel erkennen, aber keine echten Reportinhalte.
 *
 * Ziel:
 * Die beiden Oeffnungsvarianten der drei FT26-Reports browserseitig auf echte Reportausgabe regressionssicher absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "../../server/db";
import { MANAGED_SPECIAL_MEASURE_TAG_NAME } from "../../shared/appointmentCancellation";
import { componentCategories, productCategories } from "../../shared/schema";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function markReportCategoriesAsDefault(params: {
  productCategoryIds: number[];
  componentCategoryIds: number[];
}) {
  for (const categoryId of params.productCategoryIds) {
    await db
      .update(productCategories)
      .set({ isDefault: true, isActive: true })
      .where(eq(productCategories.id, categoryId));
  }

  for (const categoryId of params.componentCategoryIds) {
    await db
      .update(componentCategories)
      .set({ isDefault: true, isActive: true })
      .where(eq(componentCategories.id, categoryId));
  }
}

async function openReports(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
}

async function openReportPopup(page: Page, testId: string) {
  const popupPromise = page.waitForEvent("popup");
  await page.getByTestId(testId).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup.getByTestId("standalone-header")).toBeVisible();
  await expect(popup.getByTestId("sidebar")).toHaveCount(0);
  return popup;
}

async function createReportProject(params: {
  prefix: string;
  appointmentDate: string;
  tourId?: number | null;
  product?: { categoryName: string; name: string; shortCode?: string | null };
  component?: { categoryName: string; name: string; shortCode?: string | null };
  projectTagIds?: number[];
}) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${params.prefix}-CUST`,
    firstName: "Browser",
    lastName: params.prefix,
    fullName: `Browser ${params.prefix}`,
    postalCode: "26135",
    city: "Oldenburg",
  });
  const project = await createProjectFixture({
    prefix: `${params.prefix}-PROJ`,
    customerId: customer.id,
    name: `${params.prefix} Projekt`,
  });

  const orderNumber = project.orderNumber;
  if (!orderNumber) {
    throw new Error("Expected order number for report browser fixture.");
  }

  await createAppointmentFixture({
    projectId: project.id,
    startDate: params.appointmentDate,
    tourId: params.tourId ?? null,
  });

  for (const tagId of params.projectTagIds ?? []) {
    await attachProjectTagFixture(project.id, tagId);
  }

  if (params.product) {
    const product = await createProductFixture({
      categoryName: params.product.categoryName,
      name: params.product.name,
      shortCode: params.product.shortCode ?? null,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      productId: product.id,
      quantity: 1,
    });
  }

  if (params.component) {
    const component = await createComponentFixture({
      categoryName: params.component.categoryName,
      name: params.component.name,
      shortCode: params.component.shortCode ?? null,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      componentId: component.id,
      quantity: 1,
    });
  }

  return { customer, project };
}

test("opens the vorlaufliste both inline and in a standalone tab with real report rows", async ({ page }) => {
  const inRangeDate = getRelativeBerlinDate(2);
  const outOfRangeDate = getRelativeBerlinDate(40);
  const reportProduct = await createProductFixture({ categoryName: "Fass Saunen", name: "OpenMode Lookup Sauna" });
  const reportComponent = await createComponentFixture({ categoryName: "Fenster", name: "OpenMode Lookup Fenster" });

  await markReportCategoriesAsDefault({
    productCategoryIds: [reportProduct.categoryId],
    componentCategoryIds: [reportComponent.categoryId],
  });

  const visibleProject = await createReportProject({
    prefix: "OPEN-VL-SICHTBAR",
    appointmentDate: inRangeDate,
    product: { categoryName: "Fass Saunen", name: "OpenMode Vorlauf Sauna" },
    component: { categoryName: "Fenster", name: "OpenMode Vorlauf Fenster" },
  });
  const hiddenProject = await createReportProject({
    prefix: "OPEN-VL-SPAETER",
    appointmentDate: outOfRangeDate,
    component: { categoryName: "Fenster", name: "OpenMode Vorlauf Spaet" },
  });

  await openReports(page);
  await page.getByTestId("reports-vorlaufliste-from-date").fill(inRangeDate);
  await page.getByTestId("reports-vorlaufliste-to-date").fill(inRangeDate);
  await page.getByTestId("button-reports-vorlaufliste-generate").click();

  const vorlauflisteTable = page.getByTestId("table-reports-vorlaufliste");
  await expect(vorlauflisteTable).toBeVisible();
  await expect(vorlauflisteTable).toContainText(visibleProject.customer.fullName ?? "");
  await expect(vorlauflisteTable).toContainText("OpenMode Vorlauf Sauna");
  await expect(vorlauflisteTable).toContainText("OpenMode Vorlauf Fenster");
  await expect(vorlauflisteTable).not.toContainText(hiddenProject.customer.fullName ?? "");

  await page.getByTestId("button-reports-back").click();

  const popup = await openReportPopup(page, "button-reports-vorlaufliste-open-tab");
  const popupTable = popup.getByTestId("table-reports-vorlaufliste");
  await expect(popupTable).toBeVisible();
  await expect(popupTable).toContainText(visibleProject.customer.fullName ?? "");
  await expect(popupTable).toContainText("OpenMode Vorlauf Sauna");
  await expect(popupTable).toContainText("OpenMode Vorlauf Fenster");
  await expect(popupTable).not.toContainText(hiddenProject.customer.fullName ?? "");
  await popup.close();
});

test("opens the produktionsplanung both inline and in a standalone tab with real category and card content", async ({ page }) => {
  const inRangeDate = getRelativeBerlinDate(3);
  const outOfRangeDate = getRelativeBerlinDate(45);
  const specialMeasureTag = await createExactTagFixture(MANAGED_SPECIAL_MEASURE_TAG_NAME, "#1e3a8a");
  const reportProduct = await createProductFixture({ categoryName: "Fass Saunen", name: "OpenMode PP Lookup Sauna" });
  const reportComponent = await createComponentFixture({ categoryName: "Fenster", name: "OpenMode PP Lookup Fenster" });

  await markReportCategoriesAsDefault({
    productCategoryIds: [reportProduct.categoryId],
    componentCategoryIds: [reportComponent.categoryId],
  });

  const visibleProject = await createReportProject({
    prefix: "OPEN-PP-SICHTBAR",
    appointmentDate: inRangeDate,
    projectTagIds: [specialMeasureTag.id],
    product: { categoryName: "Fass Saunen", name: "OpenMode Produktion Sauna", shortCode: "OPS" },
    component: { categoryName: "Fenster", name: "OpenMode Produktion Fenster", shortCode: "OPF" },
  });
  const hiddenProject = await createReportProject({
    prefix: "OPEN-PP-SPAETER",
    appointmentDate: outOfRangeDate,
    component: { categoryName: "Fenster", name: "OpenMode Produktion Spaet" },
  });

  await openReports(page);
  await page.getByTestId("reports-produktionsplanung-from-date").fill(inRangeDate);
  await page.getByTestId("reports-produktionsplanung-to-date").fill(inRangeDate);
  await page.getByTestId("button-reports-produktionsplanung-generate").click();

  const categories = page.getByTestId("reports-produktionsplanung-categories");
  const cards = page.getByTestId("reports-produktionsplanung-project-cards");
  await expect(categories).toContainText("OpenMode Produktion Sauna");
  await expect(categories).toContainText("OpenMode Produktion Fenster");
  await expect(cards).toContainText(visibleProject.customer.fullName ?? "");
  await expect(cards).not.toContainText(hiddenProject.customer.fullName ?? "");

  await page.getByTestId("button-reports-produktionsplanung-back").click();

  const popup = await openReportPopup(page, "button-reports-produktionsplanung-open-tab");
  const popupCategories = popup.getByTestId("reports-produktionsplanung-categories");
  const popupCards = popup.getByTestId("reports-produktionsplanung-project-cards");
  await expect(popupCategories).toContainText("OpenMode Produktion Sauna");
  await expect(popupCategories).toContainText("OpenMode Produktion Fenster");
  await expect(popupCards).toContainText(visibleProject.customer.fullName ?? "");
  await expect(popupCards).not.toContainText(hiddenProject.customer.fullName ?? "");
  await popup.close();
});

test("opens the auftragsliste both inline and in a standalone tab with real project cards", async ({ page }) => {
  const inRangeDate = getRelativeBerlinDate(4);
  const outOfRangeDate = getRelativeBerlinDate(50);
  const tour = await createTourFixture("#0f766e");
  const reportProduct = await createProductFixture({ categoryName: "Fass Saunen", name: "OpenMode AL Lookup Sauna" });
  const reportComponent = await createComponentFixture({ categoryName: "Fenster", name: "OpenMode AL Lookup Fenster" });

  await markReportCategoriesAsDefault({
    productCategoryIds: [reportProduct.categoryId],
    componentCategoryIds: [reportComponent.categoryId],
  });

  const visibleProject = await createReportProject({
    prefix: "OPEN-AL-SICHTBAR",
    appointmentDate: inRangeDate,
    tourId: tour.id,
    product: { categoryName: "Fass Saunen", name: "OpenMode Auftrag Sauna", shortCode: "OAS" },
    component: { categoryName: "Fenster", name: "OpenMode Auftrag Fenster", shortCode: "OAF" },
  });
  const hiddenProject = await createReportProject({
    prefix: "OPEN-AL-SPAETER",
    appointmentDate: outOfRangeDate,
    component: { categoryName: "Fenster", name: "OpenMode Auftrag Spaet" },
  });

  await openReports(page);
  await page.getByTestId("reports-auftragsliste-from-date").fill(inRangeDate);
  await page.getByTestId("reports-auftragsliste-to-date").fill(inRangeDate);
  await page.getByTestId("button-reports-auftragsliste-generate").click();

  const cards = page.getByTestId("reports-auftragsliste-project-cards");
  await expect(cards).toContainText(visibleProject.customer.fullName ?? "");
  await expect(cards).toContainText("OpenMode Auftrag Sauna");
  await expect(cards).toContainText("OpenMode Auftrag Fenster");
  await expect(cards).toContainText(tour.name);
  await expect(cards).not.toContainText(hiddenProject.customer.fullName ?? "");

  await page.getByTestId("button-reports-auftragsliste-back").click();

  const popup = await openReportPopup(page, "button-reports-auftragsliste-open-tab");
  const popupCards = popup.getByTestId("reports-auftragsliste-project-cards");
  await expect(popupCards).toContainText(visibleProject.customer.fullName ?? "");
  await expect(popupCards).toContainText("OpenMode Auftrag Sauna");
  await expect(popupCards).toContainText("OpenMode Auftrag Fenster");
  await expect(popupCards).toContainText(tour.name);
  await expect(popupCards).not.toContainText(hiddenProject.customer.fullName ?? "");
  await popup.close();
});
