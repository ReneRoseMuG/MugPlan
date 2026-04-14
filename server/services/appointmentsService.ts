import { defaultAppointmentDisplayMode, type AppointmentDisplayMode } from "@shared/appointmentDisplayMode";
import {
  MANAGED_MESSE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
  RESERVED_VACANT_TAG_NAME,
} from "@shared/appointmentCancellation";
import type { InsertAppointment } from "@shared/schema";
import { addDays, addWeeks, differenceInCalendarDays, endOfWeek, getISOWeek, getISOWeekYear, startOfWeek } from "date-fns";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as notesRepository from "../repositories/notesRepository";
import * as tourWeekEmployeesRepository from "../repositories/tourWeekEmployeesRepository";
import {
  getProjectArticleField,
  getProjectArticleFieldByCategoryName,
  type ProjectArticleFieldKey,
  type ProjectArticleItem,
} from "@shared/projectArticleList";
import * as customersRepository from "../repositories/customersRepository";
import * as projectsRepository from "../repositories/projectsRepository";
import * as toursRepository from "../repositories/toursRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import { dispatchCalDavDelete, dispatchCalDavUpsert } from "./caldavSyncDispatcher";
import {
  filterVisibleAppointmentTagRelations,
  hasAppointmentCancellationTag,
  hasReservedPlanningBlockedTag,
  isAppointmentCancellationTag,
  isReservedPlanningBlockedTag,
  isReservedVacantTag,
} from "../lib/appointmentCancellation";
import { logDebug, logInfo } from "../lib/logger";
import * as tagRelationsService from "./tagRelationsService";
import * as tourWeekEmployeesService from "./tourWeekEmployeesService";
import * as tourWeeksService from "./tourWeeksService";

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
    | "CANCELLED_APPOINTMENT_READONLY"
    | "PLANNING_BLOCKED_APPOINTMENT_READONLY"
    | "ALREADY_PARKED";
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
      | "CANCELLED_APPOINTMENT_READONLY"
      | "PLANNING_BLOCKED_APPOINTMENT_READONLY"
      | "ALREADY_PARKED",
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

function isParkplatzTourId(tourId: number | null | undefined, parkplatzTourId: number | null): boolean {
  return typeof tourId === "number" && Number.isInteger(tourId) && parkplatzTourId != null && tourId === parkplatzTourId;
}

function normalizeComparableTourName(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("de");
}

function isMesseTourName(value: string | null | undefined): boolean {
  const normalized = normalizeComparableTourName(value);
  return normalized === normalizeComparableTourName("Messe")
    || normalized === normalizeComparableTourName("Tour Messe");
}

async function shouldTreatTourAsMesse(tourId: number | null | undefined): Promise<boolean> {
  if (tourId == null) return false;
  const allTours = await toursRepository.getTours();
  const tour = allTours.find((entry) => entry.id === tourId) ?? null;
  return isMesseTourName(tour?.name);
}

function allowsHistoricalParkplatzMutation(
  existingTourId: number | null | undefined,
  nextTourId: number | null | undefined,
  parkplatzTourId: number | null,
): boolean {
  return isParkplatzTourId(existingTourId, parkplatzTourId) || isParkplatzTourId(nextTourId, parkplatzTourId);
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
    visibleTags: appointmentTags,
  };
}

async function getAppointmentTagsForGuard(appointmentId: number): Promise<Array<{ name: string }>> {
  const appointmentTagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds([appointmentId]);
  return (appointmentTagsByAppointmentId.get(appointmentId) ?? []) as Array<{ name: string }>;
}

