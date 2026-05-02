import React from "react";
import type { CalendarMarker } from "@/lib/calendar-markers";
import { formatDisplayDate } from "@/lib/date-display-format";
import type { CalendarMarkerVisualizationStyle } from "@/hooks/useSettings";
import { getPrimaryCalendarMarkerVisualization } from "@/lib/calendar-marker-visualization";

type CalendarMarkerBadgesProps = {
  markers: CalendarMarker[];
  compact?: boolean;
  visualizationStyle?: CalendarMarkerVisualizationStyle;
};

function markerTypeLabel(marker: CalendarMarker): string {
  if (marker.type === "company_vacation") return "Betriebsferien";
  if (marker.type === "company_holiday") return "Betriebsfeiertag";
  return "Feiertag";
}

function markerTitle(marker: CalendarMarker): string {
  const dateLabel = marker.endDate
    ? `${formatDisplayDate(marker.date)} bis ${formatDisplayDate(marker.endDate)}`
    : formatDisplayDate(marker.date);
  const statesLabel = marker.states.length > 0 ? ` (${marker.states.join(", ")})` : "";
  const noteLabel = marker.note ? ` - ${marker.note}` : "";
  return `${markerTypeLabel(marker)}: ${marker.name}${statesLabel}, ${dateLabel}${noteLabel}`;
}

export function CalendarMarkerBadges({ markers, compact = false, visualizationStyle = "standard" }: CalendarMarkerBadgesProps) {
  if (markers.length === 0) {
    return null;
  }

  const visibleMarkers = compact ? markers.slice(0, 2) : markers.slice(0, 3);
  const hiddenCount = markers.length - visibleMarkers.length;

  return (
    <div className="mt-1 flex min-h-4 max-w-full flex-wrap items-center justify-center gap-0.5 overflow-hidden">
      {visibleMarkers.map((marker) => (
        <span
          key={marker.id}
          title={markerTitle(marker)}
          className={`inline-flex max-w-full items-center rounded border px-1 font-semibold leading-none ${
            getPrimaryCalendarMarkerVisualization([marker], visualizationStyle)?.badgeClassName ?? "border-slate-300 bg-slate-50 text-slate-700"
          } ${compact ? "h-4 text-[9px]" : "h-4 text-[10px]"}`}
          data-testid={`calendar-marker-badge-${marker.date}-${marker.id}`}
        >
          <span className="truncate" data-testid={`calendar-marker-name-${marker.date}-${marker.id}`}>{marker.name}</span>
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span
          title={markers.map(markerTitle).join("\n")}
          className="inline-flex h-4 items-center rounded border border-slate-300 bg-slate-50 px-1 text-[9px] font-semibold leading-none text-slate-700"
          data-testid="calendar-marker-badge-more"
        >
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}
