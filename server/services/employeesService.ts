import type { Employee, InsertEmployee, Team, Tour, UpdateEmployee } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";
import * as teamsRepository from "../repositories/teamsRepository";
import * as toursRepository from "../repositories/toursRepository";

export async function listEmployees(filter: "active" | "inactive" | "all" = "active"): Promise<Employee[]> {
  return employeesRepository.getEmployees(filter);
}

export async function getEmployeeWithRelations(
  id: number,
): Promise<{ employee: Employee; team: Team | null; tour: Tour | null } | null> {
  const employee = await employeesRepository.getEmployee(id);
  if (!employee) return null;

  let team: Team | null = null;
  let tour: Tour | null = null;

  if (employee.teamId) {
    team = await teamsRepository.getTeam(employee.teamId);
  }

  if (employee.tourId) {
    tour = await toursRepository.getTour(employee.tourId);
  }

  return { employee, team, tour };
}

export async function createEmployee(data: InsertEmployee): Promise<Employee> {
  const fullName = `${data.lastName}, ${data.firstName}`;
  return employeesRepository.createEmployee({ ...data, fullName });
}

export async function updateEmployee(id: number, data: UpdateEmployee): Promise<Employee | null> {
  const existing = await employeesRepository.getEmployee(id);
  if (!existing) return null;

  let fullName = existing.fullName;
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
    const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
    fullName = `${lastName}, ${firstName}`;
  }

  return employeesRepository.updateEmployee(id, { ...data, fullName });
}

export async function toggleEmployeeActive(id: number, isActive: boolean): Promise<Employee | null> {
  return employeesRepository.toggleEmployeeActive(id, isActive);
}
