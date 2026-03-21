import {
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  MANAGED_REPORT_EXCLUSION_TAG_COLOR,
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_COLOR,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  type TagPickerDomain,
} from "@shared/appointmentCancellation";
import type { Tag } from "@shared/schema";
import * as masterDataRepository from "../repositories/masterDataRepository";
import * as tagRelationsRepository from "../repositories/tagRelationsRepository";
import { filterPickerTagsForDomain } from "../lib/appointmentCancellation";

export type TagRelationDomain = TagPickerDomain;
export type TagRelationItem = tagRelationsRepository.TagRelationItem;

export async function ensureAppointmentCancellationTag(): Promise<Tag> {
  return masterDataRepository.ensureTagDefinition({
    name: RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
    color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
    isDefault: true,
  });
}

export async function ensureManagedReportExclusionTag(): Promise<Tag> {
  return masterDataRepository.ensureTagDefinition({
    name: MANAGED_REPORT_EXCLUSION_TAG_NAME,
    color: MANAGED_REPORT_EXCLUSION_TAG_COLOR,
    isDefault: true,
  });
}

export async function ensureManagedSpecialMeasureTag(): Promise<Tag> {
  return masterDataRepository.ensureTagDefinition({
    name: MANAGED_SPECIAL_MEASURE_TAG_NAME,
    color: MANAGED_SPECIAL_MEASURE_TAG_COLOR,
    isDefault: true,
  });
}

export async function listTagCatalog(domain: TagPickerDomain = "appointment"): Promise<Tag[]> {
  await Promise.all([
    ensureAppointmentCancellationTag(),
    ensureManagedReportExclusionTag(),
    ensureManagedSpecialMeasureTag(),
  ]);
  const tags = await tagRelationsRepository.listTagCatalog();
  return filterPickerTagsForDomain(tags, domain);
}

export async function getTagById(tagId: number): Promise<Tag | null> {
  return tagRelationsRepository.getTagById(tagId);
}

export async function getTagByName(tagName: string): Promise<Tag | null> {
  return tagRelationsRepository.getTagByName(tagName);
}

export async function listTagRelations(
  domain: TagRelationDomain,
  ownerId: number,
): Promise<TagRelationItem[]> {
  if (domain === "customer") {
    return tagRelationsRepository.listCustomerTagRelations(ownerId);
  }
  if (domain === "project") {
    return tagRelationsRepository.listProjectTagRelations(ownerId);
  }
  if (domain === "employee") {
    return tagRelationsRepository.listEmployeeTagRelations(ownerId);
  }
  return tagRelationsRepository.listAppointmentTagRelations(ownerId);
}

export async function addTagRelation(
  domain: TagRelationDomain,
  ownerId: number,
  tagId: number,
): Promise<TagRelationItem | null> {
  if (domain === "customer") {
    return tagRelationsRepository.addCustomerTag(ownerId, tagId);
  }
  if (domain === "project") {
    return tagRelationsRepository.addProjectTag(ownerId, tagId);
  }
  if (domain === "employee") {
    return tagRelationsRepository.addEmployeeTag(ownerId, tagId);
  }
  return tagRelationsRepository.addAppointmentTag(ownerId, tagId);
}

export async function removeTagRelation(
  domain: TagRelationDomain,
  ownerId: number,
  tagId: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "not_found" } | { kind: "version_conflict" }> {
  if (domain === "customer") {
    return tagRelationsRepository.removeCustomerTagWithVersion(ownerId, tagId, expectedVersion);
  }
  if (domain === "project") {
    return tagRelationsRepository.removeProjectTagWithVersion(ownerId, tagId, expectedVersion);
  }
  if (domain === "employee") {
    return tagRelationsRepository.removeEmployeeTagWithVersion(ownerId, tagId, expectedVersion);
  }
  return tagRelationsRepository.removeAppointmentTagWithVersion(ownerId, tagId, expectedVersion);
}
