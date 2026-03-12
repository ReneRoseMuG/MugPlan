import * as masterDataRepository from "../repositories/masterDataRepository";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";
import { hasCsvHeader, parseBooleanFlag, parseCsvWithHeaders, stringifyCsv } from "./seedCsvService";

const PRODUCTS_FILE_NAME = "products.csv";
const COMPONENTS_FILE_NAME = "components.csv";
const DEFAULT_PRODUCT_CATEGORY_NAME = "Fass Saunen";
const DEFAULT_COMPONENT_CATEGORY_NAMES = [
  "Dachvarianten",
  "Fenster",
  "Inneneinrichtung",
  "Öfen",
  "Rückwände",
  "Steuerungen",
  "Türen",
  "Vorderwände",
] as const;

export type SeedExecutionResult = {
  sourceFile: string;
  exists: boolean;
  logLines: string[];
};

async function ensureProductCategory(name: string, logLines: string[]): Promise<number> {
  const existing = await masterDataRepository.getProductCategoryByName(name);
  if (!existing) {
    const created = await masterDataRepository.createProductCategory({ name, isActive: true, version: 1 });
    logLines.push(`Produktkategorie angelegt: ${name}`);
    return created.id;
  }
  if (!existing.isActive) {
    await masterDataRepository.updateProductCategoryWithVersion(existing.id, existing.version, { isActive: true });
    logLines.push(`Produktkategorie reaktiviert: ${name}`);
  }
  return existing.id;
}

async function ensureComponentCategory(name: string, logLines: string[]): Promise<number> {
  const existing = await masterDataRepository.getComponentCategoryByName(name);
  if (!existing) {
    const created = await masterDataRepository.createComponentCategory({ name, isActive: true, version: 1 });
    logLines.push(`Komponentenkategorie angelegt: ${name}`);
    return created.id;
  }
  if (!existing.isActive) {
    await masterDataRepository.updateComponentCategoryWithVersion(existing.id, existing.version, { isActive: true });
    logLines.push(`Komponentenkategorie reaktiviert: ${name}`);
  }
  return existing.id;
}

async function ensureDefaultCategories(logLines: string[]) {
  await ensureProductCategory(DEFAULT_PRODUCT_CATEGORY_NAME, logLines);
  for (const categoryName of DEFAULT_COMPONENT_CATEGORY_NAMES) {
    await ensureComponentCategory(categoryName, logLines);
  }
}

export async function getProductSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(PRODUCTS_FILE_NAME);
}

export async function getComponentSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(COMPONENTS_FILE_NAME);
}

export async function exportProductManagementSeed(): Promise<SeedExecutionResult> {
  const products = await masterDataRepository.listProducts("all");
  const components = await masterDataRepository.listComponents("all");
  const logLines: string[] = [];

  if (products.length > 0) {
    const productCategories = await masterDataRepository.listProductCategories("all");
    const productCategoryNameById = new Map(productCategories.map((category) => [category.id, category.name]));
    await writeSeedFileUtf8(
      PRODUCTS_FILE_NAME,
      stringifyCsv(
        ["Name", "Beschreibung", "Kategorie"],
        products.map((product) => [product.name, product.description ?? "", productCategoryNameById.get(product.categoryId) ?? ""]),
      ),
    );
    logLines.push(`Export geschrieben: ${PRODUCTS_FILE_NAME}`);
    logLines.push(`Produkte exportiert: ${products.length}`);
  } else {
    logLines.push(`Kein Export geschrieben: ${PRODUCTS_FILE_NAME} (keine Produkte vorhanden)`);
  }

  if (components.length > 0) {
    const componentCategories = await masterDataRepository.listComponentCategories("all");
    const componentCategoryNameById = new Map(componentCategories.map((category) => [category.id, category.name]));
    await writeSeedFileUtf8(
      COMPONENTS_FILE_NAME,
      stringifyCsv(
        ["Name", "Beschreibung", "Kategorie"],
        components.map((component) => [component.name, component.description ?? "", componentCategoryNameById.get(component.categoryId) ?? ""]),
      ),
    );
    logLines.push(`Export geschrieben: ${COMPONENTS_FILE_NAME}`);
    logLines.push(`Komponenten exportiert: ${components.length}`);
  } else {
    logLines.push(`Kein Export geschrieben: ${COMPONENTS_FILE_NAME} (keine Komponenten vorhanden)`);
  }

  return {
    sourceFile: PRODUCTS_FILE_NAME,
    exists: products.length > 0 || components.length > 0,
    logLines,
  };
}

