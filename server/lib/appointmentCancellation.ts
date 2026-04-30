import type { Tag } from "@shared/schema";
import {
  isManagedComplaintTagName,
  isManagedRemarksTagName,
  isManagedSpecialMeasureTagName,
  isReservedAppointmentCancellationTagName,
  isReservedVacantTagName,
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

export function isManagedComplaintTag(tag: Pick<Tag, "name"> | null | undefined): boolean {
  if (!tag) return false;
  return isManagedComplaintTagName(tag.name);
}

export function hasManagedComplaintTag(tags: Array<Pick<Tag, "name">>): boolean {
  return tags.some((tag) => isManagedComplaintTag(tag));
}

export function isManagedSpecialMeasureTag(tag: Pick<Tag, "name"> | null | undefined): boolean {
  if (!tag) return false;
  return isManagedSpecialMeasureTagName(tag.name);
}

export function hasManagedSpecialMeasureTag(tags: Array<Pick<Tag, "name">>): boolean {
  return tags.some((tag) => isManagedSpecialMeasureTag(tag));
}

export function isManagedRemarksTag(tag: Pick<Tag, "name"> | null | undefined): boolean {
  if (!tag) return false;
  return isManagedRemarksTagName(tag.name);
}

export function hasManagedRemarksTag(tags: Array<Pick<Tag, "name">>): boolean {
  return tags.some((tag) => isManagedRemarksTag(tag));
}

export function isReservedVacantTag(tag: Pick<Tag, "name"> | null | undefined): boolean {
  if (!tag) return false;
  return isReservedVacantTagName(tag.name);
}

export function hasReservedVacantTag(tags: Array<Pick<Tag, "name">>): boolean {
  return tags.some((tag) => isReservedVacantTag(tag));
}

export function filterPickerTagsForDomain<TTag extends Pick<Tag, "isDefault">>(
  tags: TTag[],
  domain: TagPickerDomain,
): TTag[] {
  void domain;
  return tags.filter((tag) => !tag.isDefault);
}

export function filterVisibleAppointmentTags<TTag extends Pick<Tag, "name">>(tags: TTag[]): TTag[] {
  return tags.filter((tag) => !isAppointmentCancellationTag(tag));
}

export function filterVisibleAppointmentTagRelations(relations: TagRelationItem[]): TagRelationItem[] {
  return relations.filter((relation) => !isAppointmentCancellationTag(relation.tag));
}