async function assertAppointmentWriteAllowed(
  appointmentId: number,
  appointment: { startDate: Date | string | null | undefined; tourId: number | null | undefined },
  options: {
    parkplatzTourId: number | null;
    allowHistorical?: boolean;
    allowCancelled?: boolean;
    allowPlanningBlocked?: boolean;
    historicalMessage?: string;
    cancelledMessage?: string;
    planningBlockedMessage?: string;
  },
): Promise<void> {
  if (!options.allowHistorical && isHistoricalAppointmentMutationLocked(appointment, options.parkplatzTourId)) {
    throw new AppointmentError(
      options.historicalMessage ?? "Historische Termine koennen nicht geaendert werden",
      409,
      "PAST_APPOINTMENT_READONLY",
    );
  }

  const appointmentTags = await getAppointmentTagsForGuard(appointmentId);
  if (!options.allowCancelled && hasAppointmentCancellationTag(appointmentTags)) {
    throw new AppointmentError(
      options.cancelledMessage ?? "Stornierte Termine koennen nicht geaendert werden",
      409,
      "CANCELLED_APPOINTMENT_READONLY",
    );
  }
  if (!options.allowPlanningBlocked && hasReservedPlanningBlockedTag(appointmentTags)) {
    throw new AppointmentError(
      options.planningBlockedMessage ?? "Planung blockierte Termine koennen nicht geaendert werden",
      409,
      "PLANNING_BLOCKED_APPOINTMENT_READONLY",
    );
  }
}

