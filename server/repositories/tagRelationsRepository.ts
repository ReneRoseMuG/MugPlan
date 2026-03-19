import { asc, eq, inArray, sql } from "drizzle-orm";
import {
  appointmentTags,
  customerTags,
  projectTags,
  tags,
  type Tag,
} from "@shared/schema";
import { db } from "../db";

export type TagRelationItem = {
  tag: Tag;
  relationVersion: number;
};

type VersionedDeleteResult =
  | { kind: "deleted" }
  | { kind: "not_found" }
  | { kind: "version_conflict" };

function toAffectedRows(result: unknown): number {
  const raw = result as { affectedRows?: number; 0?: { affectedRows?: number } };
  return Number(raw?.affectedRows ?? raw?.[0]?.affectedRows ?? 0);
}

function buildTagsByOwnerMap<TOwnerId extends number>(
  rows: Array<{ ownerId: TOwnerId; tag: Tag }>,
): Map<TOwnerId, Tag[]> {
  const tagsByOwnerId = new Map<TOwnerId, Tag[]>();
  for (const row of rows) {
    const current = tagsByOwnerId.get(row.ownerId) ?? [];
    current.push(row.tag);
    tagsByOwnerId.set(row.ownerId, current);
  }
  return tagsByOwnerId;
}

export async function listTagCatalog(): Promise<Tag[]> {
  return db
    .select()
    .from(tags)
    .orderBy(asc(tags.name), asc(tags.id));
}

export async function getTagById(tagId: number): Promise<Tag | null> {
  const [row] = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
  return row ?? null;
}

export async function getTagByName(tagName: string): Promise<Tag | null> {
  const normalizedTagName = tagName.trim();
  if (normalizedTagName.length === 0) return null;

  const [row] = await db
    .select()
    .from(tags)
    .where(sql`lower(trim(${tags.name})) = lower(trim(${normalizedTagName}))`)
    .limit(1);

  return row ?? null;
}

export async function listCustomerTagRelations(customerId: number): Promise<TagRelationItem[]> {
  const rows = await db
    .select({
      tag: tags,
      relationVersion: customerTags.version,
    })
    .from(customerTags)
    .innerJoin(tags, eq(customerTags.tagId, tags.id))
    .where(eq(customerTags.customerId, customerId))
    .orderBy(asc(tags.name), asc(tags.id));

  return rows.map((row) => ({ tag: row.tag, relationVersion: row.relationVersion }));
}

export async function addCustomerTag(customerId: number, tagId: number): Promise<TagRelationItem | null> {
  await db.execute(sql`
    insert into customer_tags (customer_id, tag_id, version)
    values (${customerId}, ${tagId}, 1)
    on duplicate key update version = version
  `);

  const [row] = await db
    .select({
      tag: tags,
      relationVersion: customerTags.version,
    })
    .from(customerTags)
    .innerJoin(tags, eq(customerTags.tagId, tags.id))
    .where(sql`${customerTags.customerId} = ${customerId} and ${customerTags.tagId} = ${tagId}`)
    .limit(1);

  return row ? { tag: row.tag, relationVersion: row.relationVersion } : null;
}

export async function removeCustomerTagWithVersion(
  customerId: number,
  tagId: number,
  expectedVersion: number,
): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from customer_tags
    where customer_id = ${customerId}
      and tag_id = ${tagId}
      and version = ${expectedVersion}
  `);

  if (toAffectedRows(result) > 0) {
    return { kind: "deleted" };
  }

  const [existing] = await db
    .select({ version: customerTags.version })
    .from(customerTags)
    .where(sql`${customerTags.customerId} = ${customerId} and ${customerTags.tagId} = ${tagId}`)
    .limit(1);

  return existing ? { kind: "version_conflict" } : { kind: "not_found" };
}

export async function getCustomerTagsByCustomerIds(customerIds: number[]): Promise<Map<number, Tag[]>> {
  const uniqueCustomerIds = Array.from(new Set(customerIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueCustomerIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      ownerId: customerTags.customerId,
      tag: tags,
    })
    .from(customerTags)
    .innerJoin(tags, eq(customerTags.tagId, tags.id))
    .where(inArray(customerTags.customerId, uniqueCustomerIds))
    .orderBy(asc(customerTags.customerId), asc(tags.name), asc(tags.id));

  return buildTagsByOwnerMap(rows);
}

export async function listProjectTagRelations(projectId: number): Promise<TagRelationItem[]> {
  const rows = await db
    .select({
      tag: tags,
      relationVersion: projectTags.version,
    })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(eq(projectTags.projectId, projectId))
    .orderBy(asc(tags.name), asc(tags.id));

  return rows.map((row) => ({ tag: row.tag, relationVersion: row.relationVersion }));
}

export async function addProjectTag(projectId: number, tagId: number): Promise<TagRelationItem | null> {
  await db.execute(sql`
    insert into project_tags (project_id, tag_id, version)
    values (${projectId}, ${tagId}, 1)
    on duplicate key update version = version
  `);

  const [row] = await db
    .select({
      tag: tags,
      relationVersion: projectTags.version,
    })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(sql`${projectTags.projectId} = ${projectId} and ${projectTags.tagId} = ${tagId}`)
    .limit(1);

  return row ? { tag: row.tag, relationVersion: row.relationVersion } : null;
}

export async function removeProjectTagWithVersion(
  projectId: number,
  tagId: number,
  expectedVersion: number,
): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from project_tags
    where project_id = ${projectId}
      and tag_id = ${tagId}
      and version = ${expectedVersion}
  `);

  if (toAffectedRows(result) > 0) {
    return { kind: "deleted" };
  }

  const [existing] = await db
    .select({ version: projectTags.version })
    .from(projectTags)
    .where(sql`${projectTags.projectId} = ${projectId} and ${projectTags.tagId} = ${tagId}`)
    .limit(1);

  return existing ? { kind: "version_conflict" } : { kind: "not_found" };
}

