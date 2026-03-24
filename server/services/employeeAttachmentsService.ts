import type { EmployeeAttachment, InsertEmployeeAttachment } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";

export async function employeeExists(employeeId: number): Promise<boolean> {
  const employee = await employeesRepository.getEmployee(employeeId);
  return employee !== null;
}

export async function listEmployeeAttachments(employeeId: number): Promise<EmployeeAttachment[]> {
  return employeesRepository.getEmployeeAttachments(employeeId);
}

export async function getEmployeeAttachmentById(id: number): Promise<EmployeeAttachment | null> {
  return employeesRepository.getEmployeeAttachmentById(id);
}

export async function createEmployeeAttachment(data: InsertEmployeeAttachment): Promise<EmployeeAttachment> {
  return employeesRepository.createEmployeeAttachment(data);
}

export async function softDeleteEmployeeAttachment(id: number): Promise<void> {
  await employeesRepository.deleteEmployeeAttachment(id);
}

export async function hardDeleteEmployeeAttachment(id: number): Promise<void> {
  await employeesRepository.deleteEmployeeAttachment(id);
}
