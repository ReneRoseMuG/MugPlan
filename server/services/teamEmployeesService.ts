import type { Employee } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";

export async function listEmployeesByTeam(teamId: number): Promise<Employee[]> {
  return employeesRepository.getEmployeesByTeam(teamId);
}

export async function removeEmployeeFromTeam(employeeId: number): Promise<Employee | null> {
  return employeesRepository.setEmployeeTeam(employeeId, null);
}

export async function assignEmployeesToTeam(
  teamId: number,
  employeeIds: number[],
): Promise<Employee[]> {
  const currentEmployees = await employeesRepository.getEmployeesByTeam(teamId);
  const currentIds = currentEmployees.map((employee) => employee.id);
  const toRemove = currentIds.filter((id) => !employeeIds.includes(id));

  for (const employeeId of toRemove) {
    await employeesRepository.setEmployeeTeam(employeeId, null);
  }

  const results: Employee[] = [];
  for (const employeeId of employeeIds) {
    const employee = await employeesRepository.setEmployeeTeam(employeeId, teamId);
    if (employee) {
      results.push(employee);
    }
  }

  return results;
}
