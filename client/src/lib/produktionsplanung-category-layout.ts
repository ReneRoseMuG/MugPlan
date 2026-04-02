export type CategoryLayoutColumns = 1 | 2 | 3;

export type CategoryLayoutEntry = {
  categoryId: number;
  block: number;
  columns: CategoryLayoutColumns;
};

export type CategoryLayoutConfig = CategoryLayoutEntry[];

export type CategoryLayoutResolvedCategory<TGroup extends { categoryId: number }> = {
  columns: CategoryLayoutColumns;
  group: TGroup;
};

export type CategoryLayoutResolvedBlock<TGroup extends { categoryId: number }> = {
  block: number;
  categories: Array<CategoryLayoutResolvedCategory<TGroup>>;
};

export const CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS: Record<CategoryLayoutColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseLegacyCategoryIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every(isPositiveInteger)) {
    return null;
  }
  const unique = Array.from(new Set(value));
  return unique.length === value.length ? unique : null;
}

function tryResolveCurrentCategoryLayout(value: unknown): CategoryLayoutConfig | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const entries: CategoryLayoutConfig = [];
  const seenCategoryIds = new Set<number>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }

    const candidate = entry as Record<string, unknown>;
    const categoryId = candidate.categoryId;
    const block = candidate.block;
    const columns = candidate.columns;

    if (!isPositiveInteger(categoryId) || seenCategoryIds.has(categoryId)) {
      return null;
    }
    if (!isPositiveInteger(block)) {
      return null;
    }
    if (columns !== 1 && columns !== 2 && columns !== 3) {
      return null;
    }

    seenCategoryIds.add(categoryId);
    entries.push({
      categoryId,
      block,
      columns,
    });
  }

  return entries;
}

function tryResolveLegacyCategoryLayout(value: unknown): CategoryLayoutConfig | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const entries: CategoryLayoutConfig = [];
  const seenCategoryIds = new Set<number>();

  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }

    const candidate = entry as Record<string, unknown>;
    const categoryIds = parseLegacyCategoryIds(candidate.categoryIds);
    const columns = candidate.columns;

    if (!categoryIds) {
      return null;
    }
    if (columns !== 1 && columns !== 2 && columns !== 3) {
      return null;
    }
    if (categoryIds.some((categoryId) => seenCategoryIds.has(categoryId))) {
      return null;
    }

    for (const categoryId of categoryIds) {
      seenCategoryIds.add(categoryId);
      entries.push({
        categoryId,
        block: index + 1,
        columns,
      });
    }
  }

  return entries;
}

export function resolveCategoryLayoutConfig(value: unknown): CategoryLayoutConfig {
  return tryResolveCurrentCategoryLayout(value) ?? tryResolveLegacyCategoryLayout(value) ?? [];
}

export function getCategoryLayoutIds(config: CategoryLayoutConfig): number[] {
  return config
    .slice()
    .sort((left, right) => left.block - right.block)
    .map((entry) => entry.categoryId);
}

export function orderCategoriesByLayout<TCategory extends { id: number }>(
  categories: TCategory[],
  config: CategoryLayoutConfig,
): TCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category] as const));
  return getCategoryLayoutIds(config)
    .map((id) => byId.get(id))
    .filter((category): category is TCategory => Boolean(category));
}

export function buildCategoryLayoutBlocks<TGroup extends { categoryId: number }>(
  groups: TGroup[],
  config: CategoryLayoutConfig,
): Array<CategoryLayoutResolvedBlock<TGroup>> {
  if (config.length === 0) {
    return [];
  }

  const groupById = new Map(groups.map((group) => [group.categoryId, group] as const));
  const blocksByNumber = new Map<number, CategoryLayoutResolvedBlock<TGroup>>();

  for (const entry of config.slice().sort((left, right) => left.block - right.block)) {
    const group = groupById.get(entry.categoryId);
    if (!group) {
      continue;
    }

    const existingBlock = blocksByNumber.get(entry.block);
    if (existingBlock) {
      existingBlock.categories.push({
        columns: entry.columns,
        group,
      });
      continue;
    }

    blocksByNumber.set(entry.block, {
      block: entry.block,
      categories: [{
        columns: entry.columns,
        group,
      }],
    });
  }

  return Array.from(blocksByNumber.values());
}

export function distributeSortedItemsIntoColumns<TItem>(
  items: TItem[],
  columns: CategoryLayoutColumns,
  getLabel: (item: TItem) => string,
): TItem[][] {
  const sortedItems = [...items].sort((left, right) => getLabel(left).localeCompare(getLabel(right), "de", { sensitivity: "base" }));
  const columnCount = Math.max(1, columns);
  const baseSize = Math.floor(sortedItems.length / columnCount);
  const remainder = sortedItems.length % columnCount;
  const result: TItem[][] = [];
  let startIndex = 0;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const currentSize = baseSize + (columnIndex < remainder ? 1 : 0);
    result.push(sortedItems.slice(startIndex, startIndex + currentSize));
    startIndex += currentSize;
  }

  return result;
}
