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
        header: "bg-red-50/60",
        column: "bg-red-50/35",
        tile: "bg-red-50/55",
        badge: "border-red-200 bg-red-50 text-red-900",
      },
      standard: {
        header: "bg-red-100/75",
        column: "bg-red-100/45",
        tile: "bg-red-100/70",
        badge: "border-red-300 bg-red-100 text-red-950",
      },
      highlighted: {
        header: "bg-red-200/85",
        column: "bg-red-200/55",
        tile: "bg-red-200/80",
        badge: "border-red-400 bg-red-200 text-red-950",
      },
    },
    companyHoliday: {
      subtle: {
        header: "bg-emerald-50/60",
        column: "bg-emerald-50/35",
        tile: "bg-emerald-50/55",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-900",
      },
      standard: {
        header: "bg-emerald-100/75",
        column: "bg-emerald-100/45",
        tile: "bg-emerald-100/70",
        badge: "border-emerald-300 bg-emerald-100 text-emerald-950",
      },
      highlighted: {
        header: "bg-emerald-200/85",
        column: "bg-emerald-200/55",
        tile: "bg-emerald-200/80",
        badge: "border-emerald-400 bg-emerald-200 text-emerald-950",
      },
    },
    companyVacation: {
      subtle: {
        header: "bg-sky-50/60",
        column: "bg-sky-50/35",
        tile: "bg-sky-50/55",
        badge: "border-sky-200 bg-sky-50 text-sky-900",
      },
      standard: {
        header: "bg-sky-100/75",
        column: "bg-sky-100/45",
        tile: "bg-sky-100/70",
        badge: "border-sky-300 bg-sky-100 text-sky-950",
      },
      highlighted: {
        header: "bg-sky-200/85",
        column: "bg-sky-200/55",
        tile: "bg-sky-200/80",
        badge: "border-sky-400 bg-sky-200 text-sky-950",
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
