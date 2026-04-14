import {
  RESERVED_PLANNING_BLOCKED_TAG_COLOR,
  RESERVED_PLANNING_BLOCKED_TAG_NAME,
} from "@shared/appointmentCancellation";
import { addDays, addWeeks, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as masterDataRepository from "../repositories/masterDataRepository";
import * as tagRelationsService from "./tagRelationsService";
import * as tourWeekEmployeesRepository from "../repositories/tourWeekEmployeesRepository";
import * as tourWeeksRepository from "../repositories/tourWeeksRepository";
import * as toursRepository from "../repositories/toursRepository";
import { dispatchCalDavUpsert } from "./caldavSyncDispatcher";
import { hasAppointmentCancellationTag, hasReservedPlanningBlockedTag } from "../lib/appointmentCancellation";

type TourWeekConflictCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BUSINESS_CONFLICT"
  | "PAST_WEEK_READONLY";

const berlinFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export class TourWeeksError extends Error {
  status: number;
  code: TourWeekConflictCode;

  constructor(status: number, code: TourWeekConflictCode, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

function getBerlinDateString(date: Date): string {
  return berlinFormatter.format(date);
}

function parseDateOnly(input: string): Date {
  const parsed = new Date(`${input}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new TourWeeksError(422, "VALIDATION_ERROR", "Ungueltiges Datum");
  }
  return parsed;
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
    throw new TourWeeksError(422, "VALIDATION_ERROR", "Ungueltige ISO-Woche");
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
  weekStartDate: string;
} {
  const parsedDate = parseDateOnly(dateInput);
  const week = resolveIsoWeekWindow(getISOWeekYear(parsedDate), getISOWeek(parsedDate));
  return {
    isoYear: week.isoYear,
    isoWeek: week.isoWeek,
    weekStartDate: week.weekStartDate,
  };
}

function getBerlinTodayDateString(): string {
  return getBerlinDateString(new Date());
}

export function isWeekLocked(isoYear: number, isoWeek: number, todayBerlin = getBerlinTodayDateString()): boolean {
  const targetWeek = resolveIsoWeekWindow(isoYear, isoWeek);
  const todayWeek = resolveIsoWeekFromDate(todayBerlin);
  return targetWeek.weekStartDate <= todayWeek.weekStartDate;
}

function assertWeekEditable(isoYear: number, isoWeek: number): void {
  if (isWeekLocked(isoYear, isoWeek)) {
    throw new TourWeeksError(409, "PAST_WEEK_READONLY", "Laufende und vergangene Wochen sind schreibgeschuetzt");
  }
}

async function requireTour(tourId: number) {
  const tour = await toursRepository.getTour(tourId);
  if (!tour) {
    throw new TourWeeksError(404, "NOT_FOUND", "Tour nicht gefunden");
  }
  return tour;
}

function mapWeekToResponse(week: tourWeeksRepository.TourWeekRow) {
  const window = resolveIsoWeekWindow(week.isoYear, week.isoWeek);
  return {
    id: week.id,
    tourId: week.tourId,
    isoYear: week.isoYear,
    isoWeek: week.isoWeek,
    weekStartDate: window.weekStartDate,
    weekEndDate: window.weekEndDate,
    isLocked: isWeekLocked(week.isoYear, week.isoWeek),
    isBlocked: week.isBlocked,
  };
}

async function ensurePlanningBlockedTag() {
  return masterDataRepository.ensureTagDefinition({
    name: RESERVED_PLANNING_BLOCKED_TAG_NAME,
    color: RESERVED_PLANNING_BLOCKED_TAG_COLOR,
    isDefault: false,
  });
}

async function collectAppointmentIdsForWeek(tourId: number, isoYear: number, isoWeek: number): Promise<number[]> {
  const week = resolveIsoWeekWindow(isoYear, isoWeek);
  const rows = await tourWeekEmployeesRepository.listAppointmentsByTourAndDateRange(tourId, {
    fromDate: week.weekStart,
    toDate: week.weekEnd,
  });
  return Array.from(new Set(rows.map((row) => row.appointmentId)));
}

async function updateBlockedAppointments(params: {
  appointmentIds: number[];
  blockedTagId: number | null;
  mode: "block" | "unblock";
}): Promise<number[]> {
  if (params.appointmentIds.length === 0) {
    return [];
  }

  const tagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds(params.appointmentIds);
  const changedAppointmentIds: number[] = [];

  await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    for (const appointmentId of params.appointmentIds) {
      const appointment = await appointmentsRepository.getAppointmentWithEmployeesTx(tx, appointmentId);
      if (!appointment) {
        continue;
      }

      const existingTags = tagsByAppointmentId.get(appointmentId) ?? [];
      if (hasAppointmentCancellationTag(existingTags)) {
        continue;
      }

      const hasBlockedTag = hasReservedPlanningBlockedTag(existingTags);
      let changed = false;

      if (params.mode === "block") {
        if (appointment.employees.length > 0) {
          await appointmentsRepository.replaceAppointmentEmployeesTx(tx, appointmentId, []);
          changed = true;
        }
        if (!hasBlockedTag && params.blockedTagId != null) {
          await appointmentsRepository.addAppointmentTagTx(tx, appointmentId, params.blockedTagId);
          changed = true;
        }
      } else if (hasBlockedTag && params.blockedTagId != null) {
        await appointmentsRepository.removeAppointmentTagByTagIdTx(tx, appointmentId, params.blockedTagId);
        changed = true;
      }

      if (!changed) {
        continue;
      }

      const versionResult = await appointmentsRepository.bumpAppointmentVersionTx(tx, {
        appointmentId,
        expectedVersion: Number(appointment.version),
      });
      if (versionResult.kind === "version_conflict") {
        throw new TourWeeksError(409, "BUSINESS_CONFLICT", "Termin wurde zwischenzeitlich geaendert");
      }
      changedAppointmentIds.push(appointmentId);
    }
  });

  for (const appointmentId of changedAppointmentIds) {
    dispatchCalDavUpsert(appointmentId);
  }

  return changedAppointmentIds;
}

export async function isTourWeekBlocked(
  tourId: number,
  isoYear: number,
  isoWeek: number,
): Promise<boolean> {
  const week = await tourWeeksRepository.getWeekByTourAndWeek(tourId, isoYear, isoWeek);
  return Boolean(week?.isBlocked);
}

export async function createTourWeek(
  tourId: number,
  params: { isoYear: number; isoWeek: number },
) {
  await requireTour(tourId);
  assertWeekEditable(params.isoYear, params.isoWeek);

  const week = await tourWeeksRepository.withTourWeeksTransaction(async (tx) =>
    tourWeeksRepository.getOrCreateWeekTx(tx, {
      tourId,
      isoYear: params.isoYear,
      isoWeek: params.isoWeek,
    }),
  );

  return mapWeekToResponse(week);
}

export async function blockTourWeek(
  tourId: number,
  params: { isoYear: number; isoWeek: number },
) {
  await requireTour(tourId);
  assertWeekEditable(params.isoYear, params.isoWeek);

  const blockedTag = await ensurePlanningBlockedTag();
  const appointmentIds = await collectAppointmentIdsForWeek(tourId, params.isoYear, params.isoWeek);
  const changedAppointmentIds = await updateBlockedAppointments({
    appointmentIds,
    blockedTagId: blockedTag.id,
    mode: "block",
  });

  const week = await tourWeeksRepository.withTourWeeksTransaction(async (tx) => {
    await tourWeeksRepository.getOrCreateWeekTx(tx, {
      tourId,
      isoYear: params.isoYear,
      isoWeek: params.isoWeek,
    });

    const updated = await tourWeeksRepository.updateWeekBlockedTx(tx, {
      tourId,
      isoYear: params.isoYear,
      isoWeek: params.isoWeek,
      isBlocked: true,
    });
    if (!updated) {
      throw new TourWeeksError(404, "NOT_FOUND", "Wochenplanung nicht gefunden");
    }
    return updated;
  });

  return {
    week: mapWeekToResponse(week),
    affectedAppointmentCount: changedAppointmentIds.length,
  };
}

export async function unblockTourWeek(
  tourId: number,
  params: { isoYear: number; isoWeek: number },
) {
  await requireTour(tourId);
  assertWeekEditable(params.isoYear, params.isoWeek);

  const existingWeek = await tourWeeksRepository.getWeekByTourAndWeek(tourId, params.isoYear, params.isoWeek);
  if (!existingWeek) {
    throw new TourWeeksError(404, "NOT_FOUND", "Wochenplanung nicht gefunden");
  }

  const blockedTag = await tagRelationsService.getTagByName(RESERVED_PLANNING_BLOCKED_TAG_NAME);
  const appointmentIds = await collectAppointmentIdsForWeek(tourId, params.isoYear, params.isoWeek);
  const changedAppointmentIds = await updateBlockedAppointments({
    appointmentIds,
    blockedTagId: blockedTag?.id ?? null,
    mode: "unblock",
  });

  const week = await tourWeeksRepository.withTourWeeksTransaction(async (tx) => {
    const updated = await tourWeeksRepository.updateWeekBlockedTx(tx, {
      tourId,
      isoYear: params.isoYear,
      isoWeek: params.isoWeek,
      isBlocked: false,
    });
    if (!updated) {
      throw new TourWeeksError(404, "NOT_FOUND", "Wochenplanung nicht gefunden");
    }
    return updated;
  });

  return {
    week: mapWeekToResponse(week),
    affectedAppointmentCount: changedAppointmentIds.length,
  };
}

export async function listBlockedTourWeeksForRange(params: {
  fromDate: string;
  toDate: string;
}) {
  const fromDate = parseDateOnly(params.fromDate);
  const toDate = parseDateOnly(params.toDate);
  if (toDate < fromDate) {
    throw new TourWeeksError(422, "VALIDATION_ERROR", "toDate darf nicht vor fromDate liegen");
  }

  const blockedWeeks = await tourWeeksRepository.listBlockedWeeks();

  return blockedWeeks
    .map((week) => ({
      ...week,
      window: resolveIsoWeekWindow(week.isoYear, week.isoWeek),
    }))
    .filter(({ window }) => window.weekStart <= toDate && window.weekEnd >= fromDate)
    .map(({ id, tourId, isoYear, isoWeek, isBlocked, window }) => ({
      id,
      tourId,
      isoYear,
      isoWeek,
      weekStartDate: window.weekStartDate,
      weekEndDate: window.weekEndDate,
      isBlocked,
    }))
    .sort((left, right) => {
      if (left.weekStartDate !== right.weekStartDate) {
        return left.weekStartDate.localeCompare(right.weekStartDate);
      }
      return left.tourId - right.tourId;
    });
}
