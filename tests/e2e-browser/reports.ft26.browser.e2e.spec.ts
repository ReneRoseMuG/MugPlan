/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Reports-Seite zeigt die Vorlaufliste mit voller, teilweiser und leerer Artikelbelegung an.
 * - Vorlaufliste-Shortcodes sowie Spalten-Sichtbarkeit und -Reihenfolge bleiben nach Navigation erhalten und lassen sich zurücksetzen.
 * - Der Statusindikator ersetzt die alte Zeilenfärbung, die Druckvorschau paginiert den vollständigen Report, begrenzt Druckzellen weiter auf drei Textzeilen und Drucken ruft window.print auf.
 * - Die Produktionsplanung zeigt FT26-Kategorien, das neue Kategorie-Layout-Dialog-Wiring und die neuen Projektkarten sichtbar an.
 *
 * Fehlerfälle:
 * - Persistierte Vorlaufliste-Konfiguration geht nach Navigation verloren.
 * - Die Druckvorschau lädt keine zweite Seite, verliert die Drei-Zeilen-Begrenzung oder ruft Drucken nicht aus dem Dialog heraus auf.
 * - Der Produktionsplanung verliert Karten-, Grund- oder Gruppentreffer im Browserfluss.
 *
 * Ziel:
 * Die FT26-Reportsuite aus Anwendersicht über Vorlaufliste, Persistenz, Druckvorschau und Produktionsplanung regressionssicher absichern.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "../../server/db";
import * as projectsService from "../../server/services/projectsService";
import {
  MANAGED_MESSE_TAG_NAME,
  MANAGED_MIRRORED_TAG_NAME,
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
} from "../../shared/appointmentCancellation";
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
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { loginAsAdmin, resetBrowserSuiteState } from "../helpers/browserE2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetBrowserSuiteState("tests/e2e-browser/reports.ft26.browser.e2e.spec.ts");
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

async function ensureExactReportTag(name: string, color: string) {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      isDefault: tags.isDefault,
      version: tags.version,
    })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(name, color);
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

async function createAuftragslisteFilterBrowserProject(params: {
  prefix: string;
  appointmentDate: string;
  tourId: number;
  modelProductId: number;
  projectTags: Tag[];
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
    throw new Error("Expected order number for Auftragsliste browser fixture.");
  }

  await createAppointmentFixture({
    projectId: project.id,
    startDate: params.appointmentDate,
    tourId: params.tourId,
  });

  for (const tag of params.projectTags) {
    await attachProjectTagFixture(project.id, tag.id);
  }

  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    productId: params.modelProductId,
    quantity: 1,
  });

  const visibleProduct = await createProductFixture({
    categoryName: "Zubehör",
    name: `${params.prefix} Sichtbar`,
  });
  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    productId: visibleProduct.id,
    quantity: 1,
  });

  return { customer, project };
}

async function openReports(page: Page) {
  try {
    await loginAsAdmin(page);
  } catch (error) {
    await page.goto("/");
    await page.reload();
    await loginAsAdmin(page);
  }
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
}

async function clearSelectedAuftragslisteTagFilters(page: Page) {
  const removeButtons = page
    .locator("[data-testid^='reports-auftragsliste-tag-filter-'][data-testid$='-remove']");

  while (await removeButtons.count()) {
    await removeButtons.first().click();
  }
}

async function clearSelectedAuftragslisteSaunaModels(page: Page) {
  await page.getByTestId("button-reports-auftragsliste-open-sauna-model-filter").click();
  const checkedOptions = page
    .getByTestId("reports-auftragsliste-sauna-model-popover")
    .locator("[data-state='checked']");

  while (await checkedOptions.count()) {
    await checkedOptions.first().click();
  }

  await page.keyboard.press("Escape");
}

function rowByText(table: Locator, text: string): Locator {
  return table.getByRole("row").filter({ hasText: text }).first();
}

