/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Reports-Seite sperrt die Erzeugung ohne Von-Datum und zeigt Vorlaufliste-Daten mit voller, teilweiser und leerer Artikelbelegung sichtbar an.
 * - Shortcodes und Kategorieauswahlen fuer Vorlaufliste und Produkt-Vorlauf bleiben nach Navigation sichtbar erhalten.
 * - Ein geleertes Bis-Datum erweitert die Vorlaufliste bei erneuter Erzeugung wieder auf spaetere Termine.
 * - Der Produkt-Vorlauf zeigt Produkt- und Komponentenbloecke sowie den Sondermass-Block fuer passende Projekte sichtbar an.
 *
 * Fehlerfaelle:
 * - Reports lassen sich trotz leerem Von-Datum starten.
 * - Persistierte Checkbox-Auswahlen oder die Shortcode-Option gehen nach Navigation verloren.
 * - Ein geleertes Bis-Datum bleibt im UI wirkungslos.
 * - Der Produkt-Vorlauf verliert Sondermass- oder Gruppentreffer im Browserfluss.
 *
 * Ziel:
 * Die FT26-Reportsuite aus Anwendersicht ueber Vorlaufliste, Persistenz und Produkt-Vorlauf im Browser regressionssicher absichern.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "../../server/db";
import * as projectsService from "../../server/services/projectsService";
import { MANAGED_SPECIAL_MEASURE_TAG_NAME } from "../../shared/appointmentCancellation";
import { componentCategories, productCategories, tags, type Tag } from "../../shared/schema";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState();
});

async function ensureManagedSpecialMeasureTag() {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      isDefault: tags.isDefault,
      version: tags.version,
    })
    .from(tags)
    .where(eq(tags.name, MANAGED_SPECIAL_MEASURE_TAG_NAME))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(MANAGED_SPECIAL_MEASURE_TAG_NAME, "#1e3a8a");
}

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

