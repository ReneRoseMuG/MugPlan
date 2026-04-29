import type { CSSProperties } from "react";
import { CALENDAR_NEUTRAL_COLOR } from "@/lib/calendar-utils";

export const WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX = 20;
export const WEEK_APPOINTMENT_CARD_HEADER_MIN_HEIGHT_PX = 48;
export const WEEK_APPOINTMENT_CARD_FOOTER_MIN_HEIGHT_PX = 92;
export const WEEK_APPOINTMENT_CARD_COMPACT_FOOTER_MIN_HEIGHT_PX = 60;

function toTransparentTourColor(color: string | null | undefined, alpha: number): string {
  if (typeof color !== "string") {
    return "transparent";
  }

  const normalized = color.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return "transparent";
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getWeekAppointmentFooterStyle(
  tourColor: string | null | undefined,
  mode: "compact" | "standard" = "standard",
): CSSProperties {
  const resolvedTourColor = tourColor?.trim() ? tourColor : CALENDAR_NEUTRAL_COLOR;

  return {
    backgroundColor: toTransparentTourColor(resolvedTourColor, 0.1),
    borderTopColor: toTransparentTourColor(resolvedTourColor, 0.22),
    minHeight: `${mode === "compact" ? WEEK_APPOINTMENT_CARD_COMPACT_FOOTER_MIN_HEIGHT_PX : WEEK_APPOINTMENT_CARD_FOOTER_MIN_HEIGHT_PX}px`,
  };
}
