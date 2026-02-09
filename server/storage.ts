import type {
  Customer,
  Employee,
  Event,
  HelpText,
  InsertCustomer,
  InsertEmployee,
  InsertEvent,
  InsertHelpText,
  CreateNoteInput,
  InsertNote,
  InsertNoteTemplate,
  InsertProject,
  InsertProjectAttachment,
  InsertProjectStatus,
  InsertTeam,
  InsertTour,
  Note,
  NoteTemplate,
  Project,
  ProjectAttachment,
  ProjectStatus,
  Team,
  Tour,
  UpdateCustomer,
  UpdateEmployee,
  UpdateHelpText,
  UpdateNote,
  UpdateNoteTemplate,
  UpdateProject,
  UpdateProjectStatus,
  UpdateTeam,
  UpdateTour,
} from "@shared/schema";
import * as customerNotesService from "./services/customerNotesService";
import * as customersService from "./services/customersService";
import * as employeesService from "./services/employeesService";
import * as employeesRepository from "./repositories/employeesRepository";
import * as eventsService from "./services/eventsService";
import * as helpTextsService from "./services/helpTextsService";
import * as noteTemplatesService from "./services/noteTemplatesService";
import * as notesService from "./services/notesService";
import * as projectAttachmentsRepository from "./repositories/projectsRepository";
import * as projectNotesService from "./services/projectNotesService";
import * as projectStatusService from "./services/projectStatusService";
import * as projectsService from "./services/projectsService";
import * as teamEmployeesService from "./services/teamEmployeesService";
import * as teamsService from "./services/teamsService";
import * as tourEmployeesService from "./services/tourEmployeesService";
import * as toursService from "./services/toursService";

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
  createCustomerNote(customerId: number, note: CreateNoteInput & { templateId?: number }): Promise<Note>;
  updateNote(noteId: number, data: UpdateNote): Promise<Note | null>;
  toggleNotePin(noteId: number, isPinned: boolean): Promise<Note | null>;
  deleteNote(noteId: number): Promise<void>;
  getNoteTemplates(activeOnly?: boolean): Promise<NoteTemplate[]>;
  getNoteTemplate(id: number): Promise<NoteTemplate | null>;
  createNoteTemplate(template: InsertNoteTemplate): Promise<NoteTemplate>;
  updateNoteTemplate(id: number, data: UpdateNoteTemplate): Promise<NoteTemplate | null>;
  deleteNoteTemplate(id: number): Promise<void>;
  getProjectStatuses(filter?: "active" | "inactive" | "all"): Promise<ProjectStatus[]>;
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
  getEmployees(filter?: "active" | "all"): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | null>;
  getEmployeeWithRelations(id: number): Promise<{ employee: Employee; team: Team | null; tour: Tour | null } | null>;
  createEmployee(data: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: UpdateEmployee): Promise<Employee | null>;
  toggleEmployeeActive(id: number, isActive: boolean): Promise<Employee | null>;
  getEmployeesByTour(tourId: number): Promise<Employee[]>;
  getEmployeesByTeam(teamId: number): Promise<Employee[]>;
  setEmployeeTour(employeeId: number, tourId: number | null): Promise<Employee | null>;
  setEmployeeTeam(employeeId: number, teamId: number | null): Promise<Employee | null>;
  getProjects(filter?: "active" | "inactive" | "all"): Promise<Project[]>;
  getProject(id: number): Promise<Project | null>;
  getProjectWithCustomer(id: number): Promise<{ project: Project; customer: Customer } | null>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: UpdateProject): Promise<Project | null>;
  deleteProject(id: number): Promise<void>;
  getProjectNotes(projectId: number): Promise<Note[]>;
  createProjectNote(projectId: number, note: CreateNoteInput & { templateId?: number }): Promise<Note>;
  getProjectAttachments(projectId: number): Promise<ProjectAttachment[]>;
  getProjectAttachmentById(id: number): Promise<ProjectAttachment | null>;
  createProjectAttachment(data: InsertProjectAttachment): Promise<ProjectAttachment>;
  deleteProjectAttachment(id: number): Promise<void>;
  getProjectStatusesByProject(projectId: number): Promise<ProjectStatus[]>;
  addProjectStatus(projectId: number, statusId: number): Promise<void>;
  removeProjectStatus(projectId: number, statusId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    return eventsService.listEvents();
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    return eventsService.createEvent(event);
  }

  async deleteEvent(id: number): Promise<void> {
    await eventsService.deleteEvent(id);
  }

  async getTours(): Promise<Tour[]> {
    return toursService.listTours();
  }

  async createTour(tour: InsertTour): Promise<Tour> {
    return toursService.createTour(tour);
  }

  async updateTour(id: number, data: UpdateTour): Promise<Tour | null> {
    return toursService.updateTour(id, data);
  }

  async deleteTour(id: number): Promise<void> {
    await toursService.deleteTour(id);
  }

  async getTeams(): Promise<Team[]> {
    return teamsService.listTeams();
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    return teamsService.createTeam(team);
  }

  async updateTeam(id: number, data: UpdateTeam): Promise<Team | null> {
    return teamsService.updateTeam(id, data);
  }

  async deleteTeam(id: number): Promise<void> {
    await teamsService.deleteTeam(id);
  }

  async getCustomers(): Promise<Customer[]> {
    return customersService.listCustomers();
  }

  async getCustomer(id: number): Promise<Customer | null> {
    return customersService.getCustomer(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return customersService.createCustomer(customer);
  }

  async updateCustomer(id: number, data: UpdateCustomer): Promise<Customer | null> {
    return customersService.updateCustomer(id, data);
  }

  async getCustomerNotes(customerId: number): Promise<Note[]> {
    const notes = await customerNotesService.listCustomerNotes(customerId);
    return notes ?? [];
  }

  async createCustomerNote(customerId: number, note: CreateNoteInput & { templateId?: number }): Promise<Note> {
    const created = await customerNotesService.createCustomerNote(customerId, note);
    if (!created) {
      throw new Error("Customer not found");
    }
    return created;
  }

  async updateNote(noteId: number, data: UpdateNote): Promise<Note | null> {
    return notesService.updateNote(noteId, data);
  }

  async toggleNotePin(noteId: number, isPinned: boolean): Promise<Note | null> {
    return notesService.toggleNotePin(noteId, isPinned);
  }

  async deleteNote(noteId: number): Promise<void> {
    await notesService.deleteNote(noteId);
  }

  async getNoteTemplates(activeOnly = true): Promise<NoteTemplate[]> {
    return noteTemplatesService.listNoteTemplates(activeOnly);
  }

  async getNoteTemplate(id: number): Promise<NoteTemplate | null> {
    return noteTemplatesService.getNoteTemplate(id);
  }

  async createNoteTemplate(template: InsertNoteTemplate): Promise<NoteTemplate> {
    return noteTemplatesService.createNoteTemplate(template);
  }

  async updateNoteTemplate(id: number, data: UpdateNoteTemplate): Promise<NoteTemplate | null> {
    return noteTemplatesService.updateNoteTemplate(id, data);
  }

  async deleteNoteTemplate(id: number): Promise<void> {
    await noteTemplatesService.deleteNoteTemplate(id);
  }

  async getProjectStatuses(filter: "active" | "inactive" | "all" = "active"): Promise<ProjectStatus[]> {
    return projectStatusService.listProjectStatuses(filter);
  }

  async getProjectStatus(id: number): Promise<ProjectStatus | null> {
    return projectStatusService.getProjectStatus(id);
  }

  async createProjectStatus(status: InsertProjectStatus): Promise<ProjectStatus> {
    return projectStatusService.createProjectStatus(status);
  }

  async updateProjectStatus(
    id: number,
    data: UpdateProjectStatus,
  ): Promise<{ status: ProjectStatus | null; error?: string }> {
    return projectStatusService.updateProjectStatus(id, data);
  }

  async toggleProjectStatusActive(id: number, isActive: boolean): Promise<ProjectStatus | null> {
    return projectStatusService.toggleProjectStatusActive(id, isActive);
  }

  async deleteProjectStatus(id: number): Promise<{ success: boolean; error?: string }> {
    return projectStatusService.deleteProjectStatus(id);
  }

  async isProjectStatusInUse(id: number): Promise<boolean> {
    return projectStatusService.isProjectStatusInUse(id);
  }

  async getHelpTexts(query?: string): Promise<HelpText[]> {
    return helpTextsService.listHelpTexts(query);
  }

  async getHelpTextById(id: number): Promise<HelpText | null> {
    return helpTextsService.getHelpTextById(id);
  }

  async getHelpTextByKey(helpKey: string): Promise<HelpText | null> {
    return helpTextsService.getHelpTextByKey(helpKey);
  }

  async createHelpText(data: InsertHelpText): Promise<{ helpText: HelpText | null; error?: string }> {
    return helpTextsService.createHelpText(data);
  }

  async updateHelpText(id: number, data: UpdateHelpText): Promise<{ helpText: HelpText | null; error?: string }> {
    return helpTextsService.updateHelpText(id, data);
  }

  async toggleHelpTextActive(id: number, isActive: boolean): Promise<HelpText | null> {
    return helpTextsService.toggleHelpTextActive(id, isActive);
  }

  async deleteHelpText(id: number): Promise<void> {
    await helpTextsService.deleteHelpText(id);
  }

  async getEmployees(filter: "active" | "all" = "active"): Promise<Employee[]> {
    return employeesService.listEmployees(filter);
  }

  async getEmployee(id: number): Promise<Employee | null> {
    const result = await employeesService.getEmployeeWithRelations(id);
    return result?.employee ?? null;
  }

  async getEmployeeWithRelations(
    id: number,
  ): Promise<{ employee: Employee; team: Team | null; tour: Tour | null } | null> {
    return employeesService.getEmployeeWithRelations(id);
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    return employeesService.createEmployee(data);
  }

  async updateEmployee(id: number, data: UpdateEmployee): Promise<Employee | null> {
    return employeesService.updateEmployee(id, data);
  }

  async toggleEmployeeActive(id: number, isActive: boolean): Promise<Employee | null> {
    return employeesService.toggleEmployeeActive(id, isActive);
  }

  async getEmployeesByTour(tourId: number): Promise<Employee[]> {
    return tourEmployeesService.listEmployeesByTour(tourId);
  }

  async getEmployeesByTeam(teamId: number): Promise<Employee[]> {
    return teamEmployeesService.listEmployeesByTeam(teamId);
  }

  async setEmployeeTour(employeeId: number, tourId: number | null): Promise<Employee | null> {
    return employeesRepository.setEmployeeTour(employeeId, tourId);
  }

  async setEmployeeTeam(employeeId: number, teamId: number | null): Promise<Employee | null> {
    return employeesRepository.setEmployeeTeam(employeeId, teamId);
  }

  async getProjects(filter: "active" | "inactive" | "all" = "all"): Promise<Project[]> {
    return projectsService.listProjects(filter);
  }

  async getProject(id: number): Promise<Project | null> {
    return projectsService.getProject(id);
  }

  async getProjectWithCustomer(id: number): Promise<{ project: Project; customer: Customer } | null> {
    return projectsService.getProjectWithCustomer(id);
  }

  async createProject(data: InsertProject): Promise<Project> {
    return projectsService.createProject(data);
  }

  async updateProject(id: number, data: UpdateProject): Promise<Project | null> {
    return projectsService.updateProject(id, data);
  }

  async deleteProject(id: number): Promise<void> {
    await projectsService.deleteProject(id);
  }

  async getProjectNotes(projectId: number): Promise<Note[]> {
    return projectNotesService.listProjectNotes(projectId);
  }

  async createProjectNote(projectId: number, note: CreateNoteInput & { templateId?: number }): Promise<Note> {
    const created = await projectNotesService.createProjectNote(projectId, note);
    if (!created) {
      throw new Error("Projekt nicht gefunden");
    }
    return created;
  }

  async getProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
    return projectAttachmentsRepository.getProjectAttachments(projectId);
  }

  async getProjectAttachmentById(id: number): Promise<ProjectAttachment | null> {
    return projectAttachmentsRepository.getProjectAttachmentById(id);
  }

  async createProjectAttachment(data: InsertProjectAttachment): Promise<ProjectAttachment> {
    return projectAttachmentsRepository.createProjectAttachment(data);
  }

  async deleteProjectAttachment(id: number): Promise<void> {
    await projectAttachmentsRepository.deleteProjectAttachment(id);
  }

  async getProjectStatusesByProject(projectId: number): Promise<ProjectStatus[]> {
    return projectStatusService.listProjectStatusesByProject(projectId);
  }

  async addProjectStatus(projectId: number, statusId: number): Promise<void> {
    await projectStatusService.addProjectStatus(projectId, statusId);
  }

  async removeProjectStatus(projectId: number, statusId: number): Promise<void> {
    await projectStatusService.removeProjectStatus(projectId, statusId);
  }
}

export const storage = new DatabaseStorage();