export async function getProjectTagsByProjectIds(projectIds: number[]): Promise<Map<number, Tag[]>> {
  const uniqueProjectIds = Array.from(new Set(projectIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueProjectIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      ownerId: projectTags.projectId,
      tag: tags,
    })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(inArray(projectTags.projectId, uniqueProjectIds))
    .orderBy(asc(projectTags.projectId), asc(tags.name), asc(tags.id));

  return buildTagsByOwnerMap(rows);
}

export async function listAppointmentTagRelations(appointmentId: number): Promise<TagRelationItem[]> {
  const rows = await db
    .select({
      tag: tags,
      relationVersion: appointmentTags.version,
    })
    .from(appointmentTags)
    .innerJoin(tags, eq(appointmentTags.tagId, tags.id))
    .where(eq(appointmentTags.appointmentId, appointmentId))
    .orderBy(asc(tags.name), asc(tags.id));

  return rows.map((row) => ({ tag: row.tag, relationVersion: row.relationVersion }));
}

export async function addAppointmentTag(appointmentId: number, tagId: number): Promise<TagRelationItem | null> {
  await db.execute(sql`
    insert into appointment_tags (appointment_id, tag_id, version)
    values (${appointmentId}, ${tagId}, 1)
    on duplicate key update version = version
  `);

  const [row] = await db
    .select({
      tag: tags,
      relationVersion: appointmentTags.version,
    })
    .from(appointmentTags)
    .innerJoin(tags, eq(appointmentTags.tagId, tags.id))
    .where(sql`${appointmentTags.appointmentId} = ${appointmentId} and ${appointmentTags.tagId} = ${tagId}`)
    .limit(1);

  return row ? { tag: row.tag, relationVersion: row.relationVersion } : null;
}

export async function removeAppointmentTagWithVersion(
  appointmentId: number,
  tagId: number,
  expectedVersion: number,
): Promise<VersionedDeleteResult> {
  const result = await db.execute(sql`
    delete from appointment_tags
    where appointment_id = ${appointmentId}
      and tag_id = ${tagId}
      and version = ${expectedVersion}
  `);

  if (toAffectedRows(result) > 0) {
    return { kind: "deleted" };
  }

  const [existing] = await db
    .select({ version: appointmentTags.version })
    .from(appointmentTags)
    .where(sql`${appointmentTags.appointmentId} = ${appointmentId} and ${appointmentTags.tagId} = ${tagId}`)
    .limit(1);

  return existing ? { kind: "version_conflict" } : { kind: "not_found" };
}

export async function getAppointmentTagsByAppointmentIds(appointmentIds: number[]): Promise<Map<number, Tag[]>> {
  const uniqueAppointmentIds = Array.from(new Set(appointmentIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (uniqueAppointmentIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      ownerId: appointmentTags.appointmentId,
      tag: tags,
    })
    .from(appointmentTags)
    .innerJoin(tags, eq(appointmentTags.tagId, tags.id))
    .where(inArray(appointmentTags.appointmentId, uniqueAppointmentIds))
    .orderBy(asc(appointmentTags.appointmentId), asc(tags.name), asc(tags.id));

  return buildTagsByOwnerMap(rows);
}
