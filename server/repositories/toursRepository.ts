import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { tours, type Tour } from "@shared/schema";

export async function getTours(): Promise<Tour[]> {
  return db.select().from(tours).orderBy(tours.id);
}

export async function getTour(id: number): Promise<Tour | null> {
  const [tour] = await db.select().from(tours).where(eq(tours.id, id));
  return tour || null;
}

export async function createTour(name: string, color: string): Promise<Tour> {
  const result = await db.insert(tours).values({ name, color });
  const insertId = (result as any)[0].insertId;
  const [tour] = await db.select().from(tours).where(eq(tours.id, insertId));
  return tour;
}

export async function updateTourWithVersion(
  id: number,
  expectedVersion: number,
  color: string,
): Promise<{ kind: "updated"; tour: Tour } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    update tours
    set
      color = ${color},
      version = version + 1
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  if (affectedRows === 0) return { kind: "version_conflict" };

  const [tour] = await db.select().from(tours).where(eq(tours.id, id));
  return { kind: "updated", tour };
}

export async function deleteTourWithVersion(
  id: number,
  expectedVersion: number,
): Promise<{ kind: "deleted" } | { kind: "version_conflict" }> {
  const result = await db.execute(sql`
    delete from tours
    where id = ${id}
      and version = ${expectedVersion}
  `);
  const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
  return affectedRows === 0 ? { kind: "version_conflict" } : { kind: "deleted" };
}
