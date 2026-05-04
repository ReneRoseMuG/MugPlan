import type { InsertTour, Tour, UpdateTour } from "@shared/schema";
import { addWeeks, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";
import { isAbsenceTourName, isParkplatzTourName } from "../lib/systemTours";
import * as tourWeekEmployeesRepository from "../repositories/tourWeekEmployeesRepository";
import * as tourWeeksRepository from "../repositories/tourWeeksRepository";
import * as toursRepository from "../repositories/toursRepository";
import {
  enrichTourWeekCards,
  isWeekLockedForRole,
  resolveIsoWeekWindow,
} from "./tourWeekEmployeesService";

export class ToursError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "BUSINESS_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "BUSINESS_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

type WeekPlanningRoleKey = "ADMIN" | "DISPONENT" | "LESER" | null | undefined;

export async function listTours(): Promise<Tour[]> {
  return toursRepository.getTours();
}

export async function getTour(id: number): Promise<Tour | null> {
  return toursRepository.getTour(id);
}

function normalizeTourName(name: string): string {
  return name.trim().toLocaleLowerCase("de");
}

function buildNextTourName(existing: Tour[]): string {
  const usedNumbers = new Set(
    existing
      .map((tour) => {
        const match = tour.name.match(/^Tour (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((value) => value > 0),
  );

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }
  return `Tour ${nextNumber}`;
}

function parseDateOnlyInput(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ToursError(422, "VALIDATION_ERROR");
  }
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime()) || format(parsed, "yyyy-MM-dd") !== value) {
    throw new ToursError(422, "VALIDATION_ERROR");
  }
  return parsed;
}

function supportsWeekPlanningView(tour: Pick<Tour, "name">): boolean {
  return !isParkplatzTourName(tour.name) && !isAbsenceTourName(tour.name);
}

function resolveWeekWindows(fromDate: string, toDate: string) {
  const parsedFromDate = parseDateOnlyInput(fromDate);
  const parsedToDate = parseDateOnlyInput(toDate);
  if (parsedToDate < parsedFromDate) {
    throw new ToursError(422, "VALIDATION_ERROR");
  }

  const weeks = [];
  for (
    let cursor = startOfISOWeek(parsedFromDate);
    format(cursor, "yyyy-MM-dd") <= format(parsedToDate, "yyyy-MM-dd");
    cursor = addWeeks(cursor, 1)
  ) {
    weeks.push(resolveIsoWeekWindow(getISOWeekYear(cursor), getISOWeek(cursor)));
  }
  return weeks;
}

export async function listTourWeekPlanning(
  params: { fromDate: string; toDate: string },
  roleKey?: WeekPlanningRoleKey,
) {
  const weeks = resolveWeekWindows(params.fromDate, params.toDate);
  const planningTours = (await toursRepository.getTours()).filter(supportsWeekPlanningView);
  const tourIds = planningTours.map((tour) => tour.id);
  const [weekRows, assignments] = await Promise.all([
    tourWeeksRepository.listWeeksByTourIds(tourIds),
    tourWeekEmployeesRepository.listAssignmentsByTourIds(tourIds),
  ]);

  const weekStateByKey = new Map(
    weekRows.map((week) => [`${week.tourId}-${week.isoYear}-${week.isoWeek}`, week]),
  );
  const assignmentsByKey = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const key = `${assignment.tourId}-${assignment.isoYear}-${assignment.isoWeek}`;
    const group = assignmentsByKey.get(key) ?? [];
    group.push(assignment);
    assignmentsByKey.set(key, group);
  }

  const cells = planningTours.flatMap((tour) =>
    weeks.map((week) => {
      const key = `${tour.id}-${week.isoYear}-${week.isoWeek}`;
      const weekState = weekStateByKey.get(key);
      return {
        tourId: tour.id,
        tourName: tour.name,
        tourColor: tour.color,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        weekStartDate: week.weekStartDate,
        weekEndDate: week.weekEndDate,
        isLocked: isWeekLockedForRole(week.isoYear, week.isoWeek, roleKey),
        isBlocked: weekState?.isBlocked ?? false,
        employees: (assignmentsByKey.get(key) ?? []).map((assignment) => ({
          assignmentId: assignment.assignmentId,
          employeeId: assignment.employeeId,
          firstName: assignment.firstName,
          lastName: assignment.lastName,
          fullName: assignment.fullName,
        })),
      };
    }),
  );

  return {
    weeks: weeks.map((week) => ({
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      weekStartDate: week.weekStartDate,
      weekEndDate: week.weekEndDate,
    })),
    tours: planningTours.map((tour) => ({
      id: tour.id,
      name: tour.name,
      color: tour.color,
    })),
    cells: await enrichTourWeekCards(cells),
  };
}

export async function createTour(data: InsertTour): Promise<Tour> {
  const existing = await toursRepository.getTours();
  const name = buildNextTourName(existing);
  return toursRepository.createTour(name, data.color);
}

export async function updateTour(id: number, data: UpdateTour & { version: number }): Promise<Tour | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new ToursError(422, "VALIDATION_ERROR");
  }
  const currentTour = await toursRepository.getTour(id);
  if (!currentTour) {
    return null;
  }

  const requestedName = data.name.trim();
  const requestedNameNormalized = normalizeTourName(requestedName);
  if (requestedNameNormalized !== normalizeTourName(currentTour.name)) {
    const existingTours = await toursRepository.getTours();
    const conflictingTour = existingTours.find((tour) => (
      tour.id !== id && normalizeTourName(tour.name) === requestedNameNormalized
    ));
    if (conflictingTour) {
      throw new ToursError(409, "BUSINESS_CONFLICT");
    }
  }

  let result: Awaited<ReturnType<typeof toursRepository.updateTourWithVersion>>;
  try {
    result = await toursRepository.updateTourWithVersion(id, data.version, requestedName, data.color);
  } catch (error) {
    const mysqlError = error as { code?: string; errno?: number } | null;
    const isDuplicateName =
      mysqlError?.code === "ER_DUP_ENTRY" ||
      mysqlError?.errno === 1062;
    if (isDuplicateName) {
      throw new ToursError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }
  if (result.kind === "version_conflict") {
    const exists = await toursRepository.getTour(id);
    if (!exists) return null;
    throw new ToursError(409, "VERSION_CONFLICT");
  }
  return result.tour;
}

export async function deleteTour(id: number, version: number): Promise<void> {
  if (!Number.isInteger(version) || version < 1) {
    throw new ToursError(422, "VALIDATION_ERROR");
  }

  const hasAppointments = await toursRepository.hasAppointmentsForTour(id);
  if (hasAppointments) {
    throw new ToursError(409, "BUSINESS_CONFLICT");
  }

  let result: Awaited<ReturnType<typeof toursRepository.deleteTourWithVersion>>;
  try {
    result = await toursRepository.deleteTourWithVersion(id, version);
  } catch (error) {
    const mysqlError = error as { code?: string; errno?: number } | null;
    const isFkConflict =
      mysqlError?.code === "ER_ROW_IS_REFERENCED_2" ||
      mysqlError?.code === "ER_ROW_IS_REFERENCED" ||
      mysqlError?.errno === 1451;
    if (isFkConflict) {
      throw new ToursError(409, "BUSINESS_CONFLICT");
    }
    throw error;
  }

  if (result.kind === "version_conflict") {
    const exists = await toursRepository.getTour(id);
    if (!exists) {
      throw new ToursError(404, "NOT_FOUND");
    }
    throw new ToursError(409, "VERSION_CONFLICT");
  }
}
