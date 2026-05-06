import { isAbsenceTourName } from "@shared/absenceAppointments";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

export type CalendarMoveSelection = {
  id: number;
  version: number;
  projectId: number | null;
  projectName: string | null;
  customerId: number;
  customerName: string | null;
  customerNumber: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  tourId: number | null;
  tourName: string | null;
  employeeIds: number[];
  isCancelled: boolean;
  isLocked: boolean;
};

export type CalendarMoveRequest = {
  appointment: CalendarMoveSelection;
  targetStartDate: string;
  targetTourId: number;
  targetTourName?: string | null;
  mode: "drag" | "insert";
};

export type AppointmentWeekEmployeePreviewItem = {
  employeeId: number;
  employeeName: string;
  status: "will_add" | "conflict" | "already_present" | "current_only";
  selectable: boolean;
  conflictReason: string | null;
  source?: "week_plan" | "available" | "current";
};

export type AppointmentWeekEmployeePreviewResponse = {
  isoYear: number;
  isoWeek: number;
  hasWeekPlan: boolean;
  currentEmployeeIds: number[];
  items: AppointmentWeekEmployeePreviewItem[];
};

const normalizeTourName = (value: string | null | undefined) =>
  (value ?? "").trim().toLocaleLowerCase("de").replace(/ß/g, "ss");

export function isRegularCalendarMoveTarget(tourId: number | null | undefined, tourName: string | null | undefined): tourId is number {
  return typeof tourId === "number"
    && !isAbsenceTourName(tourName)
    && normalizeTourName(tourName) !== normalizeTourName("Parkplatz");
}

export function toCalendarMoveSelection(appointment: CalendarAppointment): CalendarMoveSelection {
  return {
    id: appointment.id,
    version: appointment.version,
    projectId: appointment.projectId,
    projectName: appointment.projectName || appointment.project?.name || null,
    customerId: appointment.customer.id,
    customerName: appointment.customer.fullName ?? null,
    customerNumber: appointment.customer.customerNumber ?? null,
    startDate: appointment.startDate,
    endDate: appointment.endDate ?? null,
    startTime: appointment.startTime ?? null,
    tourId: appointment.tourId ?? null,
    tourName: appointment.tourName ?? null,
    employeeIds: appointment.employees.map((employee) => employee.id),
    isCancelled: appointment.isCancelled,
    isLocked: appointment.isLocked,
  };
}

export function getCalendarMoveSelectionTitle(selection: CalendarMoveSelection): string {
  return selection.projectName?.trim()
    || selection.customerName?.trim()
    || selection.customerNumber?.trim()
    || `Termin ${selection.id}`;
}

export function formatCalendarMoveDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}.${month}.${year.slice(-2)}`;
}

export function getDefaultPreviewSelection(preview: AppointmentWeekEmployeePreviewResponse): number[] {
  return preview.items
    .filter((item) => item.selectable && item.status === "will_add" && (item.source ?? "week_plan") === "week_plan")
    .map((item) => item.employeeId);
}

export function buildEmployeeIdsFromPreviewSelection(
  preview: AppointmentWeekEmployeePreviewResponse,
  selectedIds: number[],
  resolutionMode: "additive" | "replace",
): number[] {
  if (resolutionMode === "additive") {
    return Array.from(new Set([...preview.currentEmployeeIds, ...selectedIds]));
  }

  const selectedSet = new Set(selectedIds);
  return Array.from(new Set(
    preview.items
      .filter((item) => item.status === "already_present" || selectedSet.has(item.employeeId))
      .map((item) => item.employeeId),
  ));
}