export async function applyProductManagementSeed(): Promise<SeedExecutionResult> {
  const productsStatus = await getSeedFileStatus(PRODUCTS_FILE_NAME);
  const componentsStatus = await getComponentSeedStatus();
  const logLines: string[] = [];

  await ensureDefaultCategories(logLines);

  if (productsStatus.exists) {
    const parsedProducts = parseCsvWithHeaders(await readSeedFileUtf8(PRODUCTS_FILE_NAME));
    const hasProductIsActiveHeader = hasCsvHeader(parsedProducts.headers, "Is Active");
    const productRows = parsedProducts.rows;
    for (const row of productRows) {
      const name = (row.Name ?? "").trim();
      if (!name) {
        logLines.push("Produkt uebersprungen: Name fehlt");
        continue;
      }
      const categoryId = await ensureProductCategory((row.Kategorie ?? "").trim() || DEFAULT_PRODUCT_CATEGORY_NAME, logLines);
      const existing = (await masterDataRepository.listProducts("all")).find((product) => product.name === name);
      const isActive = hasProductIsActiveHeader
        ? parseBooleanFlag(row["Is Active"] ?? "", existing?.isActive ?? true)
        : true;
      if (!existing) {
        await masterDataRepository.createProduct({
          name,
          description: (row.Beschreibung ?? "").trim() || null,
          categoryId,
          isActive,
          version: 1,
        });
        logLines.push(`Produkt angelegt: ${name}`);
      } else {
        await masterDataRepository.updateProductWithVersion(existing.id, existing.version, {
          description: (row.Beschreibung ?? "").trim() || null,
          categoryId,
          isActive,
        });
        logLines.push(`Produkt aktualisiert: ${name}`);
      }
    }
  } else {
    logLines.push(`Quelldatei fehlt: ${PRODUCTS_FILE_NAME}`);
  }

  if (componentsStatus.exists) {
    const parsedComponents = parseCsvWithHeaders(await readSeedFileUtf8(COMPONENTS_FILE_NAME));
    const hasComponentIsActiveHeader = hasCsvHeader(parsedComponents.headers, "Is Active");
    const componentRows = parsedComponents.rows;
    for (const row of componentRows) {
      const name = (row.Name ?? "").trim();
      if (!name) {
        logLines.push("Komponente uebersprungen: Name fehlt");
        continue;
      }
      const categoryId = await ensureComponentCategory((row.Kategorie ?? "").trim() || DEFAULT_COMPONENT_CATEGORY_NAMES[0], logLines);
      const existing = (await masterDataRepository.listComponents("all")).find((component) => component.name === name);
      const isActive = hasComponentIsActiveHeader
        ? parseBooleanFlag(row["Is Active"] ?? "", existing?.isActive ?? true)
        : true;
      if (!existing) {
        await masterDataRepository.createComponent({
          name,
          description: (row.Beschreibung ?? "").trim() || null,
          categoryId,
          isActive,
          version: 1,
        });
        logLines.push(`Komponente angelegt: ${name}`);
      } else {
        await masterDataRepository.updateComponentWithVersion(existing.id, existing.version, {
          description: (row.Beschreibung ?? "").trim() || null,
          categoryId,
          isActive,
        });
        logLines.push(`Komponente aktualisiert: ${name}`);
      }
    }
  } else {
    logLines.push(`Quelldatei fehlt: ${COMPONENTS_FILE_NAME}`);
  }

  return {
    sourceFile: PRODUCTS_FILE_NAME,
    exists: productsStatus.exists || componentsStatus.exists,
    logLines,
  };
}
