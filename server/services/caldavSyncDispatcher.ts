import { deleteAppointmentInCaldav, upsertAppointmentInCaldav } from "./caldavService";
import { logWarn } from "../lib/logger";

const logPrefix = "[caldav-dispatcher]";
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): void {
  queue = queue
    .then(task)
    .catch((error) => {
      logWarn(`${logPrefix} task failed`, {
        message: error instanceof Error ? error.message : String(error),
      });
    });
}

export function dispatchCalDavUpsert(appointmentId: number): void {
  enqueue(async () => {
    await upsertAppointmentInCaldav(appointmentId);
  });
}

export function dispatchCalDavDelete(appointmentId: number): void {
  enqueue(async () => {
    await deleteAppointmentInCaldav(appointmentId);
  });
}
