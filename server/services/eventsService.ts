import * as eventsRepository from "../repositories/eventsRepository";
import type { Event, InsertEvent } from "@shared/schema";

export async function listEvents(): Promise<Event[]> {
  return eventsRepository.getEvents();
}

export async function createEvent(data: InsertEvent): Promise<Event> {
  return eventsRepository.createEvent(data);
}

export async function deleteEvent(id: number): Promise<void> {
  await eventsRepository.deleteEvent(id);
}
