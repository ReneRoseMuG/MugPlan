import type { InsertProjectAttachment, ProjectAttachment } from "@shared/schema";
import * as projectsRepository from "../repositories/projectsRepository";

export async function listProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
  return projectsRepository.getProjectAttachments(projectId);
}

export async function getProjectAttachmentById(id: number): Promise<ProjectAttachment | null> {
  return projectsRepository.getProjectAttachmentById(id);
}

export async function createProjectAttachment(data: InsertProjectAttachment): Promise<ProjectAttachment> {
  return projectsRepository.createProjectAttachment(data);
}

export async function deleteProjectAttachment(id: number): Promise<void> {
  await projectsRepository.deleteProjectAttachment(id);
}
