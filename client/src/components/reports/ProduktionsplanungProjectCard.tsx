import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { ReportProduktionsplanungProjectRow } from "@shared/routes";
import { CalendarWeekAppointmentAttachmentsHover } from "@/components/calendar/CalendarWeekAppointmentAttachmentsHover";
import { CalendarWeekAppointmentEmployeesHover } from "@/components/calendar/CalendarWeekAppointmentEmployeesHover";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import {
  buildProjectRowArticleItems,
  type ProduktionsplanungArticleCategory,
} from "@/components/reports/produktionsplanungProjectCard.shared";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { renderProjectArticleListSection } from "@/components/ui/project-article-description-renderer";

function formatDateLabel(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd.MM.yyyy", { locale: de });
}

function resolveValue(value: string | null): string {
  if (!value || value.trim().length === 0) return "-";
  return value.trim();
}

function hasTextContent(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function formatDurationDays(value: number): string {
  return value === 1 ? "1 Tag" : `${value} Tage`;
}

function ReportProjectCardFooter({
  row,
  testIdPrefix,
}: {
  row: ReportProduktionsplanungProjectRow;
  testIdPrefix: string;
}) {
  return (
    <div className="grid w-full gap-3 md:grid-cols-2">
      <div className="min-w-0 md:w-1/2" data-testid={`${testIdPrefix}-footer-tags-column`}>
        <EntityTagFooterRow tags={row.tags} testId={`${testIdPrefix}-tags`} />
      </div>
      <div
        className="min-w-0 md:w-1/2"
        data-testid={`${testIdPrefix}-footer-badges-column`}
      >
        <div className="flex flex-nowrap items-center justify-end gap-1 overflow-x-auto text-xs text-muted-foreground">
          <CalendarWeekAppointmentEmployeesHover employees={row.employees} />
          <EntityNotesHoverPreview
            sourceMode="cumulative"
            sources={{
              customer: { id: row.customerId, count: row.customerNotesCount },
              project: { id: row.projectId, count: row.projectNotesCount },
              appointment: { id: row.appointmentId, count: row.appointmentNotesCount },
            }}
            triggerLabel="Notizen"
            triggerTestId={`${testIdPrefix}-notes-hover`}
          />
          <CalendarWeekAppointmentAttachmentsHover
            appointmentId={row.appointmentId}
            totalAttachmentsCount={row.attachmentsCount}
          />
        </div>
      </div>
    </div>
  );
}

export function ProduktionsplanungProjectCard({
  row,
  categories,
}: {
  row: ReportProduktionsplanungProjectRow;
  categories: ProduktionsplanungArticleCategory[];
}) {
  const articleSection = renderProjectArticleListSection({
    articleItems: buildProjectRowArticleItems(row, categories),
    articleSectionClassName: "flex-1 min-w-0",
    articleListClassName: "list-disc space-y-1 pl-4 text-sm leading-snug text-foreground",
    testIdPrefix: `reports-produktionsplanung-project-card-${row.projectId}`,
  });
  const hasDescription = hasTextContent(row.projectDescription);
  const hasBodyContent = articleSection || hasDescription;

  return (
    <article
      className="rounded-lg border border-border/60 bg-background/80 shadow-sm"
      data-testid={`reports-produktionsplanung-project-card-${row.projectId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{resolveValue(row.customerFullName)}</div>
          <div className="text-xs text-muted-foreground">{resolveValue(row.customerNumber)}</div>
        </div>
        <div className="space-y-1 text-center">
          <div className="text-sm font-semibold text-foreground">{resolveValue(row.orderNumber)}</div>
          <div className="text-sm text-muted-foreground">{row.projectName}</div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-sm font-semibold text-foreground">{formatDateLabel(row.actualDate)}</div>
          <div className="text-xs text-muted-foreground">{formatDurationDays(row.durationDays)}</div>
        </div>
      </div>
      {hasBodyContent ? (
        <div className="flex flex-wrap gap-6 px-4 py-4">
          {articleSection}
          {hasDescription ? (
            <div
              className="flex-1 min-w-0 whitespace-pre-wrap text-sm text-foreground"
              data-testid={`reports-produktionsplanung-project-card-${row.projectId}-description`}
            >
              {row.projectDescription?.trim() ?? ""}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="border-t border-border/60 bg-slate-50 px-4 py-3">
        <ReportProjectCardFooter
          row={row}
          testIdPrefix={`reports-produktionsplanung-project-card-${row.projectId}`}
        />
      </div>
    </article>
  );
}
