import type { ReportAuftragslisteProjectRow } from "@shared/routes";

export type AuftragslistePrintPage = {
  pageNumber: number;
  items: ReportAuftragslisteProjectRow[];
};

const BASE_CARD_HEIGHT_PX = 96;
const ARTICLE_LINE_HEIGHT_PX = 12;
const DESCRIPTION_LINE_HEIGHT_PX = 12;
const ROW_GAP_PX = 16;

function estimateDescriptionLines(value: string | null): number {
  if (!value || value.trim().length === 0) return 0;
  const text = value.trim();
  return Math.max(1, Math.ceil(text.length / 90));
}

export function estimateAuftragslisteCardHeight(row: ReportAuftragslisteProjectRow): number {
  const articleLines = row.articleValues.filter((entry) => typeof entry.value === "string" && entry.value.trim().length > 0).length;
  const descriptionLines = estimateDescriptionLines(row.projectDescription);
  return BASE_CARD_HEIGHT_PX + (articleLines * ARTICLE_LINE_HEIGHT_PX) + (descriptionLines * DESCRIPTION_LINE_HEIGHT_PX);
}

export function paginateAuftragslistePrintPages(
  items: ReportAuftragslisteProjectRow[],
  availableHeightPx: number,
): AuftragslistePrintPage[] {
  const pages: AuftragslistePrintPage[] = [];
  let currentItems: ReportAuftragslisteProjectRow[] = [];
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
    const cardHeight = estimateAuftragslisteCardHeight(item);
    const nextHeight = currentHeight === 0 ? cardHeight : currentHeight + ROW_GAP_PX + cardHeight;
    if (currentHeight > 0 && nextHeight > availableHeightPx) {
      flushPage();
    }
    currentItems.push(item);
    currentHeight = currentHeight === 0 ? cardHeight : currentHeight + ROW_GAP_PX + cardHeight;
  }
  flushPage();

  if (pages.length === 0) {
    return [{ pageNumber: 1, items: [] }];
  }

  return pages;
}
