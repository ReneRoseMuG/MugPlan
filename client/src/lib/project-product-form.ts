import {
  PROJECT_ARTICLE_FIELDS,
  getProjectArticleCategoryAliases,
  getProjectArticleField,
  getProjectArticleFieldByCategoryName,
  isProjectArticleProductField,
  normalizeProjectArticleValue,
  type ProjectArticleFieldKey,
} from "@shared/projectArticleList";
import type { Component, ComponentCategory, Product, ProductCategory, ProjectOrderItem } from "@shared/schema";

export const PROJECT_PRODUCT_FIELDS = PROJECT_ARTICLE_FIELDS;

export type ProjectProductFieldKey = ProjectArticleFieldKey;

export type ProjectProductSelection = {
  productId: number | null;
  componentId: number | null;
  componentName: string;
  itemId: number | null;
  version: number | null;
};

export type ProjectProductSelections = Record<ProjectProductFieldKey, ProjectProductSelection>;
export type DynamicProjectProductSelections = Record<string, ProjectProductSelection>;
export type DynamicProjectCategorySlot = {
  slotId: string;
  categoryId: number;
  categoryName: string;
  label: string;
  source: "product" | "component";
};

type ExtractionCategoryInput = {
  category: string;
  items: Array<{ description: string }>;
};

export function createEmptySelection(): ProjectProductSelection {
  return {
    productId: null,
    componentId: null,
    componentName: "",
    itemId: null,
    version: null,
  };
}

function getFieldCategoryAliases(fieldKey: ProjectProductFieldKey): readonly string[] {
  return getProjectArticleCategoryAliases(fieldKey);
}

export function isProductSelectionField(fieldKey: ProjectProductFieldKey): boolean {
  return isProjectArticleProductField(fieldKey);
}

export function findProjectProductCategory(
  categories: ComponentCategory[],
  fieldKey: ProjectProductFieldKey,
): ComponentCategory | null {
  if (isProductSelectionField(fieldKey)) return null;
  const aliases = getFieldCategoryAliases(fieldKey).map(normalizeProjectArticleValue);
  return categories.find((entry) => aliases.includes(normalizeProjectArticleValue(entry.name))) ?? null;
}

export function createEmptyProjectProductSelections(): ProjectProductSelections {
  return {
    saunaModel: createEmptySelection(),
    oven: createEmptySelection(),
    control: createEmptySelection(),
    roof: createEmptySelection(),
    window: createEmptySelection(),
    door: createEmptySelection(),
    frontWall: createEmptySelection(),
    rearWallWindow: createEmptySelection(),
    interior: createEmptySelection(),
  };
}

export function createEmptyDynamicProjectProductSelections(
  slots: DynamicProjectCategorySlot[],
): DynamicProjectProductSelections {
  return Object.fromEntries(slots.map((slot) => [slot.slotId, createEmptySelection()]));
}

export function cloneProjectProductSelections(
  selections: ProjectProductSelections,
): ProjectProductSelections {
  return {
    saunaModel: { ...selections.saunaModel },
    oven: { ...selections.oven },
    control: { ...selections.control },
    roof: { ...selections.roof },
    window: { ...selections.window },
    door: { ...selections.door },
    frontWall: { ...selections.frontWall },
    rearWallWindow: { ...selections.rearWallWindow },
    interior: { ...selections.interior },
  };
}

export function cloneDynamicProjectProductSelections(
  selections: DynamicProjectProductSelections,
): DynamicProjectProductSelections {
  return Object.fromEntries(Object.entries(selections).map(([key, value]) => [key, { ...value }]));
}

export function getProjectProductField(key: ProjectProductFieldKey) {
  return getProjectArticleField(key);
}

export function getProjectProductFieldByCategoryName(categoryName: string): ProjectProductFieldKey | null {
  return getProjectArticleFieldByCategoryName(categoryName);
}

export function getLegacyProductFieldByCategoryName(categoryName: string): ProjectProductFieldKey | null {
  const normalized = normalizeProjectArticleValue(categoryName);
  if (normalized === normalizeProjectArticleValue("Fass Saunen")) {
    return "saunaModel";
  }
  return null;
}

export function buildDynamicProjectCategorySlots(input: {
  productCategories: ProductCategory[];
  componentCategories: ComponentCategory[];
}): DynamicProjectCategorySlot[] {
  const knownComponentOrder: ProjectProductFieldKey[] = ["oven", "control", "roof", "window", "door", "frontWall", "rearWallWindow", "interior"];
  const knownComponentCategoryIds = new Set<number>(
    input.componentCategories
      .filter((category) => knownComponentOrder.some((fieldKey) => findProjectProductCategory([category], fieldKey) !== null))
      .map((category) => category.id),
  );

  const dynamicProductSlots = input.productCategories
    .filter((category) => category.isDefault && getLegacyProductFieldByCategoryName(category.name) === null)
    .sort((left, right) => left.name.localeCompare(right.name, "de"))
    .map((category) => ({
      slotId: `product-category-${category.id}`,
      categoryId: category.id,
      categoryName: category.name,
      label: category.name,
      source: "product" as const,
    }));

  const dynamicComponentSlots = input.componentCategories
    .filter((category) => category.isDefault && !knownComponentCategoryIds.has(category.id))
    .sort((left, right) => left.name.localeCompare(right.name, "de"))
    .map((category) => ({
      slotId: `component-category-${category.id}`,
      categoryId: category.id,
      categoryName: category.name,
      label: category.name,
      source: "component" as const,
    }));

  return [...dynamicProductSlots, ...dynamicComponentSlots];
}

