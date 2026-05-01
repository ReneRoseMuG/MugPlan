import { formatDisplayDate } from "@/lib/date-display-format";

export function formatListDate(value: string | null | undefined): string {
  return formatDisplayDate(value, "");
}

export function formatListDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
  const startLabel = formatListDate(startDate);
  const endLabel = formatListDate(endDate);

  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel || endLabel;
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
