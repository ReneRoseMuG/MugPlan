import type { ReportProduktionsplanungResponse, ReportProduktionsplanungProjectRow } from "@shared/routes";

import {
  buildCategoryLayoutBlocks,
  CATEGORY_LAYOUT_CATEGORY_SPAN_CLASS_BY_COLUMNS,
  CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS,
  distributeSortedItemsIntoColumns,
  type CategoryLayoutConfig,
} from "@/lib/produktionsplanung-category-layout";
import {
  type ProduktionsplanungArticleCategory,
} from "@/components/reports/produktionsplanungProjectCard.shared";
import { ProduktionsplanungProjectCard } from "@/components/reports/ProduktionsplanungProjectCard";
import {
  paginateMeasuredPrintCards,
  type MeasuredPrintCardHeights,
} from "@/lib/measured-print-pages";
import { cn } from "@/lib/utils";

type ProduktionsplanungItemTotal = {
  itemName: string;
  totalQuantity: number;
};

type ProduktionsplanungCategoryGroup = {
  categoryId: number;
  categoryName: string;
  items: ProduktionsplanungItemTotal[];
};

export type ProduktionsplanungPrintCategory = ProduktionsplanungArticleCategory;
export type ProduktionsplanungPrintBlock =
  | { key: string; kind: "category-empty" }
  | {
      key: string;
      kind: "category-layout";
      blockIndex: number;
      categories: Array<{ group: ProduktionsplanungCategoryGroup; columns: 1 | 2 | 3 }>;
    }
  | { key: string; kind: "category-card"; group: ProduktionsplanungCategoryGroup }
  | { key: string; kind: "section-heading"; label: string }
  | { key: string; kind: "project"; row: ReportProduktionsplanungProjectRow }
  | { key: string; kind: "projects-empty" };
export type ProduktionsplanungPrintPage = {
  pageNumber: number;
  blocks: ProduktionsplanungPrintBlock[];
};

export const PRODUKTIONSPLANUNG_PRINT_BLOCK_GAP_PX = 16;

