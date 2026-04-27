import type { InsertTour, Tour, UpdateTour } from "@shared/schema";
import * as toursRepository from "../repositories/toursRepository";

export class ToursError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "BUSINESS_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "BUSINESS_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

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
