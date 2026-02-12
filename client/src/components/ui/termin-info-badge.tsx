import { InfoBadge } from "@/components/ui/info-badge";
import { createAppointmentInfoBadgePreview } from "@/components/ui/badge-previews/appointment-info-badge-preview";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { Calendar } from "lucide-react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import type { ReactNode } from "react";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

type TerminInfoBadgeMode = "kunde" | "projekt" | "mitarbeiter";

interface TerminInfoBadgeProps {
  id?: number | string | null;
  startDate: string;
  endDate?: string | null;
  startTimeHour?: number | null;
  mode?: TerminInfoBadgeMode;
  customerLabel?: string | null;
  projectLabel?: string | null;
  employeeLabel?: string | null;
  customerName?: string | null;
  projectName?: string | null;
  employeeName?: string | null;
  icon?: ReactNode;
  color?: string | null;
  previewAppointment?: CalendarAppointment | null;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  actionDisabled?: boolean;
  onDoubleClick?: () => void;
  compact?: boolean;
}

const formatDateLabel = (value: string, compact: boolean) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, compact ? "dd.MM.yy" : "dd.MM.yy") : value;
};

const resolveDurationDays = (startDate: string, endDate: string) => {
  const parsedStart = parseISO(startDate);
  const parsedEnd = parseISO(endDate);
  if (!isValid(parsedStart) || !isValid(parsedEnd)) return null;
  const diff = differenceInCalendarDays(parsedEnd, parsedStart);
  return diff >= 0 ? diff + 1 : null;
};

const resolveStartHourLabel = (value?: number | null) => {
  if (value == null) return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return null;
  const clamped = Math.min(23, Math.max(0, Math.floor(normalized)));
  return `${String(clamped).padStart(2, "0")}:00`;
};

export function TerminInfoBadge({
  id: _id,
  startDate,
  endDate,
  startTimeHour,
  mode,
  customerLabel,
  projectLabel,
  employeeLabel,
  customerName,
  projectName,
  employeeName,
  icon,
  color,
  previewAppointment,
  testId,
  size = "default",
  fullWidth = false,
  action,
  onAdd,
  onRemove,
  actionDisabled = false,
  onDoubleClick,
  compact = false,
}: TerminInfoBadgeProps) {
  const dateLabel = formatDateLabel(startDate, compact);
  const isMultiDay = Boolean(endDate && endDate !== startDate);
  const durationDays = isMultiDay && endDate ? resolveDurationDays(startDate, endDate) : null;
  const startHourLabel = !isMultiDay ? resolveStartHourLabel(startTimeHour) : null;
  const titleTextClass = size === "sm" ? "text-xs" : "text-sm";

  const modeLine = (() => {
    if (mode === "kunde") return customerLabel;
    if (mode === "projekt") return projectLabel;
    if (mode === "mitarbeiter") return employeeLabel;
    return null;
  })();

  const secondaryLine = modeLine?.trim() ? modeLine : null;
  const compactSuffix = durationDays != null
    ? `(+${Math.max(0, durationDays - 1)})`
    : startHourLabel ?? null;

  return (
    <InfoBadge
      icon={icon ?? <Calendar className="w-4 h-4" />}
      label={(
        compact ? (
          <div className={`flex items-center gap-1 leading-tight ${titleTextClass}`}>
            <span>{dateLabel}</span>
            {compactSuffix ? (
              <span className="text-xs text-muted-foreground">
                {durationDays != null ? ` ${compactSuffix}` : ` · ${compactSuffix}`}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col leading-tight">
            <div className={`flex items-center gap-2 ${titleTextClass}`}>
              <span>{dateLabel}</span>
              {durationDays ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border bg-muted/70 px-1 text-[10px] text-muted-foreground">
                  {durationDays}T
                </span>
              ) : startHourLabel ? (
                <span className="text-xs text-muted-foreground">{startHourLabel}</span>
              ) : null}
            </div>
            {secondaryLine && (
              <span className="text-xs text-muted-foreground">
                {secondaryLine}
              </span>
            )}
          </div>
        )
      )}
      borderColor={color || undefined}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      actionDisabled={actionDisabled}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      onDoubleClick={onDoubleClick}
      preview={previewAppointment
        ? createAppointmentWeeklyPanelPreview(previewAppointment)
        : createAppointmentInfoBadgePreview({
            startDate,
            endDate: endDate ?? null,
            startTimeHour: startTimeHour ?? null,
            projectName: projectName ?? projectLabel ?? null,
            customerName: customerName ?? customerLabel ?? null,
            employeeName: employeeName ?? employeeLabel ?? null,
          })}
    />
  );
}
