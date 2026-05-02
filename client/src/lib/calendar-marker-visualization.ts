import type { CalendarMarker } from "@/lib/calendar-markers";
import type { CalendarMarkerVisualizationStyle } from "@/hooks/useSettings";

type MarkerVisualizationTone = "holiday" | "companyHoliday" | "companyVacation";

type MarkerVisualization = {
  marker: CalendarMarker;
  tone: MarkerVisualizationTone;
  headerClassName: string;
  columnClassName: string;
  badgeClassName: string;
  tileClassName: string;
};

const tonePriority: Record<MarkerVisualizationTone, number> = {
  companyVacation: 3,
  companyHoliday: 2,
  holiday: 1,
};

function markerTone(marker: CalendarMarker): MarkerVisualizationTone {
  if (marker.type === "company_vacation") return "companyVacation";
  if (marker.type === "company_holiday") return "companyHoliday";
  return "holiday";
}

function styleClasses(tone: MarkerVisualizationTone, style: CalendarMarkerVisualizationStyle) {
  const classByTone = {
    holiday: {
      subtle: {
        header: "bg-red-200/85",
        column: "bg-red-200/55",
        tile: "bg-red-200/72",
        badge: "border-red-400 bg-red-200 text-red-950",
      },
      standard: {
        header: "bg-red-300/90",
        column: "bg-red-300/65",
        tile: "bg-red-300/82",
        badge: "border-red-500 bg-red-300 text-red-950",
      },
      highlighted: {
        header: "bg-red-400/95",
        column: "bg-red-400/78",
        tile: "bg-red-400/90",
        badge: "border-red-600 bg-red-400 text-red-950",
      },
    },
    companyHoliday: {
      subtle: {
        header: "bg-emerald-200/85",
        column: "bg-emerald-200/55",
        tile: "bg-emerald-200/72",
        badge: "border-emerald-400 bg-emerald-200 text-emerald-950",
      },
      standard: {
        header: "bg-emerald-300/90",
        column: "bg-emerald-300/65",
        tile: "bg-emerald-300/82",
        badge: "border-emerald-500 bg-emerald-300 text-emerald-950",
      },
      highlighted: {
        header: "bg-emerald-400/95",
        column: "bg-emerald-400/78",
        tile: "bg-emerald-400/90",
        badge: "border-emerald-600 bg-emerald-400 text-emerald-950",
      },
    },
    companyVacation: {
      subtle: {
        header: "bg-sky-200/85",
        column: "bg-sky-200/55",
        tile: "bg-sky-200/72",
        badge: "border-sky-400 bg-sky-200 text-sky-950",
      },
      standard: {
        header: "bg-sky-300/90",
        column: "bg-sky-300/65",
        tile: "bg-sky-300/82",
        badge: "border-sky-500 bg-sky-300 text-sky-950",
      },
      highlighted: {
        header: "bg-sky-400/95",
        column: "bg-sky-400/78",
        tile: "bg-sky-400/90",
        badge: "border-sky-600 bg-sky-400 text-sky-950",
      },
    },
  } as const;

  return classByTone[tone][style];
}

export function getPrimaryCalendarMarkerVisualization(
  markers: CalendarMarker[],
  style: CalendarMarkerVisualizationStyle,
): MarkerVisualization | null {
  const marker = [...markers]
    .sort((left, right) => tonePriority[markerTone(right)] - tonePriority[markerTone(left)])
    [0];
  if (!marker) return null;

  const tone = markerTone(marker);
  const classes = styleClasses(tone, style);
  return {
    marker,
    tone,
    headerClassName: classes.header,
    columnClassName: classes.column,
    tileClassName: classes.tile,
    badgeClassName: classes.badge,
  };
}

export function markerNamesTitle(markers: CalendarMarker[]): string {
  return markers.map((marker) => marker.name).join("\n");
}