function assertNotHistoricalInput(
  data: { startDate: string; startTime?: string | null },
  options?: { allowHistorical?: boolean },
) {
  if (options?.allowHistorical) return;
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

const sortEmployeesByName = <T extends { fullName: string }>(employees: T[]): T[] =>
  [...employees].sort((left, right) => left.fullName.localeCompare(right.fullName, "de", { sensitivity: "base" }));

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
          source: "product",
          shortCode: row.productShortCode?.trim() || null,
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
      source: "component",
      shortCode: row.componentShortCode?.trim() || null,
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
    customerAttachmentCounts,
    projectAttachmentCounts,
    appointmentAttachmentCounts,
    appointmentTagsByAppointmentId,
    customerTagsByCustomerId,
    projectTagsByProjectId,
    parkplatzTourId,
  ] = await Promise.all([
    buildEmployeesByAppointment(appointmentIds),
    buildProjectArticleItemsByProject(projectIds),
    appointmentsRepository.getCustomerNoteCountsByCustomerIds(customerIds),
    appointmentsRepository.getProjectNoteCountsByProjectIds(projectIds),
    appointmentsRepository.getAppointmentNoteCountsByAppointmentIds(appointmentIds),
    appointmentsRepository.getCustomerAttachmentCountsByCustomerIds(customerIds),
    appointmentsRepository.getProjectAttachmentCountsByProjectIds(projectIds),
    appointmentsRepository.getAppointmentAttachmentCountsByAppointmentIds(appointmentIds),
    appointmentsRepository.getAppointmentTagsByAppointmentIds(appointmentIds),
    appointmentsRepository.getCustomerTagsByCustomerIds(customerIds),
    appointmentsRepository.getProjectTagsByProjectIds(projectIds),
    getParkplatzTourId(),
  ]);

  return rows.map((row) => {
    const projectId = row.project?.id ?? null;
    const { isCancelled, visibleTags } = resolveVisibleAppointmentTags(
      appointmentTagsByAppointmentId.get(row.appointment.id) ?? [],
    );
    const customerAttachmentsCount = customerAttachmentCounts.get(row.customer.id) ?? 0;
    const projectAttachmentsCount = projectId ? (projectAttachmentCounts.get(projectId) ?? 0) : 0;
    const appointmentAttachmentsCount = appointmentAttachmentCounts.get(row.appointment.id) ?? 0;
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
        company: row.customer.company ?? null,
        phone: row.customer.phone ?? null,
        email: row.customer.email ?? null,
        addressLine1: row.customer.addressLine1 ?? null,
        addressLine2: row.customer.addressLine2 ?? null,
        postalCode: row.customer.postalCode ?? null,
        city: row.customer.city ?? null,
        country: row.customer.country ?? null,
      },
      employees: employeesByAppointment.get(row.appointment.id) ?? [],
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
      isLocked: isAppointmentLockedForRole(row.appointment, roleKey, parkplatzTourId),
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
    if (await shouldTreatTourAsMesse(appointmentData.tourId ?? null)) {
      const messeTag = await tagRelationsService.getTagByName(MANAGED_MESSE_TAG_NAME);
      if (!messeTag) {
        throw new AppointmentError("Messe-Tag ist nicht konfiguriert", 409, "BUSINESS_CONFLICT");
      }
      await appointmentsRepository.addAppointmentTagTx(tx, appointmentId, messeTag.id);
    }
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
    const parkplatzTourId = await getParkplatzTourId();
    await assertAppointmentWriteAllowed(appointmentId, existing, {
      parkplatzTourId,
      historicalMessage: roleKey !== "ADMIN"
        ? "Termin ist ab dem Starttag gesperrt"
        : "Historische Termine koennen nicht geaendert werden",
    });
    const nextTourId = data.tourId !== undefined ? (data.tourId ?? null) : (existing.tourId ?? null);
    assertNotHistoricalInput(
      { startDate: data.startDate, startTime: data.startTime ?? null },
      { allowHistorical: allowsHistoricalParkplatzMutation(existing.tourId, nextTourId, parkplatzTourId) },
    );

    const relation = await resolveAppointmentRelationTx(
      tx,
      { projectId: data.projectId, customerId: data.customerId },
      "update",
      { projectId: existing.projectId ?? null, customerId: existing.customerId },
    );

    await assertNoInactiveEmployeesTx(tx, employeeIds);

    const newTourId = nextTourId;
    const tourChanged = existing.tourId !== newTourId;
    if (tourChanged) {
      logInfo(`${logPrefix} tour change detected appointmentId=${appointmentId}`);
    }

    let geparktTagIdForRemoval: number | null = null;
    let shouldAddMesseTag = false;
    let shouldRemoveMesseTag = false;
    if (tourChanged && existing.tourId != null) {
      const allTours = await toursRepository.getTours();
      const parkplatzTour = findParkplatzTour(allTours);
      if (parkplatzTour && existing.tourId === parkplatzTour.id) {
        const geparktTag = await tagRelationsService.getTagByName(RESERVED_VACANT_TAG_NAME);
        if (geparktTag) {
          geparktTagIdForRemoval = geparktTag.id;
        }
      }

      const previousTour = allTours.find((tour) => tour.id === existing.tourId) ?? null;
      const nextTour = allTours.find((tour) => tour.id === newTourId) ?? null;
      const wasMesseTour = isMesseTourName(previousTour?.name);
      const isNowMesseTour = isMesseTourName(nextTour?.name);

      shouldAddMesseTag = !wasMesseTour && isNowMesseTour;
      shouldRemoveMesseTag = wasMesseTour && !isNowMesseTour;
    } else if (tourChanged && newTourId != null) {
      const allTours = await toursRepository.getTours();
      const nextTour = allTours.find((tour) => tour.id === newTourId) ?? null;
      shouldAddMesseTag = isMesseTourName(nextTour?.name);
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
    if (geparktTagIdForRemoval !== null) {
      await appointmentsRepository.removeAppointmentTagByTagIdTx(tx, appointmentId, geparktTagIdForRemoval);
    }
    if (shouldAddMesseTag || shouldRemoveMesseTag) {
      const messeTag = await tagRelationsService.getTagByName(MANAGED_MESSE_TAG_NAME);
      if (!messeTag) {
        throw new AppointmentError("Messe-Tag ist nicht konfiguriert", 409, "BUSINESS_CONFLICT");
      }

      if (shouldAddMesseTag) {
        await appointmentsRepository.addAppointmentTagTx(tx, appointmentId, messeTag.id);
      }
      if (shouldRemoveMesseTag) {
        await appointmentsRepository.removeAppointmentTagByTagIdTx(tx, appointmentId, messeTag.id);
      }
    }
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
    const parkplatzTourId = await getParkplatzTourId();
    await assertAppointmentWriteAllowed(appointmentId, existing, {
      parkplatzTourId,
      historicalMessage: roleKey !== "ADMIN"
        ? "Termin ist ab dem Starttag gesperrt"
        : "Historische Termine koennen nicht geaendert werden",
    });

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

  const rows = await appointmentsRepository.listAppointmentsByTourForDateRange(params.tourId, firstWeekStart, finalToDate);

  const appointmentIds = Array.from(new Set(rows.map((row) => row.appointment.id)));
  const projectIds = Array.from(new Set(rows.map((row) => row.project?.id).filter((id): id is number => Number.isFinite(id))));
  const customerIds = Array.from(new Set(rows.map((row) => row.customer.id)));

  const [
    employeesByAppointment,
    projectArticleItemsByProject,
    customerPrintNotesByCustomer,
    projectPrintNotesByProject,
    appointmentPrintNotesByAppointment,
    appointmentTagsByAppointmentId,
    customerTagsByCustomerId,
    projectTagsByProjectId,
  ] = await Promise.all([
    buildEmployeesByAppointment(appointmentIds),
    buildProjectArticleItemsByProject(projectIds),
    appointmentsRepository.getCustomerPrintNotesByCustomerIds(customerIds),
    appointmentsRepository.getProjectPrintNotesByProjectIds(projectIds),
    appointmentsRepository.getAppointmentPrintNotesByAppointmentIds(appointmentIds),
    appointmentsRepository.getAppointmentTagsByAppointmentIds(appointmentIds),
    appointmentsRepository.getCustomerTagsByCustomerIds(customerIds),
    appointmentsRepository.getProjectTagsByProjectIds(projectIds),
  ]);

  const weekRanges = Array.from({ length: normalizedWeekCount }, (_, index) => {
    const weekStart = addWeeks(firstWeekStart, index);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return { weekStart, weekEnd };
  });

  const weekNotesByIndex = await Promise.all(
    weekRanges.map(({ weekStart }) =>
      notesRepository.getCalendarWeekNotes(getISOWeekYear(weekStart), getISOWeek(weekStart), params.tourId === 0 ? null : params.tourId),
    ),
  );

  const weeks = weekRanges.map(({ weekStart, weekEnd }, index) => ({
    weekStart: toDateOnlyString(weekStart) ?? "",
    weekEnd: toDateOnlyString(weekEnd) ?? "",
    weekNotes: weekNotesByIndex[index].filter((note) => note.print).map((note) => ({
      id: note.id,
      sourceType: "appointment" as const,
      title: note.title,
      body: note.body ?? null,
      cardColor: note.cardColor ?? null,
      print: note.print,
      updatedAt: new Date(note.updatedAt).toISOString(),
    })),
  }));

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
      projectName: row.project?.name ?? "",
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
        phone: row.customer.phone ?? null,
        addressLine1: row.customer.addressLine1 ?? null,
        addressLine2: row.customer.addressLine2 ?? null,
        postalCode: row.customer.postalCode ?? null,
        city: row.customer.city ?? null,
        country: row.customer.country ?? null,
      },
      employees: employeesByAppointment.get(row.appointment.id) ?? [],
      printNotes,
      appointmentTags: appointmentTagsByAppointmentId.get(row.appointment.id) ?? [],
      customerTags: customerTagsByCustomerId.get(row.customer.id) ?? [],
      projectTags: projectId ? (projectTagsByProjectId.get(projectId) ?? []) : [],
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
  const parkplatzTourId = await getParkplatzTourId();

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
        country: row.customer.country ?? null,
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
      isLocked: isAppointmentLockedForRole(row.appointment, roleKey, parkplatzTourId),
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
          country: row.customer.country ?? null,
        },
      };
    }

    return baseAppointment;
  });
}

