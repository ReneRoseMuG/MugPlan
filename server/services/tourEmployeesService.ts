import type { Employee } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";

export async function listEmployeesByTour(tourId: number): Promise<Employee[]> {
  return employeesRepository.getEmployeesByTour(tourId);
}

export async function removeEmployeeFromTour(employeeId: number): Promise<Employee | null> {
  return employeesRepository.setEmployeeTour(employeeId, null);
}

export async function assignEmployeesToTour(
  tourId: number,
  employeeIds: number[],
): Promise<Employee[]> {
  const currentEmployees = await employeesRepository.getEmployeesByTour(tourId);
  const currentIds = currentEmployees.map((employee) => employee.id);
  const toRemove = currentIds.filter((id) => !employeeIds.includes(id));

  for (const employeeId of toRemove) {
    await employeesRepository.setEmployeeTour(employeeId, null);
  }

  const results: Employee[] = [];
  for (const employeeId of employeeIds) {
    const employee = await employeesRepository.setEmployeeTour(employeeId, tourId);
    if (employee) {
      results.push(employee);
    }
  }

  return results;
}
