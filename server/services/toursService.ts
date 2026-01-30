import type { InsertTour, Tour, UpdateTour } from "@shared/schema";
import * as toursRepository from "../repositories/toursRepository";

export async function listTours(): Promise<Tour[]> {
  return toursRepository.getTours();
}

function buildNextTourName(existing: Tour[]): string {
  const nextNumber = existing.length + 1;
  let name = `Tour ${nextNumber}`;
  const existingNames = new Set(existing.map((tour) => tour.name));
  while (existingNames.has(name)) {
    const num = parseInt(name.split(" ")[1], 10) + 1;
    name = `Tour ${num}`;
  }
  return name;
}

export async function createTour(data: InsertTour): Promise<Tour> {
  const existing = await toursRepository.getTours();
  const name = buildNextTourName(existing);
  return toursRepository.createTour(name, data.color);
}

export async function updateTour(id: number, data: UpdateTour): Promise<Tour | null> {
  return toursRepository.updateTour(id, data.color);
}

export async function deleteTour(id: number): Promise<void> {
  await toursRepository.deleteTour(id);
}
