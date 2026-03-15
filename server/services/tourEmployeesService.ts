import type { Employee } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as employeesRepository from "../repositories/employeesRepository";
import * as toursRepository from "../repositories/toursRepository";
import { db } from "../db";
import { dispatchCalDavUpsert } from "./caldavSyncDispatcher";
import {
  previewEmployeeAvailabilityForDateRange,
  type ExcludedEmployee,
} from "./employeeAvailabilityService";

type CascadeConflictCode =
  | "VERSION_CONFLICT"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BUSINESS_CONFLICT"
  | "EMPLOYEE_OVERLAP_CONFLICT"
  | "AVAILABILITY_CONFLICT";

type CascadeConflictReason =
  | "EMPLOYEE_OVERLAP"
  | "EMPLOYEE_ABSENCE"
  | "EMPLOYEE_EXIT_DATE"
  | "ALREADY_ASSIGNED";

type CascadeSkipReason =
  | "ALREADY_ASSIGNED"
  | "NOT_ASSIGNED"
  | "HISTORICAL_APPOINTMENT"
  | "APPOINTMENT_NOT_ON_TOUR"
  | "EMPLOYEE_OVERLAP"
  | "EMPLOYEE_ABSENCE"
  | "EMPLOYEE_EXIT_DATE";

type CascadePreviewItem = {
  appointmentId: number;
  startDate: string;
  endDate: string | null;
  tourName: string | null;
  currentEmployees: Array<{ id: number; fullName: string }>;
  eligible: boolean;
  conflictReason: CascadeConflictReason | null;
};

type CascadeExecuteResult = {
  updatedAppointmentCount: number;
  skipped: Array<{ appointmentId: number; reason: CascadeSkipReason }>;
};

type TourAppointmentRow = Awaited<ReturnType<typeof appointmentsRepository.listSidebarAppointmentsByTourFromDate>>[number];

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export class TourEmployeesError extends Error {
  status: number;
  code: CascadeConflictCode;
  conflictEmployees?: Array<{ id: number; fullName: string }>;
  availabilityConflicts?: ExcludedEmployee[];

  constructor(
    status: number,
    code: CascadeConflictCode,
    options?: {
      conflictEmployees?: Array<{ id: number; fullName: string }>;
      availabilityConflicts?: ExcludedEmployee[];
    },
  ) {
    super(code);
    this.status = status;
    this.code = code;
    this.conflictEmployees = options?.conflictEmployees;
    this.availabilityConflicts = options?.availabilityConflicts;
  }
}

function getBerlinTodayDateString(): string {
  return berlinFormatter.format(new Date());
}

function formatDateOnly(input: string | Date): string {
  if (typeof input === "string") return input;
  return berlinFormatter.format(input);
}

