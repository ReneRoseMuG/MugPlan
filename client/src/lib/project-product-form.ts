import type { Component, ComponentCategory, ProjectOrderItem } from "@shared/schema";

export const PROJECT_PRODUCT_FIELDS = [
  { key: "saunaModel", label: "Saunamodell", categoryName: "Saunamodell" },
  { key: "oven", label: "Ofen", categoryName: "Ofen" },
  { key: "control", label: "Steuerung", categoryName: "Steuerung" },
  { key: "roof", label: "Dach", categoryName: "Dach" },
  { key: "window", label: "Fenster", categoryName: "Fenster" },
] as const;

export type ProjectProductFieldKey = (typeof PROJECT_PRODUCT_FIELDS)[number]["key"];

export type ProjectProductSelection = {
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
  return value.trim().toLocaleLowerCase("de-DE");
}

export function createEmptyProjectProductSelections(): ProjectProductSelections {
  return {
    saunaModel: { componentId: null, componentName: "", itemId: null, version: null },
    oven: { componentId: null, componentName: "", itemId: null, version: null },
    control: { componentId: null, componentName: "", itemId: null, version: null },
    roof: { componentId: null, componentName: "", itemId: null, version: null },
    window: { componentId: null, componentName: "", itemId: null, version: null },
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
  };
}

export function getProjectProductField(key: ProjectProductFieldKey) {
  return PROJECT_PRODUCT_FIELDS.find((field) => field.key === key)!;
}

export function getProjectProductFieldByCategoryName(categoryName: string): ProjectProductFieldKey | null {
  const normalized = normalizeValue(categoryName);
  return PROJECT_PRODUCT_FIELDS.find((field) => normalizeValue(field.categoryName) === normalized)?.key ?? null;
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
  components: Component[],
  categories: ComponentCategory[],
): ProjectProductSelections {
  const result = createEmptyProjectProductSelections();
  const componentById = new Map(components.map((component) => [component.id, component] as const));
  const categoryById = new Map(categories.map((category) => [category.id, category] as const));

  for (const item of orderItems) {
    if (item.componentId == null) continue;
    const component = componentById.get(item.componentId);
    if (!component) continue;
    const category = categoryById.get(component.categoryId);
    if (!category) continue;
    const fieldKey = getProjectProductFieldByCategoryName(category.name);
    if (!fieldKey) continue;
    result[fieldKey] = {
      componentId: component.id,
      componentName: component.name,
      itemId: item.id,
      version: item.version,
    };
  }

  return result;
}

function findMatchingComponent(
  components: Component[],
  categories: ComponentCategory[],
  categoryName: string,
  candidateText: string,
): Component | null {
  const normalizedCandidate = normalizeValue(candidateText);
  if (!normalizedCandidate) return null;
  const category = categories.find((entry) => normalizeValue(entry.name) === normalizeValue(categoryName));
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
  components: Component[],
  categories: ComponentCategory[],
): ProjectProductSelections {
  const result = createEmptyProjectProductSelections();
  const saunaComponent = findMatchingComponent(components, categories, "Saunamodell", input.saunaModel);
  if (saunaComponent) {
    result.saunaModel = {
      componentId: saunaComponent.id,
      componentName: saunaComponent.name,
      itemId: null,
      version: null,
    };
  }

  for (const categoryItem of input.categorizedItems) {
    const fieldKey = getProjectProductFieldByCategoryName(categoryItem.category);
    if (!fieldKey) continue;
    const firstDescription = categoryItem.items[0]?.description ?? "";
    const component = findMatchingComponent(
      components,
      categories,
      getProjectProductField(fieldKey).categoryName,
      firstDescription,
    );
    if (!component) continue;
    result[fieldKey] = {
      componentId: component.id,
      componentName: component.name,
      itemId: null,
      version: null,
    };
  }

  return result;
}