export async function listCalendarWeekLaneEmployeePreviews({
  fromDate,
  toDate,
  roleKey: _roleKey,
}: {
  fromDate: string;
  toDate: string;
  roleKey: CanonicalRoleKey;
}) {
  const requestedFromDate = parseDateOnly(fromDate);
  const requestedToDate = parseDateOnly(toDate);
  if (requestedToDate < requestedFromDate) {
    throw new AppointmentError("toDate darf nicht vor fromDate liegen", 422, "VALIDATION_ERROR");
  }

  const rows = await appointmentsRepository.listAppointmentsForCalendarRange({
    fromDate: requestedFromDate,
    toDate: requestedToDate,
  });
  const appointmentIds = Array.from(new Set(rows.map((row) => row.appointment.id)));
  const employeesByAppointment = await buildEmployeesByAppointment(appointmentIds);
  const tours = await toursRepository.getTours();
  const assignmentRows = tours.length > 0
    ? await tourWeekEmployeesRepository.listAssignmentsByTourIds(tours.map((tour) => tour.id))
    : [];

  type PreviewAccumulator = {
    date: string;
    weekStartDate: string;
    tourId: number;
    weekEmployees: Map<number, string>;
    additionalDayEmployees: Map<number, string>;
  };

  const previewByKey = new Map<string, PreviewAccumulator>();
  const assignmentsByTourWeek = new Map<string, Array<{ id: number; fullName: string }>>();

  for (const assignment of assignmentRows) {
    const key = `${assignment.tourId}-${assignment.isoYear}-${assignment.isoWeek}`;
    const existing = assignmentsByTourWeek.get(key) ?? [];
    existing.push({ id: assignment.employeeId, fullName: assignment.fullName });
    assignmentsByTourWeek.set(key, existing);
  }

  for (const [key, employees] of Array.from(assignmentsByTourWeek.entries())) {
    assignmentsByTourWeek.set(key, sortEmployeesByName(employees));
  }

  const getOrCreatePreview = (tourId: number, date: string) => {
    const key = `${tourId}-${date}`;
    const existing = previewByKey.get(key);
    if (existing) return existing;

    const weekStartDate = toDateOnlyString(startOfWeek(parseDateOnly(date), { weekStartsOn: 1 })) ?? date;
    const created: PreviewAccumulator = {
      date,
      weekStartDate,
      tourId,
      weekEmployees: new Map<number, string>(),
      additionalDayEmployees: new Map<number, string>(),
    };
    previewByKey.set(key, created);
    return created;
  };

  const seedWeekEmployeesForDate = (tourId: number, date: string) => {
    const preview = getOrCreatePreview(tourId, date);
    const dateValue = parseDateOnly(date);
    const assignmentKey = `${tourId}-${getISOWeekYear(dateValue)}-${getISOWeek(dateValue)}`;
    for (const employee of assignmentsByTourWeek.get(assignmentKey) ?? []) {
      preview.weekEmployees.set(employee.id, employee.fullName);
    }
    return preview;
  };

  for (const [key, employees] of Array.from(assignmentsByTourWeek.entries())) {
    const [tourIdText, isoYearText, isoWeekText] = key.split("-");
    const tourId = Number(tourIdText);
    const isoYear = Number(isoYearText);
    const isoWeek = Number(isoWeekText);
    if (!Number.isInteger(tourId) || !Number.isInteger(isoYear) || !Number.isInteger(isoWeek)) continue;

    const week = tourWeekEmployeesService.resolveIsoWeekWindow(isoYear, isoWeek);
    const effectiveStartDate = week.weekStartDate < fromDate ? fromDate : week.weekStartDate;
    const effectiveEndDate = week.weekEndDate > toDate ? toDate : week.weekEndDate;
    if (effectiveEndDate < effectiveStartDate) continue;

    let cursor = parseDateOnly(effectiveStartDate);
    const endCursor = parseDateOnly(effectiveEndDate);
    while (cursor <= endCursor) {
      const date = toDateOnlyString(cursor);
      if (date) {
        const preview = getOrCreatePreview(tourId, date);
        for (const employee of employees) {
          preview.weekEmployees.set(employee.id, employee.fullName);
        }
      }
      cursor = addDays(cursor, 1);
    }
  }

  for (const row of rows) {
    const tourId = row.appointment.tourId;
    if (typeof tourId !== "number" || !Number.isInteger(tourId) || tourId <= 0) continue;
    const resolvedTourId = Number(tourId);

    const appointmentEmployees = employeesByAppointment.get(row.appointment.id) ?? [];
    const appointmentStartDate = toDateOnlyString(row.appointment.startDate);
    const appointmentEndDate = toDateOnlyString(row.appointment.endDate) ?? appointmentStartDate;
    if (!appointmentStartDate || !appointmentEndDate) continue;

    const effectiveStartDate = appointmentStartDate < fromDate ? fromDate : appointmentStartDate;
    const effectiveEndDate = appointmentEndDate > toDate ? toDate : appointmentEndDate;
    if (effectiveEndDate < effectiveStartDate) continue;

    let cursor = parseDateOnly(effectiveStartDate);
    const endCursor = parseDateOnly(effectiveEndDate);
    while (cursor <= endCursor) {
      const date = toDateOnlyString(cursor);
      if (date) {
        const preview = seedWeekEmployeesForDate(resolvedTourId, date);
        for (const employee of appointmentEmployees) {
          if (preview.weekEmployees.has(employee.id)) continue;
          preview.additionalDayEmployees.set(employee.id, employee.fullName);
        }
      }
      cursor = addDays(cursor, 1);
    }
  }

  return Array.from(previewByKey.values())
    .map((preview) => ({
      date: preview.date,
      weekStartDate: preview.weekStartDate,
      tourId: preview.tourId,
      weekEmployees: sortEmployeesByName(
        Array.from(preview.weekEmployees.entries()).map(([id, fullName]) => ({ id, fullName })),
      ),
      additionalDayEmployees: sortEmployeesByName(
        Array.from(preview.additionalDayEmployees.entries()).map(([id, fullName]) => ({ id, fullName })),
      ),
    }))
    .sort((left, right) => {
      if (left.date !== right.date) return left.date.localeCompare(right.date);
      return left.tourId - right.tourId;
    });
}

