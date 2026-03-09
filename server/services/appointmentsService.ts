import { defaultAppointmentDisplayMode, type AppointmentDisplayMode } from "@shared/appointmentDisplayMode";
import type { InsertAppointment } from "@shared/schema";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as customersRepository from "../repositories/customersRepository";
import * as projectStatusRepository from "../repositories/projectStatusRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import { dispatchCalDavDelete, dispatchCalDavUpsert } from "./caldavSyncDispatcher";
import { logDebug, logInfo } from "../lib/logger";

const logPrefix = "[appointments-service]";
const overlapConflictMessage = "Termin ueberschneidet sich mit bestehenden Mitarbeiter-Terminen";

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

class AppointmentError extends Error {
  status: number;
  code:
    | "LOCK_VIOLATION"
    | "BUSINESS_CONFLICT"
    | "VERSION_CONFLICT"
    | "VALIDATION_ERROR"
    | "EMPLOYEE_OVERLAP_CONFLICT"
    | "INACTIVE_ENTITY_ASSIGNMENT"
    | "PAST_APPOINTMENT_READONLY";
  conflictEmployees?: Array<{ id: number; fullName: string }>;

  constructor(
    message: string,
    status: number,
    code:
      | "LOCK_VIOLATION"
      | "BUSINESS_CONFLICT"
      | "VERSION_CONFLICT"
      | "VALIDATION_ERROR"
      | "EMPLOYEE_OVERLAP_CONFLICT"
      | "INACTIVE_ENTITY_ASSIGNMENT"
      | "PAST_APPOINTMENT_READONLY",
    options?: { conflictEmployees?: Array<{ id: number; fullName: string }> },
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.conflictEmployees = options?.conflictEmployees;
  }
}

function getBerlinTodayDateString(): string {
  return berlinFormatter.format(new Date());
}

