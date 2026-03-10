import type { Component, ComponentCategory, Product, ProjectOrderItem } from "@shared/schema";

export const PROJECT_PRODUCT_FIELDS = [
  {
    key: "saunaModel",
    label: "Saunamodell",
    source: "product",
  },
  {
    key: "oven",
    label: "Ofen",
    source: "component",
    categoryName: "Öfen",
    categoryAliases: ["Öfen", "Ofen"],
  },
  {
    key: "control",
    label: "Steuerung",
    source: "component",
    categoryName: "Steuerungen",
    categoryAliases: ["Steuerungen", "Steuerung"],
  },
  {
    key: "roof",
    label: "Dach",
    source: "component",
    categoryName: "Dachvarianten",
    categoryAliases: ["Dachvarianten", "Dach"],
  },
  {
    key: "window",
    label: "Fenster",
    source: "component",
    categoryName: "Fenster",
    categoryAliases: ["Fenster"],
  },
  {
    key: "door",
    label: "Tür",
    source: "component",
    categoryName: "Türen",
    categoryAliases: ["Türen", "Tür"],
  },
  {
    key: "frontWall",
    label: "Vorderwand",
    source: "component",
    categoryName: "Vorderwände",
    categoryAliases: ["Vorderwände", "Vorderwand"],
  },
  {
    key: "rearWallWindow",
    label: "Rückwand",
    source: "component",
    categoryName: "Rückwände",
    categoryAliases: ["Rückwände", "Rückwand"],
  },
  {
    key: "interior",
    label: "Inneneinrichtung",
    source: "component",
    categoryName: "Inneneinrichtung",
    categoryAliases: ["Inneneinrichtung"],
  },
] as const;

export type ProjectProductFieldKey = (typeof PROJECT_PRODUCT_FIELDS)[number]["key"];

export type ProjectProductSelection = {
  productId: number | null;
  componentId: number | null;
  componentName: string;
  itemId: number | null;
  version: number | null;
};

export type ProjectProductSelections = Record<ProjectProductFieldKey, ProjectProductSelection>;

type ExtractionCategoryInput = {
  category: string;
  items: Array<{ description: string }>;
};

function normalizeValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLocaleLowerCase("de-DE");
}

function createEmptySelection(): ProjectProductSelection {
  return {
    productId: null,
    componentId: null,
    componentName: "",
    itemId: null,
    version: null,
  };
}

function getFieldCategoryAliases(fieldKey: ProjectProductFieldKey): readonly string[] {
  const field = getProjectProductField(fieldKey);
  if (field.source !== "component") return [];
  return field.categoryAliases ?? [field.categoryName];
}

export function isProductSelectionField(fieldKey: ProjectProductFieldKey): boolean {
  return getProjectProductField(fieldKey).source === "product";
}

export function findProjectProductCategory(
  categories: ComponentCategory[],
  fieldKey: ProjectProductFieldKey,
): ComponentCategory | null {
  if (isProductSelectionField(fieldKey)) return null;
  const aliases = getFieldCategoryAliases(fieldKey).map(normalizeValue);
  return categories.find((entry) => aliases.includes(normalizeValue(entry.name))) ?? null;
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

export function getProjectProductField(key: ProjectProductFieldKey) {
  return PROJECT_PRODUCT_FIELDS.find((field) => field.key === key)!;
}

export function getProjectProductFieldByCategoryName(categoryName: string): ProjectProductFieldKey | null {
  const normalized = normalizeValue(categoryName);
  return PROJECT_PRODUCT_FIELDS.find((field) => {
    if (field.source !== "component") return false;
    return (field.categoryAliases ?? [field.categoryName]).some((alias) => normalizeValue(alias) === normalized);
  })?.key ?? null;
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
    return "<h2>Artikelliste</h2><p>Keine Artikelliste gepflegt.</p>";
  }
  return `<h2>Artikelliste</h2><ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

export function buildPersistedProjectDescription(
  selections: ProjectProductSelections,
  descriptionHtml: string,
): string {
  const normalizedDescription = descriptionHtml.trim();
  const descriptionBlock = normalizedDescription.length > 0
    ? `<h2>Beschreibung</h2>${normalizedDescription}`
    : "<h2>Beschreibung</h2><p></p>";
  return `${buildProjectArticleListHtml(selections)}${descriptionBlock}`;
}

export function extractEditorDescriptionHtml(descriptionHtml: string | null | undefined): string {
  const normalized = descriptionHtml?.trim() ?? "";
  if (!normalized) return "";
  const match = normalized.match(/<h2>\s*Beschreibung\s*<\/h2>([\s\S]*)$/i);
  if (match) {
    return match[1].trim();
  }
  return normalized;
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

function findMatchingProduct(products: Product[], candidateText: string): Product | null {
  const normalizedCandidate = normalizeValue(candidateText);
  if (!normalizedCandidate) return null;
  return products.find((product) => {
    const normalizedName = normalizeValue(product.name);
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
  const normalizedCandidate = normalizeValue(candidateText);
  if (!normalizedCandidate) return null;
  const category = findProjectProductCategory(categories, fieldKey);
  if (!category) return null;
  const categoryComponents = components.filter((component) => component.categoryId === category.id);
  return categoryComponents.find((component) => {
    const normalizedName = normalizeValue(component.name);
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
