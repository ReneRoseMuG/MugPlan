import type { Employee } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";
import { db } from "../db";

export class TeamEmployeesError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function listEmployeesByTeam(teamId: number): Promise<Employee[]> {
  return employeesRepository.getEmployeesByTeam(teamId);
}

export async function removeEmployeeFromTeam(employeeId: number, version: number): Promise<Employee | null> {
  if (!Number.isInteger(version) || version < 1) {
    throw new TeamEmployeesError(422, "VALIDATION_ERROR");
  }
  const result = await employeesRepository.setEmployeeTeamWithVersion(employeeId, version, null);
  if (result.kind === "version_conflict") {
    const exists = await employeesRepository.getEmployee(employeeId);
    if (!exists) return null;
    throw new TeamEmployeesError(409, "VERSION_CONFLICT");
  }
  return result.employee;
}

export async function assignEmployeesToTeam(
  teamId: number,
  items: Array<{ employeeId: number; version: number }>,
): Promise<Employee[]> {
  for (const item of items) {
    if (!Number.isInteger(item.version) || item.version < 1) {
      throw new TeamEmployeesError(422, "VALIDATION_ERROR");
    }
  }

  return db.transaction(async () => {
    const results: Employee[] = [];
    for (const item of items) {
      const updated = await employeesRepository.setEmployeeTeamWithVersion(item.employeeId, item.version, teamId);
      if (updated.kind === "version_conflict") {
        const exists = await employeesRepository.getEmployee(item.employeeId);
        if (!exists) {
          throw new TeamEmployeesError(404, "NOT_FOUND");
        }
        throw new TeamEmployeesError(409, "VERSION_CONFLICT");
      }
      results.push(updated.employee);
    }
    return results;
  });
}
