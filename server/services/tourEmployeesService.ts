import type { Employee } from "@shared/schema";
import * as employeesRepository from "../repositories/employeesRepository";
import { db } from "../db";

export class TourEmployeesError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function listEmployeesByTour(tourId: number): Promise<Employee[]> {
  return employeesRepository.getEmployeesByTour(tourId);
}

export async function removeEmployeeFromTour(employeeId: number, version: number): Promise<Employee | null> {
  if (!Number.isInteger(version) || version < 1) {
    throw new TourEmployeesError(422, "VALIDATION_ERROR");
  }
  const result = await employeesRepository.setEmployeeTourWithVersion(employeeId, version, null);
  if (result.kind === "version_conflict") {
    const exists = await employeesRepository.getEmployee(employeeId);
    if (!exists) return null;
    throw new TourEmployeesError(409, "VERSION_CONFLICT");
  }
  return result.employee;
}

export async function assignEmployeesToTour(
  tourId: number,
  items: Array<{ employeeId: number; version: number }>,
): Promise<Employee[]> {
  for (const item of items) {
    if (!Number.isInteger(item.version) || item.version < 1) {
      throw new TourEmployeesError(422, "VALIDATION_ERROR");
    }
  }

  return db.transaction(async () => {
    const results: Employee[] = [];
    for (const item of items) {
      const updated = await employeesRepository.setEmployeeTourWithVersion(item.employeeId, item.version, tourId);
      if (updated.kind === "version_conflict") {
        const exists = await employeesRepository.getEmployee(item.employeeId);
        if (!exists) {
          throw new TourEmployeesError(404, "NOT_FOUND");
        }
        throw new TourEmployeesError(409, "VERSION_CONFLICT");
      }
      results.push(updated.employee);
    }
    return results;
  });
}
