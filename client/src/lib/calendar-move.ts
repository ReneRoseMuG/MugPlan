import { isAbsenceTourName } from "@shared/absenceAppointments";
import { getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import {
  buildEmployeeIdsFromResourcePreviewSelection,
  getDefaultResourcePreviewSelection,
  shouldShowResourceResolutionMode,
  type AppointmentResourceEmployeeCarryoverMode,
  type AppointmentResourcePreviewItem,
  type AppointmentResourcePreviewResponse,
  type AppointmentResourceResolutionMode,
} from "@/lib/resource-planning";

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

export type AppointmentWeekEmployeePreviewItem = AppointmentResourcePreviewItem;
export type AppointmentWeekEmployeePreviewResponse = AppointmentResourcePreviewResponse;
export type CalendarMoveEmployeeCarryoverMode = AppointmentResourceEmployeeCarryoverMode;

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
  return getDefaultResourcePreviewSelection(preview);
}

export function buildEmployeeIdsFromPreviewSelection(
  preview: AppointmentWeekEmployeePreviewResponse,
  selectedIds: number[],
  resolutionMode: AppointmentResourceResolutionMode,
): number[] {
  return buildEmployeeIdsFromResourcePreviewSelection(preview, selectedIds, resolutionMode);
}

function buildCalendarMoveIsoWeekKey(dateValue: string): string {
  const parsedDate = parseISO(dateValue);
  return `${getISOWeekYear(parsedDate)}-${String(getISOWeek(parsedDate)).padStart(2, "0")}`;
}

export function isCalendarMoveSameTourAndWeek(request: CalendarMoveRequest): boolean {
  return request.appointment.tourId === request.targetTourId
    && buildCalendarMoveIsoWeekKey(request.appointment.startDate) === buildCalendarMoveIsoWeekKey(request.targetStartDate);
}

export function resolveCalendarMoveEmployeeCarryoverMode(
  request: CalendarMoveRequest,
): CalendarMoveEmployeeCarryoverMode {
  return isCalendarMoveSameTourAndWeek(request) ? "preserve" : "replace";
}

export function shouldShowCalendarMoveResolutionMode(
  preview: AppointmentWeekEmployeePreviewResponse,
  request: CalendarMoveRequest,
  employeeCarryoverMode: CalendarMoveEmployeeCarryoverMode,
): boolean {
  return shouldShowResourceResolutionMode(preview, {
    employeeCarryoverMode,
    isExistingAppointment: true,
    isSameTourAndWeek: isCalendarMoveSameTourAndWeek(request),
  });
}
