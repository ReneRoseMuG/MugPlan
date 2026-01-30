import type { ProjectAttachment } from "@shared/schema";
import * as projectsRepository from "../repositories/projectsRepository";

export async function listProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
  return projectsRepository.getProjectAttachments(projectId);
}

export async function deleteProjectAttachment(id: number): Promise<void> {
  await projectsRepository.deleteProjectAttachment(id);
}