function parseDateOnly(input: string): Date {
  const parsed = new Date(`${input}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new TourEmployeesError(422, "VALIDATION_ERROR");
  }
  return parsed;
}

function parseStartTimeHour(startTime: string | null): number | null {
  if (!startTime) return null;
  const hour = Number(startTime.split(":")[0]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function normalizeAppointmentIds(appointmentIds: number[]): number[] {
  return Array.from(new Set(appointmentIds.filter((id) => Number.isInteger(id) && id > 0)));
}

async function requireTour(tourId: number) {
  const tour = await toursRepository.getTour(tourId);
  if (!tour) throw new TourEmployeesError(404, "NOT_FOUND");
  return tour;
}

async function requireEmployee(employeeId: number) {
  const employee = await employeesRepository.getEmployee(employeeId);
  if (!employee) throw new TourEmployeesError(404, "NOT_FOUND");
  return employee;
}

function assertCascadeEmployeeForAdd(employee: Employee, tourId: number) {
  if (!employee.isActive) {
    throw new TourEmployeesError(409, "BUSINESS_CONFLICT");
  }
  if (employee.tourId !== null && employee.tourId !== tourId) {
    throw new TourEmployeesError(409, "BUSINESS_CONFLICT");
  }
  if (employee.tourId === tourId) {
    throw new TourEmployeesError(409, "BUSINESS_CONFLICT");
  }
}

function assertCascadeEmployeeForRemove(employee: Employee, tourId: number) {
  if (employee.tourId !== tourId) {
    throw new TourEmployeesError(409, "BUSINESS_CONFLICT");
  }
}

async function listFutureTourAppointments(tourId: number, todayBerlin: string): Promise<TourAppointmentRow[]> {
  return appointmentsRepository.listSidebarAppointmentsByTourFromDate(tourId, parseDateOnly(todayBerlin));
}

function groupCurrentEmployees(
  rows: Awaited<ReturnType<typeof appointmentsRepository.getAppointmentEmployeesByAppointmentIds>>,
): Map<number, Array<{ id: number; fullName: string }>> {
  const byAppointmentId = new Map<number, Array<{ id: number; fullName: string }>>();
  for (const row of rows) {
    const existing = byAppointmentId.get(row.appointmentId) ?? [];
    existing.push({ id: row.employee.id, fullName: row.employee.fullName });
    byAppointmentId.set(row.appointmentId, existing);
  }
  return byAppointmentId;
}

async function resolveAddPreviewConflictReason(
  tx: Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0],
  appointment: TourAppointmentRow["appointment"],
  employeeId: number,
  currentEmployees: Array<{ id: number; fullName: string }>,
): Promise<CascadeConflictReason | null> {
  const startDate = formatDateOnly(appointment.startDate);
  const endDate = appointment.endDate ? formatDateOnly(appointment.endDate) : null;

  if (currentEmployees.some((entry) => entry.id === employeeId)) {
    return "ALREADY_ASSIGNED";
  }

  const availability = await previewEmployeeAvailabilityForDateRange([employeeId], startDate, endDate);
  if (availability.unavailableEmployees.length > 0) {
    return availability.unavailableEmployees[0]?.reason === "exit_date" ? "EMPLOYEE_EXIT_DATE" : "EMPLOYEE_ABSENCE";
  }

  const conflictEmployees = await appointmentsRepository.getConflictingEmployeesTx(tx, {
    employeeIds: [employeeId],
    startDate: parseDateOnly(startDate),
    endDate: endDate ? parseDateOnly(endDate) : null,
    startTimeHour: parseStartTimeHour(appointment.startTime),
  });

  return conflictEmployees.length > 0 ? "EMPLOYEE_OVERLAP" : null;
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

export async function previewAddEmployeeCascade(tourId: number, employeeId: number): Promise<CascadePreviewItem[]> {
  const todayBerlin = getBerlinTodayDateString();
  await requireTour(tourId);
  const employee = await requireEmployee(employeeId);
  assertCascadeEmployeeForAdd(employee, tourId);

  const appointmentRows = await listFutureTourAppointments(tourId, todayBerlin);
  const appointmentIds = appointmentRows.map((row) => Number(row.appointment.id));
  const employeeRows = await appointmentsRepository.getAppointmentEmployeesByAppointmentIds(appointmentIds);
  const employeesByAppointmentId = groupCurrentEmployees(employeeRows);

  return appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const preview: CascadePreviewItem[] = [];
    for (const row of appointmentRows) {
      const currentEmployees = employeesByAppointmentId.get(Number(row.appointment.id)) ?? [];
      const conflictReason = await resolveAddPreviewConflictReason(tx, row.appointment, employeeId, currentEmployees);
      preview.push({
        appointmentId: Number(row.appointment.id),
        startDate: formatDateOnly(row.appointment.startDate),
        endDate: row.appointment.endDate ? formatDateOnly(row.appointment.endDate) : null,
        tourName: row.tour?.name ?? null,
        currentEmployees,
        eligible: conflictReason === null,
        conflictReason,
      });
    }
    return preview;
  });
}

export async function previewRemoveEmployeeCascade(tourId: number, employeeId: number): Promise<CascadePreviewItem[]> {
  const todayBerlin = getBerlinTodayDateString();
  await requireTour(tourId);
  const employee = await requireEmployee(employeeId);
  assertCascadeEmployeeForRemove(employee, tourId);

  const appointmentRows = await listFutureTourAppointments(tourId, todayBerlin);
  const appointmentIds = appointmentRows.map((row) => Number(row.appointment.id));
  const employeeRows = await appointmentsRepository.getAppointmentEmployeesByAppointmentIds(appointmentIds);
  const employeesByAppointmentId = groupCurrentEmployees(employeeRows);

  return appointmentRows
    .filter((row) => (employeesByAppointmentId.get(Number(row.appointment.id)) ?? []).some((entry) => entry.id === employeeId))
    .map((row) => ({
      appointmentId: Number(row.appointment.id),
      startDate: formatDateOnly(row.appointment.startDate),
      endDate: row.appointment.endDate ? formatDateOnly(row.appointment.endDate) : null,
      tourName: row.tour?.name ?? null,
      currentEmployees: employeesByAppointmentId.get(Number(row.appointment.id)) ?? [],
      eligible: true,
      conflictReason: null,
    }));
}

export async function executeAddEmployeeCascade(
  tourId: number,
  params: { employeeId: number; employeeVersion: number; selectedAppointmentIds: number[] },
): Promise<CascadeExecuteResult> {
  if (!Number.isInteger(params.employeeVersion) || params.employeeVersion < 1) {
    throw new TourEmployeesError(422, "VALIDATION_ERROR");
  }

  await requireTour(tourId);
  const employee = await requireEmployee(params.employeeId);
  assertCascadeEmployeeForAdd(employee, tourId);
  const appointmentIds = normalizeAppointmentIds(params.selectedAppointmentIds);
  const todayBerlin = getBerlinTodayDateString();
  const changedAppointmentIds: number[] = [];

  const result = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const updateResult = await employeesRepository.setEmployeeTourWithVersionTx(
      tx,
      params.employeeId,
      params.employeeVersion,
      tourId,
    );
    if (updateResult.kind === "version_conflict") {
      throw new TourEmployeesError(409, "VERSION_CONFLICT");
    }

    const skipped: Array<{ appointmentId: number; reason: CascadeSkipReason }> = [];

    for (const appointmentId of appointmentIds) {
      const appointment = await appointmentsRepository.getAppointmentWithEmployeesTx(tx, appointmentId);
      if (!appointment || appointment.tourId !== tourId) {
        skipped.push({ appointmentId, reason: "APPOINTMENT_NOT_ON_TOUR" });
        continue;
      }
      const appointmentStartDate = formatDateOnly(appointment.startDate);
      const appointmentEndDate = appointment.endDate ? formatDateOnly(appointment.endDate) : null;
      if (appointmentStartDate < todayBerlin) {
        skipped.push({ appointmentId, reason: "HISTORICAL_APPOINTMENT" });
        continue;
      }

      const availability = await previewEmployeeAvailabilityForDateRange(
        [params.employeeId],
        appointmentStartDate,
        appointmentEndDate,
      );
      if (availability.unavailableEmployees.length > 0) {
        skipped.push({
          appointmentId,
          reason: availability.unavailableEmployees[0]?.reason === "exit_date" ? "EMPLOYEE_EXIT_DATE" : "EMPLOYEE_ABSENCE",
        });
        continue;
      }

      const conflictEmployees = await appointmentsRepository.getConflictingEmployeesTx(tx, {
        employeeIds: [params.employeeId],
        startDate: parseDateOnly(appointmentStartDate),
        endDate: appointmentEndDate ? parseDateOnly(appointmentEndDate) : null,
        startTimeHour: parseStartTimeHour(appointment.startTime),
      });
      if (conflictEmployees.length > 0) {
        skipped.push({ appointmentId, reason: "EMPLOYEE_OVERLAP" });
        continue;
      }

      const existingEmployeeIds = appointment.employees.map((entry) => Number(entry.id));
      if (existingEmployeeIds.includes(params.employeeId)) {
        skipped.push({ appointmentId, reason: "ALREADY_ASSIGNED" });
        continue;
      }

      await appointmentsRepository.replaceAppointmentEmployeesTx(
        tx,
        appointmentId,
        [...existingEmployeeIds, params.employeeId],
      );
      changedAppointmentIds.push(appointmentId);
    }

    return {
      updatedAppointmentCount: changedAppointmentIds.length,
      skipped,
    };
  });

  for (const appointmentId of changedAppointmentIds) {
    dispatchCalDavUpsert(appointmentId);
  }

  return result;
}

export async function executeRemoveEmployeeCascade(
  tourId: number,
  params: { employeeId: number; employeeVersion: number; selectedAppointmentIds: number[] },
): Promise<CascadeExecuteResult> {
  if (!Number.isInteger(params.employeeVersion) || params.employeeVersion < 1) {
    throw new TourEmployeesError(422, "VALIDATION_ERROR");
  }

  await requireTour(tourId);
  const employee = await requireEmployee(params.employeeId);
  assertCascadeEmployeeForRemove(employee, tourId);
  const appointmentIds = normalizeAppointmentIds(params.selectedAppointmentIds);
  const todayBerlin = getBerlinTodayDateString();
  const changedAppointmentIds: number[] = [];

  const result = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const updateResult = await employeesRepository.setEmployeeTourWithVersionTx(
      tx,
      params.employeeId,
      params.employeeVersion,
      null,
    );
    if (updateResult.kind === "version_conflict") {
      throw new TourEmployeesError(409, "VERSION_CONFLICT");
    }

    const skipped: Array<{ appointmentId: number; reason: CascadeSkipReason }> = [];

    for (const appointmentId of appointmentIds) {
      const appointment = await appointmentsRepository.getAppointmentWithEmployeesTx(tx, appointmentId);
      if (!appointment || appointment.tourId !== tourId) {
        skipped.push({ appointmentId, reason: "APPOINTMENT_NOT_ON_TOUR" });
        continue;
      }
      if (formatDateOnly(appointment.startDate) < todayBerlin) {
        skipped.push({ appointmentId, reason: "HISTORICAL_APPOINTMENT" });
        continue;
      }

      const existingEmployeeIds = appointment.employees.map((entry) => Number(entry.id));
      if (!existingEmployeeIds.includes(params.employeeId)) {
        skipped.push({ appointmentId, reason: "NOT_ASSIGNED" });
        continue;
      }

      await appointmentsRepository.replaceAppointmentEmployeesTx(
        tx,
        appointmentId,
        existingEmployeeIds.filter((employeeId) => employeeId !== params.employeeId),
      );
      changedAppointmentIds.push(appointmentId);
    }

    return {
      updatedAppointmentCount: changedAppointmentIds.length,
      skipped,
    };
  });

  for (const appointmentId of changedAppointmentIds) {
    dispatchCalDavUpsert(appointmentId);
  }

  return result;
}
