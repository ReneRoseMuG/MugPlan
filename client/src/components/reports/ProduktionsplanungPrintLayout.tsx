import type { ReportProduktionsplanungResponse, ReportProduktionsplanungProjectRow } from "@shared/routes";
import type { Tag } from "@shared/schema";

import {
  buildCategoryLayoutBlocks,
  CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS,
  distributeSortedItemsIntoColumns,
  type CategoryLayoutConfig,
} from "@/lib/produktionsplanung-category-layout";
import {
  buildProjectRowArticleItems,
  type ProduktionsplanungArticleCategory,
} from "@/components/reports/produktionsplanungProjectCard.shared";
import { renderProjectArticleListSection } from "@/components/ui/project-article-description-renderer";
import { formatDisplayDate } from "@/lib/date-display-format";
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

function formatDate(value: string | null): string {
  return formatDisplayDate(value, "-");
}

function resolveValue(value: string | null): string {
  if (!value || value.trim().length === 0) return "-";
  return value.trim();
}

function formatDurationDays(value: number): string {
  return value === 1 ? "1 Tag" : `${value} Tage`;
}

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
                className="space-y-4 rounded-xl border border-slate-300 bg-slate-100/80 p-4"
              >
                {block.categories.map(({ group, columns }) => (
                  <div key={group.categoryId} className="rounded-lg border border-slate-300 bg-white p-4">
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

function PrintTagList({
  tags,
  testId,
}: {
  tags: Tag[];
  testId: string;
}) {
  return (
    <div className="flex flex-wrap gap-1" data-testid={testId}>
      {tags.length > 0 ? tags.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-medium text-slate-700"
          data-testid={`${testId}-tag-${tag.id}`}
        >
          {tag.name}
        </span>
      )) : (
        <span className="text-[10px] text-slate-400">Keine Tags</span>
      )}
    </div>
  );
}

function PrintProjectCardFooter({ row }: { row: ReportProduktionsplanungProjectRow }) {
  return (
    <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-900">Mitarbeiter:</span>
        {row.employees.length > 0 ? row.employees.map((employee) => (
          <span key={employee.id} className="rounded-full border border-slate-300 bg-white px-2 py-0.5">
            {employee.fullName}
          </span>
        )) : (
          <span>-</span>
        )}
        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5">Notizen {row.notesCount}</span>
        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5">Anhänge {row.attachmentsCount}</span>
      </div>
      <PrintTagList tags={row.tags} testId={`print-produktionsplanung-project-card-${row.projectId}-tags`} />
    </div>
  );
}

function PrintProjectCard({
  row,
  categories,
}: {
  row: ReportProduktionsplanungProjectRow;
  categories: ProduktionsplanungPrintCategory[];
}) {
  const articleSection = renderProjectArticleListSection({
    articleItems: buildProjectRowArticleItems(row, categories),
    articleSectionClassName: "space-y-2",
    articleListClassName: "list-disc space-y-0.5 pl-4 text-[10px] leading-snug text-slate-700",
    testIdPrefix: `print-produktionsplanung-project-card-${row.projectId}`,
  });

  return (
    <article
      className="break-inside-avoid rounded-lg border border-slate-300 bg-white shadow-sm"
      data-testid={`print-produktionsplanung-project-card-${row.projectId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-900">{resolveValue(row.customerFullName)}</div>
          <div className="text-xs text-slate-600">{resolveValue(row.customerNumber)}</div>
        </div>
        <div className="space-y-1 text-center">
          <div className="text-sm font-semibold text-slate-900">{resolveValue(row.orderNumber)}</div>
          <div className="text-sm text-slate-700">{row.projectName}</div>
          {row.reportCardReasonTags.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1" data-testid={`print-produktionsplanung-project-card-${row.projectId}-reasons`}>
              {row.reportCardReasonTags.map((tag) => (
                <span key={tag.id} className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-1 text-right">
          <div className="text-sm font-semibold text-slate-900">{formatDate(row.actualDate)}</div>
          <div className="text-xs text-slate-600">{formatDurationDays(row.durationDays)}</div>
          {row.tourName ? <div className="text-xs text-slate-600">{row.tourName}</div> : null}
        </div>
      </div>
      <div className="space-y-3 px-4 py-4">
        <p className="whitespace-pre-wrap text-sm text-slate-800">{resolveValue(row.projectDescription)}</p>
        {articleSection}
      </div>
      <PrintProjectCardFooter row={row} />
    </article>
  );
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
                <PrintProjectCard key={row.projectId} row={row} categories={categories} />
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
