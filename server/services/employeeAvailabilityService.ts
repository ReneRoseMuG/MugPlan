import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { employeeAbsences, employees } from "@shared/schema";

export type EmployeeAvailabilityReason = "absence" | "exit_date";

export type ExcludedEmployee = {
  id: number;
  fullName: string;
  reason: EmployeeAvailabilityReason;
};

export type EmployeeAvailabilityPreview = {
  availableEmployeeIds: number[];
  unavailableEmployees: ExcludedEmployee[];
};

function normalizeEmployeeIds(employeeIds: number[]): number[] {
  return Array.from(new Set(employeeIds.filter((id) => Number.isFinite(id) && id > 0)));
}

export async function getExcludedEmployeesForDate(
  employeeIds: number[],
  appointmentDate: string,
): Promise<ExcludedEmployee[]> {
  const normalizedEmployeeIds = normalizeEmployeeIds(employeeIds);
  if (normalizedEmployeeIds.length === 0) return [];

  const rows = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      exitDate: employees.exitDate,
      absenceId: employeeAbsences.id,
    })
    .from(employees)
    .leftJoin(
      employeeAbsences,
      and(
        eq(employeeAbsences.employeeId, employees.id),
        lte(employeeAbsences.from, appointmentDate),
        gte(employeeAbsences.until, appointmentDate),
      ),
    )
    .where(
      and(
        inArray(employees.id, normalizedEmployeeIds),
        or(
          sql`${employees.exitDate} is not null and ${employees.exitDate} <= ${appointmentDate}`,
          sql`${employeeAbsences.id} is not null`,
        ),
      ),
    )
    .orderBy(asc(employees.id));

  const excludedById = new Map<number, ExcludedEmployee>();
  for (const row of rows) {
    if (excludedById.has(row.id)) continue;
    excludedById.set(row.id, {
      id: row.id,
      fullName: row.fullName,
      reason: row.absenceId != null ? "absence" : "exit_date",
    });
  }

  return Array.from(excludedById.values());
}

export async function filterAvailableEmployeeIdsForDate(
  employeeIds: number[],
  appointmentDate: string,
): Promise<{ employeeIds: number[]; excludedEmployees: ExcludedEmployee[] }> {
  const normalizedEmployeeIds = normalizeEmployeeIds(employeeIds);
  if (normalizedEmployeeIds.length === 0) {
    return { employeeIds: [], excludedEmployees: [] };
  }

  const excludedEmployees = await getExcludedEmployeesForDate(normalizedEmployeeIds, appointmentDate);
  const excludedIds = new Set(excludedEmployees.map((employee) => employee.id));

  return {
    employeeIds: normalizedEmployeeIds.filter((employeeId) => !excludedIds.has(employeeId)),
    excludedEmployees,
  };
}

export async function previewEmployeeAvailabilityForDate(
  employeeIds: number[],
  appointmentDate: string,
): Promise<EmployeeAvailabilityPreview> {
  const normalizedEmployeeIds = normalizeEmployeeIds(employeeIds);
  if (normalizedEmployeeIds.length === 0) {
    return { availableEmployeeIds: [], unavailableEmployees: [] };
  }

  const unavailableEmployees = await getExcludedEmployeesForDate(normalizedEmployeeIds, appointmentDate);
  const unavailableIds = new Set(unavailableEmployees.map((employee) => employee.id));

  return {
    availableEmployeeIds: normalizedEmployeeIds.filter((employeeId) => !unavailableIds.has(employeeId)),
    unavailableEmployees,
  };
}

export async function assertEmployeeAvailableOnDate(employeeId: number, appointmentDate: string): Promise<void> {
  const excludedEmployees = await getExcludedEmployeesForDate([employeeId], appointmentDate);
  if (excludedEmployees.length > 0) {
    throw new Error("EMPLOYEE_NOT_AVAILABLE");
  }
}
