export type CalendarMarkerHeaderVariant = "full" | "ft" | "icon";

export function resolveCalendarMarkerHeaderVariant(params: {
  availableWidth: number;
  fullWidth: number;
  ftWidth: number;
  iconWidth: number;
}): CalendarMarkerHeaderVariant {
  const availableWidth = Number.isFinite(params.availableWidth) ? Math.max(0, params.availableWidth) : 0;
  const fullWidth = Number.isFinite(params.fullWidth) ? Math.max(0, params.fullWidth) : 0;
  const ftWidth = Number.isFinite(params.ftWidth) ? Math.max(0, params.ftWidth) : 0;
  const iconWidth = Number.isFinite(params.iconWidth) ? Math.max(0, params.iconWidth) : 0;

  if (fullWidth > 0 && availableWidth >= fullWidth) {
    return "full";
  }

  if (ftWidth > 0 && availableWidth >= ftWidth) {
    return "ft";
  }

  if (iconWidth > 0) {
    return "icon";
  }

  return "ft";
}
