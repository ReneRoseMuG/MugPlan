import { defaultAppointmentDisplayMode, type AppointmentDisplayMode } from "@shared/appointmentDisplayMode";
import type { InsertAppointment } from "@shared/schema";
import { addWeeks, differenceInCalendarDays, endOfWeek, startOfWeek } from "date-fns";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import {
  getProjectArticleField,
  getProjectArticleFieldByCategoryName,
  type ProjectArticleFieldKey,
  type ProjectArticleItem,
} from "@shared/projectArticleList";
import * as customersRepository from "../repositories/customersRepository";
import * as employeesRepository from "../repositories/employeesRepository";
import * as toursRepository from "../repositories/toursRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import { dispatchCalDavDelete, dispatchCalDavUpsert } from "./caldavSyncDispatcher";
import {
  filterVisibleAppointmentTagRelations,
  filterVisibleAppointmentTags,
  hasAppointmentCancellationTag,
  isAppointmentCancellationTag,
} from "../lib/appointmentCancellation";
import { logDebug, logInfo } from "../lib/logger";
import * as tagRelationsService from "./tagRelationsService";

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
    | "FORBIDDEN"
    | "VERSION_CONFLICT"
    | "VALIDATION_ERROR"
    | "EMPLOYEE_OVERLAP_CONFLICT"
    | "INACTIVE_ENTITY_ASSIGNMENT"
    | "PAST_APPOINTMENT_READONLY"
    | "CANCELLATION_TAG_NOT_CONFIGURED"
    | "CANCELLATION_TAG_PROTECTED"
    | "CANCELLED_APPOINTMENT_READONLY";
  conflictEmployees?: Array<{ id: number; fullName: string }>;

  constructor(
    message: string,
    status: number,
    code:
      | "LOCK_VIOLATION"
      | "BUSINESS_CONFLICT"
      | "FORBIDDEN"
      | "VERSION_CONFLICT"
      | "VALIDATION_ERROR"
      | "EMPLOYEE_OVERLAP_CONFLICT"
      | "INACTIVE_ENTITY_ASSIGNMENT"
      | "PAST_APPOINTMENT_READONLY"
      | "CANCELLATION_TAG_NOT_CONFIGURED"
      | "CANCELLATION_TAG_PROTECTED"
      | "CANCELLED_APPOINTMENT_READONLY",
    options?: {
      conflictEmployees?: Array<{ id: number; fullName: string }>;
    },
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

function resolveVisibleAppointmentTags(tags: Awaited<ReturnType<typeof appointmentsRepository.getAppointmentTagsByAppointmentIds>> extends Map<number, infer TValue> ? TValue : never) {
  const appointmentTags = tags ?? [];
  return {
    isCancelled: hasAppointmentCancellationTag(appointmentTags),
    visibleTags: filterVisibleAppointmentTags(appointmentTags),
  };
}

async function isAppointmentCancelled(appointmentId: number): Promise<boolean> {
  const appointmentTagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds([appointmentId]);
  return hasAppointmentCancellationTag(appointmentTagsByAppointmentId.get(appointmentId) ?? []);
}

async function assertAppointmentNotCancelled(appointmentId: number, message = "Stornierte Termine koennen nicht geaendert werden"): Promise<void> {
  if (await isAppointmentCancelled(appointmentId)) {
    throw new AppointmentError(message, 409, "CANCELLED_APPOINTMENT_READONLY");
  }
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

function requireDispatcherOrAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "DISPONENT" && roleKey !== "ADMIN") {
    throw new AppointmentError("Keine Berechtigung fuer Tag-Aenderungen", 403, "FORBIDDEN");
  }
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

const PROJECT_ARTICLE_FIELD_ORDER: ProjectArticleFieldKey[] = [
  "saunaModel",
  "oven",
  "control",
  "roof",
  "window",
  "door",
  "frontWall",
  "rearWallWindow",
  "interior",
];

const buildProjectArticleItemsByProject = async (projectIds: number[]) => {
  const articleRows = await appointmentsRepository.listProjectArticleRowsByProjectIds(projectIds);
  const slotsByProject = new Map<number, Map<ProjectArticleFieldKey, ProjectArticleItem>>();

  for (const row of articleRows) {
    const slots = slotsByProject.get(row.projectId) ?? new Map<ProjectArticleFieldKey, ProjectArticleItem>();

    if (row.productId != null && row.productName?.trim()) {
      if (!slots.has("saunaModel")) {
        slots.set("saunaModel", {
          label: getProjectArticleField("saunaModel").label,
          value: row.productName.trim(),
        });
      }
      slotsByProject.set(row.projectId, slots);
      continue;
    }

    if (row.componentId == null || !row.componentName?.trim() || !row.componentCategoryName?.trim()) {
      slotsByProject.set(row.projectId, slots);
      continue;
    }

    const fieldKey = getProjectArticleFieldByCategoryName(row.componentCategoryName);
    if (!fieldKey || slots.has(fieldKey)) {
      slotsByProject.set(row.projectId, slots);
      continue;
    }

    slots.set(fieldKey, {
      label: getProjectArticleField(fieldKey).label,
      value: row.componentName.trim(),
    });
    slotsByProject.set(row.projectId, slots);
  }

  const articleItemsByProject = new Map<number, ProjectArticleItem[]>();
  for (const [projectId, slots] of Array.from(slotsByProject.entries())) {
    articleItemsByProject.set(
      projectId,
      PROJECT_ARTICLE_FIELD_ORDER.flatMap((fieldKey) => {
        const item = slots.get(fieldKey);
        return item ? [item] : [];
      }),
    );
  }

  return articleItemsByProject;
};

function getProjectSaunaModel(projectArticleItems: ProjectArticleItem[]): string | null {
  const saunaLabel = getProjectArticleField("saunaModel").label;
  const saunaItem = projectArticleItems.find((item) => item.label === saunaLabel);
  return saunaItem?.value ?? null;
}

const mapSidebarAppointments = async (rows: SidebarAppointmentRow[], roleKey: CanonicalRoleKey) => {
  const appointmentIds = Array.from(new Set(rows.map((row) => row.appointment.id)));
  const projectIds = Array.from(new Set(rows.map((row) => row.project?.id).filter((id): id is number => Number.isFinite(id))));
  const customerIds = Array.from(new Set(rows.map((row) => row.customer.id)));
  const [
    employeesByAppointment,
    projectArticleItemsByProject,
    customerNoteCounts,
    projectNoteCounts,
    appointmentNoteCounts,
    appointmentTagsByAppointmentId,
    customerTagsByCustomerId,
    projectTagsByProjectId,
  ] = await Promise.all([
    buildEmployeesByAppointment(appointmentIds),
    buildProjectArticleItemsByProject(projectIds),
    appointmentsRepository.getCustomerNoteCountsByCustomerIds(customerIds),
    appointmentsRepository.getProjectNoteCountsByProjectIds(projectIds),
    appointmentsRepository.getAppointmentNoteCountsByAppointmentIds(appointmentIds),
    appointmentsRepository.getAppointmentTagsByAppointmentIds(appointmentIds),
    appointmentsRepository.getCustomerTagsByCustomerIds(customerIds),
    appointmentsRepository.getProjectTagsByProjectIds(projectIds),
  ]);

  return rows.map((row) => {
    const projectId = row.project?.id ?? null;
    const { isCancelled, visibleTags } = resolveVisibleAppointmentTags(
      appointmentTagsByAppointmentId.get(row.appointment.id) ?? [],
    );
    return {
      id: row.appointment.id,
      version: row.appointment.version,
      projectId,
      projectName: row.project?.name ?? "Ohne Projekt",
      projectVersion: row.project?.version ?? null,
      projectOrderNumber: row.projectOrder?.orderNumber ?? null,
      projectArticleItems: projectId ? (projectArticleItemsByProject.get(projectId) ?? []) : [],
      projectDescription: row.project?.descriptionMd ?? null,
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
      appointmentTags: visibleTags,
      customerTags: customerTagsByCustomerId.get(row.customer.id) ?? [],
      projectTags: projectId ? (projectTagsByProjectId.get(projectId) ?? []) : [],
      displayMode: row.appointment.displayMode,
      isLocked: roleKey !== "ADMIN" && isStartDateLocked(row.appointment.startDate),
      isCancelled,
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
  const [appointmentTagsByAppointmentId] = await Promise.all([
    appointmentsRepository.getAppointmentTagsByAppointmentIds([id]),
  ]);
  const customerTagsByCustomerId = await appointmentsRepository.getCustomerTagsByCustomerIds([appointment.customerId]);
  const projectTagsByProjectId = appointment.projectId != null
    ? await appointmentsRepository.getProjectTagsByProjectIds([appointment.projectId])
    : await appointmentsRepository.getProjectTagsByProjectIds([]);
  const { isCancelled, visibleTags } = resolveVisibleAppointmentTags(appointmentTagsByAppointmentId.get(id) ?? []);

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
    appointmentTags: visibleTags,
    customerTags: customerTagsByCustomerId.get(appointment.customerId) ?? [],
    projectTags: appointment.projectId != null ? (projectTagsByProjectId.get(appointment.projectId) ?? []) : [],
    isCancelled,
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

    await assertAppointmentNotCancelled(appointmentId);

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

    await assertAppointmentNotCancelled(appointmentId);

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

export async function getTourPrintPreview(params: { tourId: number; fromDate: string; weekCount: number }) {
  const tour =
    params.tourId === 0
      ? { id: 0 as number, name: "Ohne Tour", color: null as string | null }
      : await toursRepository.getTour(params.tourId);
  if (!tour) return null;

  const normalizedWeekCount = Math.max(1, Math.min(params.weekCount, 12));
  const requestedFromDate = parseDateOnly(params.fromDate);
  const firstWeekStart = startOfWeek(requestedFromDate, { weekStartsOn: 1 });
  const lastWeekStart = addWeeks(firstWeekStart, normalizedWeekCount - 1);
  const finalToDate = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

  const [members, rows] = await Promise.all([
    params.tourId === 0
      ? Promise.resolve([] as { id: number; fullName: string }[])
      : employeesRepository.getEmployeesByTour(params.tourId),
    appointmentsRepository.listAppointmentsByTourForDateRange(params.tourId, firstWeekStart, finalToDate),
  ]);

  const appointmentIds = Array.from(new Set(rows.map((row) => row.appointment.id)));
  const projectIds = Array.from(new Set(rows.map((row) => row.project?.id).filter((id): id is number => Number.isFinite(id))));
  const customerIds = Array.from(new Set(rows.map((row) => row.customer.id)));

  const [
    employeesByAppointment,
    projectArticleItemsByProject,
    customerPrintNotesByCustomer,
    projectPrintNotesByProject,
    appointmentPrintNotesByAppointment,
  ] = await Promise.all([
    buildEmployeesByAppointment(appointmentIds),
    buildProjectArticleItemsByProject(projectIds),
    appointmentsRepository.getCustomerPrintNotesByCustomerIds(customerIds),
    appointmentsRepository.getProjectPrintNotesByProjectIds(projectIds),
    appointmentsRepository.getAppointmentPrintNotesByAppointmentIds(appointmentIds),
  ]);

  const weeks = Array.from({ length: normalizedWeekCount }, (_, index) => {
    const weekStart = addWeeks(firstWeekStart, index);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return {
      weekStart: toDateOnlyString(weekStart) ?? "",
      weekEnd: toDateOnlyString(weekEnd) ?? "",
    };
  });

  const appointments = rows.map((row) => {
    const projectId = row.project?.id ?? null;
    const projectArticleItems = projectId ? (projectArticleItemsByProject.get(projectId) ?? []) : [];
    const normalizedStartDate = toDateOnlyString(row.appointment.startDate) ?? "";
    const normalizedEndDate = toDateOnlyString(row.appointment.endDate);
    const printNotes = [
      ...(customerPrintNotesByCustomer.get(row.customer.id) ?? []).map((note) => ({ sourceType: "customer" as const, note })),
      ...(projectId ? (projectPrintNotesByProject.get(projectId) ?? []) : []).map((note) => ({ sourceType: "project" as const, note })),
      ...(appointmentPrintNotesByAppointment.get(row.appointment.id) ?? []).map((note) => ({ sourceType: "appointment" as const, note })),
    ].map(({ sourceType, note }) => ({
      id: note.id,
      sourceType,
      title: note.title,
      body: note.body ?? null,
      cardColor: note.cardColor ?? null,
      updatedAt: new Date(note.updatedAt).toISOString(),
    }));

    return {
      id: row.appointment.id,
      projectId,
      projectName: row.project?.name ?? "Ohne Projekt",
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      startTime: row.appointment.startTime ?? null,
      durationDays: differenceInCalendarDays(
        parseDateOnly(normalizedEndDate ?? normalizedStartDate),
        parseDateOnly(normalizedStartDate),
      ) + 1,
      saunaModel: getProjectSaunaModel(projectArticleItems),
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
      printNotes,
    };
  });

  return {
    fromDate: toDateOnlyString(firstWeekStart) ?? "",
    toDate: toDateOnlyString(finalToDate) ?? "",
    weeks,
    tour: {
      id: tour.id,
      name: tour.name,
      color: tour.color,
    },
    members: members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
    })),
    appointments,
  };
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
  const projectArticleItemsByProject = await buildProjectArticleItemsByProject(projectIds);
  const customerNoteCounts = await appointmentsRepository.getCustomerNoteCountsByCustomerIds(customerIds);
  const projectNoteCounts = await appointmentsRepository.getProjectNoteCountsByProjectIds(projectIds);
  const appointmentNoteCounts = await appointmentsRepository.getAppointmentNoteCountsByAppointmentIds(appointmentIds);
  const customerAttachmentCounts = await appointmentsRepository.getCustomerAttachmentCountsByCustomerIds(customerIds);
  const projectAttachmentCounts = await appointmentsRepository.getProjectAttachmentCountsByProjectIds(projectIds);
  const appointmentAttachmentCounts = await appointmentsRepository.getAppointmentAttachmentCountsByAppointmentIds(appointmentIds);
  const appointmentTagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds(appointmentIds);
  const customerTagsByCustomerId = await appointmentsRepository.getCustomerTagsByCustomerIds(customerIds);
  const projectTagsByProjectId = await appointmentsRepository.getProjectTagsByProjectIds(projectIds);

  return rows.map((row) => {
    const projectId = row.project?.id ?? null;
    const { isCancelled, visibleTags } = resolveVisibleAppointmentTags(
      appointmentTagsByAppointmentId.get(row.appointment.id) ?? [],
    );
    const customerAttachmentsCount = customerAttachmentCounts.get(row.customer.id) ?? 0;
    const projectAttachmentsCount = projectId ? (projectAttachmentCounts.get(projectId) ?? 0) : 0;
    const appointmentAttachmentsCount = appointmentAttachmentCounts.get(row.appointment.id) ?? 0;
    const baseAppointment = {
      id: row.appointment.id,
      version: row.appointment.version,
      projectId,
      projectName: row.project?.name ?? "Ohne Projekt",
      projectVersion: row.project?.version ?? null,
      projectOrderNumber: row.projectOrder?.orderNumber ?? null,
      projectArticleItems: projectId ? (projectArticleItemsByProject.get(projectId) ?? []) : [],
      projectDescription: row.project?.descriptionMd ?? null,
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
        phone: row.customer.phone ?? null,
        email: row.customer.email ?? null,
        company: row.customer.company ?? null,
        postalCode: row.customer.postalCode ?? null,
        city: row.customer.city ?? null,
      },
      customerNotesCount: customerNoteCounts.get(row.customer.id) ?? 0,
      projectNotesCount: projectId ? (projectNoteCounts.get(projectId) ?? 0) : 0,
      appointmentNotesCount: appointmentNoteCounts.get(row.appointment.id) ?? 0,
      customerAttachmentsCount,
      projectAttachmentsCount,
      appointmentAttachmentsCount,
      totalAttachmentsCount: customerAttachmentsCount + projectAttachmentsCount + appointmentAttachmentsCount,
      appointmentTags: visibleTags,
      customerTags: customerTagsByCustomerId.get(row.customer.id) ?? [],
      projectTags: projectId ? (projectTagsByProjectId.get(projectId) ?? []) : [],
      displayMode: row.appointment.displayMode,
      employees: employeesByAppointment.get(row.appointment.id) ?? [],
      isLocked: roleKey !== "ADMIN" && isStartDateLocked(row.appointment.startDate),
      isCancelled,
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
  projectTitle?: string;
  customerLastName?: string;
  customerNumber?: string;
  orderNumber?: string;
  tagIds?: number[];
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
  const normalizedProjectTitle = params.projectTitle?.trim();
  const normalizedCustomerLastName = params.customerLastName?.trim();
  const normalizedCustomerNumber = params.customerNumber?.trim();

  const { rows, total } = await appointmentsRepository.listAppointmentsForList(
    {
      employeeId: params.employeeId,
      projectId: params.projectId,
      customerId: params.customerId,
      projectTitle: normalizedProjectTitle && normalizedProjectTitle.length > 0 ? normalizedProjectTitle : undefined,
      customerLastName: normalizedCustomerLastName && normalizedCustomerLastName.length > 0 ? normalizedCustomerLastName : undefined,
      customerNumber: normalizedCustomerNumber && normalizedCustomerNumber.length > 0 ? normalizedCustomerNumber : undefined,
      orderNumber: normalizedOrderNumber && normalizedOrderNumber.length > 0 ? normalizedOrderNumber : undefined,
      tagIds: params.tagIds,
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
  const projectArticleItemsByProject = await buildProjectArticleItemsByProject(projectIds);
  const customerNoteCounts = await appointmentsRepository.getCustomerNoteCountsByCustomerIds(customerIds);
  const projectNoteCounts = await appointmentsRepository.getProjectNoteCountsByProjectIds(projectIds);
  const appointmentNoteCounts = await appointmentsRepository.getAppointmentNoteCountsByAppointmentIds(appointmentIds);
  const appointmentTagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds(appointmentIds);
  const customerTagsByCustomerId = await appointmentsRepository.getCustomerTagsByCustomerIds(customerIds);
  const projectTagsByProjectId = await appointmentsRepository.getProjectTagsByProjectIds(projectIds);

  const items = rows.map((row) => {
    const projectId = row.project?.id ?? null;
    const rowEmployees = employeesByAppointment.get(row.appointment.id) ?? [];
    const { isCancelled, visibleTags } = resolveVisibleAppointmentTags(
      appointmentTagsByAppointmentId.get(row.appointment.id) ?? [],
    );
    return {
      id: row.appointment.id,
      projectId,
      projectName: row.project?.name ?? "Ohne Projekt",
      projectVersion: row.project?.version ?? null,
      projectOrderNumber: row.projectOrder?.orderNumber ?? null,
      projectArticleItems: projectId ? (projectArticleItemsByProject.get(projectId) ?? []) : [],
      projectDescription: row.project?.descriptionMd ?? null,
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
      appointmentTags: visibleTags,
      customerTags: customerTagsByCustomerId.get(row.customer.id) ?? [],
      projectTags: projectId ? (projectTagsByProjectId.get(projectId) ?? []) : [],
      displayMode: row.appointment.displayMode,
      isLocked: params.roleKey !== "ADMIN" && isStartDateLocked(row.appointment.startDate),
      isCancelled,
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

    await assertAppointmentNotCancelled(appointmentId, "Stornierte Termine koennen nicht geloescht werden");

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

export async function listAppointmentTagRelations(appointmentId: number) {
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return null;
  const relations = await tagRelationsService.listTagRelations("appointment", appointmentId);
  return filterVisibleAppointmentTagRelations(relations);
}

export async function addAppointmentTag(
  appointmentId: number,
  tagId: number,
  roleKey: CanonicalRoleKey,
) {
  requireDispatcherOrAdmin(roleKey);
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return null;
  if (isStartDateLocked(appointment.startDate)) {
    throw new AppointmentError("Historische Termine koennen nicht geaendert werden", 409, "PAST_APPOINTMENT_READONLY");
  }
  await assertAppointmentNotCancelled(appointmentId);
  const tag = await tagRelationsService.getTagById(tagId);
  if (!tag) {
    return null;
  }
  if (isAppointmentCancellationTag(tag)) {
    throw new AppointmentError("Der Storno-Tag kann nur ueber die Storno-Aktion gesetzt werden", 409, "CANCELLATION_TAG_PROTECTED");
  }
  return tagRelationsService.addTagRelation("appointment", appointmentId, tagId);
}

export async function removeAppointmentTag(
  appointmentId: number,
  tagId: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
) {
  requireDispatcherOrAdmin(roleKey);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new AppointmentError("Ungueltige Versionsangabe", 422, "VALIDATION_ERROR");
  }
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return null;
  if (isStartDateLocked(appointment.startDate)) {
    throw new AppointmentError("Historische Termine koennen nicht geaendert werden", 409, "PAST_APPOINTMENT_READONLY");
  }
  const tag = await tagRelationsService.getTagById(tagId);
  if (!tag) {
    return null;
  }
  if (isAppointmentCancellationTag(tag)) {
    throw new AppointmentError("Der Storno-Tag kann nicht entfernt werden", 409, "CANCELLATION_TAG_PROTECTED");
  }
  await assertAppointmentNotCancelled(appointmentId);
  const result = await tagRelationsService.removeTagRelation("appointment", appointmentId, tagId, expectedVersion);
  if (result.kind === "version_conflict") {
    throw new AppointmentError("Termin-Tag wurde zwischenzeitlich geaendert", 409, "VERSION_CONFLICT");
  }
  if (result.kind === "not_found") {
    return null;
  }
  return;
}

export async function removeEmployeeFromAppointment(
  appointmentId: number,
  employeeId: number,
  roleKey: CanonicalRoleKey,
): Promise<{ found: boolean }> {
  requireDispatcherOrAdmin(roleKey);
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return { found: false };
  await assertAppointmentNotCancelled(appointmentId, "Stornierte Termine koennen nicht bearbeitet werden");
  await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    await appointmentsRepository.deleteAppointmentEmployeeTx(tx, appointmentId, employeeId);
  });
  return { found: true };
}

export async function cancelAppointment(appointmentId: number, roleKey: CanonicalRoleKey): Promise<{ found: boolean }> {
  requireDispatcherOrAdmin(roleKey);
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return { found: false };
  if (isStartDateLocked(appointment.startDate)) {
    throw new AppointmentError("Historische Termine koennen nicht geaendert werden", 409, "PAST_APPOINTMENT_READONLY");
  }

  const cancellationTag = await tagRelationsService.ensureAppointmentCancellationTag();

  const relations = await tagRelationsService.listTagRelations("appointment", appointmentId);
  if (relations.some((relation) => isAppointmentCancellationTag(relation.tag))) {
    return { found: true };
  }

  await tagRelationsService.addTagRelation("appointment", appointmentId, cancellationTag.id);
  return { found: true };
}

export function isAppointmentError(err: unknown): err is AppointmentError {
  return err instanceof AppointmentError;
}