export async function listCalendarBlockedTourWeeks(params: {
  fromDate: string;
  toDate: string;
}) {
  return tourWeeksService.listBlockedTourWeeksForRange(params);
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

  const { rows, total, availableRange } = await appointmentsRepository.listAppointmentsForList(
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
  const customerAttachmentCounts = await appointmentsRepository.getCustomerAttachmentCountsByCustomerIds(customerIds);
  const projectAttachmentCounts = await appointmentsRepository.getProjectAttachmentCountsByProjectIds(projectIds);
  const appointmentTagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds(appointmentIds);
  const customerTagsByCustomerId = await appointmentsRepository.getCustomerTagsByCustomerIds(customerIds);
  const projectTagsByProjectId = await appointmentsRepository.getProjectTagsByProjectIds(projectIds);
  const appointmentAttachmentCounts = await appointmentsRepository.getAppointmentAttachmentCountsByAppointmentIds(appointmentIds);
  const parkplatzTourId = await getParkplatzTourId();

  const items = rows.map((row) => {
    const projectId = row.project?.id ?? null;
    const rowEmployees = employeesByAppointment.get(row.appointment.id) ?? [];
    const { isCancelled, visibleTags } = resolveVisibleAppointmentTags(
      appointmentTagsByAppointmentId.get(row.appointment.id) ?? [],
    );
    const customerAttachmentsCount = customerAttachmentCounts.get(row.customer.id) ?? 0;
    const projectAttachmentsCount = projectId ? (projectAttachmentCounts.get(projectId) ?? 0) : 0;
    const appointmentAttachmentsCount = appointmentAttachmentCounts.get(row.appointment.id) ?? 0;
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
        company: row.customer.company ?? null,
        phone: row.customer.phone ?? null,
        email: row.customer.email ?? null,
        addressLine1: row.customer.addressLine1 ?? null,
        addressLine2: row.customer.addressLine2 ?? null,
        postalCode: row.customer.postalCode ?? null,
        city: row.customer.city ?? null,
        country: row.customer.country ?? null,
      },
      employees: rowEmployees,
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
      isLocked: isAppointmentLockedForRole(row.appointment, params.roleKey, parkplatzTourId),
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
    availableRange,
    items,
  };
}

export async function deleteAppointment(appointmentId: number, expectedVersion: number, _roleKey: CanonicalRoleKey) {
  const deleted = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const existing = await appointmentsRepository.getAppointmentTx(tx, appointmentId);
    if (!existing) return null;
    const parkplatzTourId = await getParkplatzTourId();
    await assertAppointmentWriteAllowed(appointmentId, existing, {
      parkplatzTourId,
      historicalMessage: "Historische Termine koennen nicht geloescht werden",
      cancelledMessage: "Stornierte Termine koennen nicht geloescht werden",
      planningBlockedMessage: "Planung blockierte Termine koennen nicht geloescht werden",
    });

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
  const tag = await tagRelationsService.getTagById(tagId);
  if (!tag) {
    return null;
  }
  if (isAppointmentCancellationTag(tag)) {
    throw new AppointmentError("Der Storno-Tag kann nur ueber die Storno-Aktion gesetzt werden", 409, "CANCELLATION_TAG_PROTECTED");
  }
  if (isReservedVacantTag(tag)) {
    throw new AppointmentError("Der Geparkt-Tag kann nur ueber die Parken-Aktion gesetzt werden", 409, "CANCELLATION_TAG_PROTECTED");
  }
  if (isReservedPlanningBlockedTag(tag)) {
    throw new AppointmentError("Der Planung-blockiert-Tag kann nicht manuell gesetzt werden", 409, "CANCELLATION_TAG_PROTECTED");
  }
  const parkplatzTourId = await getParkplatzTourId();
  await assertAppointmentWriteAllowed(appointmentId, appointment, {
    parkplatzTourId,
    historicalMessage: "Historische Termine koennen nicht geaendert werden",
    cancelledMessage: "Stornierte Termine koennen nicht geaendert werden",
    planningBlockedMessage: "Planung blockierte Termine koennen nicht geaendert werden",
  });
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
  const tag = await tagRelationsService.getTagById(tagId);
  if (!tag) {
    return null;
  }
  if (isAppointmentCancellationTag(tag)) {
    throw new AppointmentError("Der Storno-Tag kann nicht entfernt werden", 409, "CANCELLATION_TAG_PROTECTED");
  }
  if (isReservedVacantTag(tag)) {
    throw new AppointmentError("Der Geparkt-Tag kann nicht manuell entfernt werden", 409, "CANCELLATION_TAG_PROTECTED");
  }
  if (isReservedPlanningBlockedTag(tag)) {
    throw new AppointmentError("Der Planung-blockiert-Tag kann nicht manuell entfernt werden", 409, "CANCELLATION_TAG_PROTECTED");
  }
  const parkplatzTourId = await getParkplatzTourId();
  await assertAppointmentWriteAllowed(appointmentId, appointment, {
    parkplatzTourId,
    historicalMessage: "Historische Termine koennen nicht geaendert werden",
    cancelledMessage: "Stornierte Termine koennen nicht geaendert werden",
    planningBlockedMessage: "Planung blockierte Termine koennen nicht geaendert werden",
  });
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
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<{ found: boolean }> {
  requireDispatcherOrAdmin(roleKey);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new AppointmentError("Ungueltige Versionsangabe", 422, "VALIDATION_ERROR");
  }
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return { found: false };
  return appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const existing = await appointmentsRepository.getAppointmentTx(tx, appointmentId);
    if (!existing) return { found: false } as const;
    const parkplatzTourId = await getParkplatzTourId();
    await assertAppointmentWriteAllowed(appointmentId, existing, {
      parkplatzTourId,
      historicalMessage: "Historische Termine koennen nicht geaendert werden",
      cancelledMessage: "Stornierte Termine koennen nicht bearbeitet werden",
      planningBlockedMessage: "Planung blockierte Termine koennen nicht bearbeitet werden",
    });
    const updateResult = await appointmentsRepository.bumpAppointmentVersionTx(tx, {
      appointmentId,
      expectedVersion,
    });
    if (updateResult.kind === "version_conflict") {
      throw new AppointmentError("Termin wurde zwischenzeitlich geaendert", 409, "VERSION_CONFLICT");
    }
    await appointmentsRepository.deleteAppointmentEmployeeTx(tx, appointmentId, employeeId);
    return { found: true } as const;
  });
}

