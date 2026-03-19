export const RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME = "Storniert";
export const MANAGED_REPORT_EXCLUSION_TAG_NAME = "Reklamation";
export const MANAGED_REPORT_EXCLUSION_TAG_COLOR = "#f97316";

export type AppointmentCancellationReportState = "default" | "contains_cancelled" | "cancelled_only";

function normalizeTagName(value: string): string {
  return value.trim().toLocaleLowerCase("de");
}

export function isReservedAppointmentCancellationTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
}

export function isManagedReportExclusionTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(MANAGED_REPORT_EXCLUSION_TAG_NAME);
}

export function isProtectedSystemTagName(value: string): boolean {
  return isReservedAppointmentCancellationTagName(value) || isManagedReportExclusionTagName(value);
}
