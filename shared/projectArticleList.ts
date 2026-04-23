export const PROJECT_ARTICLE_FIELDS = [
  {
    key: "saunaModel",
    label: "Sauna",
    source: "product",
  },
  {
    key: "oven",
    label: "Ofen",
    source: "component",
    categoryName: "Öfen",
    categoryAliases: ["Öfen", "Ofen", "Oefen", "Ã–fen"],
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
    categoryAliases: ["Türen", "Tür", "Tueren", "Tuer"],
  },
  {
    key: "frontWall",
    label: "Vorderwand",
    source: "component",
    categoryName: "Vorderwände",
    categoryAliases: ["Vorderwände", "Vorderwand", "Vorderwaende"],
  },
  {
    key: "rearWallWindow",
    label: "Rückwand",
    source: "component",
    categoryName: "Rückwände",
    categoryAliases: ["Rückwände", "Rückwand", "Rueckwaende", "Rueckwand"],
  },
  {
    key: "interior",
    label: "Einrichtung",
    source: "component",
    categoryName: "Inneneinrichtung",
    categoryAliases: ["Inneneinrichtung"],
  },
] as const;

export type ProjectArticleFieldKey = (typeof PROJECT_ARTICLE_FIELDS)[number]["key"];

export type ProjectArticleItemSource = "product" | "component";

export type ProjectArticleItem = {
  label: string;
  value: string;
  source?: ProjectArticleItemSource;
  shortCode?: string | null;
};

export type ProjectArticleListFilter = "all" | "components";

export type ProjectArticleListRenderOptions = {
  filter?: ProjectArticleListFilter;
  useShortCodes?: boolean;
};

const REPORT_SAUNA_PRODUCT_CATEGORY_ALIASES = [
  "Fass Saunen",
  "Fasssaunen",
  "Sauna Modell",
  "Saunamodell",
] as const;

export function normalizeProjectArticleValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLocaleLowerCase("de-DE");
}

export function normalizeProjectArticleItemText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function matchesProjectArticleListFilter(
  item: Pick<ProjectArticleItem, "source">,
  filter: ProjectArticleListFilter = "all",
): boolean {
  if (filter === "components") {
    return item.source === "component";
  }
  return true;
}

export function resolveProjectArticleItemDisplayValue(
  item: Pick<ProjectArticleItem, "value" | "shortCode">,
  useShortCodes = false,
): string {
  const shortCode = normalizeProjectArticleItemText(item.shortCode);
  if (useShortCodes && shortCode.length > 0) {
    return shortCode;
  }
  return normalizeProjectArticleItemText(item.value);
}

export function normalizeRenderableProjectArticleItems(
  items: ProjectArticleItem[] | null | undefined,
  options: ProjectArticleListRenderOptions = {},
): ProjectArticleItem[] {
  const filter = options.filter ?? "all";
  const useShortCodes = options.useShortCodes ?? false;

  return (items ?? [])
    .filter((item) => matchesProjectArticleListFilter(item, filter))
    .map((item) => ({
      ...item,
      label: normalizeProjectArticleItemText(item.label),
      value: resolveProjectArticleItemDisplayValue(item, useShortCodes),
    }))
    .filter((item) => item.label.length > 0 && item.value.length > 0);
}

export function getProjectArticleField(key: ProjectArticleFieldKey) {
  return PROJECT_ARTICLE_FIELDS.find((field) => field.key === key)!;
}

export function isProjectArticleProductField(fieldKey: ProjectArticleFieldKey): boolean {
  return getProjectArticleField(fieldKey).source === "product";
}

export function getProjectArticleCategoryAliases(fieldKey: ProjectArticleFieldKey): readonly string[] {
  const field = getProjectArticleField(fieldKey);
  if (field.source !== "component") return [];
  return field.categoryAliases ?? [field.categoryName];
}

export function getProjectArticleFieldByCategoryName(categoryName: string): ProjectArticleFieldKey | null {
  const normalized = normalizeProjectArticleValue(categoryName);
  return PROJECT_ARTICLE_FIELDS.find((field) => {
    if (field.source !== "component") return false;
    return getProjectArticleCategoryAliases(field.key).some((alias) => normalizeProjectArticleValue(alias) === normalized);
  })?.key ?? null;
}

export function isReportSaunaProductCategoryName(categoryName: string): boolean {
  const normalized = normalizeProjectArticleValue(categoryName);
  return REPORT_SAUNA_PRODUCT_CATEGORY_ALIASES.some((alias) => normalizeProjectArticleValue(alias) === normalized);
}
