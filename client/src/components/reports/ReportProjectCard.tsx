import type { Tag } from "@shared/schema";
import { CalendarWeekAppointmentAttachmentsHover } from "@/components/calendar/CalendarWeekAppointmentAttachmentsHover";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { formatDisplayDate } from "@/lib/date-display-format";
import { cn } from "@/lib/utils";

type ReportProjectCardRow = {
  projectId: number;
  customerId: number;
  appointmentId: number;
  projectName: string;
  orderNumber: string | null;
  customerNumber: string | null;
  customerFullName: string | null;
  tourName?: string | null;
  actualDate: string | null;
  durationDays: number;
  employees: Array<{ id: number; firstName?: string | null; lastName?: string | null; fullName: string }>;
  tourColor?: string | null;
  customerNotesCount: number;
  projectNotesCount: number;
  appointmentNotesCount: number;
  customerAttachmentsCount: number;
  projectAttachmentsCount: number;
  appointmentAttachmentsCount: number;
  attachmentsCount: number;
  tags: Tag[];
};

function formatDateLabel(value: string | null): string {
  return formatDisplayDate(value, "-");
}

function resolveValue(value: string | null): string {
  if (!value || value.trim().length === 0) return "-";
  return value.trim();
}

function formatDurationDays(value: number): string {
  return value === 1 ? "1 Tag" : `${value} Tage`;
}

function ReportProjectCardFooter({
  row,
  testIdPrefix,
  hideBadges,
}: {
  row: ReportProjectCardRow;
  testIdPrefix: string;
  hideBadges?: boolean;
}) {
  if (hideBadges) {
    return (
      <div className="w-full">
        <div className="min-w-0 w-full" data-testid={`${testIdPrefix}-footer-tags-column`}>
          <EntityTagFooterRow tags={row.tags} testId={`${testIdPrefix}-tags`} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-3 md:grid-cols-2">
      <div className="min-w-0 md:w-1/2" data-testid={`${testIdPrefix}-footer-tags-column`}>
        <EntityTagFooterRow tags={row.tags} testId={`${testIdPrefix}-tags`} />
      </div>
      <div className="min-w-0 md:w-1/2" data-testid={`${testIdPrefix}-footer-badges-column`}>
        <div className="flex flex-nowrap items-center justify-end gap-1 overflow-x-auto text-xs text-muted-foreground">
          {row.employees.length > 0 ? row.employees.map((employee) => (
            <EmployeeInfoBadge
              key={employee.id}
              id={employee.id}
              firstName={employee.firstName}
              lastName={employee.lastName}
              fullName={employee.fullName}
              renderMode="compact"
              size="sm"
              showPreview={false}
              testId={`${testIdPrefix}-employee-${employee.id}`}
            />
          )) : (
            <span className="text-[9px] italic text-slate-400">Keine MA</span>
          )}
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

export function ReportProjectCard({
  row,
  testIdPrefix,
  bodyContent,
  className,
  style,
  dominantTagName,
  headerClassName,
  headerStyle,
  bodyClassName,
  bodyStyle,
  footerClassName,
  footerStyle,
  hideFooterBadges,
}: {
  row: ReportProjectCardRow;
  testIdPrefix: string;
  bodyContent?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  dominantTagName?: string | null;
  headerClassName?: string;
  headerStyle?: React.CSSProperties;
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;
  footerClassName?: string;
  footerStyle?: React.CSSProperties;
  hideFooterBadges?: boolean;
}) {
  return (
    <article
      className={cn("overflow-hidden rounded-lg border border-border bg-white shadow-sm", className)}
      data-testid={testIdPrefix}
      data-report-dominant-tag={dominantTagName ?? undefined}
      style={style}
    >
      <div
        className={cn("grid gap-2 border-b border-border px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-4", headerClassName)}
        style={headerStyle}
      >
        <div className="min-w-0 text-sm">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 md:flex-nowrap">
            <span className="truncate font-semibold text-foreground">{resolveValue(row.customerFullName)}</span>
            <span className="text-xs text-muted-foreground">{resolveValue(row.customerNumber)}</span>
          </div>
        </div>
        <div className="min-w-0 text-sm md:text-center">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 md:flex-nowrap md:justify-center">
            <span className="truncate font-semibold text-foreground">{resolveValue(row.orderNumber)}</span>
            <span className="truncate text-sm text-muted-foreground">{resolveValue(row.projectName)}</span>
          </div>
        </div>
        <div className="text-sm md:text-right">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 md:flex-nowrap md:justify-end">
            {row.tourName ? <span className="text-xs text-muted-foreground">{resolveValue(row.tourName)}</span> : null}
            <span className="font-semibold text-foreground">{formatDateLabel(row.actualDate)}</span>
            <span className="text-xs text-muted-foreground">{formatDurationDays(row.durationDays)}</span>
          </div>
        </div>
      </div>
      {bodyContent ? <div className={cn("grid gap-6 px-4 py-4 md:grid-cols-2", bodyClassName)} style={bodyStyle}>{bodyContent}</div> : null}
      <div className={cn("border-t border-border bg-slate-50 px-4 py-3", footerClassName)} style={footerStyle}>
        <ReportProjectCardFooter row={row} testIdPrefix={testIdPrefix} hideBadges={hideFooterBadges} />
      </div>
    </article>
  );
}
