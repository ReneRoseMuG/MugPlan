import * as masterDataRepository from "../repositories/masterDataRepository";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";
import { hasCsvHeader, parseBooleanFlag, parseCsvWithHeaders, stringifyCsv } from "./seedCsvService";

const PRODUCT_CATEGORIES_FILE_NAME = "product-categories.csv";
const COMPONENT_CATEGORIES_FILE_NAME = "component-categories.csv";
const PRODUCTS_FILE_NAME = "products.csv";
const COMPONENTS_FILE_NAME = "components.csv";

export type SeedExecutionResult = {
  sourceFile: string;
  exists: boolean;
  logLines: string[];
};

type CategoryKind = "Produktkategorie" | "Komponentenkategorie";

type CategoryRow = {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
};

function createDuplicateKeyError(kind: CategoryKind, name: string) {
  throw new Error(`${kind} doppelt in Datei: ${name}`);
}

function createMissingCategoryError(kind: "Produkt" | "Komponente", entryName: string, categoryName: string) {
  throw new Error(`${kind} ${entryName} verweist auf unbekannte Kategorie: ${categoryName}`);
}

async function syncCategories(
  fileName: string,
  kind: CategoryKind,
  listExisting: () => Promise<CategoryRow[]>,
  getByName: (name: string) => Promise<CategoryRow | undefined>,
  createCategory: (input: { name: string; isDefault: boolean; isActive: boolean; version: number }) => Promise<CategoryRow>,
  updateCategory: (id: number, expectedVersion: number, input: { isDefault?: boolean; isActive?: boolean }) => Promise<unknown>,
  logLines: string[],
) {
  const parsed = parseCsvWithHeaders(await readSeedFileUtf8(fileName));
  const hasIsDefaultHeader = hasCsvHeader(parsed.headers, "IsDefault");
  const hasIsActiveHeader = hasCsvHeader(parsed.headers, "IsActive");
  const rows = parsed.rows;
  const seenNames = new Set<string>();
  const importedNames = new Set<string>();

  for (const row of rows) {
    const name = (row.Name ?? "").trim();
    if (!name) {
      logLines.push(`${kind} uebersprungen: Name fehlt`);
      continue;
    }
    if (seenNames.has(name)) {
      createDuplicateKeyError(kind, name);
    }
    seenNames.add(name);

    const existing = await getByName(name);
    const isDefault = hasIsDefaultHeader
      ? parseBooleanFlag(row.IsDefault ?? "", existing?.isDefault ?? false)
      : existing?.isDefault ?? false;
    const isActive = hasIsActiveHeader
      ? parseBooleanFlag(row.IsActive ?? "", existing?.isActive ?? true)
      : existing?.isActive ?? true;

    if (!existing) {
      await createCategory({
        name,
        isDefault,
        isActive,
        version: 1,
      });
      logLines.push(`${kind} angelegt: ${name}`);
    } else if (existing.isDefault !== isDefault || existing.isActive !== isActive) {
      await updateCategory(existing.id, existing.version, {
        isDefault,
        isActive,
      });
      logLines.push(`${kind} aktualisiert: ${name}`);
    } else {
      logLines.push(`${kind} bereits vorhanden: ${name}`);
    }

    importedNames.add(name);
  }

  const existingCategories = await listExisting();
  for (const category of existingCategories) {
    if (importedNames.has(category.name) || !category.isActive) {
      continue;
    }
    await updateCategory(category.id, category.version, { isActive: false });
    logLines.push(`${kind} deaktiviert: ${category.name}`);
  }
}

async function resolveProductCategoryIdsByName() {
  const categories = await masterDataRepository.listProductCategories("all");
  return new Map(categories.map((category) => [category.name, category.id]));
}

async function resolveComponentCategoryIdsByName() {
  const categories = await masterDataRepository.listComponentCategories("all");
  return new Map(categories.map((category) => [category.name, category.id]));
}

export async function getProductCategorySeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(PRODUCT_CATEGORIES_FILE_NAME);
}

export async function getComponentCategorySeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(COMPONENT_CATEGORIES_FILE_NAME);
}

export async function getProductSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(PRODUCTS_FILE_NAME);
}

export async function getComponentSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(COMPONENTS_FILE_NAME);
}