async function createBrowserReportProjectFixture(params: {
  prefix: string;
  appointmentDates: string[];
  amount?: string | null;
  descriptionMd?: string | null;
  plannedDateText?: string | null;
  plannedWeek?: string | null;
  articleValues?: Partial<{
    sauna: { name: string; shortCode?: string | null };
    door: { name: string; shortCode?: string | null };
    window: { name: string; shortCode?: string | null };
    oven: { name: string; shortCode?: string | null };
    control: { name: string; shortCode?: string | null };
    roof: { name: string; shortCode?: string | null };
  }>;
  projectTags?: Tag[];
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

  const updatedProject = await projectsService.updateProject(project.id, {
    version: project.version,
    descriptionMd: params.descriptionMd ?? null,
    projectOrder: {
      amount: params.amount ?? null,
      plannedDateText: params.plannedDateText ?? null,
      plannedWeek: params.plannedWeek ?? null,
    },
  });
  if (!updatedProject) {
    throw new Error("Expected updated browser report project.");
  }

  const orderNumber = updatedProject.projectOrder?.orderNumber ?? updatedProject.orderNumber;
  if (!orderNumber) {
    throw new Error("Expected order number for browser report project.");
  }

  for (const appointmentDate of params.appointmentDates) {
    await createAppointmentFixture({
      projectId: project.id,
      startDate: appointmentDate,
    });
  }

  for (const tag of params.projectTags ?? []) {
    await attachProjectTagFixture(project.id, tag.id);
  }

  if (params.articleValues?.sauna) {
    const product = await createProductFixture({
      categoryName: "Fass Saunen",
      name: params.articleValues.sauna.name,
      shortCode: params.articleValues.sauna.shortCode ?? null,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      productId: product.id,
      quantity: 1,
    });
  }

  const componentDefinitions = [
    { key: "door", categoryName: "Tuer" },
    { key: "window", categoryName: "Fenster" },
    { key: "oven", categoryName: "Ofen" },
    { key: "control", categoryName: "Steuerung" },
    { key: "roof", categoryName: "Dachvarianten" },
  ] as const;

  for (const definition of componentDefinitions) {
    const componentValue = params.articleValues?.[definition.key];
    if (!componentValue) {
      continue;
    }

    const component = await createComponentFixture({
      categoryName: definition.categoryName,
      name: componentValue.name,
      shortCode: componentValue.shortCode ?? null,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      componentId: component.id,
      quantity: 1,
    });
  }

  return {
    customer,
    project: updatedProject,
  };
}

async function openReports(page: Page) {
  await loginAsAdmin(page);
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
}

function rowByText(table: Locator, text: string): Locator {
  return table.getByRole("row").filter({ hasText: text }).first();
}

test("covers visible FT26 report interactions, persistence and product-vorlauf output", async ({ page }) => {
  const inRangeDate = getRelativeBerlinDate(1);
  const laterDate = getRelativeBerlinDate(40);
  const specialMeasureTag = await ensureManagedSpecialMeasureTag();

  const completeProduct = await createProductFixture({
    categoryName: "Fass Saunen",
    name: "FT26 Lookup Sauna Browser",
  });
  const doorComponent = await createComponentFixture({
    categoryName: "Tuer",
    name: "FT26 Lookup Tuer Browser",
  });
  const windowComponent = await createComponentFixture({
    categoryName: "Fenster",
    name: "FT26 Lookup Fenster Browser",
  });
  const ovenComponent = await createComponentFixture({
    categoryName: "Ofen",
    name: "FT26 Lookup Ofen Browser",
  });
  const controlComponent = await createComponentFixture({
    categoryName: "Steuerung",
    name: "FT26 Lookup Steuerung Browser",
  });
  const roofComponent = await createComponentFixture({
    categoryName: "Dachvarianten",
    name: "FT26 Lookup Dach Browser",
  });

  await markReportCategoriesAsDefault({
    productCategoryIds: [completeProduct.categoryId],
    componentCategoryIds: [
      doorComponent.categoryId,
      windowComponent.categoryId,
      ovenComponent.categoryId,
      controlComponent.categoryId,
      roofComponent.categoryId,
    ],
  });

  await createBrowserReportProjectFixture({
    prefix: "FT26 Browser Vollstaendig",
    appointmentDates: [inRangeDate],
    amount: "14999.90",
    descriptionMd: "<p>Vollstaendige Browserbeschreibung</p>",
    plannedDateText: "Morgen",
    plannedWeek: "KW B1",
    articleValues: {
      sauna: { name: "Kolmikko Voll", shortCode: "KOL" },
      door: { name: "Tuer Glas Voll", shortCode: "TG" },
      window: { name: "Fenster Klein Voll", shortCode: "FK" },
      oven: { name: "Ofen 9kW Voll", shortCode: "O9" },
      control: { name: "Steuerung Pro Voll", shortCode: "SP" },
      roof: { name: "Dach Flach Voll", shortCode: "DF" },
    },
  });
  const partialProject = await createBrowserReportProjectFixture({
    prefix: "FT26 Browser Teilweise",
    appointmentDates: [inRangeDate],
    amount: "8999.00",
    articleValues: {
      door: { name: "Teilglas Browser" },
      window: { name: "Panorama Browser" },
    },
  });
  const emptyProject = await createBrowserReportProjectFixture({
    prefix: "FT26 Browser Leer",
    appointmentDates: [inRangeDate],
    amount: "5000.00",
  });
  const futureProject = await createBrowserReportProjectFixture({
    prefix: "FT26 Browser Spaeter",
    appointmentDates: [laterDate],
    amount: "7777.00",
    articleValues: {
      window: { name: "Spaetes Fenster" },
    },
  });
  const specialProject = await createBrowserReportProjectFixture({
    prefix: "FT26 Browser Sondermass",
    appointmentDates: [inRangeDate],
    amount: "12000.00",
    descriptionMd: "<p>Sondermass Browser</p>",
    projectTags: [specialMeasureTag],
    articleValues: {
      sauna: { name: "Sondermass Sauna" },
      door: { name: "Sondermass Tuer" },
    },
  });

  await openReports(page);

  const vorlauflisteGenerateButton = page.getByTestId("button-reports-vorlaufliste-generate");
  await page.getByTestId("reports-vorlaufliste-from-date").fill("");
  await expect(vorlauflisteGenerateButton).toBeDisabled();
  await page.getByTestId("reports-product-vorlauf-from-date").fill("");
  await expect(page.getByTestId("button-reports-product-vorlauf-generate")).toBeDisabled();

  await page.getByTestId("reports-vorlaufliste-from-date").fill(inRangeDate);
  await page.getByTestId("reports-product-vorlauf-from-date").fill(inRangeDate);

  await page.getByTestId("button-reports-vorlaufliste-show-to-date").click();
  await page.getByTestId("reports-vorlaufliste-to-date").fill(inRangeDate);
  await vorlauflisteGenerateButton.click();

  const vorlauflisteTable = page.getByTestId("table-reports-vorlaufliste");
  await expect(vorlauflisteTable).toBeVisible();
  await expect(vorlauflisteTable).toContainText("Kolmikko Voll");
  await expect(vorlauflisteTable).toContainText("Tuer Glas Voll");
  await expect(vorlauflisteTable).toContainText("Fenster Klein Voll");
  await expect(vorlauflisteTable).not.toContainText("KOL");
  await expect(vorlauflisteTable).not.toContainText(futureProject.customer.fullName ?? "");

  const partialRow = rowByText(vorlauflisteTable, partialProject.customer.fullName ?? "");
  await expect(partialRow).toContainText("Teilglas Browser");
  await expect(partialRow).toContainText("Panorama Browser");

  const emptyRow = rowByText(vorlauflisteTable, emptyProject.customer.fullName ?? "");
  await expect(emptyRow).toContainText("-");

  await page.getByTestId("button-reports-back").click();
  await page.getByTestId("checkbox-reports-vorlaufliste-use-shortcodes").click();
  await expect(page.getByTestId("checkbox-reports-vorlaufliste-use-shortcodes")).toHaveAttribute("data-state", "checked");

  await vorlauflisteGenerateButton.click();
  await expect(vorlauflisteTable).toContainText("KOL");
  await expect(vorlauflisteTable).toContainText("TG");
  await expect(vorlauflisteTable).not.toContainText("Kolmikko Voll");
  await expect(vorlauflisteTable).not.toContainText("Tuer Glas Voll");

  await page.getByTestId("button-reports-back").click();
  await page.getByTestId(`checkbox-reports-vorlaufliste-component-category-${controlComponent.categoryId}`).click();
  await page.getByTestId(`checkbox-reports-product-vorlauf-component-category-${controlComponent.categoryId}`).click();

  await page.getByTestId("nav-termine").click();
  await expect(page.getByTestId("nav-reports")).toBeVisible();
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
  await expect(page.getByTestId("checkbox-reports-vorlaufliste-use-shortcodes")).toHaveAttribute("data-state", "checked");
  await expect(page.getByTestId(`checkbox-reports-vorlaufliste-component-category-${controlComponent.categoryId}`)).toHaveAttribute("data-state", "unchecked");
  await expect(page.getByTestId(`checkbox-reports-product-vorlauf-component-category-${controlComponent.categoryId}`)).toHaveAttribute("data-state", "unchecked");

  await page.getByTestId("reports-vorlaufliste-from-date").fill(inRangeDate);
  await page.getByTestId("button-reports-vorlaufliste-show-to-date").click();
  await page.getByTestId("reports-vorlaufliste-to-date").fill(inRangeDate);
  await vorlauflisteGenerateButton.click();
  await expect(vorlauflisteTable).not.toContainText(futureProject.customer.fullName ?? "");

  await page.getByTestId("button-reports-back").click();
  await page.getByTestId("reports-vorlaufliste-to-date").fill("");
  await vorlauflisteGenerateButton.click();
  await expect(vorlauflisteTable).toContainText(futureProject.customer.fullName ?? "");

  await page.getByTestId("button-reports-back").click();
  await page.getByTestId("reports-product-vorlauf-from-date").fill(inRangeDate);
  await page.getByTestId("button-reports-product-vorlauf-show-to-date").click();
  await page.getByTestId("reports-product-vorlauf-to-date").fill(inRangeDate);
  await page.getByTestId("button-reports-product-vorlauf-generate").click();

  await expect(page.getByTestId("reports-product-vorlauf-overlay")).toBeVisible();
  await expect(page.getByTestId("reports-product-vorlauf-products")).toContainText("Kolmikko Voll");
  await expect(page.getByTestId("reports-product-vorlauf-components")).toContainText("Fenster Klein Voll");
  await expect(page.getByTestId("reports-product-vorlauf-components")).not.toContainText("Steuerung Pro Voll");
  await expect(page.getByTestId("reports-product-vorlauf-special-measures")).toContainText(specialProject.customer.fullName ?? "");
  await expect(page.getByTestId("reports-product-vorlauf-special-measures")).toContainText("Sondermass Browser");
  await expect(page.getByTestId("reports-product-vorlauf-products")).toContainText("Sondermass Sauna");
  await expect(page.getByTestId("reports-product-vorlauf-components")).toContainText("Teilglas Browser");
  await expect(page.getByTestId("reports-product-vorlauf-components")).toContainText("Panorama Browser");
});