export function buildProjectArticleLines(selections: ProjectProductSelections): string[] {
  return PROJECT_PRODUCT_FIELDS
    .map((field) => {
      const selection = selections[field.key];
      if (!selection.componentName.trim()) return null;
      return `${field.label}: ${selection.componentName.trim()}`;
    })
    .filter((value): value is string => value !== null);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildProjectArticleListHtml(selections: ProjectProductSelections): string {
  const lines = buildProjectArticleLines(selections);
  if (lines.length === 0) {
    return "<ul></ul>";
  }
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

export function buildPersistedProjectDescription(
  _selections: ProjectProductSelections,
  descriptionHtml: string,
): string {
  return descriptionHtml;
}

export function extractEditorDescriptionHtml(descriptionHtml: string | null | undefined): string {
  return descriptionHtml ?? "";
}

export function mapProjectOrderItemsToSelections(
  orderItems: ProjectOrderItem[],
  products: Product[],
  components: Component[],
  categories: ComponentCategory[],
): ProjectProductSelections {
  const result = createEmptyProjectProductSelections();
  const productById = new Map(products.map((product) => [product.id, product] as const));
  const componentById = new Map(components.map((component) => [component.id, component] as const));
  const categoryById = new Map(categories.map((category) => [category.id, category] as const));

  for (const item of orderItems) {
    if (item.productId != null) {
      const product = productById.get(item.productId);
      if (!product) continue;
      result.saunaModel = {
        productId: product.id,
        componentId: null,
        componentName: product.name,
        itemId: item.id,
        version: item.version,
      };
      continue;
    }

    if (item.componentId == null) continue;
    const component = componentById.get(item.componentId);
    if (!component) continue;
    const category = categoryById.get(component.categoryId);
    if (!category) continue;
    const fieldKey = getProjectProductFieldByCategoryName(category.name);
    if (!fieldKey) continue;
    result[fieldKey] = {
      productId: null,
      componentId: component.id,
      componentName: component.name,
      itemId: item.id,
      version: item.version,
    };
  }

  return result;
}

export function mapProjectOrderItemsToDynamicSelections(
  orderItems: ProjectOrderItem[],
  products: Product[],
  components: Component[],
  slots: DynamicProjectCategorySlot[],
): DynamicProjectProductSelections {
  const result = createEmptyDynamicProjectProductSelections(slots);
  const productById = new Map(products.map((product) => [product.id, product] as const));
  const componentById = new Map(components.map((component) => [component.id, component] as const));
  const slotByProductCategoryId = new Map(
    slots.filter((slot) => slot.source === "product").map((slot) => [slot.categoryId, slot] as const),
  );
  const slotByComponentCategoryId = new Map(
    slots.filter((slot) => slot.source === "component").map((slot) => [slot.categoryId, slot] as const),
  );

  for (const item of orderItems) {
    if (item.productId != null) {
      const product = productById.get(item.productId);
      if (!product) continue;
      const slot = slotByProductCategoryId.get(product.categoryId);
      if (!slot) continue;
      result[slot.slotId] = {
        productId: product.id,
        componentId: null,
        componentName: product.name,
        itemId: item.id,
        version: item.version,
      };
      continue;
    }

    if (item.componentId == null) continue;
    const component = componentById.get(item.componentId);
    if (!component) continue;
    const slot = slotByComponentCategoryId.get(component.categoryId);
    if (!slot) continue;
    result[slot.slotId] = {
      productId: null,
      componentId: component.id,
      componentName: component.name,
      itemId: item.id,
      version: item.version,
    };
    continue;
  }

  return result;
}

function findMatchingProduct(products: Product[], candidateText: string): Product | null {
  const normalizedCandidate = normalizeProjectArticleValue(candidateText);
  if (!normalizedCandidate) return null;
  return products.find((product) => {
    const normalizedName = normalizeProjectArticleValue(product.name);
    return normalizedName === normalizedCandidate
      || normalizedCandidate.includes(normalizedName)
      || normalizedName.includes(normalizedCandidate);
  }) ?? null;
}

function findMatchingComponent(
  components: Component[],
  categories: ComponentCategory[],
  fieldKey: ProjectProductFieldKey,
  candidateText: string,
): Component | null {
  const normalizedCandidate = normalizeProjectArticleValue(candidateText);
  if (!normalizedCandidate) return null;
  const category = findProjectProductCategory(categories, fieldKey);
  if (!category) return null;
  const categoryComponents = components.filter((component) => component.categoryId === category.id);
  return categoryComponents.find((component) => {
    const normalizedName = normalizeProjectArticleValue(component.name);
    return normalizedName === normalizedCandidate
      || normalizedCandidate.includes(normalizedName)
      || normalizedName.includes(normalizedCandidate);
  }) ?? null;
}

export function resolveSelectionsFromExtraction(
  input: {
    saunaModel: string;
    categorizedItems: ExtractionCategoryInput[];
  },
  products: Product[],
  components: Component[],
  categories: ComponentCategory[],
): ProjectProductSelections {
  const result = createEmptyProjectProductSelections();
  const saunaProduct = findMatchingProduct(products, input.saunaModel);
  if (saunaProduct) {
    result.saunaModel = {
      productId: saunaProduct.id,
      componentId: null,
      componentName: saunaProduct.name,
      itemId: null,
      version: null,
    };
  }

  for (const categoryItem of input.categorizedItems) {
    const fieldKey = getProjectProductFieldByCategoryName(categoryItem.category);
    if (!fieldKey) continue;
    const firstDescription = categoryItem.items[0]?.description ?? "";
    const component = findMatchingComponent(components, categories, fieldKey, firstDescription);
    if (!component) continue;
    result[fieldKey] = {
      productId: null,
      componentId: component.id,
      componentName: component.name,
      itemId: null,
      version: null,
    };
  }

  return result;
}
