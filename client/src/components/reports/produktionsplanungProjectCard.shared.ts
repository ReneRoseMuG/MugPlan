import {
  getProjectArticleField,
  getProjectArticleFieldByCategoryName,
  isReportSaunaProductCategoryName,
  type ProjectArticleItem,
} from "@shared/projectArticleList";
import type { ReportProduktionsplanungProjectRow } from "@shared/routes";

export type ProduktionsplanungArticleCategory = {
  id: number;
  name: string;
};

export function resolveProjectRowArticleLabel(categoryName: string): string {
  if (isReportSaunaProductCategoryName(categoryName)) {
    return getProjectArticleField("saunaModel").label;
  }

  const fieldKey = getProjectArticleFieldByCategoryName(categoryName);
  if (!fieldKey) {
    return categoryName;
  }

  return getProjectArticleField(fieldKey).label;
}

export function splitProjectRowArticleValue(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function buildProjectRowArticleGroups(
  row: Pick<ReportProduktionsplanungProjectRow, "articleValues">,
  categories: ProduktionsplanungArticleCategory[],
): Array<{ categoryId: number; categoryName: string; items: string[] }> {
  return categories
    .map((category) => {
      const value = row.articleValues.find((entry) => entry.categoryId === category.id)?.value ?? null;
      if (!value || value.trim().length === 0) return null;
      const items = splitProjectRowArticleValue(value);
      if (items.length === 0) return null;
      return {
        categoryId: category.id,
        categoryName: resolveProjectRowArticleLabel(category.name),
        items,
      };
    })
    .filter((value): value is { categoryId: number; categoryName: string; items: string[] } => Boolean(value));
}

export function buildProjectRowArticleItems(
  row: Pick<ReportProduktionsplanungProjectRow, "articleValues">,
  categories: ProduktionsplanungArticleCategory[],
): ProjectArticleItem[] {
  return buildProjectRowArticleGroups(row, categories).flatMap((group) =>
    group.items.map((item) => ({
      label: group.categoryName,
      value: item,
    })));
}
