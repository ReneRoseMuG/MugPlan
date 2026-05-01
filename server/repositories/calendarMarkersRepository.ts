import { z } from "zod";
import { calendarMarkerSchema, type CalendarMarker } from "@shared/routes";
import {
  FileStoreIOError,
  FileStoreValidationError,
  ServerScopedFileStore,
} from "../services/serverScopedFileStore";

const calendarMarkersPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  markers: z.array(calendarMarkerSchema),
});

type CalendarMarkersPayload = z.infer<typeof calendarMarkersPayloadSchema>;

const fileRequest = {
  scope: "GLOBAL" as const,
  namespace: "calendar-markers",
  key: "admin-markers",
};

let fileStore = new ServerScopedFileStore();

export class CalendarMarkersRepositoryValidationError extends Error {}
export class CalendarMarkersRepositoryIOError extends Error {}

export function setCalendarMarkersFileStoreForTests(nextStore: ServerScopedFileStore): void {
  fileStore = nextStore;
}

export function resetCalendarMarkersFileStoreForTests(): void {
  fileStore = new ServerScopedFileStore();
}

export async function readStoredCalendarMarkers(): Promise<CalendarMarker[]> {
  try {
    const payload = await fileStore.readJson<CalendarMarkersPayload>({
      ...fileRequest,
      schema: calendarMarkersPayloadSchema,
    });
    return payload?.markers ?? [];
  } catch (error) {
    if (error instanceof FileStoreValidationError) {
      throw new CalendarMarkersRepositoryValidationError(error.message);
    }
    if (error instanceof FileStoreIOError) {
      throw new CalendarMarkersRepositoryIOError(error.message);
    }
    throw error;
  }
}

export async function writeStoredCalendarMarkers(markers: CalendarMarker[]): Promise<void> {
  try {
    await fileStore.writeJson<CalendarMarkersPayload>({
      ...fileRequest,
      schema: calendarMarkersPayloadSchema,
      data: {
        schemaVersion: 1,
        markers,
      },
    });
  } catch (error) {
    if (error instanceof FileStoreValidationError) {
      throw new CalendarMarkersRepositoryValidationError(error.message);
    }
    if (error instanceof FileStoreIOError) {
      throw new CalendarMarkersRepositoryIOError(error.message);
    }
    throw error;
  }
}
