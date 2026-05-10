import type { ReportAuftragslisteProjectRow } from "@shared/routes";
import {
  paginateMeasuredPrintCards,
  type MeasuredPrintCardHeights,
} from "@/lib/measured-print-pages";

export type AuftragslistePrintPage = {
  pageNumber: number;
  items: ReportAuftragslisteProjectRow[];
};

const BASE_CARD_HEIGHT_PX = 160;
const ARTICLE_LINE_HEIGHT_PX = 12;
const DESCRIPTION_LINE_HEIGHT_PX = 12;
export const AUFTRAGSLISTE_PRINT_CARD_GAP_PX = 16;

function estimateDescriptionLines(value: string | null): number {
  if (!value || value.trim().length === 0) return 0;
  const text = value.trim();
  return Math.max(1, Math.ceil(text.length / 90));
}

export function estimateAuftragslisteCardHeight(row: ReportAuftragslisteProjectRow): number {
  const articleItems = row.projectArticleItems ?? [];
  const articleLines = articleItems.filter((entry) => entry.label.trim().length > 0 && entry.value.trim().length > 0).length;
  const descriptionLines = estimateDescriptionLines(row.projectDescription);
  return BASE_CARD_HEIGHT_PX + ((articleLines > 0 ? articleLines + 1 : 0) * ARTICLE_LINE_HEIGHT_PX) + (descriptionLines * DESCRIPTION_LINE_HEIGHT_PX);
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
    const nextHeight = currentHeight === 0 ? cardHeight : currentHeight + AUFTRAGSLISTE_PRINT_CARD_GAP_PX + cardHeight;
    if (currentHeight > 0 && nextHeight > availableHeightPx) {
      flushPage();
    }
    currentItems.push(item);
    currentHeight = currentHeight === 0 ? cardHeight : currentHeight + AUFTRAGSLISTE_PRINT_CARD_GAP_PX + cardHeight;
  }
  flushPage();

  if (pages.length === 0) {
    return [{ pageNumber: 1, items: [] }];
  }

  return pages;
}

export function paginateMeasuredAuftragslistePrintPages(
  items: ReportAuftragslisteProjectRow[],
  pageCapacityPx: number,
  cardHeights: MeasuredPrintCardHeights,
): AuftragslistePrintPage[] {
  return paginateMeasuredPrintCards({
    items,
    pageCapacityPx,
    cardHeights,
    getItemKey: (item) => item.projectId,
    itemGapPx: AUFTRAGSLISTE_PRINT_CARD_GAP_PX,
  });
}
