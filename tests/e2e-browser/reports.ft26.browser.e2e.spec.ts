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

function rowByText(table: Locator, text: string): Locator {
  return table.getByRole("row").filter({ hasText: text }).first();
}

function formatIsoDateForUi(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
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
