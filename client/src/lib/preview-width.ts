export const WEEKLY_PREVIEW_WIDTH_STORAGE_KEY = "mugplan.preview.weekdayWidthPx.v1";
export const WEEKLY_PREVIEW_WIDTH_FALLBACK_PX = 240;
const MIN_PREVIEW_WIDTH_PX = 120;
const MAX_PREVIEW_WIDTH_PX = 1200;

function normalizePreviewWidth(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < MIN_PREVIEW_WIDTH_PX || rounded > MAX_PREVIEW_WIDTH_PX) return null;
  return rounded;
}

export function parseStoredWeeklyPreviewWidth(rawValue: string | null): number | null {
  if (typeof rawValue !== "string") return null;
  const parsed = Number(rawValue);
  return normalizePreviewWidth(parsed);
}

export function getStoredWeeklyPreviewWidth(): number | null {
  if (typeof window === "undefined") return null;
  return parseStoredWeeklyPreviewWidth(window.localStorage.getItem(WEEKLY_PREVIEW_WIDTH_STORAGE_KEY));
}

export function resolveWeeklyPreviewWidthPx(): number {
  return getStoredWeeklyPreviewWidth() ?? WEEKLY_PREVIEW_WIDTH_FALLBACK_PX;
}

export function storeWeeklyPreviewWidth(widthPx: number): number | null {
  const normalized = normalizePreviewWidth(widthPx);
  if (normalized == null) return null;
  if (typeof window === "undefined") return normalized;
  window.localStorage.setItem(WEEKLY_PREVIEW_WIDTH_STORAGE_KEY, String(normalized));
  return normalized;
}
