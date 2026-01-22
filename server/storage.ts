import { db } from "./db";
import {
  events,
  tours,
  type InsertEvent,
  type Event,
  type Tour,
  type InsertTour,
  type UpdateTour
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  getTours(): Promise<Tour[]>;
  createTour(tour: InsertTour): Promise<Tour>;
  updateTour(id: number, data: UpdateTour): Promise<Tour | null>;
  deleteTour(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getTours(): Promise<Tour[]> {
    return await db.select().from(tours).orderBy(tours.id);
  }

  async createTour(insertTour: InsertTour): Promise<Tour> {
    const existingTours = await this.getTours();
    const nextNumber = existingTours.length + 1;
    
    let name = `Tour ${nextNumber}`;
    const existingNames = new Set(existingTours.map(t => t.name));
    while (existingNames.has(name)) {
      const num = parseInt(name.split(' ')[1]) + 1;
      name = `Tour ${num}`;
    }
    
    const [tour] = await db.insert(tours).values({ ...insertTour, name }).returning();
    return tour;
  }

  async updateTour(id: number, data: UpdateTour): Promise<Tour | null> {
    const [tour] = await db.update(tours).set(data).where(eq(tours.id, id)).returning();
    return tour || null;
  }

  async deleteTour(id: number): Promise<void> {
    await db.delete(tours).where(eq(tours.id, id));
  }
}

export const storage = new DatabaseStorage();