function parseDateOnly(input: string): Date {
  const parsed = new Date(`${input}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppointmentError("Ungueltiges Datum", 422, "VALIDATION_ERROR");
  }
  return parsed;
}

function toDateOnlyString(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === "string") return input.slice(0, 10);

  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isStartDateLocked(startDate: Date | string | null | undefined): boolean {
  const normalizedStartDate = toDateOnlyString(startDate);
  if (!normalizedStartDate) return false;
  const todayBerlin = getBerlinTodayDateString();
  return normalizedStartDate < todayBerlin;
}

function getBerlinCurrentTimeSeconds(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const second = Number(parts.find((part) => part.type === "second")?.value ?? "0");
  return hour * 3600 + minute * 60 + second;
}

function parseTimeToSeconds(startTime: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(startTime);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
  return hour * 3600 + minute * 60 + second;
}

function resolveOverlapStartTimeHour(startTime?: string | null): number | null {
  if (!startTime) return null;
  const seconds = parseTimeToSeconds(startTime);
  if (seconds == null) {
    throw new AppointmentError("Ungueltige Startzeit", 422, "VALIDATION_ERROR");
  }
  return Math.floor(seconds / 3600);
}

function assertNotHistoricalInput(data: { startDate: string; startTime?: string | null }) {
  if (isStartDateLocked(data.startDate)) {
    throw new AppointmentError("Datum in der Vergangenheit", 409, "PAST_APPOINTMENT_READONLY");
  }
  if (!data.startTime) return;
  if (data.startDate !== getBerlinTodayDateString()) return;

  const inputTimeSeconds = parseTimeToSeconds(data.startTime);
  if (inputTimeSeconds == null) {
    throw new AppointmentError("Ungueltige Startzeit", 422, "VALIDATION_ERROR");
  }
  if (inputTimeSeconds < getBerlinCurrentTimeSeconds()) {
    throw new AppointmentError("Startzeit liegt in der Vergangenheit", 409, "VALIDATION_ERROR");
  }
}

function normalizeEmployeeIds(employeeIds?: number[]) {
  return Array.from(new Set(employeeIds ?? [])).filter((id) => Number.isFinite(id));
}

async function assertNoInactiveEmployeesTx(
  tx: Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0],
  employeeIds: number[],
): Promise<void> {
  if (employeeIds.length === 0) return;
  const inactiveEmployees = await appointmentsRepository.getInactiveEmployeesByIdsTx(tx, employeeIds);
  if (inactiveEmployees.length > 0) {
    throw new AppointmentError(
      "Inaktive Mitarbeiter koennen keinem Termin zugewiesen werden",
      409,
      "INACTIVE_ENTITY_ASSIGNMENT",
      { conflictEmployees: inactiveEmployees },
    );
  }
}

type SidebarAppointmentRow = Awaited<
  ReturnType<typeof appointmentsRepository.listSidebarAppointmentsByProjectFromDate>
>[number];

const buildEmployeesByAppointment = async (appointmentIds: number[]) => {
  const employeeRows = await appointmentsRepository.getAppointmentEmployeesByAppointmentIds(appointmentIds);
  const employeesByAppointment = new Map<number, { id: number; fullName: string }[]>();
  for (const row of employeeRows) {
    const list = employeesByAppointment.get(row.appointmentId) ?? [];
    list.push({
      id: row.employee.id,
      fullName: row.employee.fullName,
    });
    employeesByAppointment.set(row.appointmentId, list);
  }
  return employeesByAppointment;
};

const buildStatusesByProject = async (projectIds: number[]) => {
  const statusRows = await projectStatusRepository.getProjectStatusesByProjectIds(projectIds);
  const statusesByProject = new Map<number, { id: number; title: string; color: string }[]>();
  for (const row of statusRows) {
    const list = statusesByProject.get(row.projectId) ?? [];
    list.push({
      id: row.status.id,
      title: row.status.title,
      color: row.status.color,
    });
    statusesByProject.set(row.projectId, list);
  }
  return statusesByProject;
};

const mapSidebarAppointments = async (rows: SidebarAppointmentRow[], roleKey: CanonicalRoleKey) => {
  const appointmentIds = Array.from(new Set(rows.map((row) => row.appointment.id)));
  const projectIds = Array.from(new Set(rows.map((row) => row.project?.id).filter((id): id is number => Number.isFinite(id))));
  const customerIds = Array.from(new Set(rows.map((row) => row.customer.id)));
  const employeesByAppointment = await buildEmployeesByAppointment(appointmentIds);
  const statusesByProject = await buildStatusesByProject(projectIds);
  const customerNoteCounts = await appointmentsRepository.getCustomerNoteCountsByCustomerIds(customerIds);
  const projectNoteCounts = await appointmentsRepository.getProjectNoteCountsByProjectIds(projectIds);
  const appointmentNoteCounts = await appointmentsRepository.getAppointmentNoteCountsByAppointmentIds(appointmentIds);

  return rows.map((row) => {
    const projectId = row.project?.id ?? null;
    return {
      id: row.appointment.id,
      version: row.appointment.version,
      projectId,
      projectName: row.project?.name ?? "Ohne Projekt",
      projectVersion: row.project?.version ?? null,
      projectOrderNumber: row.projectOrder?.orderNumber ?? null,
      projectDescription: row.project?.descriptionMd ?? null,
      projectStatuses: projectId ? (statusesByProject.get(projectId) ?? []) : [],
      startDate: toDateOnlyString(row.appointment.startDate) ?? "",
      endDate: toDateOnlyString(row.appointment.endDate),
      startTime: row.appointment.startTime ?? null,
      startTimeHour: row.appointment.startTime ? Number(row.appointment.startTime.slice(0, 2)) : null,
      tourId: row.appointment.tourId ?? null,
      tourName: row.tour?.name ?? null,
      tourColor: row.tour?.color ?? null,
      customer: {
        id: row.customer.id,
        customerNumber: row.customer.customerNumber,
        fullName: row.customer.fullName,
        addressLine1: row.customer.addressLine1 ?? null,
        addressLine2: row.customer.addressLine2 ?? null,
        postalCode: row.customer.postalCode ?? null,
        city: row.customer.city ?? null,
      },
      employees: employeesByAppointment.get(row.appointment.id) ?? [],
      customerNotesCount: customerNoteCounts.get(row.customer.id) ?? 0,
      projectNotesCount: projectId ? (projectNoteCounts.get(projectId) ?? 0) : 0,
      appointmentNotesCount: appointmentNoteCounts.get(row.appointment.id) ?? 0,
      displayMode: row.appointment.displayMode,
      isLocked: roleKey !== "ADMIN" && isStartDateLocked(row.appointment.startDate),
    };
  });
};

function validateDateRange(startDate: string, endDate?: string | null) {
  if (endDate && endDate < startDate) {
    throw new AppointmentError("Enddatum darf nicht vor dem Startdatum liegen", 422, "VALIDATION_ERROR");
  }
}

async function ensureProjectExistsTx(
  tx: Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0],
  projectId: number,
) {
  const project = await appointmentsRepository.getProjectTx(tx, projectId);
  if (!project) {
    throw new AppointmentError("Projekt wurde nicht gefunden", 422, "VALIDATION_ERROR");
  }
  return project;
}

async function ensureActiveCustomer(customerId: number) {
  const customer = await customersRepository.getCustomer(customerId);
  if (!customer) {
    throw new AppointmentError("Kunde wurde nicht gefunden", 422, "VALIDATION_ERROR");
  }
  if (!customer.isActive) {
    throw new AppointmentError("Inaktive Kunden koennen nicht zugewiesen werden", 409, "INACTIVE_ENTITY_ASSIGNMENT");
  }
  return customer;
}

async function resolveAppointmentRelationTx(
  tx: Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0],
  data: { projectId?: number | null; customerId?: number },
  mode: "create" | "update",
  existing?: { projectId: number | null; customerId: number },
) {
  const nextProjectId = data.projectId !== undefined
    ? (data.projectId ?? null)
    : (mode === "update" ? (existing?.projectId ?? null) : null);

  if (nextProjectId != null) {
    const project = await ensureProjectExistsTx(tx, nextProjectId);
    if (typeof data.customerId === "number" && data.customerId !== project.customerId) {
      throw new AppointmentError("Projekt-Kunde muss mit Termin-Kunde uebereinstimmen", 422, "VALIDATION_ERROR");
    }
    const customer = await ensureActiveCustomer(project.customerId);
    return {
      project,
      customer,
      projectId: project.id,
      customerId: project.customerId,
    };
  }

  const nextCustomerId = data.customerId ?? existing?.customerId;
  if (!nextCustomerId) {
    throw new AppointmentError("Termin braucht Projekt oder Kunde", 422, "VALIDATION_ERROR");
  }

  const customer = await ensureActiveCustomer(nextCustomerId);
  return {
    project: null,
    customer,
    projectId: null,
    customerId: customer.id,
  };
}

function resolveTitle(projectName: string | null, customerName: string | null, customerNumber: string): string {
  if (projectName && projectName.trim().length > 0) return projectName.trim();
  if (customerName && customerName.trim().length > 0) return `Termin: ${customerName.trim()}`;
  return `Termin Kunde ${customerNumber}`;
}

export async function getAppointmentDetails(id: number) {
  const appointment = await appointmentsRepository.getAppointmentWithEmployees(id);
  if (!appointment) return null;

  return {
    id: appointment.id,
    version: appointment.version,
    projectId: appointment.projectId,
    customerId: appointment.customerId,
    tourId: appointment.tourId ?? null,
    displayMode: appointment.displayMode,
    title: appointment.title,
    description: appointment.description ?? null,
    startDate: toDateOnlyString(appointment.startDate) ?? "",
    startTime: appointment.startTime ?? null,
    endDate: toDateOnlyString(appointment.endDate),
    endTime: appointment.endTime ?? null,
    employees: appointment.employees,
  };
}

export async function createAppointment(
  data: {
    projectId?: number | null;
    customerId?: number;
    tourId?: number | null;
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    employeeIds?: number[];
  },
) {
  logDebug(`${logPrefix} create request projectId=${data.projectId ?? null} customerId=${data.customerId ?? null}`);
  validateDateRange(data.startDate, data.endDate ?? null);
  assertNotHistoricalInput({ startDate: data.startDate, startTime: data.startTime ?? null });

  const employeeIds = normalizeEmployeeIds(data.employeeIds);
  const startDate = parseDateOnly(data.startDate);
  const endDate = data.endDate ? parseDateOnly(data.endDate) : null;
  const startTimeHour = resolveOverlapStartTimeHour(data.startTime ?? null);

  const created = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const relation = await resolveAppointmentRelationTx(tx, data, "create");
    await assertNoInactiveEmployeesTx(tx, employeeIds);

    const conflictEmployees = await appointmentsRepository.getConflictingEmployeesTx(tx, {
      employeeIds,
      startDate,
      endDate,
      startTimeHour,
    });
    if (conflictEmployees.length > 0) {
      throw new AppointmentError(overlapConflictMessage, 409, "EMPLOYEE_OVERLAP_CONFLICT", { conflictEmployees });
    }

    const appointmentData: InsertAppointment = {
      projectId: relation.projectId,
      customerId: relation.customerId,
      tourId: data.tourId ?? null,
      displayMode: defaultAppointmentDisplayMode,
      title: resolveTitle(relation.project?.name ?? null, relation.customer.fullName ?? null, relation.customer.customerNumber),
      description: null,
      startDate,
      endDate,
      startTime: data.startTime ?? null,
      endTime: null,
    };

    const appointmentId = await appointmentsRepository.createAppointmentTx(tx, appointmentData);
    await appointmentsRepository.replaceAppointmentEmployeesTx(tx, appointmentId, employeeIds);
    return appointmentsRepository.getAppointmentWithEmployeesTx(tx, appointmentId);
  });

  if (created?.id) {
    dispatchCalDavUpsert(created.id);
  }
  return created;
}

export async function updateAppointment(
  appointmentId: number,
  data: {
    version: number;
    projectId?: number | null;
    customerId?: number;
    tourId?: number | null;
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    employeeIds?: number[];
  },
  roleKey: CanonicalRoleKey,
) {
  validateDateRange(data.startDate, data.endDate ?? null);
  const employeeIds = normalizeEmployeeIds(data.employeeIds);
  const startDate = parseDateOnly(data.startDate);
  const endDate = data.endDate ? parseDateOnly(data.endDate) : null;
  const startTimeHour = resolveOverlapStartTimeHour(data.startTime ?? null);

  const updated = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const existing = await appointmentsRepository.getAppointmentTx(tx, appointmentId);
    if (!existing) return null;

    if (isStartDateLocked(existing.startDate)) {
      if (roleKey !== "ADMIN") {
        throw new AppointmentError("Termin ist ab dem Starttag gesperrt", 409, "PAST_APPOINTMENT_READONLY");
      }
      throw new AppointmentError("Historische Termine koennen nicht geaendert werden", 409, "PAST_APPOINTMENT_READONLY");
    }

    assertNotHistoricalInput({ startDate: data.startDate, startTime: data.startTime ?? null });

    const relation = await resolveAppointmentRelationTx(
      tx,
      { projectId: data.projectId, customerId: data.customerId },
      "update",
      { projectId: existing.projectId ?? null, customerId: existing.customerId },
    );

    await assertNoInactiveEmployeesTx(tx, employeeIds);

    if (existing.tourId !== (data.tourId ?? null)) {
      logInfo(`${logPrefix} tour change detected appointmentId=${appointmentId}`);
    }

    const conflictEmployees = await appointmentsRepository.getConflictingEmployeesTx(tx, {
      employeeIds,
      startDate,
      endDate,
      startTimeHour,
      excludeAppointmentId: appointmentId,
    });
    if (conflictEmployees.length > 0) {
      throw new AppointmentError(overlapConflictMessage, 409, "EMPLOYEE_OVERLAP_CONFLICT", { conflictEmployees });
    }

    const appointmentData: Partial<InsertAppointment> = {
      projectId: relation.projectId,
      customerId: relation.customerId,
      tourId: data.tourId ?? null,
      title: resolveTitle(relation.project?.name ?? null, relation.customer.fullName ?? null, relation.customer.customerNumber),
      description: null,
      startDate,
      endDate,
      startTime: data.startTime ?? null,
      endTime: null,
    };

    const updateResult = await appointmentsRepository.updateAppointmentWithVersionTx(tx, {
      appointmentId,
      expectedVersion: data.version,
      data: appointmentData,
    });
    if (updateResult.kind === "version_conflict") {
      throw new AppointmentError("Termin wurde zwischenzeitlich geaendert", 409, "VERSION_CONFLICT");
    }

    await appointmentsRepository.replaceAppointmentEmployeesTx(tx, appointmentId, employeeIds);
    return appointmentsRepository.getAppointmentWithEmployeesTx(tx, appointmentId);
  });

  if (updated?.id) {
    dispatchCalDavUpsert(updated.id);
  }
  return updated;
}

export async function setAppointmentDisplayMode(
  appointmentId: number,
  data: { version: number; displayMode: AppointmentDisplayMode },
  roleKey: CanonicalRoleKey,
) {
  const updated = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const existing = await appointmentsRepository.getAppointmentTx(tx, appointmentId);
    if (!existing) return null;

    if (isStartDateLocked(existing.startDate)) {
      if (roleKey !== "ADMIN") {
        throw new AppointmentError("Termin ist ab dem Starttag gesperrt", 409, "PAST_APPOINTMENT_READONLY");
      }
      throw new AppointmentError("Historische Termine koennen nicht geaendert werden", 409, "PAST_APPOINTMENT_READONLY");
    }

    const updateResult = await appointmentsRepository.updateAppointmentDisplayModeWithVersionTx(tx, {
      appointmentId,
      expectedVersion: data.version,
      displayMode: data.displayMode,
    });
    if (updateResult.kind === "version_conflict") {
      throw new AppointmentError("Termin wurde zwischenzeitlich geaendert", 409, "VERSION_CONFLICT");
    }

    const refreshed = await appointmentsRepository.getAppointmentTx(tx, appointmentId);
    if (!refreshed) return null;
    return {
      id: refreshed.id,
      version: refreshed.version,
      displayMode: refreshed.displayMode as AppointmentDisplayMode,
    };
  });

  if (updated?.id) {
    dispatchCalDavUpsert(updated.id);
  }
  return updated;
}

export async function listProjectAppointments(
  projectId: number,
  fromDate: string | undefined,
  roleKey: CanonicalRoleKey,
) {
  const todayBerlin = getBerlinTodayDateString();
  const effectiveFromDate = fromDate ?? todayBerlin;

  const appointments = await appointmentsRepository.listSidebarAppointmentsByProjectFromDate(
    projectId,
    parseDateOnly(effectiveFromDate),
  );

  return mapSidebarAppointments(appointments, roleKey);
}

export async function listEmployeeAppointments(
  employeeId: number,
  fromDate: string | undefined,
  roleKey: CanonicalRoleKey,
) {
  return listEmployeeAppointmentsByScope(employeeId, "upcoming", roleKey, { fromDateOverride: fromDate });
}

type EntityAppointmentsScope = "upcoming" | "all";

function resolveScopeFromDate(scope: EntityAppointmentsScope, fromDateOverride?: string): Date | undefined {
  if (scope === "all") {
    return undefined;
  }
  const todayBerlin = getBerlinTodayDateString();
  const effectiveFromDate = fromDateOverride ?? todayBerlin;
  return parseDateOnly(effectiveFromDate);
}

export async function listEmployeeAppointmentsByScope(
  employeeId: number,
  scope: EntityAppointmentsScope,
  roleKey: CanonicalRoleKey,
  options?: { fromDateOverride?: string },
) {
  const fromDate = resolveScopeFromDate(scope, options?.fromDateOverride);
  const appointments = await appointmentsRepository.listSidebarAppointmentsByEmployeeScope(employeeId, fromDate);
  return mapSidebarAppointments(appointments, roleKey);
}

export async function listCustomerAppointmentsByScope(
  customerId: number,
  scope: EntityAppointmentsScope,
  roleKey: CanonicalRoleKey,
  options?: { fromDateOverride?: string },
) {
  const fromDate = resolveScopeFromDate(scope, options?.fromDateOverride);
  const appointments = await appointmentsRepository.listSidebarAppointmentsByCustomerScope(customerId, fromDate);
  return mapSidebarAppointments(appointments, roleKey);
}

export async function listTourAppointments(
  tourId: number,
  fromDate: string | undefined,
  roleKey: CanonicalRoleKey,
) {
  const todayBerlin = getBerlinTodayDateString();
  const effectiveFromDate = fromDate ?? todayBerlin;

  const appointments = await appointmentsRepository.listSidebarAppointmentsByTourFromDate(
    tourId,
    parseDateOnly(effectiveFromDate),
  );

  return mapSidebarAppointments(appointments, roleKey);
}

export async function listCalendarAppointments({
  fromDate,
  toDate,
  employeeId,
  detail,
  roleKey,
}: {
  fromDate: string;
  toDate: string;
  employeeId?: number | null;
  detail?: "compact" | "full";
  roleKey: CanonicalRoleKey;
}) {
  const resolvedDetail = detail ?? "compact";
  const rows = await appointmentsRepository.listAppointmentsForCalendarRange({
    fromDate: parseDateOnly(fromDate),
    toDate: parseDateOnly(toDate),
    employeeId,
  });

  const appointmentIds = Array.from(new Set(rows.map((row) => row.appointment.id)));
  const projectIds = Array.from(new Set(rows.map((row) => row.project?.id).filter((id): id is number => Number.isFinite(id))));
  const customerIds = Array.from(new Set(rows.map((row) => row.customer.id)));

  const employeesByAppointment = await buildEmployeesByAppointment(appointmentIds);
  const statusesByProject = await buildStatusesByProject(projectIds);
  const customerNoteCounts = await appointmentsRepository.getCustomerNoteCountsByCustomerIds(customerIds);
  const projectNoteCounts = await appointmentsRepository.getProjectNoteCountsByProjectIds(projectIds);
  const appointmentNoteCounts = await appointmentsRepository.getAppointmentNoteCountsByAppointmentIds(appointmentIds);

  return rows.map((row) => {
    const projectId = row.project?.id ?? null;
    const baseAppointment = {
      id: row.appointment.id,
      version: row.appointment.version,
      projectId,
      projectName: row.project?.name ?? "Ohne Projekt",
      projectVersion: row.project?.version ?? null,
      projectOrderNumber: row.projectOrder?.orderNumber ?? null,
      projectDescription: row.project?.descriptionMd ?? null,
      projectStatuses: projectId ? (statusesByProject.get(projectId) ?? []) : [],
      startDate: toDateOnlyString(row.appointment.startDate) ?? "",
      endDate: toDateOnlyString(row.appointment.endDate),
      startTime: row.appointment.startTime ?? null,
      tourId: row.appointment.tourId ?? null,
      tourName: row.tour?.name ?? null,
      tourColor: row.tour?.color ?? null,
      customer: {
        id: row.customer.id,
        customerNumber: row.customer.customerNumber,
        fullName: row.customer.fullName,
        postalCode: row.customer.postalCode ?? null,
        city: row.customer.city ?? null,
      },
      customerNotesCount: customerNoteCounts.get(row.customer.id) ?? 0,
      projectNotesCount: projectId ? (projectNoteCounts.get(projectId) ?? 0) : 0,
      appointmentNotesCount: appointmentNoteCounts.get(row.appointment.id) ?? 0,
      displayMode: row.appointment.displayMode,
      employees: employeesByAppointment.get(row.appointment.id) ?? [],
      isLocked: roleKey !== "ADMIN" && isStartDateLocked(row.appointment.startDate),
    };

    if (resolvedDetail === "full") {
      return {
        ...baseAppointment,
        project: row.project
          ? {
              id: row.project.id,
              customerId: row.project.customerId,
              name: row.project.name,
              orderNumber: row.projectOrder?.orderNumber ?? null,
              descriptionMd: row.project.descriptionMd ?? null,
              isActive: row.project.isActive,
            }
          : null,
        customer: {
          ...baseAppointment.customer,
          addressLine1: row.customer.addressLine1 ?? null,
          addressLine2: row.customer.addressLine2 ?? null,
        },
      };
    }

    return baseAppointment;
  });
}

export async function listAppointmentsList(params: {
  employeeId?: number;
  projectId?: number;
  customerId?: number;
  orderNumber?: string;
  tourId?: number;
  dateFrom?: string;
  dateTo?: string;
  allDayOnly?: boolean;
  withStartTimeOnly?: boolean;
  singleEmployeeOnly?: boolean;
  lockedOnly?: boolean;
  page: number;
  pageSize: number;
  roleKey: CanonicalRoleKey;
}) {
  const dateFrom = params.dateFrom ? parseDateOnly(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? parseDateOnly(params.dateTo) : undefined;
  if (dateFrom && dateTo && dateTo < dateFrom) {
    throw new AppointmentError("dateTo darf nicht vor dateFrom liegen", 422, "VALIDATION_ERROR");
  }

  const berlinToday = parseDateOnly(getBerlinTodayDateString());
  const normalizedOrderNumber = params.orderNumber?.trim();

  const { rows, total } = await appointmentsRepository.listAppointmentsForList(
    {
      employeeId: params.employeeId,
      projectId: params.projectId,
      customerId: params.customerId,
      orderNumber: normalizedOrderNumber && normalizedOrderNumber.length > 0 ? normalizedOrderNumber : undefined,
      tourId: params.tourId,
      dateFrom,
      dateTo,
      allDayOnly: params.allDayOnly,
      withStartTimeOnly: params.withStartTimeOnly,
      singleEmployeeOnly: params.singleEmployeeOnly,
      lockedOnly: params.lockedOnly,
      lockedBeforeDate: berlinToday,
    },
    {
      page: params.page,
      pageSize: params.pageSize,
    },
  );

  const appointmentIds = Array.from(new Set(rows.map((row) => row.appointment.id)));
  const projectIds = Array.from(new Set(rows.map((row) => row.project?.id).filter((id): id is number => Number.isFinite(id))));
  const customerIds = Array.from(new Set(rows.map((row) => row.customer.id)));
  const employeesByAppointment = await buildEmployeesByAppointment(appointmentIds);
  const statusesByProject = await buildStatusesByProject(projectIds);
  const customerNoteCounts = await appointmentsRepository.getCustomerNoteCountsByCustomerIds(customerIds);
  const projectNoteCounts = await appointmentsRepository.getProjectNoteCountsByProjectIds(projectIds);
  const appointmentNoteCounts = await appointmentsRepository.getAppointmentNoteCountsByAppointmentIds(appointmentIds);

  const items = rows.map((row) => {
    const projectId = row.project?.id ?? null;
    const rowEmployees = employeesByAppointment.get(row.appointment.id) ?? [];
    return {
      id: row.appointment.id,
      projectId,
      projectName: row.project?.name ?? "Ohne Projekt",
      projectVersion: row.project?.version ?? null,
      projectOrderNumber: row.projectOrder?.orderNumber ?? null,
      projectDescription: row.project?.descriptionMd ?? null,
      projectStatuses: projectId ? (statusesByProject.get(projectId) ?? []) : [],
      startDate: toDateOnlyString(row.appointment.startDate) ?? "",
      endDate: toDateOnlyString(row.appointment.endDate),
      startTime: row.appointment.startTime ?? null,
      startTimeHour: row.appointment.startTime ? Number(row.appointment.startTime.slice(0, 2)) : null,
      tourId: row.appointment.tourId ?? null,
      tourName: row.tour?.name ?? null,
      tourColor: row.tour?.color ?? null,
      customer: {
        id: row.customer.id,
        customerNumber: row.customer.customerNumber,
        fullName: row.customer.fullName,
        addressLine1: row.customer.addressLine1 ?? null,
        addressLine2: row.customer.addressLine2 ?? null,
        postalCode: row.customer.postalCode ?? null,
        city: row.customer.city ?? null,
      },
      employees: rowEmployees,
      customerNotesCount: customerNoteCounts.get(row.customer.id) ?? 0,
      projectNotesCount: projectId ? (projectNoteCounts.get(projectId) ?? 0) : 0,
      appointmentNotesCount: appointmentNoteCounts.get(row.appointment.id) ?? 0,
      displayMode: row.appointment.displayMode,
      isLocked: params.roleKey !== "ADMIN" && isStartDateLocked(row.appointment.startDate),
      allDay: row.appointment.startTime == null,
      singleEmployee: rowEmployees.length === 1,
    };
  });

  const totalPages = total === 0 ? 0 : Math.ceil(total / params.pageSize);
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
    items,
  };
}

export async function deleteAppointment(appointmentId: number, expectedVersion: number, _roleKey: CanonicalRoleKey) {
  const deleted = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const existing = await appointmentsRepository.getAppointmentTx(tx, appointmentId);
    if (!existing) return null;

    if (isStartDateLocked(existing.startDate)) {
      throw new AppointmentError("Historische Termine koennen nicht geloescht werden", 409, "PAST_APPOINTMENT_READONLY");
    }

    const result = await appointmentsRepository.deleteAppointmentWithVersionTx(tx, {
      appointmentId,
      expectedVersion,
    });
    if (result.kind === "version_conflict") {
      throw new AppointmentError("Termin wurde zwischenzeitlich geaendert", 409, "VERSION_CONFLICT");
    }

    return existing;
  });
  if (deleted?.id) {
    dispatchCalDavDelete(deleted.id, deleted.externalEventId ?? null);
  }
  return deleted;
}

export function isAppointmentError(err: unknown): err is AppointmentError {
  return err instanceof AppointmentError;
}
