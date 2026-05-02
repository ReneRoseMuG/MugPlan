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

const calendarMarkersFileRequest = {
  scope: "GLOBAL" as const,
  namespace: "calendar-markers",
  key: "admin-markers",
};

const calendarMarkerSeedStateSchema = z.object({
  schemaVersion: z.literal(1),
  lastAdminLoginSeedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

type CalendarMarkerSeedState = z.infer<typeof calendarMarkerSeedStateSchema>;

const calendarMarkerSeedStateFileRequest = {
  scope: "GLOBAL" as const,
  namespace: "calendar-markers",
  key: "seed-state",
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
      ...calendarMarkersFileRequest,
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
      ...calendarMarkersFileRequest,
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

export async function readCalendarMarkerSeedState(): Promise<CalendarMarkerSeedState> {
  try {
    const payload = await fileStore.readJson<CalendarMarkerSeedState>({
      ...calendarMarkerSeedStateFileRequest,
      schema: calendarMarkerSeedStateSchema,
    });
    return payload ?? { schemaVersion: 1, lastAdminLoginSeedDate: null };
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

export async function writeCalendarMarkerSeedState(state: CalendarMarkerSeedState): Promise<void> {
  try {
    await fileStore.writeJson<CalendarMarkerSeedState>({
      ...calendarMarkerSeedStateFileRequest,
      schema: calendarMarkerSeedStateSchema,
      data: state,
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
