import type { Tag } from "@shared/schema";
import * as tagRelationsRepository from "../repositories/tagRelationsRepository";

export type TagRelationDomain = "customer" | "project" | "appointment";
export type TagRelationItem = tagRelationsRepository.TagRelationItem;

export async function listTagCatalog(): Promise<Tag[]> {
  return tagRelationsRepository.listTagCatalog();
}

export async function getTagById(tagId: number): Promise<Tag | null> {
  return tagRelationsRepository.getTagById(tagId);
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
  return tagRelationsRepository.removeAppointmentTagWithVersion(ownerId, tagId, expectedVersion);
}
