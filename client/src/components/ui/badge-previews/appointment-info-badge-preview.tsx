import { Calendar, Clock } from "lucide-react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type AppointmentInfoBadgePreviewProps = {
  startDate: string;
  endDate?: string | null;
  startTimeHour?: number | null;
  projectName?: string | null;
  customerName?: string | null;
  employeeName?: string | null;
};

export const appointmentInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 420,
  maxHeight: 300,
};

const formatDateLabel = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd.MM.yy") : value;
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
  return `${String(clamped).padStart(2, "0")}h`;
};

export function AppointmentInfoBadgePreview({
  startDate,
  endDate,
  startTimeHour,
  projectName,
  customerName,
  employeeName,
}: AppointmentInfoBadgePreviewProps) {
  const dateLabel = formatDateLabel(startDate);
  const isMultiDay = Boolean(endDate && endDate !== startDate);
  const durationDays = isMultiDay && endDate
    ? resolveDurationDays(startDate, endDate)
    : null;
  const startHourLabel = !isMultiDay ? resolveStartHourLabel(startTimeHour) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{dateLabel}</span>
        {durationDays ? (
          <span className="text-xs text-muted-foreground">({durationDays} Tage)</span>
        ) : startHourLabel ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {startHourLabel}
          </span>
        ) : null}
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {projectName && <div>Projekt: {projectName}</div>}
        {customerName && <div>Kunde: {customerName}</div>}
        {employeeName && <div>Mitarbeiter: {employeeName}</div>}
      </div>
    </div>
  );
}

export function createAppointmentInfoBadgePreview(props: AppointmentInfoBadgePreviewProps): InfoBadgePreview {
  return {
    content: <AppointmentInfoBadgePreview {...props} />,
    options: appointmentInfoBadgePreviewOptions,
  };
}
