import type { InsertProjectAttachment, ProjectAttachment } from "@shared/schema";
import * as projectsRepository from "../repositories/projectsRepository";

export async function projectExists(projectId: number): Promise<boolean> {
  const project = await projectsRepository.getProject(projectId);
  return project !== null;
}

export async function listProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
  return projectsRepository.getProjectAttachments(projectId);
}

export async function getProjectAttachmentById(id: number): Promise<ProjectAttachment | null> {
  return projectsRepository.getProjectAttachmentById(id);
}

export async function createProjectAttachment(data: InsertProjectAttachment): Promise<ProjectAttachment> {
  return projectsRepository.createProjectAttachment(data);
}
