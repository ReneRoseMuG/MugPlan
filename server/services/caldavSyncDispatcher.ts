import { deleteAppointmentInCaldav, upsertAppointmentInCaldav } from "./caldavService";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as calendarSyncRepository from "../repositories/calendarSyncRepository";
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
    try {
      const result = await upsertAppointmentInCaldav(appointmentId);
      if (!result) {
        await calendarSyncRepository.createCalendarSyncLog({
          appointmentId,
          action: "upsert",
          status: "skipped",
          message: "CalDAV nicht konfiguriert oder Termin nicht vorhanden",
        });
        return;
      }
      await appointmentsRepository.setAppointmentExternalEventId(appointmentId, result.externalEventId);
      await calendarSyncRepository.createCalendarSyncLog({
        appointmentId,
        action: "upsert",
        status: "success",
        message: `external_event_id=${result.externalEventId}`,
      });
    } catch (error) {
      await calendarSyncRepository.createCalendarSyncLog({
        appointmentId,
        action: "upsert",
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}

export function dispatchCalDavDelete(appointmentId: number, externalEventId?: string | null): void {
  enqueue(async () => {
    try {
      const result = await deleteAppointmentInCaldav(appointmentId, externalEventId);
      if (!result) {
        await calendarSyncRepository.createCalendarSyncLog({
          appointmentId,
          action: "delete",
          status: "skipped",
          message: "CalDAV nicht konfiguriert",
        });
        return;
      }
      await calendarSyncRepository.createCalendarSyncLog({
        appointmentId,
        action: "delete",
        status: "success",
        message: `external_event_id=${result.externalEventId}`,
      });
    } catch (error) {
      await calendarSyncRepository.createCalendarSyncLog({
        appointmentId,
        action: "delete",
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}
