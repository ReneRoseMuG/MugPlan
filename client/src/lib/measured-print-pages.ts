export type MeasuredPrintCardHeights = Record<string, number>;

export type MeasuredPrintPage<TItem> = {
  pageNumber: number;
  items: TItem[];
};

export function normalizeMeasuredPrintCardKey(key: string | number): string {
  return String(key);
}

export function paginateMeasuredPrintCards<TItem>({
  items,
  pageCapacityPx,
  cardHeights,
  getItemKey,
  itemGapPx,
}: {
  items: readonly TItem[];
  pageCapacityPx: number;
  cardHeights: MeasuredPrintCardHeights;
  getItemKey: (item: TItem) => string | number;
  itemGapPx: number;
}): MeasuredPrintPage<TItem>[] {
  const pages: MeasuredPrintPage<TItem>[] = [];
  let currentItems: TItem[] = [];
  let currentHeight = 0;

  const flushPage = () => {
    if (currentItems.length === 0) return;
    pages.push({
      pageNumber: pages.length + 1,
      items: currentItems,
    });
    currentItems = [];
    currentHeight = 0;
  };

  for (const item of items) {
    const cardHeight = cardHeights[normalizeMeasuredPrintCardKey(getItemKey(item))] ?? 0;
    const nextHeight = currentHeight === 0 ? cardHeight : currentHeight + itemGapPx + cardHeight;
    if (currentHeight > 0 && nextHeight > pageCapacityPx) {
      flushPage();
    }
    currentItems.push(item);
    currentHeight = currentHeight === 0 ? cardHeight : currentHeight + itemGapPx + cardHeight;
  }

  flushPage();

  if (pages.length === 0) {
    return [{ pageNumber: 1, items: [] }];
  }

  return pages;
}