export async function exportProductManagementSeed(): Promise<SeedExecutionResult> {
  const productCategories = await masterDataRepository.listProductCategories("all");
  const componentCategories = await masterDataRepository.listComponentCategories("all");
  const products = await masterDataRepository.listProducts("all");
  const components = await masterDataRepository.listComponents("all");
  const logLines: string[] = [];

  if (productCategories.length > 0) {
    await writeSeedFileUtf8(
      PRODUCT_CATEGORIES_FILE_NAME,
      stringifyCsv(
        ["Name", "IsDefault", "IsActive"],
        productCategories.map((category) => [
          category.name,
          category.isDefault ? "true" : "false",
          category.isActive ? "true" : "false",
        ]),
      ),
    );
    logLines.push(`Export geschrieben: ${PRODUCT_CATEGORIES_FILE_NAME}`);
    logLines.push(`Produktkategorien exportiert: ${productCategories.length}`);
  } else {
    logLines.push(`Kein Export geschrieben: ${PRODUCT_CATEGORIES_FILE_NAME} (keine Produktkategorien vorhanden)`);
  }

  if (componentCategories.length > 0) {
    await writeSeedFileUtf8(
      COMPONENT_CATEGORIES_FILE_NAME,
      stringifyCsv(
        ["Name", "IsDefault", "IsActive"],
        componentCategories.map((category) => [
          category.name,
          category.isDefault ? "true" : "false",
          category.isActive ? "true" : "false",
        ]),
      ),
    );
    logLines.push(`Export geschrieben: ${COMPONENT_CATEGORIES_FILE_NAME}`);
    logLines.push(`Komponentenkategorien exportiert: ${componentCategories.length}`);
  } else {
    logLines.push(`Kein Export geschrieben: ${COMPONENT_CATEGORIES_FILE_NAME} (keine Komponentenkategorien vorhanden)`);
  }

  if (products.length > 0) {
    const productCategoryNameById = new Map(productCategories.map((category) => [category.id, category.name]));
    await writeSeedFileUtf8(
      PRODUCTS_FILE_NAME,
      stringifyCsv(
        ["Name", "ShortCode", "Beschreibung", "Kategorie"],
        products.map((product) => [
          product.name,
          product.shortCode ?? "",
          product.description ?? "",
          productCategoryNameById.get(product.categoryId) ?? "",
        ]),
      ),
    );
    logLines.push(`Export geschrieben: ${PRODUCTS_FILE_NAME}`);
    logLines.push(`Produkte exportiert: ${products.length}`);
  } else {
    logLines.push(`Kein Export geschrieben: ${PRODUCTS_FILE_NAME} (keine Produkte vorhanden)`);
  }

  if (components.length > 0) {
    const componentCategoryNameById = new Map(componentCategories.map((category) => [category.id, category.name]));
    await writeSeedFileUtf8(
      COMPONENTS_FILE_NAME,
      stringifyCsv(
        ["Name", "ShortCode", "Beschreibung", "Kategorie"],
        components.map((component) => [
          component.name,
          component.shortCode ?? "",
          component.description ?? "",
          componentCategoryNameById.get(component.categoryId) ?? "",
        ]),
      ),
    );
    logLines.push(`Export geschrieben: ${COMPONENTS_FILE_NAME}`);
    logLines.push(`Komponenten exportiert: ${components.length}`);
  } else {
    logLines.push(`Kein Export geschrieben: ${COMPONENTS_FILE_NAME} (keine Komponenten vorhanden)`);
  }

  return {
    sourceFile: PRODUCT_CATEGORIES_FILE_NAME,
    exists: productCategories.length > 0 || componentCategories.length > 0 || products.length > 0 || components.length > 0,
    logLines,
  };
}