function formatIsoDateForUi(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year.slice(-2)}`;
}

async function getHeaderTexts(table: Locator) {
  return (await table.locator("thead th").allTextContents())
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

test("covers visible FT26 report interactions, persistence, print preview and produktionsplanung output", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => {
      (window as Window & { __printCalls?: number }).__printCalls = ((window as Window & { __printCalls?: number }).__printCalls ?? 0) + 1;
    };
  });

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

  const completeProject = await createBrowserReportProjectFixture({
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

  for (let index = 0; index < 18; index += 1) {
    await createBrowserReportProjectFixture({
      prefix: `FT26 Browser Druckseite ${index + 1}`,
      appointmentDates: [inRangeDate],
      amount: String(1000 + index),
    });
  }

  await openReports(page);
  await expect(page.getByTestId("toggle-reports-vorlaufliste-calendarWeek")).toBeVisible();
  await expect(page.getByTestId("button-reports-vorlaufliste-open-columns-dialog")).toBeVisible();
  await expect(page.getByTestId("toggle-reports-produktionsplanung-calendarWeek")).toBeVisible();
  await expect(page.getByTestId("button-reports-produktionsplanung-open-category-layout")).toBeVisible();
  await page.getByTestId("button-reports-vorlaufliste-open-columns-dialog").click();
  await expect(page.getByTestId("dialog-reports-vorlaufliste-columns")).toBeVisible();
  await page.getByTestId("button-reports-vorlaufliste-columns-dialog-close").click();
  await expect(page.getByTestId("dialog-reports-vorlaufliste-columns")).toBeHidden();

  const vorlauflisteGenerateButton = page.getByTestId("button-reports-vorlaufliste-generate");
  await page.getByTestId("reports-vorlaufliste-from-date").fill(inRangeDate);
  await page.getByTestId("reports-produktionsplanung-from-date").fill(inRangeDate);

  await page.getByTestId("reports-vorlaufliste-to-date").fill(inRangeDate);
  await vorlauflisteGenerateButton.click();

  const vorlauflisteTable = page.getByTestId("table-reports-vorlaufliste");
  await expect(vorlauflisteTable).toBeVisible();
  await expect(vorlauflisteTable).toContainText("Kolmikko Voll");
  await expect(vorlauflisteTable).toContainText("Tuer Glas Voll");
  await expect(vorlauflisteTable).toContainText("Fenster Klein Voll");
  await expect(vorlauflisteTable).not.toContainText("KOL");
  await expect(vorlauflisteTable).not.toContainText(futureProject.customer.fullName ?? "");
  await expect(page.getByTestId(`reports-vorlaufliste-indicator-${specialProject.project.id}`)).toHaveCSS("background-color", "rgb(186, 117, 23)");
  await expect(page.getByTestId("reports-vorlaufliste-legend")).toContainText("Storniert");
  await expect(page.getByTestId("reports-vorlaufliste-legend")).toContainText("Sondermaß / Info-Tag");
  expect(await rowByText(vorlauflisteTable, specialProject.customer.fullName ?? "").getAttribute("style")).toBeNull();

  const partialRow = rowByText(vorlauflisteTable, partialProject.customer.fullName ?? "");
  await expect(partialRow).toContainText("Teilglas Browser");
  await expect(partialRow).toContainText("Panorama Browser");

  const emptyRow = rowByText(vorlauflisteTable, emptyProject.customer.fullName ?? "");
  await expect(emptyRow).toContainText("-");

  await page.getByTestId("button-reports-back").click();
  await page.getByTestId("toggle-reports-vorlaufliste-calendarWeek").click();
  await page.getByTestId("input-reports-vorlaufliste-kw-start").fill("14");
  await page.getByTestId("input-reports-vorlaufliste-week-count").fill("2");
  await page.getByTestId("toggle-reports-produktionsplanung-calendarWeek").click();
  await page.getByTestId("input-reports-produktionsplanung-kw-start").fill("15");
  await page.getByTestId("input-reports-produktionsplanung-week-count").fill("3");
  await page.getByTestId("button-reports-produktionsplanung-open-category-layout").click();
  await expect(page.getByTestId("dialog-reports-produktionsplanung-category-layout")).toBeVisible();
  await page.getByTestId("button-reports-produktionsplanung-category-layout-close").click();
  await expect(page.getByTestId("dialog-reports-produktionsplanung-category-layout")).toBeHidden();
  await page.getByTestId("toggle-reports-vorlaufliste-date").click();
  await page.getByTestId("toggle-reports-produktionsplanung-date").click();
  await page.getByTestId("checkbox-reports-vorlaufliste-use-shortcodes").click();
  await expect(page.getByTestId("checkbox-reports-vorlaufliste-use-shortcodes")).toBeChecked();
  await page.getByTestId("checkbox-reports-produktionsplanung-use-shortcodes").click();
  await expect(page.getByTestId("checkbox-reports-produktionsplanung-use-shortcodes")).toBeChecked();

  await vorlauflisteGenerateButton.click();
  await page.getByTestId("button-reports-vorlaufliste-columns").click();
  await page.getByTestId(`checkbox-reports-vorlaufliste-column-component-${controlComponent.categoryId}`).click();
  await page.getByTestId("button-reports-vorlaufliste-column-actualDate-up").click();
  await page.getByTestId("button-reports-vorlaufliste-columns").click();

  await expect(vorlauflisteTable).toContainText("KOL");
  await expect(vorlauflisteTable).toContainText("TG");
  await expect(vorlauflisteTable).not.toContainText("Kolmikko Voll");
  await expect(vorlauflisteTable).not.toContainText("Tuer Glas Voll");
  await expect(vorlauflisteTable).not.toContainText("SP");

  const reorderedHeaders = await getHeaderTexts(vorlauflisteTable);
  expect(reorderedHeaders.indexOf("Tatsächlicher Termin")).toBeLessThan(reorderedHeaders.indexOf("KW Vorgeplant"));

  await page.getByTestId("button-reports-vorlaufliste-print-preview").click();
  await expect(page.getByTestId("dialog-vorlaufliste-print-preview")).toBeVisible();
  await expect(page.getByTestId("vorlaufliste-print-preview-page-indicator")).toHaveCount(0);
  await expect(page.getByTestId("vorlaufliste-print-preview-active-page-shell")).toContainText(formatIsoDateForUi(inRangeDate));
  await expect(page.getByTestId("vorlaufliste-print-preview-active-page-shell")).not.toContainText(inRangeDate);
  await expect(page.getByTestId("vorlaufliste-print-preview-active-page-shell")).toContainText(/KW \d+/);
  await expect(page.getByTestId("vorlaufliste-print-preview-active-page-shell")).toContainText("Seite 1");
  await expect(page.getByTestId("vorlaufliste-print-preview-active-page-shell")).toContainText("KOL");
  const firstPageDescriptionCell = page
    .getByTestId("vorlaufliste-print-preview-active-page-shell")
    .getByTestId(`vorlaufliste-print-cell-1-${completeProject.project.id}-projectDescription`);
  await expect(firstPageDescriptionCell).toBeVisible();
  await expect.poll(async () => firstPageDescriptionCell.evaluate((element) => window.getComputedStyle(element).getPropertyValue("-webkit-line-clamp"))).toBe("3");
  const firstPrintPage = page.getByTestId("vorlaufliste-print-page-1").first();
  const firstPageBox = await firstPrintPage.boundingBox();
  expect(firstPageBox).not.toBeNull();
  expect(firstPageBox!.width).toBeGreaterThan(firstPageBox!.height);
  await page.getByTestId("button-vorlaufliste-print-preview-next").click();
  await expect(page.getByTestId("vorlaufliste-print-preview-active-page-shell")).toContainText("Seite 2");
  await page.getByTestId("button-reports-vorlaufliste-print").click();
  await expect.poll(async () => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls ?? 0)).toBe(1);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dialog-vorlaufliste-print-preview")).toBeHidden();

  await page.getByTestId("button-reports-back").click();

  await page.getByTestId("nav-termine").click();
  await expect(page.getByTestId("nav-reports")).toBeVisible();
  await page.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-panel")).toBeVisible();
  await expect(page.getByTestId("checkbox-reports-vorlaufliste-use-shortcodes")).toBeChecked();
  await expect(page.getByTestId("reports-vorlaufliste-to-date")).not.toHaveValue(inRangeDate);
  await expect(page.getByTestId("reports-produktionsplanung-to-date")).toHaveValue(await page.getByTestId("reports-vorlaufliste-to-date").inputValue());
  await page.getByTestId("toggle-reports-vorlaufliste-calendarWeek").click();
  const resetVorlauflisteKwStart = await page.getByTestId("input-reports-vorlaufliste-kw-start").inputValue();
  const resetVorlauflisteWeekCount = await page.getByTestId("input-reports-vorlaufliste-week-count").inputValue();
  await page.getByTestId("toggle-reports-produktionsplanung-calendarWeek").click();
  await expect(page.getByTestId("input-reports-produktionsplanung-kw-start")).toHaveValue(resetVorlauflisteKwStart);
  await expect(page.getByTestId("input-reports-produktionsplanung-week-count")).toHaveValue(resetVorlauflisteWeekCount);
  expect(Number.parseInt(resetVorlauflisteWeekCount, 10)).toBeGreaterThan(2);
  await page.getByTestId("toggle-reports-vorlaufliste-date").click();
  await page.getByTestId("toggle-reports-produktionsplanung-date").click();

  await page.getByTestId("reports-vorlaufliste-from-date").fill(inRangeDate);
  await page.getByTestId("reports-vorlaufliste-to-date").fill(inRangeDate);
  await vorlauflisteGenerateButton.click();
  await page.getByTestId("button-reports-vorlaufliste-columns").click();
  await expect(page.getByTestId(`checkbox-reports-vorlaufliste-column-component-${controlComponent.categoryId}`)).not.toBeChecked();
  await page.getByTestId("button-reports-vorlaufliste-columns-reset").click();
  await expect(page.getByTestId(`checkbox-reports-vorlaufliste-column-component-${controlComponent.categoryId}`)).toBeChecked();
  await page.getByTestId("button-reports-vorlaufliste-columns").click();

  await expect(vorlauflisteTable).toContainText("SP");
  const resetHeaders = await getHeaderTexts(vorlauflisteTable);
  expect(resetHeaders.indexOf("KW Vorgeplant")).toBeLessThan(resetHeaders.indexOf("Tatsächlicher Termin"));
  await expect(vorlauflisteTable).not.toContainText(futureProject.customer.fullName ?? "");

  await page.getByTestId("button-reports-back").click();
  await page.getByTestId("reports-produktionsplanung-from-date").fill(inRangeDate);
  await page.getByTestId("reports-produktionsplanung-to-date").fill(inRangeDate);
  await page.getByTestId("button-reports-produktionsplanung-generate").click();

  await expect(page.getByTestId("reports-produktionsplanung-overlay")).toBeVisible();
  await expect(page.getByTestId("reports-produktionsplanung-categories")).toContainText("KOL");
  await expect(page.getByTestId("reports-produktionsplanung-categories")).toContainText("FK");
  await expect(page.getByTestId("reports-produktionsplanung-project-cards")).toContainText(specialProject.customer.fullName ?? "");
  await expect(page.getByTestId("reports-produktionsplanung-project-cards")).not.toContainText("Sondermaß");
  await expect(page.getByTestId("reports-produktionsplanung-project-cards")).toContainText("Sondermass Browser");
  await expect(page.getByTestId("reports-produktionsplanung-project-cards")).toContainText("Sondermass Sauna");
  await expect(page.getByTestId("reports-produktionsplanung-categories")).toContainText("Teilglas Browser");
  await expect(page.getByTestId("reports-produktionsplanung-categories")).toContainText("Panorama Browser");
});

test("filters the Auftragsliste by reduced tags and Sauna Modell through overlay, print preview and browser print", async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => {
      (window as Window & { __printCalls?: number }).__printCalls = ((window as Window & { __printCalls?: number }).__printCalls ?? 0) + 1;
    };
  });

  const inRangeDate = getRelativeBerlinDate(20);
  const laterInRangeDate = getRelativeBerlinDate(22);
  const remarksTag = await ensureExactReportTag(MANAGED_REMARKS_TAG_NAME, "#888780");
  const specialMeasureTag = await ensureManagedSpecialMeasureTag();
  const tourOne = await createTourFixture("#0f766e");
  const tourTwo = await createTourFixture("#1d4ed8");
  const modelAlpha = await createProductFixture({ categoryName: "Fass Saunen", name: "Browser Modell Alpha Filter" });
  const modelBeta = await createProductFixture({ categoryName: "Fass Saunen", name: "Browser Modell Beta Filter" });

  await markReportCategoriesAsDefault({
    productCategoryIds: [modelAlpha.categoryId],
    componentCategoryIds: [],
  });

  const tourOneEarlier = await createAuftragslisteFilterBrowserProject({
    prefix: "AL-BROWSER-T1-EARLY",
    appointmentDate: inRangeDate,
    tourId: tourOne.id,
    modelProductId: modelAlpha.id,
    projectTags: [specialMeasureTag],
  });
  const tourOneLater = await createAuftragslisteFilterBrowserProject({
    prefix: "AL-BROWSER-T1-LATE",
    appointmentDate: laterInRangeDate,
    tourId: tourOne.id,
    modelProductId: modelAlpha.id,
    projectTags: [specialMeasureTag],
  });
  const tourTwoEarlier = await createAuftragslisteFilterBrowserProject({
    prefix: "AL-BROWSER-T2",
    appointmentDate: getRelativeBerlinDate(19),
    tourId: tourTwo.id,
    modelProductId: modelAlpha.id,
    projectTags: [specialMeasureTag],
  });
  const remarksOnlyProject = await createAuftragslisteFilterBrowserProject({
    prefix: "AL-BROWSER-REMARKS",
    appointmentDate: getRelativeBerlinDate(21),
    tourId: tourOne.id,
    modelProductId: modelAlpha.id,
    projectTags: [remarksTag],
  });
  const betaProject = await createAuftragslisteFilterBrowserProject({
    prefix: "AL-BROWSER-BETA",
    appointmentDate: getRelativeBerlinDate(18),
    tourId: tourOne.id,
    modelProductId: modelBeta.id,
    projectTags: [specialMeasureTag],
  });

  await openReports(page);
  await page.getByTestId("reports-auftragsliste-from-date").fill(getRelativeBerlinDate(18));
  await page.getByTestId("reports-auftragsliste-to-date").fill(getRelativeBerlinDate(24));

  await clearSelectedAuftragslisteTagFilters(page);
  await clearSelectedAuftragslisteSaunaModels(page);
  await page.getByTestId("button-reports-auftragsliste-add-tag-filter").click();
  await page.getByTestId(`reports-auftragsliste-tag-filter-add-${specialMeasureTag.id}-add`).click();
  await expect(page.getByTestId(`reports-auftragsliste-tag-filter-${specialMeasureTag.id}`)).toBeVisible();
  await page.getByTestId("button-reports-auftragsliste-open-sauna-model-filter").click();
  await page.getByTestId("checkbox-reports-auftragsliste-sauna-model-browser-modell-alpha-filter").click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("button-reports-auftragsliste-open-sauna-model-filter")).toContainText(modelAlpha.name);

  const auftragslisteResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/reports/auftragsliste")
    && response.request().method() === "GET");
  await page.getByTestId("button-reports-auftragsliste-generate").click();
  const auftragslisteResponse = await auftragslisteResponsePromise;
  const requestUrl = new URL(auftragslisteResponse.url());
  expect(requestUrl.searchParams.getAll("tagIds")).toEqual([String(specialMeasureTag.id)]);
  expect(requestUrl.searchParams.getAll("saunaModels")).toEqual([modelAlpha.name]);

  const cards = page.getByTestId("reports-auftragsliste-project-cards").locator("article[data-testid^='reports-auftragsliste-project-card-']");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText(tourOneEarlier.customer.fullName ?? "");
  await expect(cards.nth(1)).toContainText(tourOneLater.customer.fullName ?? "");
  await expect(cards.nth(2)).toContainText(tourTwoEarlier.customer.fullName ?? "");
  await expect(page.getByTestId("reports-auftragsliste-project-cards")).not.toContainText(remarksOnlyProject.customer.fullName ?? "");
  await expect(page.getByTestId("reports-auftragsliste-project-cards")).not.toContainText(betaProject.customer.fullName ?? "");

  await expect.poll(async () => cards.nth(0).evaluate((element) => element.innerHTML.includes("border-color"))).toBe(true);

  await page.getByTestId("button-reports-auftragsliste-print-preview").click();
  await expect(page.getByTestId("dialog-auftragsliste-print-preview")).toBeVisible();
  const activePrintShell = page.getByTestId("auftragsliste-print-preview-active-page-shell");
  await expect(activePrintShell).toContainText(tourOneEarlier.customer.fullName ?? "");
  await expect(activePrintShell).toContainText(tourOneLater.customer.fullName ?? "");
  await expect(activePrintShell).toContainText(tourTwoEarlier.customer.fullName ?? "");
  await expect(activePrintShell).toContainText("Sond.");
  await expect(activePrintShell).not.toContainText(remarksOnlyProject.customer.fullName ?? "");
  await expect(activePrintShell).not.toContainText(betaProject.customer.fullName ?? "");

  const printRoot = page.locator('[data-testid="print-document-root"]');
  await expect(printRoot).toContainText(tourOneEarlier.customer.fullName ?? "");
  await expect(printRoot).toContainText(tourOneLater.customer.fullName ?? "");
  await expect(printRoot).toContainText(tourTwoEarlier.customer.fullName ?? "");
  await expect(printRoot).toContainText("Sond.");
  await expect(printRoot).not.toContainText(remarksOnlyProject.customer.fullName ?? "");
  await expect(printRoot).not.toContainText(betaProject.customer.fullName ?? "");

  await page.getByTestId("button-reports-auftragsliste-print").click();
  await expect.poll(async () => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls ?? 0)).toBe(1);
});

test("resolves competing Auftragsliste highlight tags consistently in overlay and print preview", async ({ page }) => {
  const inRangeDate = getRelativeBerlinDate(30);
  const laterInRangeDate = getRelativeBerlinDate(31);
  const messeTag = await ensureExactReportTag(MANAGED_MESSE_TAG_NAME, "#3465A4");
  const remarksTag = await ensureExactReportTag(MANAGED_REMARKS_TAG_NAME, "#888780");
  const mirroredTag = await ensureExactReportTag(MANAGED_MIRRORED_TAG_NAME, "#0891b2");
  const tour = await createTourFixture("#0f766e");
  const modelGamma = await createProductFixture({ categoryName: "Fass Saunen", name: "Browser Modell Gamma Highlight" });

  await markReportCategoriesAsDefault({
    productCategoryIds: [modelGamma.categoryId],
    componentCategoryIds: [],
  });

  const messeWinsProject = await createAuftragslisteFilterBrowserProject({
    prefix: "AL-BROWSER-HL-MESSE",
    appointmentDate: inRangeDate,
    tourId: tour.id,
    modelProductId: modelGamma.id,
    projectTags: [remarksTag, messeTag],
  });
  const mirroredWinsProject = await createAuftragslisteFilterBrowserProject({
    prefix: "AL-BROWSER-HL-MIRROR",
    appointmentDate: laterInRangeDate,
    tourId: tour.id,
    modelProductId: modelGamma.id,
    projectTags: [messeTag, mirroredTag],
  });

  await openReports(page);
  await page.getByTestId("reports-auftragsliste-from-date").fill(getRelativeBerlinDate(29));
  await page.getByTestId("reports-auftragsliste-to-date").fill(getRelativeBerlinDate(32));
  await clearSelectedAuftragslisteTagFilters(page);
  await clearSelectedAuftragslisteSaunaModels(page);
  await page.getByTestId("button-reports-auftragsliste-generate").click();

  const messeCard = page.getByTestId(`reports-auftragsliste-project-card-${messeWinsProject.project.id}`);
  const mirroredCard = page.getByTestId(`reports-auftragsliste-project-card-${mirroredWinsProject.project.id}`);

  await expect(messeCard).toContainText(messeWinsProject.customer.fullName ?? "");
  await expect(mirroredCard).toContainText(mirroredWinsProject.customer.fullName ?? "");
  await expect(messeCard).toHaveAttribute("data-report-dominant-tag", MANAGED_MESSE_TAG_NAME);
  await expect(mirroredCard).toHaveAttribute("data-report-dominant-tag", MANAGED_MIRRORED_TAG_NAME);
  await expect.poll(async () => messeCard.evaluate((element) => getComputedStyle(element).borderColor)).toBe("rgb(52, 101, 164)");
  await expect.poll(async () => mirroredCard.evaluate((element) => getComputedStyle(element).borderColor)).toBe("rgb(8, 145, 178)");

  await page.getByTestId("button-reports-auftragsliste-print-preview").click();
  await expect(page.getByTestId("dialog-auftragsliste-print-preview")).toBeVisible();

  const activePrintShell = page.getByTestId("auftragsliste-print-preview-active-page-shell");
  const printedMesseCard = activePrintShell.getByTestId(`reports-auftragsliste-project-card-${messeWinsProject.project.id}`);
  const printedMirroredCard = activePrintShell.getByTestId(`reports-auftragsliste-project-card-${mirroredWinsProject.project.id}`);

  await expect(printedMesseCard).toHaveAttribute("data-report-dominant-tag", MANAGED_MESSE_TAG_NAME);
  await expect(printedMirroredCard).toHaveAttribute("data-report-dominant-tag", MANAGED_MIRRORED_TAG_NAME);
});
