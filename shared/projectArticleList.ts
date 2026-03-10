export const PROJECT_ARTICLE_FIELDS = [
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
    label: "Inneneinrichtung",
    source: "component",
    categoryName: "Inneneinrichtung",
    categoryAliases: ["Inneneinrichtung"],
  },
] as const;

export type ProjectArticleFieldKey = (typeof PROJECT_ARTICLE_FIELDS)[number]["key"];

export type ProjectArticleItem = {
  label: string;
  value: string;
};

export function normalizeProjectArticleValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLocaleLowerCase("de-DE");
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
