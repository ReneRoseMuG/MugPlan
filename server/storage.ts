import { db } from "./db";
import {
  events,
  tours,
  teams,
  customers,
  notes,
  noteTemplates,
  customerNotes,
  projects,
  projectNotes,
  projectAttachments,
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
  type Project,
  type InsertProject,
  type UpdateProject,
  type ProjectAttachment,
  type InsertProjectAttachment,
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
  getProjects(filter?: 'active' | 'inactive' | 'all'): Promise<Project[]>;
  getProject(id: number): Promise<Project | null>;
  getProjectWithCustomer(id: number): Promise<{ project: Project; customer: Customer } | null>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: UpdateProject): Promise<Project | null>;
  getProjectNotes(projectId: number): Promise<Note[]>;
  createProjectNote(projectId: number, note: InsertNote): Promise<Note>;
  getProjectAttachments(projectId: number): Promise<ProjectAttachment[]>;
  createProjectAttachment(data: InsertProjectAttachment): Promise<ProjectAttachment>;
  deleteProjectAttachment(id: number): Promise<void>;
  getProjectStatusesByProject(projectId: number): Promise<ProjectStatus[]>;
  addProjectStatus(projectId: number, statusId: number): Promise<void>;
  removeProjectStatus(projectId: number, statusId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(insertEvent);
    const insertId = (result as any)[0].insertId;
    const [event] = await db.select().from(events).where(eq(events.id, insertId));
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
    
    const result = await db.insert(tours).values({ ...insertTour, name });
    const insertId = (result as any)[0].insertId;
    const [tour] = await db.select().from(tours).where(eq(tours.id, insertId));
    return tour;
  }

  async updateTour(id: number, data: UpdateTour): Promise<Tour | null> {
    await db.update(tours).set(data).where(eq(tours.id, id));
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
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
    
    const result = await db.insert(teams).values({ ...insertTeam, name });
    const insertId = (result as any)[0].insertId;
    const [team] = await db.select().from(teams).where(eq(teams.id, insertId));
    return team;
  }

  async updateTeam(id: number, data: UpdateTeam): Promise<Team | null> {
    await db.update(teams).set(data).where(eq(teams.id, id));
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
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
    const fullName = `${insertCustomer.lastName}, ${insertCustomer.firstName}`;
    const result = await db.insert(customers).values({ ...insertCustomer, fullName });
    const insertId = (result as any)[0].insertId;
    const [customer] = await db.select().from(customers).where(eq(customers.id, insertId));
    return customer;
  }

  async updateCustomer(id: number, data: UpdateCustomer): Promise<Customer | null> {
    const existing = await this.getCustomer(id);
    if (!existing) return null;

    let fullName = existing.fullName;
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
      const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
      fullName = `${lastName}, ${firstName}`;
    }

    await db
      .update(customers)
      .set({ ...data, fullName, updatedAt: new Date() })
      .where(eq(customers.id, id));
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
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
    const result = await db.insert(notes).values(noteData);
    const insertId = (result as any)[0].insertId;
    const [note] = await db.select().from(notes).where(eq(notes.id, insertId));
    await db.insert(customerNotes).values({ customerId, noteId: note.id });
    return note;
  }

  async updateNote(noteId: number, data: UpdateNote): Promise<Note | null> {
    await db
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notes.id, noteId));
    const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
    return note || null;
  }

  async toggleNotePin(noteId: number, isPinned: boolean): Promise<Note | null> {
    await db
      .update(notes)
      .set({ isPinned, updatedAt: new Date() })
      .where(eq(notes.id, noteId));
    const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
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
    const result = await db.insert(noteTemplates).values(template);
    const insertId = (result as any)[0].insertId;
    const [created] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, insertId));
    return created;
  }

  async updateNoteTemplate(id: number, data: UpdateNoteTemplate): Promise<NoteTemplate | null> {
    await db
      .update(noteTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(noteTemplates.id, id));
    const [template] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, id));
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
    const result = await db.insert(projectStatus).values({
      ...insertStatus,
      isActive: true,
      isDefault: false,
    });
    const insertId = (result as any)[0].insertId;
    const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, insertId));
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
    await db
      .update(projectStatus)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectStatus.id, id));
    const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, id));
    return { status: status || null };
  }

  async toggleProjectStatusActive(id: number, isActive: boolean): Promise<ProjectStatus | null> {
    const existing = await this.getProjectStatus(id);
    if (!existing) return null;
    if (existing.isDefault && !isActive) {
      return null;
    }
    await db
      .update(projectStatus)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(projectStatus.id, id));
    const [status] = await db.select().from(projectStatus).where(eq(projectStatus.id, id));
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
    const result = await db.insert(helpTexts).values(data);
    const insertId = (result as any)[0].insertId;
    const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, insertId));
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
    await db
      .update(helpTexts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(helpTexts.id, id));
    const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, id));
    return { helpText: helpText || null };
  }

  async toggleHelpTextActive(id: number, isActive: boolean): Promise<HelpText | null> {
    const existing = await this.getHelpTextById(id);
    if (!existing) return null;
    await db
      .update(helpTexts)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(helpTexts.id, id));
    const [helpText] = await db.select().from(helpTexts).where(eq(helpTexts.id, id));
    return helpText || null;
  }

  async deleteHelpText(id: number): Promise<void> {
    await db.delete(helpTexts).where(eq(helpTexts.id, id));
  }

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
    const fullName = `${data.lastName}, ${data.firstName}`;
    const result = await db.insert(employees).values({ ...data, fullName });
    const insertId = (result as any)[0].insertId;
    const [employee] = await db.select().from(employees).where(eq(employees.id, insertId));
    return employee;
  }

  async updateEmployee(id: number, data: UpdateEmployee): Promise<Employee | null> {
    const existing = await this.getEmployee(id);
    if (!existing) return null;

    let fullName = existing.fullName;
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
      const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
      fullName = `${lastName}, ${firstName}`;
    }

    await db
      .update(employees)
      .set({ ...data, fullName, updatedAt: new Date() })
      .where(eq(employees.id, id));
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || null;
  }

  async toggleEmployeeActive(id: number, isActive: boolean): Promise<Employee | null> {
    await db
      .update(employees)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(employees.id, id));
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
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
    await db
      .update(employees)
      .set({ tourId, updatedAt: new Date() })
      .where(eq(employees.id, employeeId));
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
    return employee || null;
  }

  async setEmployeeTeam(employeeId: number, teamId: number | null): Promise<Employee | null> {
    await db
      .update(employees)
      .set({ teamId, updatedAt: new Date() })
      .where(eq(employees.id, employeeId));
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
    return employee || null;
  }

  async getProjects(filter: 'active' | 'inactive' | 'all' = 'all'): Promise<Project[]> {
    if (filter === 'active') {
      return await db.select().from(projects).where(eq(projects.isActive, true)).orderBy(desc(projects.updatedAt));
    } else if (filter === 'inactive') {
      return await db.select().from(projects).where(eq(projects.isActive, false)).orderBy(desc(projects.updatedAt));
    }
    return await db.select().from(projects).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: number): Promise<Project | null> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || null;
  }

  async getProjectWithCustomer(id: number): Promise<{ project: Project; customer: Customer } | null> {
    const [result] = await db
      .select({ project: projects, customer: customers })
      .from(projects)
      .innerJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(projects.id, id));
    return result || null;
  }

  async createProject(data: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(data);
    const insertId = (result as any)[0].insertId;
    const [project] = await db.select().from(projects).where(eq(projects.id, insertId));
    return project;
  }

  async updateProject(id: number, data: UpdateProject): Promise<Project | null> {
    await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id));
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || null;
  }

  async getProjectNotes(projectId: number): Promise<Note[]> {
    const result = await db
      .select({ note: notes })
      .from(projectNotes)
      .innerJoin(notes, eq(projectNotes.noteId, notes.id))
      .where(eq(projectNotes.projectId, projectId))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
    return result.map(r => r.note);
  }

  async createProjectNote(projectId: number, note: InsertNote): Promise<Note> {
    const result = await db.insert(notes).values(note);
    const insertId = (result as any)[0].insertId;
    const [newNote] = await db.select().from(notes).where(eq(notes.id, insertId));
    await db.insert(projectNotes).values({ projectId, noteId: newNote.id });
    return newNote;
  }

  async getProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
    return await db
      .select()
      .from(projectAttachments)
      .where(eq(projectAttachments.projectId, projectId))
      .orderBy(desc(projectAttachments.createdAt));
  }

  async createProjectAttachment(data: InsertProjectAttachment): Promise<ProjectAttachment> {
    const result = await db.insert(projectAttachments).values(data);
    const insertId = (result as any)[0].insertId;
    const [attachment] = await db.select().from(projectAttachments).where(eq(projectAttachments.id, insertId));
    return attachment;
  }

  async deleteProjectAttachment(id: number): Promise<void> {
    await db.delete(projectAttachments).where(eq(projectAttachments.id, id));
  }

  async getProjectStatusesByProject(projectId: number): Promise<ProjectStatus[]> {
    const result = await db
      .select({ status: projectStatus })
      .from(projectProjectStatus)
      .innerJoin(projectStatus, eq(projectProjectStatus.projectStatusId, projectStatus.id))
      .where(eq(projectProjectStatus.projectId, projectId))
      .orderBy(asc(projectStatus.sortOrder), asc(projectStatus.title));
    return result.map(r => r.status);
  }

  async addProjectStatus(projectId: number, statusId: number): Promise<void> {
    const existing = await db
      .select()
      .from(projectProjectStatus)
      .where(and(
        eq(projectProjectStatus.projectId, projectId),
        eq(projectProjectStatus.projectStatusId, statusId)
      ));
    if (existing.length === 0) {
      await db.insert(projectProjectStatus).values({ projectId, projectStatusId: statusId });
    }
  }

  async removeProjectStatus(projectId: number, statusId: number): Promise<void> {
    await db.delete(projectProjectStatus).where(and(
      eq(projectProjectStatus.projectId, projectId),
      eq(projectProjectStatus.projectStatusId, statusId)
    ));
  }
}

export const storage = new DatabaseStorage();
