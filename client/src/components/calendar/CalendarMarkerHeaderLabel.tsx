import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "lucide-react";
import type { CalendarMarker } from "@/lib/calendar-markers";
import type { CalendarMarkerVisualizationStyle } from "@/hooks/useSettings";
import { getPrimaryCalendarMarkerVisualization } from "@/lib/calendar-marker-visualization";
import { calendarMarkerDateLabel, calendarMarkersTitle, calendarMarkerTypeLabel } from "@/lib/calendar-marker-text";
import { resolveCalendarMarkerHeaderVariant, type CalendarMarkerHeaderVariant } from "@/lib/calendar-marker-header-display";
import { cn } from "@/lib/utils";
import { HoverPreview } from "@/components/ui/hover-preview";

const CHIP_HORIZONTAL_CHROME_PX = 16;
const ICON_CHIP_WIDTH_PX = 28;

function measureTextWidth(text: string, node: HTMLElement): number {
  if (typeof document === "undefined") {
    return 0;
  }

  const computed = window.getComputedStyle(node);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return 0;
  }

  context.font = [
    computed.fontStyle,
    computed.fontVariant,
    computed.fontWeight,
    computed.fontSize,
    computed.fontFamily,
  ].join(" ");

  const letterSpacing = Number.parseFloat(computed.letterSpacing || "0");
  const textWidth = context.measureText(text).width;
  const spacingWidth = Number.isFinite(letterSpacing) ? Math.max(0, text.length - 1) * letterSpacing : 0;
  return Math.ceil(textWidth + spacingWidth);
}

function CalendarMarkerHoverPreview({ markers }: { markers: CalendarMarker[] }) {
  return (
    <div className="space-y-2 text-xs">
      {markers.map((marker) => (
        <div key={marker.id} className="space-y-0.5">
          <div className="font-semibold text-foreground">{marker.name}</div>
          <div className="text-muted-foreground">
            {calendarMarkerTypeLabel(marker)} · {calendarMarkerDateLabel(marker)}
          </div>
        </div>
      ))}
    </div>
  );
}

export type CalendarMarkerHeaderLabelProps = {
  markers: CalendarMarker[];
  visualizationStyle?: CalendarMarkerVisualizationStyle;
  dateKey?: string;
  className?: string;
  contentClassName?: string;
};

export function CalendarMarkerHeaderLabel({
  markers,
  visualizationStyle = "standard",
  dateKey,
  className,
  contentClassName,
}: CalendarMarkerHeaderLabelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const [measuredWidths, setMeasuredWidths] = useState<{ full: number; ft: number; icon: number } | null>(null);

  const primaryVisualization = useMemo(
    () => getPrimaryCalendarMarkerVisualization(markers, visualizationStyle),
    [markers, visualizationStyle],
  );

  const primaryMarker = primaryVisualization?.marker ?? null;
  const title = useMemo(() => calendarMarkersTitle(markers), [markers]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !primaryMarker) {
      setAvailableWidth(null);
      setMeasuredWidths(null);
      return;
    }

    const updateMeasurements = () => {
      const width = Math.floor(node.getBoundingClientRect().width);
      setAvailableWidth(width);
      setMeasuredWidths({
        full: measureTextWidth(primaryMarker.name, node) + CHIP_HORIZONTAL_CHROME_PX,
        ft: measureTextWidth("FT", node) + CHIP_HORIZONTAL_CHROME_PX,
        icon: ICON_CHIP_WIDTH_PX,
      });
    };

    updateMeasurements();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateMeasurements);
      return () => {
        window.removeEventListener("resize", updateMeasurements);
      };
    }

    const observer = new ResizeObserver(() => {
      updateMeasurements();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [primaryMarker]);

  if (!primaryMarker || !primaryVisualization) {
    return null;
  }

  const variant: CalendarMarkerHeaderVariant =
    availableWidth == null || measuredWidths == null
      ? "ft"
      : resolveCalendarMarkerHeaderVariant({
          availableWidth,
          fullWidth: measuredWidths.full,
          ftWidth: measuredWidths.ft,
          iconWidth: measuredWidths.icon,
        });

  const visibleLabel = variant === "full" ? primaryMarker.name : variant === "ft" ? "FT" : null;
  const trigger = (
    <div
      ref={containerRef}
      className={cn("flex min-w-0 items-center justify-center", className)}
      data-testid={dateKey ? `calendar-marker-header-${dateKey}` : undefined}
      data-marker-header-variant={variant}
    >
      <span
        title={title}
        className={cn(
          "inline-flex max-w-full items-center justify-center gap-1 overflow-hidden rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
          primaryVisualization.badgeClassName,
          contentClassName,
        )}
      >
        {variant === "icon" ? <Flag className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
        {visibleLabel ? <span className="truncate whitespace-nowrap">{visibleLabel}</span> : null}
      </span>
    </div>
  );

  return (
    <HoverPreview
      preview={<CalendarMarkerHoverPreview markers={markers} />}
      side="bottom"
      align="center"
      maxWidth={320}
      maxHeight={240}
      className="z-[9999]"
    >
      {trigger}
    </HoverPreview>
  );
}
