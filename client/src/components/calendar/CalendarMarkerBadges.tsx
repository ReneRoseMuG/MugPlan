import React from "react";
import type { CalendarMarker } from "@/lib/calendar-markers";
import type { CalendarMarkerVisualizationStyle } from "@/hooks/useSettings";
import { getPrimaryCalendarMarkerVisualization } from "@/lib/calendar-marker-visualization";
import { calendarMarkersTitle, calendarMarkerTitle } from "@/lib/calendar-marker-text";

type CalendarMarkerBadgesProps = {
  markers: CalendarMarker[];
  compact?: boolean;
  visualizationStyle?: CalendarMarkerVisualizationStyle;
};

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
          title={calendarMarkerTitle(marker)}
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
          title={calendarMarkersTitle(markers)}
          className="inline-flex h-4 items-center rounded border border-slate-300 bg-slate-50 px-1 text-[9px] font-semibold leading-none text-slate-700"
          data-testid="calendar-marker-badge-more"
        >
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}