export async function cancelAppointment(
  appointmentId: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<{ found: boolean }> {
  requireDispatcherOrAdmin(roleKey);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new AppointmentError("Ungueltige Versionsangabe", 422, "VALIDATION_ERROR");
  }
  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return { found: false };

  const cancellationTag = await tagRelationsService.getTagByName(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
  if (!cancellationTag) {
    throw new AppointmentError(
      "System-Tag 'Storniert' fehlt. Bitte den Admin-System-Seed ausfuehren.",
      409,
      "BUSINESS_CONFLICT",
    );
  }
  const result = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const existing = await appointmentsRepository.getAppointmentTx(tx, appointmentId);
    if (!existing) return { found: false } as const;
    const parkplatzTourId = await getParkplatzTourId();
    await assertAppointmentWriteAllowed(appointmentId, existing, {
      parkplatzTourId,
      allowCancelled: true,
      allowPlanningBlocked: true,
      historicalMessage: "Historische Termine koennen nicht geaendert werden",
    });

    const updateResult = await appointmentsRepository.bumpAppointmentVersionTx(tx, {
      appointmentId,
      expectedVersion,
    });
    if (updateResult.kind === "version_conflict") {
      throw new AppointmentError("Termin wurde zwischenzeitlich geaendert", 409, "VERSION_CONFLICT");
    }

    await appointmentsRepository.replaceAppointmentEmployeesTx(tx, appointmentId, []);
    if (existing.projectId != null) {
      await projectsRepository.setProjectOrderAmountTx(tx, existing.projectId, "0.00");
    }
    await appointmentsRepository.addAppointmentTagTx(tx, appointmentId, cancellationTag.id);
    return { found: true } as const;
  });

  return result;
}

