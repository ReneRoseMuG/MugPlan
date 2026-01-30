import { eq } from "drizzle-orm";
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

export async function updateTour(id: number, color: string): Promise<Tour | null> {
  await db.update(tours).set({ color }).where(eq(tours.id, id));
  const [tour] = await db.select().from(tours).where(eq(tours.id, id));
  return tour || null;
}

export async function deleteTour(id: number): Promise<void> {
  await db.delete(tours).where(eq(tours.id, id));
}
