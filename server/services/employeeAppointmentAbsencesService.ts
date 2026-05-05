import {
  addWeeks,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import {
  ABSENCE_CUSTOMER_ADDRESS_LINE1,
  ABSENCE_CUSTOMER_CITY,
  ABSENCE_CUSTOMER_COUNTRY,
  ABSENCE_CUSTOMER_NAME,
  ABSENCE_CUSTOMER_NUMBER,
  ABSENCE_CUSTOMER_POSTAL_CODE,
  ABSENCE_TAG_DEFINITIONS,
  ABSENCE_TOUR_COLOR,
  ABSENCE_TOUR_NAME,
  type AbsenceType,
  getAbsenceTagName,
  isAbsenceTagName,
  isAbsenceTourName,
} from "@shared/absenceAppointments";
import type { EmployeeAppointmentAbsenceInput } from "@shared/routes";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as customersRepository from "../repositories/customersRepository";
import * as employeesRepository from "../repositories/employeesRepository";
import * as masterDataRepository from "../repositories/masterDataRepository";
import * as tourWeekEmployeesRepository from "../repositories/tourWeekEmployeesRepository";
import * as toursRepository from "../repositories/toursRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import * as appointmentsService from "./appointmentsService";
import { dispatchCalDavUpsert } from "./caldavSyncDispatcher";
import * as tourWeekEmployeesService from "./tourWeekEmployeesService";

type WeekPlanningRemovalConflict = {
  assignmentId: number;
  tourId: number;
  tourName: string;
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
};

export class EmployeeAppointmentAbsencesError extends Error {
  status: number;
  code:
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "BUSINESS_CONFLICT"
    | "ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL"
    | "PAST_APPOINTMENT_READONLY"
    | "VERSION_CONFLICT";
  employeeRemovalConflicts?: Awaited<ReturnType<typeof appointmentsService.listEmployeeAppointmentsByScope>>;
  weekPlanningRemovalConflicts?: WeekPlanningRemovalConflict[];

  constructor(
    status: number,
    code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "BUSINESS_CONFLICT"
      | "ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL"
      | "PAST_APPOINTMENT_READONLY"
      | "VERSION_CONFLICT",
    message?: string,
    options?: {
      employeeRemovalConflicts?: Awaited<ReturnType<typeof appointmentsService.listEmployeeAppointmentsByScope>>;
      weekPlanningRemovalConflicts?: WeekPlanningRemovalConflict[];
    },
  ) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.employeeRemovalConflicts = options?.employeeRemovalConflicts;
    this.weekPlanningRemovalConflicts = options?.weekPlanningRemovalConflicts;
  }
}

function requireDispatcherOrAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
    throw new EmployeeAppointmentAbsencesError(403, "FORBIDDEN");
  }
}