function normalizeTourName(value: string): string {
  return value.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
}

function findParkplatzTour(tours: Awaited<ReturnType<typeof toursRepository.getTours>>) {
  return tours.find((tour) => normalizeTourName(tour.name) === normalizeTourName("Parkplatz")) ?? null;
}

async function getParkplatzTour(): Promise<Awaited<ReturnType<typeof findParkplatzTour>>> {
  const allTours = await toursRepository.getTours();
  return findParkplatzTour(allTours);
}

async function getParkplatzTourId(): Promise<number | null> {
  return (await getParkplatzTour())?.id ?? null;
}

function isHistoricalAppointmentMutationLocked(
  appointment: { startDate: Date | string | null | undefined; tourId: number | null | undefined },
  parkplatzTourId: number | null,
): boolean {
  if (!isStartDateLocked(appointment.startDate)) return false;
  return !isParkplatzTourId(appointment.tourId, parkplatzTourId);
}

function isAppointmentLockedForRole(
  appointment: { startDate: Date | string | null | undefined; tourId: number | null | undefined },
  roleKey: CanonicalRoleKey,
  parkplatzTourId: number | null,
): boolean {
  return roleKey !== "ADMIN" && isHistoricalAppointmentMutationLocked(appointment, parkplatzTourId);
}

