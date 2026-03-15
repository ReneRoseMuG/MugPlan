import type { EmployeeAbsence, InsertEmployeeAbsence, UpdateEmployeeAbsence } from "@shared/schema";
import * as employeeAbsencesRepository from "../repositories/employeeAbsencesRepository";
import * as employeesRepository from "../repositories/employeesRepository";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import { previewEmployeeAvailabilityForDateRange } from "./employeeAvailabilityService";

type EmployeeAbsenceErrorCode = "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN";

export class EmployeeAbsencesError extends Error {
  status: number;
  code: EmployeeAbsenceErrorCode;

  constructor(status: number, code: EmployeeAbsenceErrorCode, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getBerlinTodayDateString(): string {
  return berlinFormatter.format(new Date());
}

function parseDateOnly(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }

  const normalized = [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");

  if (normalized !== value) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }

  return value;
}

function requireEmployeeAbsenceRole(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
    throw new EmployeeAbsencesError(403, "FORBIDDEN");
  }
}

async function getAccessibleEmployee(employeeId: number, roleKey: CanonicalRoleKey) {
  const employee = await employeesRepository.getEmployee(employeeId);
  if (!employee) return null;
  if (roleKey !== "ADMIN" && !employee.isActive) return null;
  return employee;
}

function validateCreateOrUpdateDates(from: string, until: string): void {
  const normalizedFrom = parseDateOnly(from);
  const normalizedUntil = parseDateOnly(until);
  const today = getBerlinTodayDateString();

  if (normalizedFrom < today) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }
  if (normalizedUntil < normalizedFrom) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }
}

function assertMutableExistingAbsence(absence: EmployeeAbsence): void {
  if (parseDateOnly(absence.from) < getBerlinTodayDateString()) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }
}

function isVisibleAbsenceForRole(absence: EmployeeAbsence, roleKey: CanonicalRoleKey): boolean {
  if (roleKey === "ADMIN") return true;
  return parseDateOnly(absence.until) >= getBerlinTodayDateString();
}

export type EmployeeAbsenceAffectedAppointment = {
  appointmentId: number;
  startDate: string;
  tourName: string | null;
  employees: Array<{ id: number; fullName: string }>;
};

async function getExistingAbsenceOrThrow(
  employeeId: number,
  absenceId: number,
  roleKey: CanonicalRoleKey,
): Promise<EmployeeAbsence> {
  requireEmployeeAbsenceRole(roleKey);
  const employee = await getAccessibleEmployee(employeeId, roleKey);
  if (!employee) {
    throw new EmployeeAbsencesError(404, "NOT_FOUND");
  }

  const existing = await employeeAbsencesRepository.getEmployeeAbsence(employeeId, absenceId);
  if (!existing) {
    throw new EmployeeAbsencesError(404, "NOT_FOUND");
  }
  if (!isVisibleAbsenceForRole(existing, roleKey)) {
    throw new EmployeeAbsencesError(404, "NOT_FOUND");
  }
  return existing;
}

export async function listEmployeeAbsences(
  employeeId: number,
  roleKey: CanonicalRoleKey,
): Promise<EmployeeAbsence[]> {
  requireEmployeeAbsenceRole(roleKey);
  const employee = await getAccessibleEmployee(employeeId, roleKey);
  if (!employee) {
    throw new EmployeeAbsencesError(404, "NOT_FOUND");
  }
  const absences = await employeeAbsencesRepository.listEmployeeAbsences(employeeId);
  return absences.filter((absence) => isVisibleAbsenceForRole(absence, roleKey));
}

export async function getEmployeeAbsence(
  employeeId: number,
  absenceId: number,
  roleKey: CanonicalRoleKey,
): Promise<EmployeeAbsence | null> {
  requireEmployeeAbsenceRole(roleKey);
  const employee = await getAccessibleEmployee(employeeId, roleKey);
  if (!employee) {
    throw new EmployeeAbsencesError(404, "NOT_FOUND");
  }

  const absence = await employeeAbsencesRepository.getEmployeeAbsence(employeeId, absenceId);
  if (!absence) return null;
  return isVisibleAbsenceForRole(absence, roleKey) ? absence : null;
}

export async function createEmployeeAbsence(
  employeeId: number,
  data: InsertEmployeeAbsence,
  roleKey: CanonicalRoleKey,
): Promise<EmployeeAbsence> {
  requireEmployeeAbsenceRole(roleKey);
  const employee = await getAccessibleEmployee(employeeId, roleKey);
  if (!employee) {
    throw new EmployeeAbsencesError(404, "NOT_FOUND");
  }
  if (!employee.isActive) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }

  validateCreateOrUpdateDates(data.from, data.until);
  return employeeAbsencesRepository.createEmployeeAbsence(employeeId, data);
}

