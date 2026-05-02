import type { CalendarMarker } from "@/lib/calendar-markers";
import { formatDisplayDate } from "@/lib/date-display-format";

export function calendarMarkerTypeLabel(marker: CalendarMarker): string {
  if (marker.type === "company_vacation") return "Betriebsferien";
  if (marker.type === "company_holiday") return "Betriebsfeiertag";
  return "Feiertag";
}

export function calendarMarkerDateLabel(marker: CalendarMarker): string {
  return marker.endDate
    ? `${formatDisplayDate(marker.date)} bis ${formatDisplayDate(marker.endDate)}`
    : formatDisplayDate(marker.date);
}

export function calendarMarkerTitle(marker: CalendarMarker): string {
  const statesLabel = marker.states.length > 0 ? ` (${marker.states.join(", ")})` : "";
  const noteLabel = marker.note ? ` - ${marker.note}` : "";
  return `${calendarMarkerTypeLabel(marker)}: ${marker.name}${statesLabel}, ${calendarMarkerDateLabel(marker)}${noteLabel}`;
}

export function calendarMarkersTitle(markers: CalendarMarker[]): string {
  return markers.map(calendarMarkerTitle).join("\n");
}
