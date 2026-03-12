import { format } from "date-fns";
import { de } from "date-fns/locale";

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatListDate(value: string | null | undefined): string {
  const parsed = parseDateOnly(value);
  if (!parsed) return "";
  return format(parsed, "dd.MM.yy", { locale: de });
}

export function formatListTime(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export function formatListDateTime(input: {
  startDate: string | null | undefined;
  startTime?: string | null | undefined;
  startTimeHour?: number | null | undefined;
}): string {
  const dateLabel = formatListDate(input.startDate);
  const timeLabel = input.startTime
    ? formatListTime(input.startTime)
    : (typeof input.startTimeHour === "number" ? `${String(input.startTimeHour).padStart(2, "0")}:00` : "");

  if (!dateLabel) return timeLabel;
  if (!timeLabel) return dateLabel;
  return `${timeLabel} - ${dateLabel}`;
}
