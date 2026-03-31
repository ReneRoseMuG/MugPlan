import {
  isManagedReportExclusionTagName,
  isReservedAppointmentCancellationTagName,
} from "@shared/appointmentCancellation";
import type { Tag } from "@shared/schema";

export type GroupedProductVorlaufItemInput = {
  categoryId: number;
  categoryName: string;
  itemName: string;
  quantity: number;
  shortCode?: string | null;
};

export type GroupedProductVorlaufCategoryGroup = {
  categoryId: number;
  categoryName: string;
  items: Array<{
    itemName: string;
    totalQuantity: number;
  }>;
};

type GroupBucket = {
  categoryId: number;
  categoryName: string;
  items: Map<string, { itemName: string; totalQuantity: number }>;
};

export function resolveGroupedProductVorlaufName(
  name: string,
  shortCode: string | null | undefined,
  useShortCodes: boolean,
): string {
  if (useShortCodes && shortCode && shortCode.trim().length > 0) {
    return shortCode.trim();
  }
  return name.trim();
}

export function buildGroupedProductVorlaufCategoryGroups(
  rows: GroupedProductVorlaufItemInput[],
  useShortCodes: boolean,
): GroupedProductVorlaufCategoryGroup[] {
  const buckets = new Map<number, GroupBucket>();

  for (const row of rows) {
    if (!Number.isInteger(row.quantity) || row.quantity <= 0) {
      continue;
    }

    const bucket = buckets.get(row.categoryId) ?? {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      items: new Map<string, { itemName: string; totalQuantity: number }>(),
    };
    const groupedName = resolveGroupedProductVorlaufName(row.itemName, row.shortCode, useShortCodes);
    const existing = bucket.items.get(groupedName);

    if (existing) {
      existing.totalQuantity += row.quantity;
    } else {
      bucket.items.set(groupedName, {
        itemName: groupedName,
        totalQuantity: row.quantity,
      });
    }

    buckets.set(row.categoryId, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      categoryId: bucket.categoryId,
      categoryName: bucket.categoryName,
      items: Array.from(bucket.items.values())
        .sort((left, right) => left.itemName.localeCompare(right.itemName, "de")),
    }))
    .sort((left, right) =>
      left.categoryName.localeCompare(right.categoryName, "de") || left.categoryId - right.categoryId);
}

export function collectMatchedSonderblockTagIds(params: {
  selectedTags: Tag[];
  projectTags: Tag[];
  appointmentTags: Tag[];
}): number[] {
  const allowedSelectedTagIds = new Set(
    params.selectedTags
      .filter((tag) =>
        !isManagedReportExclusionTagName(tag.name)
        && !isReservedAppointmentCancellationTagName(tag.name))
      .map((tag) => tag.id),
  );

  if (allowedSelectedTagIds.size === 0) {
    return [];
  }

  return Array.from(new Set(
    [...params.projectTags, ...params.appointmentTags]
      .filter((tag) => allowedSelectedTagIds.has(tag.id))
      .map((tag) => tag.id),
  )).sort((left, right) => left - right);
}
