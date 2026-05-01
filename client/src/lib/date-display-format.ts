import { format, isValid } from "date-fns";
import { de } from "date-fns/locale";

const DISPLAY_DATE_FORMAT = "dd.MM.yy";
const DISPLAY_TIMESTAMP_FORMAT = "dd.MM.yy HH:mm";

function parseDisplayDateInput(value: Date | string): Date | null {
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDisplayDate(
  value: Date | string | null | undefined,
  fallback = "",
): string {
  if (value == null || value === "") return fallback;
  const parsed = parseDisplayDateInput(value);
  if (!parsed) {
    return typeof value === "string" ? value : fallback;
  }
  return format(parsed, DISPLAY_DATE_FORMAT, { locale: de });
}

export function formatDisplayTimestamp(
  value: Date | string | null | undefined,
  fallback = "",
): string {
  if (value == null || value === "") return fallback;
  const parsed = parseDisplayDateInput(value);
  if (!parsed) {
    return typeof value === "string" ? value : fallback;
  }
  return format(parsed, DISPLAY_TIMESTAMP_FORMAT, { locale: de });
}
