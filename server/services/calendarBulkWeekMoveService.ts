import {
  endOfWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfWeek,
} from "date-fns";
import type { Tag } from "@shared/schema";
import type { CanonicalRoleKey } from "../settings/registry";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as appointmentsService from "./appointmentsService";
import type { WeekMoveBlockReasonCode } from "./appointmentsService";
import { listEffectiveCalendarMarkers } from "./calendarMarkersService";

export type BulkWeekMoveBlockCode = WeekMoveBlockReasonCode | "BLOCKING_TAG";
export type BulkWeekMoveBlockReason = { code: BulkWeekMoveBlockCode; message: string };
export type BulkWeekMoveHintCode = "PUBLIC_HOLIDAY" | "NOTES";
export type BulkWeekMoveHint = { code: BulkWeekMoveHintCode; message: string };

export type BulkWeekMovePreviewItem = {
  appointmentId: number;
  version: number;
  title: string;
  tourId: number | null;
  tourName: string | null;
  sourceStartDate: string;
  sourceEndDate: string | null;
  startTime: string | null;
  targetStartDate: string;
  targetEndDate: string | null;
  status: "movable" | "blocked";
  selectable: boolean;
  preselected: boolean;
  blockReasons: BulkWeekMoveBlockReason[];
  hints: BulkWeekMoveHint[];
};

export type BulkWeekMovePreviewResult = {
  sourceWeek: { isoYear: number; isoWeek: number; fromDate: string; toDate: string };
  shiftWeeks: number;
  items: BulkWeekMovePreviewItem[];
};

export type BulkWeekMoveExecuteResult = {
  moved: Array<{ appointmentId: number; sourceStartDate: string; targetStartDate: string }>;
  failed: Array<{ appointmentId: number; code: string; message: string }>;
};

function toDateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Verschiebt ein reines Datum (yyyy-MM-dd) um N volle Kalenderwochen nach vorn (TZ-sicher via UTC). */
function addWeeksToDateOnly(dateOnly: string, weeks: number): string {
  const base = new Date(`${dateOnly}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + weeks * 7);
  return base.toISOString().slice(0, 10);
}

function buildSourceWeek(sourceWeekDate: string) {
  const parsed = parseISO(sourceWeekDate);
  const from = startOfWeek(parsed, { weekStartsOn: 1 });
  const to = endOfWeek(parsed, { weekStartsOn: 1 });
  return {
    isoYear: getISOWeekYear(parsed),
    isoWeek: getISOWeek(parsed),
    fromDate: format(from, "yyyy-MM-dd"),
    toDate: format(to, "yyyy-MM-dd"),
  };
}

function buildAppointmentTitle(row: {
  project: { name: string | null } | null;
  customer: { fullName: string | null; customerNumber: string | null };
  appointment: { id: number };
}): string {
  const projectName = row.project?.name?.trim();
  if (projectName) return projectName;
  const customerName = row.customer.fullName?.trim();
  if (customerName) return customerName;
  const customerNumber = row.customer.customerNumber?.trim();
  if (customerNumber) return customerNumber;
  return `Termin ${row.appointment.id}`;
}

function buildBlockingTagReason(matchingTags: Tag[]): BulkWeekMoveBlockReason {
  const names = matchingTags.map((tag) => tag.name).join(", ");
  return {
    code: "BLOCKING_TAG",
    message: names
      ? `Termin ist durch blockierende Tags ausgeschlossen: ${names}`
      : "Termin ist durch ein blockierendes Tag ausgeschlossen.",
  };
}

export async function previewBulkWeekMove(params: {
  sourceTourIds: number[];
  sourceWeekDate: string;
  shiftWeeks: number;
  blockingTagIds: number[];
  roleKey: CanonicalRoleKey;
}): Promise<BulkWeekMovePreviewResult> {
  const sourceWeek = buildSourceWeek(params.sourceWeekDate);
  const fromDate = parseISO(sourceWeek.fromDate);
  const toDate = parseISO(sourceWeek.toDate);
  const blockingTagIdSet = new Set(params.blockingTagIds);

  // Ausgangsmenge: Termine der ausgewählten Touren mit Startdatum innerhalb der Ausgangswoche.
  const sourceRowsByAppointmentId = new Map<number, Awaited<ReturnType<typeof appointmentsRepository.listAppointmentsByTourForDateRange>>[number]>();
  for (const tourId of Array.from(new Set(params.sourceTourIds))) {
    const rows = await appointmentsRepository.listAppointmentsByTourForDateRange(tourId, fromDate, toDate);
    for (const row of rows) {
      const startDateOnly = toDateOnly(row.appointment.startDate);
      if (startDateOnly < sourceWeek.fromDate || startDateOnly > sourceWeek.toDate) continue;
      if (!sourceRowsByAppointmentId.has(row.appointment.id)) {
        sourceRowsByAppointmentId.set(row.appointment.id, row);
      }
    }
  }

  const sourceRows = Array.from(sourceRowsByAppointmentId.values());
  if (sourceRows.length === 0) {
    return { sourceWeek, shiftWeeks: params.shiftWeeks, items: [] };
  }

  const appointmentIds = sourceRows.map((row) => row.appointment.id);
  const [employeeRows, tagsByAppointmentId, noteCountsByAppointmentId] = await Promise.all([
    appointmentsRepository.getAppointmentEmployeesByAppointmentIds(appointmentIds),
    appointmentsRepository.getAppointmentTagsByAppointmentIds(appointmentIds),
    appointmentsRepository.getAppointmentNoteCountsByAppointmentIds(appointmentIds),
  ]);

  const employeeIdsByAppointmentId = new Map<number, number[]>();
  for (const row of employeeRows) {
    const list = employeeIdsByAppointmentId.get(row.appointmentId) ?? [];
    list.push(row.employee.id);
    employeeIdsByAppointmentId.set(row.appointmentId, list);
  }

  // Feiertage am Ziel: bundeseinheitliche (nationale) gesetzliche Feiertage einmalig für den Zielbereich laden.
  const targetStartDates = sourceRows.map((row) => addWeeksToDateOnly(toDateOnly(row.appointment.startDate), params.shiftWeeks));
  const targetEndDates = sourceRows.map((row) =>
    row.appointment.endDate
      ? addWeeksToDateOnly(toDateOnly(row.appointment.endDate), params.shiftWeeks)
      : addWeeksToDateOnly(toDateOnly(row.appointment.startDate), params.shiftWeeks),
  );
  const holidayFrom = targetStartDates.reduce((min, value) => (value < min ? value : min), targetStartDates[0]);
  const holidayTo = targetEndDates.reduce((max, value) => (value > max ? value : max), targetEndDates[0]);
  const markers = await listEffectiveCalendarMarkers(params.roleKey, { fromDate: holidayFrom, toDate: holidayTo });
  const nationalHolidays = markers.filter((marker) => marker.type === "public_holiday" && marker.scope === "national");

  const items: BulkWeekMovePreviewItem[] = [];
  for (const row of sourceRows) {
    const appointmentId = row.appointment.id;
    const sourceStartDate = toDateOnly(row.appointment.startDate);
    const sourceEndDate = row.appointment.endDate ? toDateOnly(row.appointment.endDate) : null;
    const startTime = row.appointment.startTime ?? null;
    const targetStartDate = addWeeksToDateOnly(sourceStartDate, params.shiftWeeks);
    const targetEndDate = sourceEndDate ? addWeeksToDateOnly(sourceEndDate, params.shiftWeeks) : null;
    const employeeIds = employeeIdsByAppointmentId.get(appointmentId) ?? [];
    const tags = tagsByAppointmentId.get(appointmentId) ?? [];

    const blockReasons: BulkWeekMoveBlockReason[] = [];

    const matchingBlockingTags = tags.filter((tag) => blockingTagIdSet.has(tag.id));
    if (matchingBlockingTags.length > 0) {
      blockReasons.push(buildBlockingTagReason(matchingBlockingTags));
    }

    const systemEvaluation = await appointmentsService.evaluateWeekMoveTarget({
      appointmentId,
      targetStartDate,
      targetEndDate,
      startTime,
      employeeIds,
      roleKey: params.roleKey,
    });
    for (const reason of systemEvaluation.blockReasons) {
      blockReasons.push(reason);
    }

    const hints: BulkWeekMoveHint[] = [];
    const holidayHit = nationalHolidays.find((marker) => {
      const markerEnd = marker.endDate ?? marker.date;
      return marker.date <= (targetEndDate ?? targetStartDate) && markerEnd >= targetStartDate;
    });
    if (holidayHit) {
      hints.push({
        code: "PUBLIC_HOLIDAY",
        message: `Ziel liegt auf einem bundeseinheitlichen Feiertag (${holidayHit.name}). Die Verschiebung bleibt möglich.`,
      });
    }
    const noteCount = noteCountsByAppointmentId.get(appointmentId) ?? 0;
    if (noteCount > 0) {
      hints.push({
        code: "NOTES",
        message: "Termin hat Notizen mit möglichem Datumsbezug. Bitte vor der Verschiebung prüfen.",
      });
    }

    const blocked = blockReasons.length > 0;
    items.push({
      appointmentId,
      version: row.appointment.version,
      title: buildAppointmentTitle(row),
      tourId: row.appointment.tourId ?? null,
      tourName: row.tour?.name ?? null,
      sourceStartDate,
      sourceEndDate,
      startTime,
      targetStartDate,
      targetEndDate,
      status: blocked ? "blocked" : "movable",
      selectable: !blocked,
      preselected: !blocked,
      blockReasons,
      hints,
    });
  }

  items.sort((left, right) =>
    left.sourceStartDate.localeCompare(right.sourceStartDate)
    || (left.startTime ?? "").localeCompare(right.startTime ?? "")
    || left.appointmentId - right.appointmentId,
  );

  return { sourceWeek, shiftWeeks: params.shiftWeeks, items };
}

export async function executeBulkWeekMove(params: {
  shiftWeeks: number;
  items: Array<{ appointmentId: number; version: number }>;
  roleKey: CanonicalRoleKey;
}): Promise<BulkWeekMoveExecuteResult> {
  const moved: BulkWeekMoveExecuteResult["moved"] = [];
  const failed: BulkWeekMoveExecuteResult["failed"] = [];

  for (const item of params.items) {
    const existing = await appointmentsRepository.getAppointmentWithEmployees(item.appointmentId);
    if (!existing) {
      failed.push({ appointmentId: item.appointmentId, code: "NOT_FOUND", message: "Termin nicht gefunden" });
      continue;
    }

    const sourceStartDate = toDateOnly(existing.startDate);
    const sourceEndDate = existing.endDate ? toDateOnly(existing.endDate) : null;
    const targetStartDate = addWeeksToDateOnly(sourceStartDate, params.shiftWeeks);
    const targetEndDate = sourceEndDate ? addWeeksToDateOnly(sourceEndDate, params.shiftWeeks) : null;
    const employeeIds = existing.employees.map((employee) => employee.id);

    try {
      await appointmentsService.updateAppointment(
        item.appointmentId,
        {
          version: item.version,
          startDate: targetStartDate,
          endDate: targetEndDate,
          startTime: existing.startTime ?? null,
          employeeIds,
        },
        params.roleKey,
      );
      moved.push({ appointmentId: item.appointmentId, sourceStartDate, targetStartDate });
    } catch (err) {
      if (appointmentsService.isAppointmentError(err)) {
        failed.push({ appointmentId: item.appointmentId, code: err.code, message: err.message });
        continue;
      }
      throw err;
    }
  }

  return { moved, failed };
}