function normalizeOptionalNote(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalCustomerField(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeConfirmedEmployeeRemovalAppointments(input: EmployeeAppointmentAbsenceInput["confirmedEmployeeRemovalAppointments"]) {
  const confirmed = new Map<number, number>();
  for (const item of input ?? []) {
    confirmed.set(item.appointmentId, item.version);
  }
  return confirmed;
}

function normalizeConfirmedWeekPlanningRemovals(input: EmployeeAppointmentAbsenceInput["confirmedWeekPlanningRemovals"]) {
  const confirmed = new Map<number, string>();
  for (const item of input ?? []) {
    confirmed.set(item.assignmentId, `${item.tourId}:${item.isoYear}:${item.isoWeek}`);
  }
  return confirmed;
}

function dateRangesOverlap(leftStart: string, leftEnd: string | null | undefined, rightStart: string, rightEnd: string | null | undefined): boolean {
  const normalizedLeftEnd = leftEnd ?? leftStart;
  const normalizedRightEnd = rightEnd ?? rightStart;
  return leftStart <= normalizedRightEnd && rightStart <= normalizedLeftEnd;
}

function parseAbsenceDateOnly(input: string): Date {
  const parsed = parseISO(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new EmployeeAppointmentAbsencesError(422, "VALIDATION_ERROR", "Ungültiges Datum");
  }
  return parsed;
}

function resolveAffectedIsoWeeks(input: Pick<EmployeeAppointmentAbsenceInput, "startDate" | "endDate">): Array<{ isoYear: number; isoWeek: number }> {
  const startDate = parseAbsenceDateOnly(input.startDate);
  const endDate = parseAbsenceDateOnly(input.endDate ?? input.startDate);
  if (endDate < startDate) {
    throw new EmployeeAppointmentAbsencesError(422, "VALIDATION_ERROR", "Das Bis-Datum darf nicht vor dem Von-Datum liegen.");
  }

  const result: Array<{ isoYear: number; isoWeek: number }> = [];
  const seen = new Set<string>();
  for (let cursor = startOfISOWeek(startDate); cursor <= endDate; cursor = addWeeks(cursor, 1)) {
    const isoYear = getISOWeekYear(cursor);
    const isoWeek = getISOWeek(cursor);
    const key = `${isoYear}:${isoWeek}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ isoYear, isoWeek });
    }
  }
  return result;
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

function getAbsenceRangeEndDate(input: Pick<EmployeeAppointmentAbsenceInput, "startDate" | "endDate">): string {
  return input.endDate ?? input.startDate;
}

function canWriteAbsenceRange(roleKey: CanonicalRoleKey, input: Pick<EmployeeAppointmentAbsenceInput, "startDate" | "endDate">): boolean {
  if (roleKey === "ADMIN") return true;
  return getAbsenceRangeEndDate(input) >= getBerlinTodayDateString();
}

function assertAbsenceRangeWritable(roleKey: CanonicalRoleKey, input: Pick<EmployeeAppointmentAbsenceInput, "startDate" | "endDate">): void {
  if (canWriteAbsenceRange(roleKey, input)) return;
  throw new EmployeeAppointmentAbsencesError(
    409,
    "PAST_APPOINTMENT_READONLY",
    "Vollständig vergangene Abwesenheiten können nicht geändert werden.",
  );
}

async function assertEmployeeVisible(employeeId: number, roleKey: CanonicalRoleKey) {
  const employee = await employeesRepository.getEmployee(employeeId);
  if (!employee) {
    throw new EmployeeAppointmentAbsencesError(404, "NOT_FOUND", "Mitarbeiter nicht gefunden");
  }
  if (roleKey !== "ADMIN" && !employee.isActive) {
    throw new EmployeeAppointmentAbsencesError(404, "NOT_FOUND", "Mitarbeiter nicht gefunden");
  }
  return employee;
}

async function ensureAbsenceTour() {
  const tours = await toursRepository.getTours();
  const existing = tours.find((tour) => isAbsenceTourName(tour.name));
  if (existing) return existing;
  return toursRepository.createTour(ABSENCE_TOUR_NAME, ABSENCE_TOUR_COLOR);
}

function customerMatchesAbsenceSeedCustomer(
  customer: Awaited<ReturnType<typeof customersRepository.getCustomersByCustomerNumber>>[number],
): boolean {
  return customer.customerNumber.trim() === ABSENCE_CUSTOMER_NUMBER
    && normalizeOptionalCustomerField(customer.firstName) === null
    && normalizeOptionalCustomerField(customer.lastName) === null
    && normalizeOptionalCustomerField(customer.fullName) === ABSENCE_CUSTOMER_NAME
    && normalizeOptionalCustomerField(customer.company) === ABSENCE_CUSTOMER_NAME
    && normalizeOptionalCustomerField(customer.addressLine1) === ABSENCE_CUSTOMER_ADDRESS_LINE1
    && normalizeOptionalCustomerField(customer.addressLine2) === null
    && normalizeOptionalCustomerField(customer.postalCode) === ABSENCE_CUSTOMER_POSTAL_CODE
    && normalizeOptionalCustomerField(customer.city) === ABSENCE_CUSTOMER_CITY
    && normalizeOptionalCustomerField(customer.country) === ABSENCE_CUSTOMER_COUNTRY;
}

async function getExistingAbsenceCustomer() {
  const matches = await customersRepository.getCustomersByCustomerNumber(ABSENCE_CUSTOMER_NUMBER);
  return matches[0] ?? null;
}

async function ensureAbsenceCustomer() {
  const existing = await getExistingAbsenceCustomer();
  if (existing) {
    if (!existing.isActive) {
      throw new EmployeeAppointmentAbsencesError(
        409,
        "BUSINESS_CONFLICT",
        `Systemkunde '${ABSENCE_CUSTOMER_NAME}' ist inaktiv.`,
      );
    }
    if (!customerMatchesAbsenceSeedCustomer(existing)) {
      throw new EmployeeAppointmentAbsencesError(
        409,
        "BUSINESS_CONFLICT",
        `Systemkunde '${ABSENCE_CUSTOMER_NUMBER} · ${ABSENCE_CUSTOMER_NAME}' weicht vom erwarteten Sollzustand ab. Bitte System-Seed ausführen.`,
      );
    }
    return existing;
  }

  return customersRepository.createCustomer({
    customerNumber: ABSENCE_CUSTOMER_NUMBER,
    firstName: null,
    lastName: null,
    company: ABSENCE_CUSTOMER_NAME,
    fullName: ABSENCE_CUSTOMER_NAME,
    email: null,
    phone: null,
    addressLine1: ABSENCE_CUSTOMER_ADDRESS_LINE1,
    addressLine2: null,
    postalCode: ABSENCE_CUSTOMER_POSTAL_CODE,
    city: ABSENCE_CUSTOMER_CITY,
    country: ABSENCE_CUSTOMER_COUNTRY,
  });
}

async function ensureAbsenceTag(absenceType: AbsenceType) {
  const definition = ABSENCE_TAG_DEFINITIONS[absenceType];
  return masterDataRepository.ensureTagDefinition({
    name: definition.name,
    color: definition.color,
    isDefault: true,
  });
}

async function ensureAbsencePrerequisites(absenceType: AbsenceType) {
  const [tour, customer, tag] = await Promise.all([
    ensureAbsenceTour(),
    ensureAbsenceCustomer(),
    ensureAbsenceTag(absenceType),
  ]);
  return { tour, customer, tag };
}

async function setAbsenceTag(appointmentId: number, absenceType: AbsenceType): Promise<void> {
  const nextTag = await ensureAbsenceTag(absenceType);
  const absenceTags = await Promise.all(
    Object.values(ABSENCE_TAG_DEFINITIONS).map((definition) => masterDataRepository.getTagByNormalizedName(definition.name)),
  );
  await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    for (const tag of absenceTags) {
      if (tag) {
        await appointmentsRepository.removeAppointmentTagByTagIdTx(tx, appointmentId, tag.id);
      }
    }
    await appointmentsRepository.addAppointmentTagTx(tx, appointmentId, nextTag.id);
  });
  dispatchCalDavUpsert(appointmentId);
}

function isAbsenceAppointmentItem(item: Awaited<ReturnType<typeof appointmentsService.listEmployeeAppointmentsByScope>>[number]): boolean {
  return isAbsenceTourName(item.tourName)
    && item.appointmentTags.some((tag) => isAbsenceTagName(tag.name));
}

async function listRegularAppointmentConflictsForAbsence(
  employeeId: number,
  input: EmployeeAppointmentAbsenceInput,
  roleKey: CanonicalRoleKey,
  excludeAppointmentId?: number,
) {
  const items = await appointmentsService.listEmployeeAppointmentsByScope(employeeId, "all", roleKey);
  return items.filter((item) => (
    item.id !== excludeAppointmentId
    && !isAbsenceAppointmentItem(item)
    && dateRangesOverlap(input.startDate, input.endDate ?? null, item.startDate, item.endDate)
  ));
}

async function listWeekPlanningConflictsForAbsence(
  employeeId: number,
  input: EmployeeAppointmentAbsenceInput,
): Promise<WeekPlanningRemovalConflict[]> {
  const affectedWeeks = new Set(resolveAffectedIsoWeeks(input).map((week) => `${week.isoYear}:${week.isoWeek}`));
  if (affectedWeeks.size === 0) return [];

  const assignments = await tourWeekEmployeesRepository.listAssignmentsByEmployee(employeeId);
  return assignments
    .filter((assignment) => affectedWeeks.has(`${assignment.isoYear}:${assignment.isoWeek}`))
    .map((assignment) => {
      const week = tourWeekEmployeesService.resolveIsoWeekWindow(assignment.isoYear, assignment.isoWeek);
      return {
        assignmentId: assignment.assignmentId,
        tourId: assignment.tourId,
        tourName: assignment.tourName,
        isoYear: assignment.isoYear,
        isoWeek: assignment.isoWeek,
        weekStartDate: week.weekStartDate,
        weekEndDate: week.weekEndDate,
      };
    })
    .sort((left, right) => (
      left.isoYear - right.isoYear
      || left.isoWeek - right.isoWeek
      || left.tourName.localeCompare(right.tourName, "de")
      || left.assignmentId - right.assignmentId
    ));
}

async function listAbsenceAppointmentConflictsForAbsence(
  employeeId: number,
  input: EmployeeAppointmentAbsenceInput,
  roleKey: CanonicalRoleKey,
  excludeAppointmentId?: number,
) {
  const items = await appointmentsService.listEmployeeAppointmentsByScope(employeeId, "all", roleKey);
  return items.filter((item) => (
    item.id !== excludeAppointmentId
    && isAbsenceAppointmentItem(item)
    && dateRangesOverlap(input.startDate, input.endDate ?? null, item.startDate, item.endDate)
  ));
}

async function assertNoAbsenceAppointmentConflictsForAbsence(
  employeeId: number,
  input: EmployeeAppointmentAbsenceInput,
  roleKey: CanonicalRoleKey,
  excludeAppointmentId?: number,
): Promise<void> {
  const conflicts = await listAbsenceAppointmentConflictsForAbsence(employeeId, input, roleKey, excludeAppointmentId);
  if (conflicts.length === 0) return;
  throw new EmployeeAppointmentAbsencesError(
    409,
    "BUSINESS_CONFLICT",
    "Der Zeitraum überschneidet sich mit einer bestehenden Abwesenheit.",
  );
}

async function assertWeekPlanningRemovalAllowed(
  conflicts: WeekPlanningRemovalConflict[],
  roleKey: CanonicalRoleKey,
  employeeId: number,
): Promise<void> {
  for (const conflict of conflicts) {
    const assignment = await tourWeekEmployeesRepository.getAssignmentById(conflict.assignmentId);
    if (
      !assignment
      || assignment.tourId !== conflict.tourId
      || assignment.isoYear !== conflict.isoYear
      || assignment.isoWeek !== conflict.isoWeek
      || assignment.employeeId !== employeeId
    ) {
      throw new EmployeeAppointmentAbsencesError(
        409,
        "ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL",
        "Eine betroffene Tour-KW-Planung wurde zwischenzeitlich geändert. Bitte neu laden.",
        { weekPlanningRemovalConflicts: conflicts },
      );
    }
    await tourWeekEmployeesService.assertWeekEmployeeAssignmentRemovalAllowed(assignment, roleKey);
  }
}

async function removeEmployeeFromConfirmedConflicts(
  employeeId: number,
  input: EmployeeAppointmentAbsenceInput,
  roleKey: CanonicalRoleKey,
  excludeAppointmentId?: number,
): Promise<void> {
  const [appointmentConflicts, weekPlanningConflicts] = await Promise.all([
    listRegularAppointmentConflictsForAbsence(employeeId, input, roleKey, excludeAppointmentId),
    listWeekPlanningConflictsForAbsence(employeeId, input),
  ]);
  if (appointmentConflicts.length === 0 && weekPlanningConflicts.length === 0) return;

  const confirmedVersions = normalizeConfirmedEmployeeRemovalAppointments(input.confirmedEmployeeRemovalAppointments);
  const unconfirmedAppointmentConflicts = appointmentConflicts.filter((item) => confirmedVersions.get(item.id) !== item.version);
  const confirmedWeekPlanningRemovals = normalizeConfirmedWeekPlanningRemovals(input.confirmedWeekPlanningRemovals);
  const unconfirmedWeekPlanningConflicts = weekPlanningConflicts.filter((item) => (
    confirmedWeekPlanningRemovals.get(item.assignmentId) !== `${item.tourId}:${item.isoYear}:${item.isoWeek}`
  ));
  const hasUnconfirmedAppointmentConflicts = appointmentConflicts.length > 0
    && (unconfirmedAppointmentConflicts.length > 0 || confirmedVersions.size !== appointmentConflicts.length);
  const hasUnconfirmedWeekPlanningConflicts = weekPlanningConflicts.length > 0
    && (unconfirmedWeekPlanningConflicts.length > 0 || confirmedWeekPlanningRemovals.size !== weekPlanningConflicts.length);

  if (hasUnconfirmedAppointmentConflicts || hasUnconfirmedWeekPlanningConflicts) {
    throw new EmployeeAppointmentAbsencesError(
      409,
      "ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL",
      "Der Mitarbeiter muss vor dem Speichern der Abwesenheit aus bestehenden Terminen oder Tour-KW-Planungen entfernt werden.",
      {
        employeeRemovalConflicts: appointmentConflicts,
        weekPlanningRemovalConflicts: weekPlanningConflicts,
      },
    );
  }

  await assertWeekPlanningRemovalAllowed(weekPlanningConflicts, roleKey, employeeId);

  const changedAppointmentIds: number[] = [];
  await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    for (const conflict of appointmentConflicts) {
      const updateResult = await appointmentsRepository.bumpAppointmentVersionTx(tx, {
        appointmentId: conflict.id,
        expectedVersion: conflict.version,
      });
      if (updateResult.kind === "version_conflict") {
        throw new EmployeeAppointmentAbsencesError(409, "VERSION_CONFLICT", "Ein betroffener Termin wurde zwischenzeitlich geändert. Bitte neu laden.");
      }
      await appointmentsRepository.deleteAppointmentEmployeeTx(tx, conflict.id, employeeId);
      changedAppointmentIds.push(conflict.id);
    }

    for (const conflict of weekPlanningConflicts) {
      const deletedCount = await tourWeekEmployeesRepository.deleteAssignmentTx(tx, conflict.assignmentId);
      if (deletedCount !== 1) {
        throw new EmployeeAppointmentAbsencesError(
          409,
          "ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL",
          "Eine betroffene Tour-KW-Planung wurde zwischenzeitlich geändert. Bitte neu laden.",
          { weekPlanningRemovalConflicts: weekPlanningConflicts },
        );
      }
    }
  });

  for (const appointmentId of changedAppointmentIds) {
    dispatchCalDavUpsert(appointmentId);
  }
}

async function findEmployeeAppointmentAbsence(employeeId: number, appointmentId: number, roleKey: CanonicalRoleKey) {
  const items = await listEmployeeAppointmentAbsences(employeeId, roleKey);
  return items.find((item) => item.id === appointmentId) ?? null;
}

async function getCreatedOrUpdatedAbsenceAppointment(employeeId: number, appointmentId: number, roleKey: CanonicalRoleKey) {
  const item = await findEmployeeAppointmentAbsence(employeeId, appointmentId, roleKey);
  if (!item) {
    throw new EmployeeAppointmentAbsencesError(404, "NOT_FOUND", "Abwesenheit nicht gefunden");
  }
  return item;
}

export async function listEmployeeAppointmentAbsences(employeeId: number, roleKey: CanonicalRoleKey) {
  await assertEmployeeVisible(employeeId, roleKey);
  const items = await appointmentsService.listEmployeeAppointmentsByScope(employeeId, "all", roleKey);
  return items.filter(isAbsenceAppointmentItem);
}

export async function createEmployeeAppointmentAbsence(
  employeeId: number,
  input: EmployeeAppointmentAbsenceInput,
  roleKey: CanonicalRoleKey,
) {
  requireDispatcherOrAdmin(roleKey);
  await assertEmployeeVisible(employeeId, roleKey);
  assertAbsenceRangeWritable(roleKey, input);
  const { tour, customer } = await ensureAbsencePrerequisites(input.absenceType);
  await assertNoAbsenceAppointmentConflictsForAbsence(employeeId, input, roleKey);
  await removeEmployeeFromConfirmedConflicts(employeeId, input, roleKey);
  const appointment = await appointmentsService.createAppointment({
    customerId: customer.id,
    tourId: tour.id,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    startTime: null,
    description: normalizeOptionalNote(input.note),
    employeeIds: [employeeId],
  }, roleKey, {
    allowAbsenceWorkflow: true,
    allowHistoricalInput: canWriteAbsenceRange(roleKey, input),
  });
  if (!appointment?.id) {
    throw new EmployeeAppointmentAbsencesError(409, "BUSINESS_CONFLICT", "Abwesenheit konnte nicht angelegt werden");
  }
  await setAbsenceTag(appointment.id, input.absenceType);
  return getCreatedOrUpdatedAbsenceAppointment(employeeId, appointment.id, roleKey);
}

export async function updateEmployeeAppointmentAbsence(
  employeeId: number,
  appointmentId: number,
  input: EmployeeAppointmentAbsenceInput & { version: number },
  roleKey: CanonicalRoleKey,
) {
  requireDispatcherOrAdmin(roleKey);
  await assertEmployeeVisible(employeeId, roleKey);
  const existing = await findEmployeeAppointmentAbsence(employeeId, appointmentId, roleKey);
  if (!existing) {
    throw new EmployeeAppointmentAbsencesError(404, "NOT_FOUND", "Abwesenheit nicht gefunden");
  }
  if (existing.version !== input.version) {
    throw new EmployeeAppointmentAbsencesError(409, "VERSION_CONFLICT", "Die Abwesenheit wurde zwischenzeitlich geändert. Bitte neu laden.");
  }
  assertAbsenceRangeWritable(roleKey, input);
  const { tour, customer } = await ensureAbsencePrerequisites(input.absenceType);
  await assertNoAbsenceAppointmentConflictsForAbsence(employeeId, input, roleKey, appointmentId);
  await removeEmployeeFromConfirmedConflicts(employeeId, input, roleKey, appointmentId);
  await appointmentsService.updateAppointment(appointmentId, {
    version: input.version,
    customerId: customer.id,
    tourId: tour.id,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    startTime: null,
    description: normalizeOptionalNote(input.note),
    employeeIds: [employeeId],
  }, roleKey, {
    allowAbsenceWorkflow: true,
    allowHistoricalInput: canWriteAbsenceRange(roleKey, input),
  });
  await setAbsenceTag(appointmentId, input.absenceType);
  return getCreatedOrUpdatedAbsenceAppointment(employeeId, appointmentId, roleKey);
}

export async function deleteEmployeeAppointmentAbsence(
  employeeId: number,
  appointmentId: number,
  version: number,
  roleKey: CanonicalRoleKey,
): Promise<void> {
  requireDispatcherOrAdmin(roleKey);
  await assertEmployeeVisible(employeeId, roleKey);
  const existing = await findEmployeeAppointmentAbsence(employeeId, appointmentId, roleKey);
  if (!existing) {
    throw new EmployeeAppointmentAbsencesError(404, "NOT_FOUND", "Abwesenheit nicht gefunden");
  }
  await appointmentsService.deleteAppointment(appointmentId, version, roleKey, { allowAbsenceWorkflow: true });
}

export function getAbsenceTypeLabel(absenceType: AbsenceType): string {
  return getAbsenceTagName(absenceType);
}
