import type { InsertTour, Tour, UpdateTour } from "@shared/schema";
import * as toursRepository from "../repositories/toursRepository";

export class ToursError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR";

  constructor(status: number, code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function listTours(): Promise<Tour[]> {
  return toursRepository.getTours();
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
  const result = await toursRepository.updateTourWithVersion(id, data.version, data.color);
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
  const result = await toursRepository.deleteTourWithVersion(id, version);
  if (result.kind === "version_conflict") {
    const exists = await toursRepository.getTour(id);
    if (!exists) {
      throw new ToursError(404, "NOT_FOUND");
    }
    throw new ToursError(409, "VERSION_CONFLICT");
  }
}
