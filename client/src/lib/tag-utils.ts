import {
  isManagedReportExclusionTagName,
  isManagedSpecialMeasureTagName,
} from "@shared/appointmentCancellation";
import type { Tag } from "@shared/schema";

function normalizeTagSegment(value: string): string {
  return value.trim();
}

export function trimTagLabel(name: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) return "";

  const segments = normalizedName
    .split(/\s+/)
    .map(normalizeTagSegment)
    .filter((segment) => segment.length > 0);

  if (segments.length <= 1) {
    const shortLabel = normalizedName.slice(0, 4);
    if (shortLabel.length <= 1) {
      return shortLabel.toLocaleUpperCase("de-DE");
    }
    const formattedLabel = `${shortLabel[0].toLocaleUpperCase("de-DE")}${shortLabel.slice(1).toLocaleLowerCase("de-DE")}`;
    return normalizedName.length > shortLabel.length ? `${formattedLabel}.` : formattedLabel;
  }

  return segments
    .slice(0, 3)
    .map((segment) => segment[0]?.toLocaleUpperCase("de-DE") ?? "")
    .join("");
}

export function mergeUniqueTags(...collections: Array<readonly Tag[] | null | undefined>): Tag[] {
  const tagsById = new Map<number, Tag>();
  for (const collection of collections) {
    for (const tag of collection ?? []) {
      if (!tagsById.has(tag.id)) {
        tagsById.set(tag.id, tag);
      }
    }
  }
  return Array.from(tagsById.values());
}

export function filterTourPrintTags(tags: readonly Tag[]): Tag[] {
  return tags.filter((tag) => (
    isManagedReportExclusionTagName(tag.name)
    || isManagedSpecialMeasureTagName(tag.name)
  ));
}

export function mergeTourPrintTags(...collections: Array<readonly Tag[] | null | undefined>): Tag[] {
  return filterTourPrintTags(mergeUniqueTags(...collections));
}