export async function applyProductManagementSeed(): Promise<SeedExecutionResult> {
  const productCategoriesStatus = await getProductCategorySeedStatus();
  const componentCategoriesStatus = await getComponentCategorySeedStatus();
  const productsStatus = await getProductSeedStatus();
  const componentsStatus = await getComponentSeedStatus();
  const logLines: string[] = [];

  if (productCategoriesStatus.exists) {
    await syncCategories(
      PRODUCT_CATEGORIES_FILE_NAME,
      "Produktkategorie",
      () => masterDataRepository.listProductCategories("all"),
      masterDataRepository.getProductCategoryByName,
      (input) => masterDataRepository.createProductCategory(input),
      (id, expectedVersion, input) => masterDataRepository.updateProductCategoryWithVersion(id, expectedVersion, input),
      logLines,
    );
  } else {
    logLines.push(`Quelldatei fehlt: ${PRODUCT_CATEGORIES_FILE_NAME}`);
  }

  if (componentCategoriesStatus.exists) {
    await syncCategories(
      COMPONENT_CATEGORIES_FILE_NAME,
      "Komponentenkategorie",
      () => masterDataRepository.listComponentCategories("all"),
      masterDataRepository.getComponentCategoryByName,
      (input) => masterDataRepository.createComponentCategory(input),
      (id, expectedVersion, input) => masterDataRepository.updateComponentCategoryWithVersion(id, expectedVersion, input),
      logLines,
    );
  } else {
    logLines.push(`Quelldatei fehlt: ${COMPONENT_CATEGORIES_FILE_NAME}`);
  }

  if (productsStatus.exists) {
    const productCategoryIdsByName = await resolveProductCategoryIdsByName();
    const parsedProducts = parseCsvWithHeaders(await readSeedFileUtf8(PRODUCTS_FILE_NAME));
    const hasProductIsActiveHeader = hasCsvHeader(parsedProducts.headers, "Is Active");
    const hasProductShortCodeHeader = hasCsvHeader(parsedProducts.headers, "ShortCode");
    const existingProducts = await masterDataRepository.listProducts("all");
    for (const row of parsedProducts.rows) {
      const name = (row.Name ?? "").trim();
      if (!name) {
        logLines.push("Produkt uebersprungen: Name fehlt");
        continue;
      }
      const categoryName = (row.Kategorie ?? "").trim();
      if (!categoryName) {
        throw createMissingCategoryError("Produkt", name, "<leer>");
      }
      const categoryId = productCategoryIdsByName.get(categoryName);
      if (!categoryId) {
        throw createMissingCategoryError("Produkt", name, categoryName);
      }
      const existing = existingProducts.find((product) => product.name === name);
      const isActive = hasProductIsActiveHeader
        ? parseBooleanFlag(row["Is Active"] ?? "", existing?.isActive ?? true)
        : true;
      if (!existing) {
        await masterDataRepository.createProduct({
          name,
          shortCode: hasProductShortCodeHeader ? ((row.ShortCode ?? "").trim() || null) : null,
          description: (row.Beschreibung ?? "").trim() || null,
          categoryId,
          isActive,
          version: 1,
        });
        logLines.push(`Produkt angelegt: ${name}`);
      } else {
        await masterDataRepository.updateProductWithVersion(existing.id, existing.version, {
          shortCode: hasProductShortCodeHeader ? ((row.ShortCode ?? "").trim() || null) : undefined,
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
    const componentCategoryIdsByName = await resolveComponentCategoryIdsByName();
    const parsedComponents = parseCsvWithHeaders(await readSeedFileUtf8(COMPONENTS_FILE_NAME));
    const hasComponentIsActiveHeader = hasCsvHeader(parsedComponents.headers, "Is Active");
    const hasComponentShortCodeHeader = hasCsvHeader(parsedComponents.headers, "ShortCode");
    const existingComponents = await masterDataRepository.listComponents("all");
    for (const row of parsedComponents.rows) {
      const name = (row.Name ?? "").trim();
      if (!name) {
        logLines.push("Komponente uebersprungen: Name fehlt");
        continue;
      }
      const categoryName = (row.Kategorie ?? "").trim();
      if (!categoryName) {
        throw createMissingCategoryError("Komponente", name, "<leer>");
      }
      const categoryId = componentCategoryIdsByName.get(categoryName);
      if (!categoryId) {
        throw createMissingCategoryError("Komponente", name, categoryName);
      }
      const existing = existingComponents.find((component) => component.name === name);
      const isActive = hasComponentIsActiveHeader
        ? parseBooleanFlag(row["Is Active"] ?? "", existing?.isActive ?? true)
        : true;
      if (!existing) {
        await masterDataRepository.createComponent({
          name,
          shortCode: hasComponentShortCodeHeader ? ((row.ShortCode ?? "").trim() || null) : null,
          description: (row.Beschreibung ?? "").trim() || null,
          categoryId,
          isActive,
          version: 1,
        });
        logLines.push(`Komponente angelegt: ${name}`);
      } else {
        await masterDataRepository.updateComponentWithVersion(existing.id, existing.version, {
          shortCode: hasComponentShortCodeHeader ? ((row.ShortCode ?? "").trim() || null) : undefined,
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
    sourceFile: PRODUCT_CATEGORIES_FILE_NAME,
    exists: productCategoriesStatus.exists || componentCategoriesStatus.exists || productsStatus.exists || componentsStatus.exists,
    logLines,
  };
}
