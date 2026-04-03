import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Tag } from "@shared/schema";

import {
  buildCategoryLayoutBlocks,
  CATEGORY_LAYOUT_GRID_CLASS_BY_COLUMNS,
  distributeSortedItemsIntoColumns,
  type CategoryLayoutConfig,
} from "@/lib/produktionsplanung-category-layout";
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

type ProduktionsplanungProjectRow = {
  projectId: number;
  projectName: string;
  orderNumber: string | null;
  customerNumber: string | null;
  customerFullName: string | null;
  actualDate: string;
  durationDays: number;
  tourName: string | null;
  employees: Array<{ id: number; fullName: string }>;
  notesCount: number;
  attachmentsCount: number;
  tags: Tag[];
  reportCardReasonTags: Tag[];
  articleValues: Array<{ categoryId: number; value: string | null }>;
  projectDescription: string | null;
};

type ProduktionsplanungResponse = {
  productCategoryGroups: ProduktionsplanungCategoryGroup[];
  componentCategoryGroups: ProduktionsplanungCategoryGroup[];
  projectRows: ProduktionsplanungProjectRow[];
};

export type ProduktionsplanungPrintCategory = {
  id: number;
  name: string;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd.MM.yyyy", { locale: de });
}

function resolveValue(value: string | null): string {
  if (!value || value.trim().length === 0) return "-";
  return value.trim();
}

function formatDurationDays(value: number): string {
  return value === 1 ? "1 Tag" : `${value} Tage`;
}

function splitProjectRowArticleValue(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildProjectRowArticleGroups(
  row: ProduktionsplanungProjectRow,
  categories: ProduktionsplanungPrintCategory[],
): Array<{ categoryId: number; categoryName: string; items: string[] }> {
  return categories
    .map((category) => {
      const value = row.articleValues.find((entry) => entry.categoryId === category.id)?.value ?? null;
      if (!value || value.trim().length === 0) return null;
      const items = splitProjectRowArticleValue(value);
      if (items.length === 0) return null;
      return {
        categoryId: category.id,
        categoryName: category.name,
        items,
      };
    })
    .filter((value): value is { categoryId: number; categoryName: string; items: string[] } => Boolean(value));
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

function PrintProjectCardFooter({ row }: { row: ProduktionsplanungProjectRow }) {
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
  row: ProduktionsplanungProjectRow;
  categories: ProduktionsplanungPrintCategory[];
}) {
  const articleGroups = buildProjectRowArticleGroups(row, categories);

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
        {articleGroups.length > 0 ? (
          <div className="space-y-2" data-testid={`print-produktionsplanung-project-card-${row.projectId}-articles`}>
            {articleGroups.map((group) => (
              <div key={`${row.projectId}-${group.categoryId}`} className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900">{group.categoryName}</div>
                <div className="flex flex-wrap gap-2 text-sm text-slate-700">
                  {group.items.map((item) => (
                    <span key={`${row.projectId}-${group.categoryId}-${item}`}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
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
  data: ProduktionsplanungResponse;
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
