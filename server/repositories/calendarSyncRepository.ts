import { desc, sql } from "drizzle-orm";
import { db } from "../db";
import { calendarSyncLog } from "@shared/schema";

export type CalendarSyncStatus = "success" | "error" | "skipped";
export type CalendarSyncAction = "upsert" | "delete";

let ensureCalendarSyncLogTablePromise: Promise<void> | null = null;

async function ensureCalendarSyncLogTable(): Promise<void> {
  if (!ensureCalendarSyncLogTablePromise) {
    ensureCalendarSyncLogTablePromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS calendar_sync_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        appointment_id BIGINT NULL,
        action VARCHAR(32) NOT NULL,
        status VARCHAR(16) NOT NULL,
        message TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_calendar_sync_appointment_created (appointment_id, created_at),
        INDEX idx_calendar_sync_status_created (status, created_at)
      )
    `).then(() => undefined);
  }
  await ensureCalendarSyncLogTablePromise;
}

export async function createCalendarSyncLog(input: {
  appointmentId: number | null;
  action: CalendarSyncAction;
  status: CalendarSyncStatus;
  message?: string | null;
}): Promise<void> {
  await ensureCalendarSyncLogTable();
  await db.insert(calendarSyncLog).values({
    appointmentId: input.appointmentId,
    action: input.action,
    status: input.status,
    message: input.message ?? null,
  });
}

export async function listCalendarSyncLogs(limit = 100): Promise<Array<typeof calendarSyncLog.$inferSelect>> {
  await ensureCalendarSyncLogTable();
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 100;
  return db
    .select()
    .from(calendarSyncLog)
    .orderBy(desc(calendarSyncLog.createdAt), desc(calendarSyncLog.id))
    .limit(safeLimit);
}

