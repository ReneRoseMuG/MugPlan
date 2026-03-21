import type { Tag } from "@shared/schema";
import {
  isPickerVisibleForDomain,
  isManagedReportExclusionTagName,
  isReservedAppointmentCancellationTagName,
  type TagPickerDomain,
} from "@shared/appointmentCancellation";
import type { TagRelationItem } from "../repositories/tagRelationsRepository";

export function isAppointmentCancellationTag(tag: Pick<Tag, "name"> | null | undefined): boolean {
  if (!tag) return false;
  return isReservedAppointmentCancellationTagName(tag.name);
}

export function hasAppointmentCancellationTag(tags: Array<Pick<Tag, "name">>): boolean {
  return tags.some((tag) => isAppointmentCancellationTag(tag));
}

export function isManagedReportExclusionTag(tag: Pick<Tag, "name"> | null | undefined): boolean {
  if (!tag) return false;
  return isManagedReportExclusionTagName(tag.name);
}

export function hasManagedReportExclusionTag(tags: Array<Pick<Tag, "name">>): boolean {
  return tags.some((tag) => isManagedReportExclusionTag(tag));
}

export function filterPickerTagsForDomain<TTag extends Pick<Tag, "name">>(
  tags: TTag[],
  domain: TagPickerDomain,
): TTag[] {
  return tags.filter((tag) => isPickerVisibleForDomain(tag.name, domain));
}

export function filterVisibleAppointmentTags<TTag extends Pick<Tag, "name">>(tags: TTag[]): TTag[] {
  return tags.filter((tag) => !isAppointmentCancellationTag(tag));
}

export function filterVisibleAppointmentTagRelations(relations: TagRelationItem[]): TagRelationItem[] {
  return relations.filter((relation) => !isAppointmentCancellationTag(relation.tag));
}
