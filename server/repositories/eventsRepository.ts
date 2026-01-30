import { eq } from "drizzle-orm";
import { db } from "../db";
import { events, type Event, type InsertEvent } from "@shared/schema";

export async function getEvents(): Promise<Event[]> {
  return db.select().from(events);
}

export async function createEvent(insertEvent: InsertEvent): Promise<Event> {
  const result = await db.insert(events).values(insertEvent);
  const insertId = (result as any)[0].insertId;
  const [event] = await db.select().from(events).where(eq(events.id, insertId));
  return event;
}

export async function deleteEvent(id: number): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}
