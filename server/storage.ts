import { db } from "./db";
import {
  events,
  tours,
  teams,
  customers,
  notes,
  noteTemplates,
  customerNotes,
  type InsertEvent,
  type Event,
  type Tour,
  type InsertTour,
  type UpdateTour,
  type Team,
  type InsertTeam,
  type UpdateTeam,
  type Customer,
  type InsertCustomer,
  type UpdateCustomer,
  type Note,
  type InsertNote,
  type UpdateNote,
  type NoteTemplate,
  type InsertNoteTemplate
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  getTours(): Promise<Tour[]>;
  createTour(tour: InsertTour): Promise<Tour>;
  updateTour(id: number, data: UpdateTour): Promise<Tour | null>;
  deleteTour(id: number): Promise<void>;
  getTeams(): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, data: UpdateTeam): Promise<Team | null>;
  deleteTeam(id: number): Promise<void>;
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | null>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: UpdateCustomer): Promise<Customer | null>;
  getCustomerNotes(customerId: number): Promise<Note[]>;
  createCustomerNote(customerId: number, note: InsertNote): Promise<Note>;
  updateNote(noteId: number, data: UpdateNote): Promise<Note | null>;
  toggleNotePin(noteId: number, isPinned: boolean): Promise<Note | null>;
  deleteNote(noteId: number): Promise<void>;
  getNoteTemplates(activeOnly?: boolean): Promise<NoteTemplate[]>;
  getNoteTemplate(id: number): Promise<NoteTemplate | null>;
  createNoteTemplate(template: InsertNoteTemplate): Promise<NoteTemplate>;
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

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.id);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const existingTeams = await this.getTeams();
    const nextNumber = existingTeams.length + 1;
    
    let name = `Team ${nextNumber}`;
    const existingNames = new Set(existingTeams.map(t => t.name));
    while (existingNames.has(name)) {
      const num = parseInt(name.split(' ')[1]) + 1;
      name = `Team ${num}`;
    }
    
    const [team] = await db.insert(teams).values({ ...insertTeam, name }).returning();
    return team;
  }

  async updateTeam(id: number, data: UpdateTeam): Promise<Team | null> {
    const [team] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return team || null;
  }

  async deleteTeam(id: number): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  async getCustomers(): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(customers.id);
  }

  async getCustomer(id: number): Promise<Customer | null> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || null;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: number, data: UpdateCustomer): Promise<Customer | null> {
    const [customer] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer || null;
  }

  async getCustomerNotes(customerId: number): Promise<Note[]> {
    const result = await db
      .select({ note: notes })
      .from(customerNotes)
      .innerJoin(notes, eq(customerNotes.noteId, notes.id))
      .where(eq(customerNotes.customerId, customerId))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
    return result.map(r => r.note);
  }

  async createCustomerNote(customerId: number, noteData: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values(noteData).returning();
    await db.insert(customerNotes).values({ customerId, noteId: note.id });
    return note;
  }

  async updateNote(noteId: number, data: UpdateNote): Promise<Note | null> {
    const [note] = await db
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notes.id, noteId))
      .returning();
    return note || null;
  }

  async toggleNotePin(noteId: number, isPinned: boolean): Promise<Note | null> {
    const [note] = await db
      .update(notes)
      .set({ isPinned, updatedAt: new Date() })
      .where(eq(notes.id, noteId))
      .returning();
    return note || null;
  }

  async deleteNote(noteId: number): Promise<void> {
    await db.delete(notes).where(eq(notes.id, noteId));
  }

  async getNoteTemplates(activeOnly: boolean = true): Promise<NoteTemplate[]> {
    if (activeOnly) {
      return await db
        .select()
        .from(noteTemplates)
        .where(eq(noteTemplates.isActive, true))
        .orderBy(noteTemplates.sortOrder, noteTemplates.title);
    }
    return await db.select().from(noteTemplates).orderBy(noteTemplates.sortOrder, noteTemplates.title);
  }

  async getNoteTemplate(id: number): Promise<NoteTemplate | null> {
    const [template] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, id));
    return template || null;
  }

  async createNoteTemplate(template: InsertNoteTemplate): Promise<NoteTemplate> {
    const [result] = await db.insert(noteTemplates).values(template).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
