import { db } from "./db";
import {
  events,
  tours,
  teams,
  customers,
  notes,
  noteTemplates,
  customerNotes,
  projectStatus,
  projectProjectStatus,
  employees,
  helpTexts,
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
  type InsertNoteTemplate,
  type UpdateNoteTemplate,
  type ProjectStatus,
  type InsertProjectStatus,
  type UpdateProjectStatus,
  type Employee,
  type InsertEmployee,
  type UpdateEmployee,
  type HelpText,
  type InsertHelpText,
  type UpdateHelpText
} from "@shared/schema";
import { eq, desc, and, sql, asc } from "drizzle-orm";

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
  updateNoteTemplate(id: number, data: UpdateNoteTemplate): Promise<NoteTemplate | null>;
  deleteNoteTemplate(id: number): Promise<void>;
  getProjectStatuses(filter?: 'active' | 'inactive' | 'all'): Promise<ProjectStatus[]>;
  getProjectStatus(id: number): Promise<ProjectStatus | null>;
  createProjectStatus(status: InsertProjectStatus): Promise<ProjectStatus>;
  updateProjectStatus(id: number, data: UpdateProjectStatus): Promise<{ status: ProjectStatus | null; error?: string }>;
  toggleProjectStatusActive(id: number, isActive: boolean): Promise<ProjectStatus | null>;
  deleteProjectStatus(id: number): Promise<{ success: boolean; error?: string }>;
  isProjectStatusInUse(id: number): Promise<boolean>;
  getHelpTexts(query?: string): Promise<HelpText[]>;
  getHelpTextById(id: number): Promise<HelpText | null>;
  getHelpTextByKey(helpKey: string): Promise<HelpText | null>;
  createHelpText(data: InsertHelpText): Promise<{ helpText: HelpText | null; error?: string }>;
  updateHelpText(id: number, data: UpdateHelpText): Promise<{ helpText: HelpText | null; error?: string }>;
  toggleHelpTextActive(id: number, isActive: boolean): Promise<HelpText | null>;
  deleteHelpText(id: number): Promise<void>;
  // Employee (FT 05)
  getEmployees(filter?: 'active' | 'inactive' | 'all'): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | null>;
  getEmployeeWithRelations(id: number): Promise<{ employee: Employee; team: Team | null; tour: Tour | null } | null>;
  createEmployee(data: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: UpdateEmployee): Promise<Employee | null>;
  toggleEmployeeActive(id: number, isActive: boolean): Promise<Employee | null>;
  getEmployeesByTour(tourId: number): Promise<Employee[]>;
  getEmployeesByTeam(teamId: number): Promise<Employee[]>;
  setEmployeeTour(employeeId: number, tourId: number | null): Promise<Employee | null>;
  setEmployeeTeam(employeeId: number, teamId: number | null): Promise<Employee | null>;
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

  async updateNoteTemplate(id: number, data: UpdateNoteTemplate): Promise<NoteTemplate | null> {
    const [template] = await db
      .update(noteTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(noteTemplates.id, id))
      .returning();
    return template || null;
  }

  async deleteNoteTemplate(id: number): Promise<void> {
    await db.delete(noteTemplates).where(eq(noteTemplates.id, id));
  }

  async getProjectStatuses(filter: 'active' | 'inactive' | 'all' = 'active'): Promise<ProjectStatus[]> {
    if (filter === 'all') {
      return await db
        .select()
        .from(projectStatus)
        .orderBy(asc(projectStatus.sortOrder), asc(projectStatus.title), asc(projectStatus.id));
    }
    const isActive = filter === 'active';
    return await db
      .select()
      .from(projectStatus)
      .where(eq(projectStatus.isActive, isActive))
      .orderBy(asc(projectStatus.sortOrder), asc(projectStatus.title), asc(projectStatus.id));
  }

  async getProjectStatus(id: number): Promise<ProjectStatus | null> {
    const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, id));
    return status || null;
  }

  async createProjectStatus(insertStatus: InsertProjectStatus): Promise<ProjectStatus> {
    const [status] = await db.insert(projectStatus).values({
      ...insertStatus,
      isActive: true,
      isDefault: false,
    }).returning();
    return status;
  }

  async updateProjectStatus(id: number, data: UpdateProjectStatus): Promise<{ status: ProjectStatus | null; error?: string }> {
    const existing = await this.getProjectStatus(id);
    if (!existing) {
      return { status: null, error: 'Status nicht gefunden' };
    }
    if (existing.isDefault && data.isActive === false) {
      return { status: null, error: 'Default-Status kann nicht deaktiviert werden' };
    }
    const [status] = await db
      .update(projectStatus)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectStatus.id, id))
      .returning();
    return { status: status || null };
  }

  async toggleProjectStatusActive(id: number, isActive: boolean): Promise<ProjectStatus | null> {
    const existing = await this.getProjectStatus(id);
    if (!existing) return null;
    if (existing.isDefault && !isActive) {
      return null;
    }
    const [status] = await db
      .update(projectStatus)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(projectStatus.id, id))
      .returning();
    return status || null;
  }

  async isProjectStatusInUse(id: number): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectProjectStatus)
      .where(eq(projectProjectStatus.projectStatusId, id));
    return (result?.count || 0) > 0;
  }

  async deleteProjectStatus(id: number): Promise<{ success: boolean; error?: string }> {
    const existing = await this.getProjectStatus(id);
    if (!existing) {
      return { success: false, error: 'Status nicht gefunden' };
    }
    if (existing.isDefault) {
      return { success: false, error: 'Default-Status kann nicht gelöscht werden' };
    }
    const inUse = await this.isProjectStatusInUse(id);
    if (inUse) {
      return { success: false, error: 'Status wird von Projekten verwendet' };
    }
    await db.delete(projectStatus).where(eq(projectStatus.id, id));
    return { success: true };
  }

  async getHelpTexts(query?: string): Promise<HelpText[]> {
    if (query && query.trim()) {
      const searchTerm = `%${query.trim().toLowerCase()}%`;
      return await db
        .select()
        .from(helpTexts)
        .where(
          sql`LOWER(${helpTexts.helpKey}) LIKE ${searchTerm} OR LOWER(${helpTexts.title}) LIKE ${searchTerm}`
        )
        .orderBy(asc(helpTexts.helpKey));
    }
    return await db.select().from(helpTexts).orderBy(asc(helpTexts.helpKey));
  }

  async getHelpTextById(id: number): Promise<HelpText | null> {
    const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, id));
    return helpText || null;
  }

  async getHelpTextByKey(helpKey: string): Promise<HelpText | null> {
    const [helpText] = await db
      .select()
      .from(helpTexts)
      .where(and(eq(helpTexts.helpKey, helpKey), eq(helpTexts.isActive, true)));
    return helpText || null;
  }

  async createHelpText(data: InsertHelpText): Promise<{ helpText: HelpText | null; error?: string }> {
    const existing = await db
      .select()
      .from(helpTexts)
      .where(eq(helpTexts.helpKey, data.helpKey));
    if (existing.length > 0) {
      return { helpText: null, error: 'help_key bereits vergeben' };
    }
    const [helpText] = await db.insert(helpTexts).values(data).returning();
    return { helpText };
  }

  async updateHelpText(id: number, data: UpdateHelpText): Promise<{ helpText: HelpText | null; error?: string }> {
    const existing = await this.getHelpTextById(id);
    if (!existing) {
      return { helpText: null, error: 'Hilfetext nicht gefunden' };
    }
    if (data.helpKey && data.helpKey !== existing.helpKey) {
      const duplicate = await db
        .select()
        .from(helpTexts)
        .where(eq(helpTexts.helpKey, data.helpKey));
      if (duplicate.length > 0) {
        return { helpText: null, error: 'help_key bereits vergeben' };
      }
    }
    const [helpText] = await db
      .update(helpTexts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(helpTexts.id, id))
      .returning();
    return { helpText: helpText || null };
  }

  async toggleHelpTextActive(id: number, isActive: boolean): Promise<HelpText | null> {
    const existing = await this.getHelpTextById(id);
    if (!existing) return null;
    const [helpText] = await db
      .update(helpTexts)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(helpTexts.id, id))
      .returning();
    return helpText || null;
  }

  async deleteHelpText(id: number): Promise<void> {
    await db.delete(helpTexts).where(eq(helpTexts.id, id));
  }

  // Employee (FT 05)
  async getEmployees(filter: 'active' | 'inactive' | 'all' = 'active'): Promise<Employee[]> {
    if (filter === 'all') {
      return await db
        .select()
        .from(employees)
        .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));
    }
    const isActive = filter === 'active';
    return await db
      .select()
      .from(employees)
      .where(eq(employees.isActive, isActive))
      .orderBy(asc(employees.lastName), asc(employees.firstName), asc(employees.id));
  }

  async getEmployee(id: number): Promise<Employee | null> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || null;
  }

  async getEmployeeWithRelations(id: number): Promise<{ employee: Employee; team: Team | null; tour: Tour | null } | null> {
    const employee = await this.getEmployee(id);
    if (!employee) return null;
    
    let team: Team | null = null;
    let tour: Tour | null = null;
    
    if (employee.teamId) {
      const [t] = await db.select().from(teams).where(eq(teams.id, employee.teamId));
      team = t || null;
    }
    if (employee.tourId) {
      const [t] = await db.select().from(tours).where(eq(tours.id, employee.tourId));
      tour = t || null;
    }
    
    return { employee, team, tour };
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const fullName = `${data.firstName} ${data.lastName}`;
    const [employee] = await db.insert(employees).values({ ...data, fullName }).returning();
    return employee;
  }

  async updateEmployee(id: number, data: UpdateEmployee): Promise<Employee | null> {
    const existing = await this.getEmployee(id);
    if (!existing) return null;

    // Recalculate fullName if firstName or lastName changed
    let fullName = existing.fullName;
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
      const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
      fullName = `${firstName} ${lastName}`;
    }

    const [employee] = await db
      .update(employees)
      .set({ ...data, fullName, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return employee || null;
  }

  async toggleEmployeeActive(id: number, isActive: boolean): Promise<Employee | null> {
    const [employee] = await db
      .update(employees)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return employee || null;
  }

  async getEmployeesByTour(tourId: number): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.tourId, tourId))
      .orderBy(asc(employees.lastName), asc(employees.firstName));
  }

  async getEmployeesByTeam(teamId: number): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.teamId, teamId))
      .orderBy(asc(employees.lastName), asc(employees.firstName));
  }

  async setEmployeeTour(employeeId: number, tourId: number | null): Promise<Employee | null> {
    const [employee] = await db
      .update(employees)
      .set({ tourId, updatedAt: new Date() })
      .where(eq(employees.id, employeeId))
      .returning();
    return employee || null;
  }

  async setEmployeeTeam(employeeId: number, teamId: number | null): Promise<Employee | null> {
    const [employee] = await db
      .update(employees)
      .set({ teamId, updatedAt: new Date() })
      .where(eq(employees.id, employeeId))
      .returning();
    return employee || null;
  }
}

export const storage = new DatabaseStorage();
