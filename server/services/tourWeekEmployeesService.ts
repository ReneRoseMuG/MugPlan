import { addDays, addWeeks, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import type { Employee } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as employeesRepository from "../repositories/employeesRepository";
import * as tourWeekEmployeesRepository from "../repositories/tourWeekEmployeesRepository";
import * as toursRepository from "../repositories/toursRepository";
import * as userSettingsService from "./userSettingsService";
import { dispatchCalDavUpsert } from "./caldavSyncDispatcher";
import { hasAppointmentCancellationTag } from "../lib/appointmentCancellation";

type WeekEmployeeConflictCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BUSINESS_CONFLICT"
  | "PAST_WEEK_READONLY";

type WeekExecuteSkipReason =
  | "ALREADY_ASSIGNED"
  | "NOT_ASSIGNED"
  | "APPOINTMENT_NOT_IN_WEEK"
  | "EMPLOYEE_OVERLAP";

type AppointmentEmployeePreviewStatus =
  | "will_add"
  | "conflict"
  | "already_present"
  | "current_only";

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export class TourWeekEmployeesError extends Error {
  status: number;
  code: WeekEmployeeConflictCode;

  constructor(status: number, code: WeekEmployeeConflictCode, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

function getBerlinDateString(date: Date): string {
  return berlinFormatter.format(date);
}

function getBerlinTodayDateString(): string {
  return getBerlinDateString(new Date());
}

function parseDateOnly(input: string): Date {
  const parsed = new Date(`${input}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new TourWeekEmployeesError(422, "VALIDATION_ERROR", "Ungueltiges Datum");
  }
  return parsed;
}

function toDateOnlyString(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === "string") return input.slice(0, 10);
  return getBerlinDateString(input);
}

function parseStartTimeHour(startTime: string | null | undefined): number | null {
  if (!startTime) return null;
  const hour = Number(startTime.split(":")[0]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new TourWeekEmployeesError(422, "VALIDATION_ERROR", "Ungueltige Startzeit");
  }
  return hour;
}

function normalizeAppointmentIds(appointmentIds: number[]): number[] {
  return Array.from(new Set(appointmentIds.filter((id) => Number.isInteger(id) && id > 0)));
}

export function resolveIsoWeekWindow(isoYear: number, isoWeek: number): {
  isoYear: number;
  isoWeek: number;
  weekStart: Date;
  weekEnd: Date;
  weekStartDate: string;
  weekEndDate: string;
} {
  const isoAnchor = new Date(Date.UTC(isoYear, 0, 4, 12, 0, 0));
  const firstWeekStart = startOfISOWeek(isoAnchor);
  const weekStart = addWeeks(firstWeekStart, isoWeek - 1);
  const resolvedIsoYear = getISOWeekYear(weekStart);
  const resolvedIsoWeek = getISOWeek(weekStart);

  if (resolvedIsoYear !== isoYear || resolvedIsoWeek !== isoWeek) {
    throw new TourWeekEmployeesError(422, "VALIDATION_ERROR", "Ungueltige ISO-Woche");
  }

  const weekEnd = addDays(weekStart, 6);
  return {
    isoYear,
    isoWeek,
    weekStart,
    weekEnd,
    weekStartDate: getBerlinDateString(weekStart),
    weekEndDate: getBerlinDateString(weekEnd),
  };
}

function resolveIsoWeekFromDate(dateInput: string): {
  isoYear: number;
  isoWeek: number;
  weekStart: Date;
  weekEnd: Date;
  weekStartDate: string;
  weekEndDate: string;
} {
  const parsedDate = parseDateOnly(dateInput);
  return resolveIsoWeekWindow(getISOWeekYear(parsedDate), getISOWeek(parsedDate));
}

export function isWeekLocked(isoYear: number, isoWeek: number, todayBerlin = getBerlinTodayDateString()): boolean {
  const targetWeek = resolveIsoWeekWindow(isoYear, isoWeek);
  const todayWeek = resolveIsoWeekFromDate(todayBerlin);
  return targetWeek.weekStartDate <= todayWeek.weekStartDate;
}

function assertWeekEditable(isoYear: number, isoWeek: number): void {
  if (isWeekLocked(isoYear, isoWeek)) {
    throw new TourWeekEmployeesError(409, "PAST_WEEK_READONLY", "Laufende und vergangene Wochen sind schreibgeschuetzt");
  }
}

async function requireTour(tourId: number) {
  const tour = await toursRepository.getTour(tourId);
  if (!tour) {
    throw new TourWeekEmployeesError(404, "NOT_FOUND", "Tour nicht gefunden");
  }
  return tour;
}

async function requireEmployee(employeeId: number): Promise<Employee> {
  const employee = await employeesRepository.getEmployee(employeeId);
  if (!employee) {
    throw new TourWeekEmployeesError(404, "NOT_FOUND", "Mitarbeiter nicht gefunden");
  }
  return employee;
}

function assertWeekAssignmentEmployee(employee: Employee): void {
  if (!employee.isActive) {
    throw new TourWeekEmployeesError(409, "BUSINESS_CONFLICT", "Inaktive Mitarbeiter koennen keiner Wochenplanung zugewiesen werden");
  }
}

async function assertWeekUniqueAssignment(
  tourId: number,
  employeeId: number,
  isoYear: number,
  isoWeek: number,
): Promise<{ existingAssignmentId: number | null }> {
  const existingAssignment = await tourWeekEmployeesRepository.getAssignmentForEmployeeWeek(employeeId, isoYear, isoWeek);
  if (!existingAssignment) {
    return { existingAssignmentId: null };
  }
  if (existingAssignment.tourId !== tourId) {
    throw new TourWeekEmployeesError(
      409,
      "BUSINESS_CONFLICT",
      `Mitarbeiter ist in KW ${isoWeek}/${isoYear} bereits Tour "${existingAssignment.tourName}" zugeordnet`,
    );
  }
  return { existingAssignmentId: existingAssignment.assignmentId };
}

async function getMinimumEmployeesThreshold(): Promise<number> {
  const settingValue = await userSettingsService.getGlobalSettingValue("monitoring.tr01.minimumEmployees");
  return typeof settingValue === "number" && settingValue > 0 ? settingValue : 1;
}

async function filterCancelledAppointments(
  rows: tourWeekEmployeesRepository.TourWeekAppointmentRow[],
): Promise<tourWeekEmployeesRepository.TourWeekAppointmentRow[]> {
  if (rows.length === 0) return rows;
  const tagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds(
    rows.map((row) => row.appointmentId),
  );
  return rows.filter((row) => !hasAppointmentCancellationTag(tagsByAppointmentId.get(row.appointmentId) ?? []));
}

async function listWeekAppointments(tourId: number, isoYear: number, isoWeek: number) {
  const week = resolveIsoWeekWindow(isoYear, isoWeek);
  const rows = await tourWeekEmployeesRepository.listAppointmentsByTourAndDateRange(tourId, {
    fromDate: week.weekStart,
    toDate: week.weekEnd,
  });
  return {
    week,
    appointments: await filterCancelledAppointments(rows),
  };
}

async function buildAddPreviewItems(
  employeeId: number,
  appointments: tourWeekEmployeesRepository.TourWeekAppointmentRow[],
) {
  const appointmentIds = appointments.map((row) => row.appointmentId);
  const assignedAppointmentIds = new Set(
    await tourWeekEmployeesRepository.listAssignedAppointmentIdsForEmployee(employeeId, appointmentIds),
  );

  return appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const items = [];

    for (const appointment of appointments) {
      const startDate = toDateOnlyString(appointment.startDate);
      if (!startDate) {
        throw new TourWeekEmployeesError(422, "VALIDATION_ERROR", "Termin ohne Startdatum");
      }

      if (assignedAppointmentIds.has(appointment.appointmentId)) {
        items.push({
          appointmentId: appointment.appointmentId,
          startDate,
          endDate: toDateOnlyString(appointment.endDate),
          projectName: appointment.projectName,
          customerName: appointment.customerName,
          status: "already_assigned" as const,
          selectable: false,
          conflictReason: "ALREADY_ASSIGNED",
        });
        continue;
      }

      const conflictEmployees = await appointmentsRepository.getConflictingEmployeesTx(tx, {
        employeeIds: [employeeId],
        startDate: parseDateOnly(startDate),
        endDate: appointment.endDate ? parseDateOnly(toDateOnlyString(appointment.endDate) ?? startDate) : null,
        startTimeHour: parseStartTimeHour(appointment.startTime),
      });

      const hasConflict = conflictEmployees.length > 0;
      items.push({
        appointmentId: appointment.appointmentId,
        startDate,
        endDate: toDateOnlyString(appointment.endDate),
        projectName: appointment.projectName,
        customerName: appointment.customerName,
        status: hasConflict ? "conflict" as const : "will_add" as const,
        selectable: !hasConflict,
        conflictReason: hasConflict ? "EMPLOYEE_OVERLAP" : null,
      });
    }

    return items;
  });
}

function buildCurrentOnlyPreviewItems(
  currentEmployees: Array<{ id: number; fullName: string }>,
  weekEmployeeIds: Set<number>,
) {
  return currentEmployees
    .filter((employee) => !weekEmployeeIds.has(employee.id))
    .map((employee) => ({
      employeeId: employee.id,
      employeeName: employee.fullName,
      status: "current_only" as const,
      selectable: false,
      conflictReason: null,
    }));
}

async function buildAppointmentEmployeePreview(
  params: {
    appointmentId?: number;
    tourId: number | null;
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    currentEmployees: Array<{ id: number; fullName: string }>;
  },
): Promise<{
  isoYear: number;
  isoWeek: number;
  hasWeekPlan: boolean;
  currentEmployeeIds: number[];
  items: Array<{
    employeeId: number;
    employeeName: string;
    status: AppointmentEmployeePreviewStatus;
    selectable: boolean;
    conflictReason: string | null;
  }>;
}> {
  const week = resolveIsoWeekFromDate(params.startDate);
  const currentEmployeeIds = params.currentEmployees.map((employee) => employee.id);

  if (!params.tourId) {
    return {
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      hasWeekPlan: false,
      currentEmployeeIds,
      items: buildCurrentOnlyPreviewItems(params.currentEmployees, new Set()),
    };
  }

  const weekAssignments = await tourWeekEmployeesRepository.listAssignmentsByTourAndWeek(
    params.tourId,
    week.isoYear,
    week.isoWeek,
  );

  if (weekAssignments.length === 0) {
    return {
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      hasWeekPlan: false,
      currentEmployeeIds,
      items: buildCurrentOnlyPreviewItems(params.currentEmployees, new Set()),
    };
  }

  const weekEmployeeIds = new Set(weekAssignments.map((assignment) => assignment.employeeId));
  const items = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const nextItems: Array<{
      employeeId: number;
      employeeName: string;
      status: AppointmentEmployeePreviewStatus;
      selectable: boolean;
      conflictReason: string | null;
    }> = [];

    for (const assignment of weekAssignments) {
      if (currentEmployeeIds.includes(assignment.employeeId)) {
        nextItems.push({
          employeeId: assignment.employeeId,
          employeeName: assignment.fullName,
          status: "already_present",
          selectable: false,
          conflictReason: null,
        });
        continue;
      }

      const conflictEmployees = await appointmentsRepository.getConflictingEmployeesTx(tx, {
        employeeIds: [assignment.employeeId],
        startDate: parseDateOnly(params.startDate),
        endDate: params.endDate ? parseDateOnly(params.endDate) : null,
        startTimeHour: parseStartTimeHour(params.startTime),
        excludeAppointmentId: params.appointmentId,
      });

      const hasConflict = conflictEmployees.length > 0;
      nextItems.push({
        employeeId: assignment.employeeId,
        employeeName: assignment.fullName,
        status: hasConflict ? "conflict" : "will_add",
        selectable: !hasConflict,
        conflictReason: hasConflict ? "EMPLOYEE_OVERLAP" : null,
      });
    }

    return nextItems;
  });

  return {
    isoYear: week.isoYear,
    isoWeek: week.isoWeek,
    hasWeekPlan: true,
    currentEmployeeIds,
    items: [...items, ...buildCurrentOnlyPreviewItems(params.currentEmployees, weekEmployeeIds)],
  };
}

export async function listWeekEmployeesByTour(tourId: number) {
  await requireTour(tourId);
  const assignments = await tourWeekEmployeesRepository.listAssignmentsByTour(tourId);
  const grouped = new Map<number, {
    isoYear: number;
    isoWeek: number;
    weekStartDate: string;
    weekEndDate: string;
    isLocked: boolean;
    employees: Array<{ assignmentId: number; employeeId: number; fullName: string }>;
  }>();

  for (const assignment of assignments) {
    const week = resolveIsoWeekWindow(assignment.isoYear, assignment.isoWeek);
    const key = assignment.isoYear * 100 + assignment.isoWeek;
    const existing = grouped.get(key) ?? {
      isoYear: assignment.isoYear,
      isoWeek: assignment.isoWeek,
      weekStartDate: week.weekStartDate,
      weekEndDate: week.weekEndDate,
      isLocked: isWeekLocked(assignment.isoYear, assignment.isoWeek),
      employees: [],
    };

    existing.employees.push({
      assignmentId: assignment.assignmentId,
      employeeId: assignment.employeeId,
      fullName: assignment.fullName,
    });
    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.isoYear !== right.isoYear) return left.isoYear - right.isoYear;
    return left.isoWeek - right.isoWeek;
  });
}

export async function previewAddWeekEmployee(
  tourId: number,
  params: { isoYear: number; isoWeek: number; employeeId: number },
) {
  await requireTour(tourId);
  const employee = await requireEmployee(params.employeeId);
  assertWeekAssignmentEmployee(employee);
  assertWeekEditable(params.isoYear, params.isoWeek);
  const week = resolveIsoWeekWindow(params.isoYear, params.isoWeek);
  await assertWeekUniqueAssignment(tourId, params.employeeId, params.isoYear, params.isoWeek);

  const { appointments } = await listWeekAppointments(tourId, params.isoYear, params.isoWeek);
  const items = await buildAddPreviewItems(params.employeeId, appointments);

  return {
    isoYear: week.isoYear,
    isoWeek: week.isoWeek,
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    employee: {
      employeeId: employee.id,
      fullName: employee.fullName,
    },
    items,
  };
}

export async function executeAddWeekEmployee(
  tourId: number,
  params: { isoYear: number; isoWeek: number; employeeId?: number; selectedAppointmentIds: number[] },
) {
  if (typeof params.employeeId !== "number") {
    throw new TourWeekEmployeesError(422, "VALIDATION_ERROR", "Mitarbeiter fehlt");
  }

  await requireTour(tourId);
  const employee = await requireEmployee(params.employeeId);
  assertWeekAssignmentEmployee(employee);
  assertWeekEditable(params.isoYear, params.isoWeek);

  const selectedAppointmentIds = normalizeAppointmentIds(params.selectedAppointmentIds);
  const weekAppointmentsResult = await listWeekAppointments(tourId, params.isoYear, params.isoWeek);
  const allowedAppointmentIds = new Set(weekAppointmentsResult.appointments.map((appointment) => appointment.appointmentId));
  const changedAppointmentIds: number[] = [];

  const result = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const uniqueCheck = await assertWeekUniqueAssignment(tourId, params.employeeId!, params.isoYear, params.isoWeek);
    let assignmentId = uniqueCheck.existingAssignmentId;
    if (!assignmentId) {
      try {
        assignmentId = await tourWeekEmployeesRepository.createAssignmentTx(tx, {
          tourId,
          isoYear: params.isoYear,
          isoWeek: params.isoWeek,
          employeeId: params.employeeId!,
        });
      } catch (error) {
        const retryCheck = await assertWeekUniqueAssignment(tourId, params.employeeId!, params.isoYear, params.isoWeek);
        if (!retryCheck.existingAssignmentId) {
          throw error;
        }
        assignmentId = retryCheck.existingAssignmentId;
      }
    }

    const skipped: Array<{ appointmentId: number; reason: WeekExecuteSkipReason }> = [];

    for (const appointmentId of selectedAppointmentIds) {
      if (!allowedAppointmentIds.has(appointmentId)) {
        skipped.push({ appointmentId, reason: "APPOINTMENT_NOT_IN_WEEK" });
        continue;
      }

      const appointment = await appointmentsRepository.getAppointmentWithEmployeesTx(tx, appointmentId);
      if (!appointment || appointment.tourId !== tourId) {
        skipped.push({ appointmentId, reason: "APPOINTMENT_NOT_IN_WEEK" });
        continue;
      }

      const existingEmployeeIds = appointment.employees.map((entry) => Number(entry.id));
      if (existingEmployeeIds.includes(params.employeeId!)) {
        skipped.push({ appointmentId, reason: "ALREADY_ASSIGNED" });
        continue;
      }

      const appointmentStartDate = toDateOnlyString(appointment.startDate);
      if (!appointmentStartDate) {
        throw new TourWeekEmployeesError(422, "VALIDATION_ERROR", "Termin ohne Startdatum");
      }

      const conflictEmployees = await appointmentsRepository.getConflictingEmployeesTx(tx, {
        employeeIds: [params.employeeId!],
        startDate: parseDateOnly(appointmentStartDate),
        endDate: appointment.endDate ? parseDateOnly(toDateOnlyString(appointment.endDate) ?? appointmentStartDate) : null,
        startTimeHour: parseStartTimeHour(appointment.startTime),
      });

      if (conflictEmployees.length > 0) {
        skipped.push({ appointmentId, reason: "EMPLOYEE_OVERLAP" });
        continue;
      }

      await appointmentsRepository.replaceAppointmentEmployeesTx(tx, appointmentId, [...existingEmployeeIds, params.employeeId!]);
      const versionResult = await appointmentsRepository.bumpAppointmentVersionTx(tx, {
        appointmentId,
        expectedVersion: Number(appointment.version),
      });
      if (versionResult.kind === "version_conflict") {
        throw new TourWeekEmployeesError(409, "BUSINESS_CONFLICT", "Termin wurde zwischenzeitlich geaendert");
      }
      changedAppointmentIds.push(appointmentId);
    }

    return {
      assignmentId,
      updatedAppointmentCount: changedAppointmentIds.length,
      skipped,
    };
  });

  for (const appointmentId of changedAppointmentIds) {
    dispatchCalDavUpsert(appointmentId);
  }

  return result;
}

export async function previewRemoveWeekEmployee(
  tourId: number,
  params: { assignmentId: number },
) {
  await requireTour(tourId);
  const assignment = await tourWeekEmployeesRepository.getAssignmentById(params.assignmentId);
  if (!assignment || assignment.tourId !== tourId) {
    throw new TourWeekEmployeesError(404, "NOT_FOUND", "Wochenzuordnung nicht gefunden");
  }
  assertWeekEditable(assignment.isoYear, assignment.isoWeek);

  const [{ appointments }, minimumEmployees] = await Promise.all([
    listWeekAppointments(tourId, assignment.isoYear, assignment.isoWeek),
    getMinimumEmployeesThreshold(),
  ]);

  const appointmentIds = appointments.map((appointment) => appointment.appointmentId);
  const assignedAppointmentIds = new Set(
    await tourWeekEmployeesRepository.listAssignedAppointmentIdsForEmployee(assignment.employeeId, appointmentIds),
  );
  const employeeRows = await appointmentsRepository.getAppointmentEmployeesByAppointmentIds(appointmentIds);
  const employeesByAppointmentId = new Map<number, Array<{ id: number; fullName: string }>>();

  for (const row of employeeRows) {
    const existing = employeesByAppointmentId.get(row.appointmentId) ?? [];
    existing.push({ id: Number(row.employee.id), fullName: row.employee.fullName });
    employeesByAppointmentId.set(row.appointmentId, existing);
  }

  const items = appointments
    .filter((appointment) => assignedAppointmentIds.has(appointment.appointmentId))
    .map((appointment) => {
      const currentEmployees = employeesByAppointmentId.get(appointment.appointmentId) ?? [];
      const nextEmployeeCount = currentEmployees.filter((entry) => entry.id !== assignment.employeeId).length;
      const isUnderstaffed = nextEmployeeCount < minimumEmployees;
      const startDate = toDateOnlyString(appointment.startDate);
      if (!startDate) {
        throw new TourWeekEmployeesError(422, "VALIDATION_ERROR", "Termin ohne Startdatum");
      }

      return {
        appointmentId: appointment.appointmentId,
        startDate,
        endDate: toDateOnlyString(appointment.endDate),
        projectName: appointment.projectName,
        customerName: appointment.customerName,
        status: isUnderstaffed ? "understaffed" as const : "will_remove" as const,
        selectable: true,
        conflictReason: null,
        isUnderstaffed,
      };
    });

  const week = resolveIsoWeekWindow(assignment.isoYear, assignment.isoWeek);
  return {
    assignmentId: assignment.assignmentId,
    isoYear: assignment.isoYear,
    isoWeek: assignment.isoWeek,
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    employee: {
      assignmentId: assignment.assignmentId,
      employeeId: assignment.employeeId,
      fullName: assignment.fullName,
    },
    items,
  };
}

export async function executeRemoveWeekEmployee(
  tourId: number,
  assignmentId: number,
  params: { isoYear: number; isoWeek: number; selectedAppointmentIds: number[] },
) {
  await requireTour(tourId);
  const assignment = await tourWeekEmployeesRepository.getAssignmentById(assignmentId);
  if (!assignment || assignment.tourId !== tourId) {
    throw new TourWeekEmployeesError(404, "NOT_FOUND", "Wochenzuordnung nicht gefunden");
  }

  if (assignment.isoYear !== params.isoYear || assignment.isoWeek !== params.isoWeek) {
    throw new TourWeekEmployeesError(422, "VALIDATION_ERROR", "Wochenzuordnung passt nicht zur Zielwoche");
  }

  assertWeekEditable(assignment.isoYear, assignment.isoWeek);

  const selectedAppointmentIds = normalizeAppointmentIds(params.selectedAppointmentIds);
  const weekAppointmentsResult = await listWeekAppointments(tourId, assignment.isoYear, assignment.isoWeek);
  const allowedAppointmentIds = new Set(weekAppointmentsResult.appointments.map((appointment) => appointment.appointmentId));
  const changedAppointmentIds: number[] = [];

  const result = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const skipped: Array<{ appointmentId: number; reason: WeekExecuteSkipReason }> = [];

    for (const appointmentId of selectedAppointmentIds) {
      if (!allowedAppointmentIds.has(appointmentId)) {
        skipped.push({ appointmentId, reason: "APPOINTMENT_NOT_IN_WEEK" });
        continue;
      }

      const appointment = await appointmentsRepository.getAppointmentWithEmployeesTx(tx, appointmentId);
      if (!appointment || appointment.tourId !== tourId) {
        skipped.push({ appointmentId, reason: "APPOINTMENT_NOT_IN_WEEK" });
        continue;
      }

      const existingEmployeeIds = appointment.employees.map((entry) => Number(entry.id));
      if (!existingEmployeeIds.includes(assignment.employeeId)) {
        skipped.push({ appointmentId, reason: "NOT_ASSIGNED" });
        continue;
      }

      await appointmentsRepository.replaceAppointmentEmployeesTx(
        tx,
        appointmentId,
        existingEmployeeIds.filter((employeeId) => employeeId !== assignment.employeeId),
      );
      const versionResult = await appointmentsRepository.bumpAppointmentVersionTx(tx, {
        appointmentId,
        expectedVersion: Number(appointment.version),
      });
      if (versionResult.kind === "version_conflict") {
        throw new TourWeekEmployeesError(409, "BUSINESS_CONFLICT", "Termin wurde zwischenzeitlich geaendert");
      }
      changedAppointmentIds.push(appointmentId);
    }

    await tourWeekEmployeesRepository.deleteAssignmentTx(tx, assignment.assignmentId);

    return {
      assignmentId: assignment.assignmentId,
      updatedAppointmentCount: changedAppointmentIds.length,
      skipped,
    };
  });

  for (const appointmentId of changedAppointmentIds) {
    dispatchCalDavUpsert(appointmentId);
  }

  return result;
}

export async function previewTourAssignment(
  tourId: number,
  params: {
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    existingEmployeeIds: number[];
  },
) {
  await requireTour(tourId);
  const currentEmployees = await employeesRepository.getEmployeesByIds(params.existingEmployeeIds);
  return buildAppointmentEmployeePreview({
    tourId,
    startDate: params.startDate,
    endDate: params.endDate ?? null,
    startTime: params.startTime ?? null,
    currentEmployees: currentEmployees.map((employee) => ({ id: employee.id, fullName: employee.fullName })),
  });
}

export async function previewAppointmentTourChange(
  appointmentId: number,
  params: {
    newTourId: number | null;
    newStartDate: string;
    newEndDate?: string | null;
    newStartTime?: string | null;
    currentEmployeeIds?: number[];
  },
) {
  const appointment = await appointmentsRepository.getAppointmentWithEmployees(appointmentId);
  if (!appointment) {
    throw new TourWeekEmployeesError(404, "NOT_FOUND", "Termin nicht gefunden");
  }

  if (toDateOnlyString(appointment.startDate) && toDateOnlyString(appointment.startDate)! < getBerlinTodayDateString()) {
    throw new TourWeekEmployeesError(409, "PAST_WEEK_READONLY", "Historische Termine koennen nicht ueber Wochenplanung umgestellt werden");
  }

  if (params.newTourId) {
    await requireTour(params.newTourId);
  }

  const currentEmployees = typeof params.currentEmployeeIds !== "undefined"
    ? (await employeesRepository.getEmployeesByIds(params.currentEmployeeIds)).map((employee) => ({
      id: employee.id,
      fullName: employee.fullName,
    }))
    : appointment.employees.map((employee) => ({ id: Number(employee.id), fullName: employee.fullName }));

  return buildAppointmentEmployeePreview({
    appointmentId,
    tourId: params.newTourId,
    startDate: params.newStartDate,
    endDate: params.newEndDate ?? null,
    startTime: params.newStartTime ?? null,
    currentEmployees,
  });
}
