import type { Customer, InsertProject, Project, UpdateProject } from "@shared/schema";
import * as projectsRepository from "../repositories/projectsRepository";
import * as projectStatusService from "./projectStatusService";

export type ProjectScope = "upcoming" | "noAppointments";

export async function listProjects(
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<Project[]> {
  return projectsRepository.getProjects(filter, statusIds, scope);
}

export async function listProjectsByCustomer(
  customerId: number,
  filter: "active" | "inactive" | "all" = "all",
  statusIds: number[] = [],
  scope: ProjectScope = "upcoming",
): Promise<Project[]> {
  return projectsRepository.getProjectsByCustomer(customerId, filter, statusIds, scope);
}

export async function getProject(id: number): Promise<Project | null> {
  return projectsRepository.getProject(id);
}

export async function getProjectWithCustomer(
  id: number,
): Promise<{ project: Project; customer: Customer } | null> {
  return projectsRepository.getProjectWithCustomer(id);
}

export async function createProject(data: InsertProject): Promise<Project> {
  return projectsRepository.createProject(data);
}

export async function updateProject(id: number, data: UpdateProject): Promise<Project | null> {
  return projectsRepository.updateProject(id, data);
}

export async function deleteProject(id: number): Promise<void> {
  await projectStatusService.removeProjectStatusesForProject(id);
  await projectsRepository.deleteProject(id);
}
