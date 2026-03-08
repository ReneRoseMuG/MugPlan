import { eq, sql } from "drizzle-orm";
import { tags } from "@shared/schema";
import { db } from "../db";
import { logError } from "../lib/logger";

const logPrefix = "[tag-seeder]";

const DEMO_TAGS = [
  { name: "Demo-Montage", color: "#2563eb" },
  { name: "Demo-Service", color: "#0f766e" },
  { name: "Demo-Premium", color: "#7c3aed" },
  { name: "Demo-Bestand", color: "#b45309" },
  { name: "Demo-Express", color: "#be123c" },
  { name: "Demo-Nord", color: "#0369a1" },
] as const;

export type DemoTagSeedResult = {
  tagsCreated: number;
  tagsSkipped: number;
  projectLinksCreated: number;
  projectLinksSkipped: number;
  customerLinksCreated: number;
  customerLinksSkipped: number;
  employeeLinksCreated: number;
  employeeLinksSkipped: number;
  appointmentLinksCreated: number;
  appointmentLinksSkipped: number;
};

export type SeedTagDefinition = {
  id: number;
  name: string;
  color: string;
};

function createEmptyResult(): DemoTagSeedResult {
  return {
    tagsCreated: 0,
    tagsSkipped: 0,
    projectLinksCreated: 0,
    projectLinksSkipped: 0,
    customerLinksCreated: 0,
    customerLinksSkipped: 0,
    employeeLinksCreated: 0,
    employeeLinksSkipped: 0,
    appointmentLinksCreated: 0,
    appointmentLinksSkipped: 0,
  };
}

function toAffectedRows(result: unknown): number {
  return Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
}

async function ensureTag(name: string, color: string) {
  const insertResult = await db.execute(sql`
    INSERT IGNORE INTO tags (name, color, is_default, version, created_at, updated_at)
    VALUES (${name}, ${color}, 0, 1, now(), now())
  `);
  const [row] = await db.select().from(tags).where(eq(tags.name, name));
  if (!row) {
    throw new Error(`Tag konnte nicht geladen werden: ${name}`);
  }
  return { row, created: toAffectedRows(insertResult) > 0 };
}

export async function ensureDemoTags(): Promise<{ tags: SeedTagDefinition[]; result: DemoTagSeedResult }> {
  const result = createEmptyResult();
  try {
    const rows: SeedTagDefinition[] = [];
    for (const item of DEMO_TAGS) {
      const ensured = await ensureTag(item.name, item.color);
      rows.push({
        id: Number(ensured.row.id),
        name: ensured.row.name,
        color: ensured.row.color,
      });
      if (ensured.created) {
        result.tagsCreated += 1;
      } else {
        result.tagsSkipped += 1;
      }
    }
    return { tags: rows, result };
  } catch (error) {
    logError(`${logPrefix} ensure demo tags failed`, {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function uniquePositive(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
}

function pickTagIds(
  availableTagIds: number[],
  minTags: number,
  maxTags: number,
  randomInt: (min: number, max: number) => number,
) {
  if (availableTagIds.length === 0 || maxTags <= 0) return [];
  const maxAllowed = Math.min(maxTags, availableTagIds.length);
  const minAllowed = Math.min(minTags, maxAllowed);
  const targetCount = randomInt(minAllowed, maxAllowed);
  const remaining = [...availableTagIds];
  const selected: number[] = [];

  while (selected.length < targetCount && remaining.length > 0) {
    const index = randomInt(0, remaining.length - 1);
    const [tagId] = remaining.splice(index, 1);
    if (tagId != null) {
      selected.push(tagId);
    }
  }

  return selected;
}

async function insertProjectTag(projectId: number, tagId: number) {
  return db.execute(sql`
    INSERT IGNORE INTO project_tags (project_id, tag_id, version)
    VALUES (${projectId}, ${tagId}, 1)
  `);
}

async function insertCustomerTag(customerId: number, tagId: number) {
  return db.execute(sql`
    INSERT IGNORE INTO customer_tags (customer_id, tag_id, version)
    VALUES (${customerId}, ${tagId}, 1)
  `);
}

async function insertEmployeeTag(employeeId: number, tagId: number) {
  return db.execute(sql`
    INSERT IGNORE INTO employee_tags (employee_id, tag_id, version)
    VALUES (${employeeId}, ${tagId}, 1)
  `);
}

async function insertAppointmentTag(appointmentId: number, tagId: number) {
  return db.execute(sql`
    INSERT IGNORE INTO appointment_tags (appointment_id, tag_id, version)
    VALUES (${appointmentId}, ${tagId}, 1)
  `);
}

export async function assignDemoTags(params: {
  tags: SeedTagDefinition[];
  projectIds?: number[];
  customerIds?: number[];
  employeeIds?: number[];
  appointmentIds?: number[];
  randomInt: (min: number, max: number) => number;
}): Promise<DemoTagSeedResult> {
  const result = createEmptyResult();
  const tagIds = params.tags.map((tag) => tag.id);

  try {
    for (const projectId of uniquePositive(params.projectIds ?? [])) {
      const selectedTagIds = pickTagIds(tagIds, 1, 2, params.randomInt);
      for (const tagId of selectedTagIds) {
        const insertResult = await insertProjectTag(projectId, tagId);
        if (toAffectedRows(insertResult) > 0) {
          result.projectLinksCreated += 1;
        } else {
          result.projectLinksSkipped += 1;
        }
      }
    }

    for (const customerId of uniquePositive(params.customerIds ?? [])) {
      const selectedTagIds = pickTagIds(tagIds, 1, 2, params.randomInt);
      for (const tagId of selectedTagIds) {
        const insertResult = await insertCustomerTag(customerId, tagId);
        if (toAffectedRows(insertResult) > 0) {
          result.customerLinksCreated += 1;
        } else {
          result.customerLinksSkipped += 1;
        }
      }
    }

    for (const employeeId of uniquePositive(params.employeeIds ?? [])) {
      const selectedTagIds = pickTagIds(tagIds, 1, 2, params.randomInt);
      for (const tagId of selectedTagIds) {
        const insertResult = await insertEmployeeTag(employeeId, tagId);
        if (toAffectedRows(insertResult) > 0) {
          result.employeeLinksCreated += 1;
        } else {
          result.employeeLinksSkipped += 1;
        }
      }
    }

    for (const appointmentId of uniquePositive(params.appointmentIds ?? [])) {
      const selectedTagIds = pickTagIds(tagIds, 0, 1, params.randomInt);
      for (const tagId of selectedTagIds) {
        const insertResult = await insertAppointmentTag(appointmentId, tagId);
        if (toAffectedRows(insertResult) > 0) {
          result.appointmentLinksCreated += 1;
        } else {
          result.appointmentLinksSkipped += 1;
        }
      }
    }

    return result;
  } catch (error) {
    logError(`${logPrefix} assign demo tags failed`, {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