function renderCategoryCard(group: ProduktionsplanungCategoryGroup) {
  return (
    <div key={group.categoryId} className="rounded border border-slate-300 p-3">
      <h4 className="text-sm font-semibold text-slate-900">{group.categoryName}</h4>
      <ul className="mt-2 space-y-1 text-xs text-slate-700">
        {distributeSortedItemsIntoColumns(group.items, 1, (item) => item.itemName)[0]?.map((item) => (
          <li key={`${group.categoryId}-${item.itemName}`} className="flex min-h-[44px] items-center justify-between gap-3 rounded-md bg-slate-100 px-3 py-1.5">
            <span className="truncate">{item.itemName}</span>
            <span className="font-semibold">{item.totalQuantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderCategoryLayoutSection(
  groups: ProduktionsplanungCategoryGroup[],
  layoutConfig: CategoryLayoutConfig,
) {
  const layoutBlocks = buildCategoryLayoutBlocks(groups, layoutConfig);

  return (
    <section>
      {groups.length > 0 ? (
        layoutBlocks.length > 0 ? (
          <div className="space-y-4">
            {layoutBlocks.map((block, blockIndex) => (
              <div
                key={`layout-block-${blockIndex}`}
                className="grid grid-cols-3 gap-4 rounded-xl border border-slate-300 bg-slate-100/80 p-4"
              >
                {block.categories.map(({ group, columns }) => (
                  <div
                    key={group.categoryId}
                    className={cn("rounded-lg border border-slate-300 bg-white p-4", CATEGORY_LAYOUT_CATEGORY_SPAN_CLASS_BY_COLUMNS[columns])}
                  >
                    <h4 className="text-sm font-semibold text-slate-900">{group.categoryName}</h4>
                    <div className={cn("mt-3 grid gap-3 text-xs text-slate-700", CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS[columns])}>
                      {distributeSortedItemsIntoColumns(group.items, columns, (item) => item.itemName).map((columnItems, columnIndex) => (
                        <ul key={`${group.categoryId}-column-${columnIndex}`} className="space-y-2">
                          {columnItems.map((item) => (
                            <li key={`${group.categoryId}-${item.itemName}`} className="flex min-h-[44px] items-center justify-between gap-3 rounded-md bg-slate-100 px-3 py-1.5">
                              <span className="truncate">{item.itemName}</span>
                              <span className="font-semibold">{item.totalQuantity}</span>
                            </li>
                          ))}
                        </ul>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4">
            {groups.map((group) => renderCategoryCard(group))}
          </div>
        )
      ) : (
        <p className="mt-2 text-xs text-slate-500">Keine Einträge.</p>
      )}
    </section>
  );
}

export function buildProduktionsplanungPrintBlocks(
  data: ReportProduktionsplanungResponse,
  layoutConfig: CategoryLayoutConfig,
): ProduktionsplanungPrintBlock[] {
  const blocks: ProduktionsplanungPrintBlock[] = [];
  const groups = [
    ...data.productCategoryGroups,
    ...data.componentCategoryGroups,
  ];
  const layoutBlocks = buildCategoryLayoutBlocks(groups, layoutConfig);

  if (groups.length === 0) {
    blocks.push({ key: "category-empty", kind: "category-empty" });
  } else if (layoutBlocks.length > 0) {
    layoutBlocks.forEach((block, blockIndex) => {
      blocks.push({
        key: `category-layout-${blockIndex}`,
        kind: "category-layout",
        blockIndex,
        categories: block.categories,
      });
    });
  } else {
    groups.forEach((group) => {
      blocks.push({ key: `category-card-${group.categoryId}`, kind: "category-card", group });
    });
  }

  blocks.push({ key: "projects-heading", kind: "section-heading", label: "Projekte" });
  if (data.projectRows.length > 0) {
    data.projectRows.forEach((row) => {
      blocks.push({ key: `project-${row.projectId}`, kind: "project", row });
    });
  } else {
    blocks.push({ key: "projects-empty", kind: "projects-empty" });
  }

  return blocks;
}

export function renderProduktionsplanungPrintBlock(
  block: ProduktionsplanungPrintBlock,
  categories: ProduktionsplanungPrintCategory[],
) {
  switch (block.kind) {
    case "category-empty":
      return <p className="text-xs text-slate-500">Keine Einträge.</p>;
    case "category-layout":
      return (
        <div
          className="grid grid-cols-3 gap-4 rounded-xl border border-slate-300 bg-slate-100/80 p-4"
          data-testid={`print-produktionsplanung-category-layout-${block.blockIndex}`}
        >
          {block.categories.map(({ group, columns }) => (
            <div
              key={group.categoryId}
              className={cn("rounded-lg border border-slate-300 bg-white p-4", CATEGORY_LAYOUT_CATEGORY_SPAN_CLASS_BY_COLUMNS[columns])}
            >
              <h4 className="text-sm font-semibold text-slate-900">{group.categoryName}</h4>
              <div className={cn("mt-3 grid gap-3 text-xs text-slate-700", CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS[columns])}>
                {distributeSortedItemsIntoColumns(group.items, columns, (item) => item.itemName).map((columnItems, columnIndex) => (
                  <ul key={`${group.categoryId}-column-${columnIndex}`} className="space-y-2">
                    {columnItems.map((item) => (
                      <li key={`${group.categoryId}-${item.itemName}`} className="flex min-h-[44px] items-center justify-between gap-3 rounded-md bg-slate-100 px-3 py-1.5">
                        <span className="truncate">{item.itemName}</span>
                        <span className="font-semibold">{item.totalQuantity}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case "category-card":
      return renderCategoryCard(block.group);
    case "section-heading":
      return <h2 className="text-lg font-semibold text-slate-900">{block.label}</h2>;
    case "project":
      return <ProduktionsplanungProjectCard row={block.row} categories={categories} className="break-inside-avoid" />;
    case "projects-empty":
      return <p className="text-xs text-slate-500">Keine passenden Projekte im gewählten Zeitraum.</p>;
    default:
      return null;
  }
}

export function paginateMeasuredProduktionsplanungPrintPages(
  blocks: ProduktionsplanungPrintBlock[],
  pageCapacityPx: number,
  blockHeights: MeasuredPrintCardHeights,
): ProduktionsplanungPrintPage[] {
  return paginateMeasuredPrintCards({
    items: blocks,
    pageCapacityPx,
    cardHeights: blockHeights,
    getItemKey: (block) => block.key,
    itemGapPx: PRODUKTIONSPLANUNG_PRINT_BLOCK_GAP_PX,
  }).map((page) => ({
    pageNumber: page.pageNumber,
    blocks: page.items,
  }));
}

export function ProduktionsplanungPrintLayout({
  data,
  categories,
  layoutConfig,
}: {
  data: ReportProduktionsplanungResponse;
  categories: ProduktionsplanungPrintCategory[];
  layoutConfig: CategoryLayoutConfig;
}) {
  return (
    <div className="hidden print:block">
      <div className="space-y-6 bg-white text-slate-900">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Produktionsplanung</h2>
          {renderCategoryLayoutSection([
            ...data.productCategoryGroups,
            ...data.componentCategoryGroups,
          ], layoutConfig)}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Projekte</h2>
          {data.projectRows.length > 0 ? (
            <div className="grid gap-4">
              {data.projectRows.map((row) => (
                <ProduktionsplanungProjectCard
                  key={row.projectId}
                  row={row}
                  categories={categories}
                  className="break-inside-avoid"
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Keine passenden Projekte im gewählten Zeitraum.</p>
          )}
        </section>
      </div>
    </div>
  );
}
