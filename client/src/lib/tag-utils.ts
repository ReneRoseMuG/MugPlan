import {
  isManagedComplaintTagName,
  isManagedSpecialMeasureTagName,
} from "@shared/appointmentCancellation";
import type { Tag } from "@shared/schema";

export type TagWidthLevel = 0 | 1 | 2 | 3;

function normalizeTagSegment(value: string): string {
  return value.trim();
}

function getSingleWordLimit(level: TagWidthLevel): number {
  if (level === 1) return 3;
  if (level === 2) return 2;
  if (level === 3) return 1;
  return 4;
}

function getMultiWordLimit(level: TagWidthLevel): number {
  if (level === 2) return 2;
  if (level === 3) return 1;
  return 3;
}

export function trimTagLabel(name: string, level: TagWidthLevel = 0): string {
  const normalizedName = name.trim();
  if (!normalizedName) return "";

  const segments = normalizedName
    .split(/\s+/)
    .map(normalizeTagSegment)
    .filter((segment) => segment.length > 0);

  if (segments.length <= 1) {
    const shortLabel = normalizedName.slice(0, getSingleWordLimit(level));
    if (shortLabel.length <= 1) {
      return shortLabel.toLocaleUpperCase("de-DE");
    }
    const formattedLabel = `${shortLabel[0].toLocaleUpperCase("de-DE")}${shortLabel.slice(1).toLocaleLowerCase("de-DE")}`;
    const shouldAppendDot = normalizedName.length > shortLabel.length && level <= 1;
    return shouldAppendDot ? `${formattedLabel}.` : formattedLabel;
  }

  return segments
    .slice(0, getMultiWordLimit(level))
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
    isManagedComplaintTagName(tag.name)
    || isManagedSpecialMeasureTagName(tag.name)
  ));
}

export function mergeTourPrintTags(...collections: Array<readonly Tag[] | null | undefined>): Tag[] {
  return filterTourPrintTags(mergeUniqueTags(...collections));
}
