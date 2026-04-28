import type { CSSProperties } from "react";
import type { Tag } from "@shared/schema";
import {
  isManagedMesseTagName,
  isManagedMirroredTagName,
  isManagedRemarksTagName,
  isManagedSpecialMeasureTagName,
} from "@shared/appointmentCancellation";

const EXACT_PRINT_COLOR_STYLE: CSSProperties = {
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
};

type AuftragslisteHighlightStyles = {
  dominantTag: Tag | null;
  articleStyle?: CSSProperties;
  headerStyle?: CSSProperties;
  bodyStyle?: CSSProperties;
  footerStyle?: CSSProperties;
  descriptionStyle?: CSSProperties;
};

function resolvePriority(tag: Tag): number {
  if (isManagedSpecialMeasureTagName(tag.name)) return 0;
  if (isManagedMirroredTagName(tag.name)) return 1;
  if (isManagedMesseTagName(tag.name)) return 2;
  if (isManagedRemarksTagName(tag.name)) return 3;
  return Number.POSITIVE_INFINITY;
}

function resolveRelevantHighlightTags(tags: Tag[]): Tag[] {
  return tags
    .filter((tag) =>
      isManagedSpecialMeasureTagName(tag.name)
      || isManagedMirroredTagName(tag.name)
      || isManagedMesseTagName(tag.name)
      || isManagedRemarksTagName(tag.name))
    .sort((left, right) => resolvePriority(left) - resolvePriority(right) || left.id - right.id);
}

function toRgbTuple(hexColor: string): [number, number, number] | null {
  const normalized = hexColor.trim();
  const match = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;

  const [hex] = match.slice(1);
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function toTransparentColor(hexColor: string, alpha: number): string {
  const tuple = toRgbTuple(hexColor);
  if (!tuple) return hexColor;

  const [red, green, blue] = tuple;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function resolveAuftragslisteHighlightStyles(tags: Tag[]): AuftragslisteHighlightStyles {
  const dominantTag = resolveRelevantHighlightTags(tags)[0] ?? null;

  if (!dominantTag) {
    return {
      dominantTag: null,
    };
  }

  return {
    dominantTag,
    articleStyle: {
      ...EXACT_PRINT_COLOR_STYLE,
      borderColor: dominantTag.color,
    },
    headerStyle: {
      ...EXACT_PRINT_COLOR_STYLE,
      backgroundColor: toTransparentColor(dominantTag.color, 0.14),
      borderColor: dominantTag.color,
    },
  };
}
