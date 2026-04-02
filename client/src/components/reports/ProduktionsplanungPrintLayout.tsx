import { format } from "date-fns";
import { de } from "date-fns/locale";

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
  actualDate: string;
  tourName: string | null;
  articleValues: Array<{ categoryId: number; value: string | null }>;
  projectDescription: string | null;
  matchedSonderblockTagIds: number[];
};

type ProduktionsplanungResponse = {
  productCategoryGroups: ProduktionsplanungCategoryGroup[];
  componentCategoryGroups: ProduktionsplanungCategoryGroup[];
  specialMeasureProjects: Array<unknown>;
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

export function ProduktionsplanungPrintLayout({
  data,
  categories,
  layoutConfig,
}: {
  data: ProduktionsplanungResponse;
  categories: ProduktionsplanungPrintCategory[];
  layoutConfig: CategoryLayoutConfig;
}) {
  const sonderblockRows = data.projectRows.filter((row) => row.matchedSonderblockTagIds.length > 0);

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

        <section>
          <h2 className="text-lg font-semibold">Projektliste</h2>
          <div className="mt-3 overflow-hidden rounded border border-slate-300">
            <table className="min-w-full border-collapse text-[11px]">
              <thead className="bg-slate-100">
                <tr className="text-left">
                  <th className="border-b border-slate-300 px-2 py-2 font-semibold">#</th>
                  <th className="border-b border-slate-300 px-2 py-2 font-semibold">Tatsächlicher Termin</th>
                  <th className="border-b border-slate-300 px-2 py-2 font-semibold">Tour</th>
                  <th className="border-b border-slate-300 px-2 py-2 font-semibold">Projekt / Auftragsnummer</th>
                  {categories.map((category) => (
                    <th key={category.id} className="border-b border-slate-300 px-2 py-2 font-semibold whitespace-nowrap">{category.name}</th>
                  ))}
                  <th className="border-b border-slate-300 px-2 py-2 font-semibold">Anmerkungen</th>
                </tr>
              </thead>
              <tbody>
                {data.projectRows.map((row, index) => (
                  <tr key={row.projectId} className="align-top">
                    <td className="border-b border-slate-200 px-2 py-2 whitespace-nowrap">{index + 1}</td>
                    <td className="border-b border-slate-200 px-2 py-2 whitespace-nowrap">{formatDate(row.actualDate)}</td>
                    <td className="border-b border-slate-200 px-2 py-2 whitespace-nowrap">{resolveValue(row.tourName)}</td>
                    <td className="border-b border-slate-200 px-2 py-2 whitespace-nowrap">
                      {row.projectName} / {resolveValue(row.orderNumber)}
                    </td>
                    {categories.map((category) => {
                      const value = row.articleValues.find((entry) => entry.categoryId === category.id)?.value ?? null;
                      return (
                        <td key={`${row.projectId}-${category.id}`} className="border-b border-slate-200 px-2 py-2 whitespace-nowrap">
                          {resolveValue(value)}
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-200 px-2 py-2 whitespace-nowrap">{resolveValue(row.projectDescription)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Sonderblöcke</h2>
          {sonderblockRows.length > 0 ? (
            <div className="mt-3 space-y-3">
              {sonderblockRows.map((row, index) => (
                <div key={row.projectId} className="break-inside-avoid rounded border border-slate-300 p-3">
                  <h3 className="text-sm font-semibold">
                    #{index + 1} - {formatDate(row.actualDate)} - {row.projectName}
                  </h3>
                  <p className="mt-2 text-sm text-slate-700">{resolveValue(row.projectDescription)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Keine Sonderblöcke im gewählten Zeitraum.</p>
          )}
        </section>
      </div>
    </div>
  );
}
