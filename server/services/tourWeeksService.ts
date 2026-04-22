import { addDays, addWeeks, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as tourWeekEmployeesRepository from "../repositories/tourWeekEmployeesRepository";
import * as tourWeeksRepository from "../repositories/tourWeeksRepository";
import * as toursRepository from "../repositories/toursRepository";
import { dispatchCalDavUpsert } from "./caldavSyncDispatcher";
import { hasAppointmentCancellationTag } from "../lib/appointmentCancellation";
import { isParkplatzTourName } from "../lib/systemTours";
import { getAppointmentParkingDefaults, parkAppointmentTx } from "./appointmentParkingService";

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
    throw new TourWeeksError(422, "VALIDATION_ERROR", "Ungültiges Datum");
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
    throw new TourWeeksError(422, "VALIDATION_ERROR", "Ungültige ISO-Woche");
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
    throw new TourWeeksError(409, "PAST_WEEK_READONLY", "Laufende und vergangene Wochen sind schreibgeschützt");
  }
}

async function requireTour(tourId: number) {
  const tour = await toursRepository.getTour(tourId);
  if (!tour) {
    throw new TourWeeksError(404, "NOT_FOUND", "Tour nicht gefunden");
  }
  return tour;
}

function assertWeekPlanningSupported(tour: { name: string | null | undefined }): void {
  if (isParkplatzTourName(tour.name)) {
    throw new TourWeeksError(409, "BUSINESS_CONFLICT", "Die Tour Parkplatz unterstuetzt keine Wochenplanung.");
  }
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

async function collectAppointmentIdsForWeek(tourId: number, isoYear: number, isoWeek: number): Promise<number[]> {
  const week = resolveIsoWeekWindow(isoYear, isoWeek);
  const rows = await tourWeekEmployeesRepository.listAppointmentsByTourAndDateRange(tourId, {
    fromDate: week.weekStart,
    toDate: week.weekEnd,
  });
  return Array.from(new Set(rows.map((row) => row.appointmentId)));
}

async function parkAppointmentsForBlockedWeek(appointmentIds: number[]): Promise<number[]> {
  if (appointmentIds.length === 0) {
    return [];
  }

  const parkingDefaults = await getAppointmentParkingDefaults();
  if (parkingDefaults.kind !== "ready") {
    throw new TourWeeksError(
      409,
      "BUSINESS_CONFLICT",
      parkingDefaults.kind === "missing_parkplatz_tour"
        ? "Tour 'Parkplatz' nicht gefunden. Bitte den Admin-System-Seed ausführen."
        : "System-Tag 'Geparkt' fehlt. Bitte den Admin-System-Seed ausführen.",
    );
  }

  const tagsByAppointmentId = await appointmentsRepository.getAppointmentTagsByAppointmentIds(appointmentIds);
  const changedAppointmentIds: number[] = [];

  await appointmentsRepository.withAppointmentTransaction(async (tx) => {
    for (const appointmentId of appointmentIds) {
      const existingTags = tagsByAppointmentId.get(appointmentId) ?? [];
      if (hasAppointmentCancellationTag(existingTags)) {
        continue;
      }

      const parkResult = await parkAppointmentTx(tx, {
        appointmentId,
        parkplatzTourId: parkingDefaults.parkplatzTourId,
        geparktTagId: parkingDefaults.geparktTagId,
        alreadyParkedMode: "noop",
      });
      if (parkResult.kind === "not_found") {
        continue;
      }
      if (parkResult.kind === "version_conflict") {
        throw new TourWeeksError(409, "BUSINESS_CONFLICT", "Termin wurde zwischenzeitlich geändert");
      }
      if (parkResult.kind === "already_parked" || parkResult.kind === "noop") {
        continue;
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
  const tour = await requireTour(tourId);
  assertWeekPlanningSupported(tour);
  assertWeekEditable(params.isoYear, params.isoWeek);

  const week = await tourWeeksRepository.withTourWeeksTransaction(async (tx) =>
    tourWeeksRepository.getOrCreateWeekTx(tx, {
      tourId,
      isoYear: params.isoYear,
      isoWeek: params.isoWeek,
    }),
  );

  return {
    ...mapWeekToResponse(week),
    tourName: tour.name,
  };
}

export async function blockTourWeek(
  tourId: number,
  params: { isoYear: number; isoWeek: number },
) {
  const tour = await requireTour(tourId);
  assertWeekPlanningSupported(tour);
  assertWeekEditable(params.isoYear, params.isoWeek);

  const appointmentIds = await collectAppointmentIdsForWeek(tourId, params.isoYear, params.isoWeek);
  const changedAppointmentIds = await parkAppointmentsForBlockedWeek(appointmentIds);

  const week = await tourWeeksRepository.withTourWeeksTransaction(async (tx) => {
    await tourWeeksRepository.getOrCreateWeekTx(tx, {
      tourId,
      isoYear: params.isoYear,
      isoWeek: params.isoWeek,
    });

    await tourWeekEmployeesRepository.deleteAssignmentsByTourAndWeekTx(tx, {
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
    tourName: tour.name,
    affectedAppointmentCount: changedAppointmentIds.length,
  };
}

export async function unblockTourWeek(
  tourId: number,
  params: { isoYear: number; isoWeek: number },
) {
  const tour = await requireTour(tourId);
  assertWeekPlanningSupported(tour);
  assertWeekEditable(params.isoYear, params.isoWeek);

  const existingWeek = await tourWeeksRepository.getWeekByTourAndWeek(tourId, params.isoYear, params.isoWeek);
  if (!existingWeek) {
    throw new TourWeeksError(404, "NOT_FOUND", "Wochenplanung nicht gefunden");
  }

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
    tourName: tour.name,
    affectedAppointmentCount: 0,
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