export async function updateEmployeeAbsence(
  employeeId: number,
  absenceId: number,
  data: UpdateEmployeeAbsence & { version: number },
  roleKey: CanonicalRoleKey,
): Promise<EmployeeAbsence | null> {
  requireEmployeeAbsenceRole(roleKey);
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }

  const employee = await getAccessibleEmployee(employeeId, roleKey);
  if (!employee) {
    throw new EmployeeAbsencesError(404, "NOT_FOUND");
  }

  const existing = await employeeAbsencesRepository.getEmployeeAbsence(employeeId, absenceId);
  if (!existing) return null;

  assertMutableExistingAbsence(existing);

  const nextFrom = data.from ?? existing.from;
  const nextUntil = data.until ?? existing.until;
  validateCreateOrUpdateDates(nextFrom, nextUntil);

  const result = await employeeAbsencesRepository.updateEmployeeAbsenceWithVersion(employeeId, absenceId, data.version, data);
  if (result.kind === "version_conflict") {
    const stillExists = await employeeAbsencesRepository.getEmployeeAbsence(employeeId, absenceId);
    if (!stillExists) return null;
    throw new EmployeeAbsencesError(409, "VERSION_CONFLICT");
  }

  return result.absence;
}

export async function deleteEmployeeAbsence(
  employeeId: number,
  absenceId: number,
  version: number,
  roleKey: CanonicalRoleKey,
): Promise<boolean> {
  requireEmployeeAbsenceRole(roleKey);
  if (!Number.isInteger(version) || version < 1) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }

  const employee = await getAccessibleEmployee(employeeId, roleKey);
  if (!employee) {
    throw new EmployeeAbsencesError(404, "NOT_FOUND");
  }

  const existing = await employeeAbsencesRepository.getEmployeeAbsence(employeeId, absenceId);
  if (!existing) return false;

  assertMutableExistingAbsence(existing);

  const result = await employeeAbsencesRepository.deleteEmployeeAbsenceWithVersion(employeeId, absenceId, version);
  if (result.kind === "version_conflict") {
    const stillExists = await employeeAbsencesRepository.getEmployeeAbsence(employeeId, absenceId);
    if (!stillExists) return false;
    throw new EmployeeAbsencesError(409, "VERSION_CONFLICT");
  }

  return true;
}

export async function previewAffectedAppointments(
  employeeId: number,
  absenceId: number,
  roleKey: CanonicalRoleKey,
): Promise<EmployeeAbsenceAffectedAppointment[]> {
  const absence = await getExistingAbsenceOrThrow(employeeId, absenceId, roleKey);
  const rows = await employeeAbsencesRepository.listAffectedFutureAppointments(employeeId, {
    from: absence.from,
    until: absence.until,
    today: getBerlinTodayDateString(),
  });

  const employeesByAppointment = await appointmentsRepository.getAppointmentEmployeesByAppointmentIds(
    rows.map((row) => row.appointmentId),
  );
  const employeesByAppointmentId = new Map<number, Array<{ id: number; fullName: string }>>();
  for (const row of employeesByAppointment) {
    const current = employeesByAppointmentId.get(row.appointmentId) ?? [];
    current.push({ id: row.employee.id, fullName: row.employee.fullName });
    employeesByAppointmentId.set(row.appointmentId, current);
  }

  return rows.map((row) => ({
    appointmentId: row.appointmentId,
    startDate: row.startDate instanceof Date ? row.startDate.toISOString().slice(0, 10) : String(row.startDate).slice(0, 10),
    tourName: row.tourName ?? null,
    employees: employeesByAppointmentId.get(row.appointmentId) ?? [],
  }));
}

export async function bulkReplaceAffectedAppointments(
  employeeId: number,
  absenceId: number,
  replacementEmployeeId: number,
  roleKey: CanonicalRoleKey,
): Promise<{ absenceId: number; updatedAppointmentCount: number; skippedAlreadyAssignedCount: number }> {
  const absence = await getExistingAbsenceOrThrow(employeeId, absenceId, roleKey);
  if (!Number.isInteger(replacementEmployeeId) || replacementEmployeeId < 1 || replacementEmployeeId === employeeId) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }

  const replacementEmployee = await employeesRepository.getEmployee(replacementEmployeeId);
  if (!replacementEmployee || !replacementEmployee.isActive) {
    throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
  }

  return appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const rows = await employeeAbsencesRepository.listAffectedFutureAppointmentsTx(tx, employeeId, {
      from: absence.from,
      until: absence.until,
      today: getBerlinTodayDateString(),
      replacementEmployeeId,
    });

    for (const row of rows) {
      const rowStartDate = row.startDate instanceof Date ? row.startDate.toISOString().slice(0, 10) : String(row.startDate).slice(0, 10);
      const rowEndDate = row.endDate instanceof Date
        ? row.endDate.toISOString().slice(0, 10)
        : row.endDate
          ? String(row.endDate).slice(0, 10)
          : null;
      const preview = await previewEmployeeAvailabilityForDateRange(
        [replacementEmployeeId],
        rowStartDate,
        rowEndDate,
      );
      if (preview.unavailableEmployees.length > 0) {
        throw new EmployeeAbsencesError(422, "VALIDATION_ERROR");
      }
    }

    let updatedAppointmentCount = 0;
    let skippedAlreadyAssignedCount = 0;

    for (const row of rows) {
      await employeeAbsencesRepository.removeEmployeeFromAppointmentTx(tx, row.appointmentId, employeeId);
      if (Number(row.replacementAlreadyAssigned ?? 0) > 0) {
        skippedAlreadyAssignedCount += 1;
        continue;
      }

      await employeeAbsencesRepository.addEmployeeToAppointmentTx(tx, row.appointmentId, replacementEmployeeId);
      updatedAppointmentCount += 1;
    }

    return {
      absenceId,
      updatedAppointmentCount,
      skippedAlreadyAssignedCount,
    };
  });
}
