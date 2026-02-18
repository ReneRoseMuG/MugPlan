import type { Employee, InsertEmployee, Team, Tour, UpdateEmployee } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";
import * as teamsRepository from "../repositories/teamsRepository";
import * as toursRepository from "../repositories/toursRepository";
import type { CanonicalRoleKey } from "../settings/registry";

export class EmployeesError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function resolveScope(roleKey: CanonicalRoleKey, requestedScope: "active" | "inactive"): "active" | "inactive" {
  if (roleKey !== "ADMIN") return "active";
  return requestedScope;
}

export async function listEmployees(roleKey: CanonicalRoleKey, scope: "active" | "inactive" = "active"): Promise<Employee[]> {
  return employeesRepository.getEmployees(resolveScope(roleKey, scope));
}

export async function getEmployeeWithRelations(
  id: number,
  roleKey: CanonicalRoleKey,
): Promise<{ employee: Employee; team: Team | null; tour: Tour | null } | null> {
  const employee = await employeesRepository.getEmployee(id);
  if (!employee) return null;
  if (roleKey !== "ADMIN" && !employee.isActive) return null;

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

export async function updateEmployee(
  id: number,
  data: UpdateEmployee & { version: number },
  roleKey: CanonicalRoleKey,
): Promise<Employee | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new EmployeesError(422, "VALIDATION_ERROR");
  }

  const existing = await employeesRepository.getEmployee(id);
  if (!existing) return null;
  if (roleKey !== "ADMIN" && !existing.isActive) return null;
  if (roleKey !== "ADMIN" && data.isActive !== undefined && data.isActive !== existing.isActive) {
    throw new EmployeesError(403, "FORBIDDEN");
  }

  let fullName = existing.fullName;
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
    const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
    fullName = `${lastName}, ${firstName}`;
  }

  const result = await employeesRepository.updateEmployeeWithVersion(id, data.version, { ...data, fullName });
  if (result.kind === "version_conflict") {
    const exists = await employeesRepository.getEmployee(id);
    if (!exists) return null;
    throw new EmployeesError(409, "VERSION_CONFLICT");
  }
  return result.employee;
}

export async function toggleEmployeeActive(
  id: number,
  isActive: boolean,
  version: number,
  roleKey: CanonicalRoleKey,
): Promise<Employee | null> {
  if (roleKey !== "ADMIN") {
    throw new EmployeesError(403, "FORBIDDEN");
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new EmployeesError(422, "VALIDATION_ERROR");
  }
  const result = await employeesRepository.toggleEmployeeActiveWithVersion(id, version, isActive);
  if (result.kind === "version_conflict") {
    const exists = await employeesRepository.getEmployee(id);
    if (!exists) return null;
    throw new EmployeesError(409, "VERSION_CONFLICT");
  }
  return result.employee;
}
