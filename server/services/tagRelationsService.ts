import {
  isManagedRemarksTagName,
  isManagedSpecialMeasureTagName,
  type TagPickerDomain,
} from "@shared/appointmentCancellation";
import type { Tag } from "@shared/schema";
import * as tagRelationsRepository from "../repositories/tagRelationsRepository";
import { filterPickerTagsForDomain } from "../lib/appointmentCancellation";

export type TagRelationDomain = TagPickerDomain;
export type TagRelationItem = tagRelationsRepository.TagRelationItem;

export async function listTagCatalog(
  domain: TagPickerDomain = "appointment",
  options: { includeReportTags?: boolean } = {},
): Promise<Tag[]> {
  const tags = await tagRelationsRepository.listTagCatalog();
  const pickerTags = filterPickerTagsForDomain(tags, domain);
  if (!options.includeReportTags) {
    return pickerTags;
  }

  const pickerTagIds = new Set(pickerTags.map((tag) => tag.id));
  const reportTags = tags.filter((tag) =>
    !pickerTagIds.has(tag.id)
    && (isManagedSpecialMeasureTagName(tag.name) || isManagedRemarksTagName(tag.name)));
  return [...pickerTags, ...reportTags]
    .sort((left, right) => left.name.localeCompare(right.name, "de") || left.id - right.id);
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
