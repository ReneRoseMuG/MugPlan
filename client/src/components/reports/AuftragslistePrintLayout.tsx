import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MANAGED_SPECIAL_MEASURE_TAG_NAME } from "@shared/appointmentCancellation";
import type { ReportAuftragslisteProjectRow } from "@shared/routes";
import {
  buildProjectRowArticleItems,
  type ProduktionsplanungArticleCategory,
} from "@/components/reports/produktionsplanungProjectCard.shared";
import { renderProjectArticleListSection } from "@/components/ui/project-article-description-renderer";

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

function resolveSpecialMeasureTag(row: ReportAuftragslisteProjectRow) {
  return row.tags.find((tag) => tag.name === MANAGED_SPECIAL_MEASURE_TAG_NAME) ?? null;
}

function PrintProjectCard({
  row,
  categories,
}: {
  row: ReportAuftragslisteProjectRow;
  categories: ProduktionsplanungArticleCategory[];
}) {
  const specialMeasureTag = resolveSpecialMeasureTag(row);
  const articleSection = renderProjectArticleListSection({
    articleItems: buildProjectRowArticleItems(row, categories),
    articleSectionClassName: "space-y-2",
    articleListClassName: "list-disc space-y-0.5 pl-4 text-[10px] leading-snug text-slate-700",
    testIdPrefix: `print-auftragsliste-project-card-${row.projectId}`,
  });

  return (
    <article
      className="break-inside-avoid rounded-lg border border-slate-300 bg-white shadow-sm"
      data-testid={`print-auftragsliste-project-card-${row.projectId}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0 text-xs">
          <div className="flex min-w-0 flex-nowrap items-baseline gap-x-2">
            {specialMeasureTag ? (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: specialMeasureTag.color }}
                data-testid={`print-auftragsliste-project-card-${row.projectId}-special-measure-tag`}
              >
                {specialMeasureTag.name}
              </span>
            ) : null}
            <span className="truncate font-semibold text-slate-900">{resolveValue(row.orderNumber)}</span>
            <span className="truncate text-[10px] text-slate-600">{resolveValue(row.projectName)}</span>
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="flex flex-nowrap items-baseline justify-end gap-x-2">
            <span className="text-[10px] text-slate-600">{resolveValue(row.customerNumber)}</span>
            <span className="truncate font-semibold text-slate-900">{resolveValue(row.customerFullName)}</span>
            {row.tourName ? <span className="text-[10px] text-slate-600">{resolveValue(row.tourName)}</span> : null}
            <span className="font-semibold text-slate-900">{formatDate(row.actualDate)}</span>
            <span className="text-[10px] text-slate-600">{formatDurationDays(row.durationDays)}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 px-4 py-4">
        <div className="min-w-0 pr-3">{articleSection}</div>
        <p className="min-w-0 whitespace-pre-wrap rounded-md border-l border-slate-200 bg-slate-50/70 px-4 py-3 text-[10px] leading-snug text-slate-800">
          {resolveValue(row.projectDescription)}
        </p>
      </div>
    </article>
  );
}

export function AuftragslistePrintLayout({
  items,
  categories,
}: {
  items: ReportAuftragslisteProjectRow[];
  categories: ProduktionsplanungArticleCategory[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((row) => (
        <PrintProjectCard key={row.projectId} row={row} categories={categories} />
      ))}
    </div>
  );
}