export async function parkAppointment(
  appointmentId: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
): Promise<{ found: boolean }> {
  requireDispatcherOrAdmin(roleKey);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new AppointmentError("Ungueltige Versionsangabe", 422, "VALIDATION_ERROR");
  }

  const appointment = await appointmentsRepository.getAppointment(appointmentId);
  if (!appointment) return { found: false };

  const parkplatzTourId = await getParkplatzTourId();
  await assertAppointmentWriteAllowed(appointmentId, appointment, {
    parkplatzTourId,
    historicalMessage: "Historische Termine koennen nicht geparkt werden",
    cancelledMessage: "Stornierte Termine koennen nicht geparkt werden",
    planningBlockedMessage: "Planung blockierte Termine koennen nicht geparkt werden",
  });

  const parkplatzTour = await getParkplatzTour();
  if (!parkplatzTour) {
    throw new AppointmentError(
      "Tour 'Parkplatz' nicht gefunden. Bitte den Admin-System-Seed ausfuehren.",
      409,
      "BUSINESS_CONFLICT",
    );
  }

  const geparktTag = await tagRelationsService.getTagByName(RESERVED_VACANT_TAG_NAME);
  if (!geparktTag) {
    throw new AppointmentError(
      "System-Tag 'Geparkt' fehlt. Bitte den Admin-System-Seed ausfuehren.",
      409,
      "BUSINESS_CONFLICT",
    );
  }

  const result = await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    const existing = await appointmentsRepository.getAppointmentTx(tx, appointmentId);
    if (!existing) return { found: false } as const;

    if (existing.tourId === parkplatzTour.id) {
      throw new AppointmentError("Termin ist bereits geparkt", 409, "ALREADY_PARKED");
    }

    const parkResult = await appointmentsRepository.setAppointmentParkTx(tx, {
      appointmentId,
      expectedVersion,
      tourId: parkplatzTour.id,
    });
    if (parkResult.kind === "version_conflict") {
      throw new AppointmentError("Termin wurde zwischenzeitlich geaendert", 409, "VERSION_CONFLICT");
    }

    await appointmentsRepository.replaceAppointmentEmployeesTx(tx, appointmentId, []);
    await appointmentsRepository.addAppointmentTagTx(tx, appointmentId, geparktTag.id);

    return { found: true } as const;
  });

  return result;
}

export async function previewAppointmentTourChange(
  appointmentId: number,
  params: {
    newTourId: number | null;
    newStartDate: string;
    newEndDate?: string | null;
    newStartTime?: string | null;
  },
) {
  return tourWeekEmployeesService.previewAppointmentTourChange(appointmentId, params);
}

export function isAppointmentError(err: unknown): err is AppointmentError {
  return err instanceof AppointmentError;
}
