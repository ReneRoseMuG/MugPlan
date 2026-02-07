import type { EmployeeAttachment, InsertEmployeeAttachment } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";

export async function listEmployeeAttachments(employeeId: number): Promise<EmployeeAttachment[]> {
  return employeesRepository.getEmployeeAttachments(employeeId);
}

export async function getEmployeeAttachmentById(id: number): Promise<EmployeeAttachment | null> {
  return employeesRepository.getEmployeeAttachmentById(id);
}

export async function createEmployeeAttachment(data: InsertEmployeeAttachment): Promise<EmployeeAttachment> {
  return employeesRepository.createEmployeeAttachment(data);
}
