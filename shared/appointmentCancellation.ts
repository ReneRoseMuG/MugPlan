export const RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME = "Storniert";
export const RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR = "#2C2C2A";
export const MANAGED_COMPLAINT_TAG_NAME = "Reklamation";
export const MANAGED_COMPLAINT_TAG_COLOR = "#FF011B";
export const MANAGED_SPECIAL_MEASURE_TAG_NAME = "Sondermaß";
export const MANAGED_SPECIAL_MEASURE_TAG_COLOR = "#BA7517";
export const MANAGED_MESSE_TAG_NAME = "Messe Aufbau/Abbau";
export const MANAGED_MESSE_TAG_COLOR = "#3465A4";
export const MANAGED_REMARKS_TAG_NAME = "Anmerkungen";
export const MANAGED_REMARKS_TAG_COLOR = "#888780";
export const RESERVED_VACANT_TAG_NAME = "Vakant";
export const RESERVED_VACANT_TAG_COLOR = "#D4537E";

export type AppointmentCancellationReportState = "default" | "contains_cancelled" | "cancelled_only";
export type TagPickerDomain = "appointment" | "project" | "customer" | "employee";

function normalizeTagName(value: string): string {
  return value.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
}

export function isReservedAppointmentCancellationTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
}

export function isManagedComplaintTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(MANAGED_COMPLAINT_TAG_NAME);
}

export function isManagedSpecialMeasureTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(MANAGED_SPECIAL_MEASURE_TAG_NAME);
}

export function isManagedMesseTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(MANAGED_MESSE_TAG_NAME);
}

export function isManagedRemarksTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(MANAGED_REMARKS_TAG_NAME);
}

export function isProtectedSystemTagName(value: string): boolean {
  return isReservedAppointmentCancellationTagName(value)
    || isManagedComplaintTagName(value)
    || isManagedSpecialMeasureTagName(value)
    || isManagedMesseTagName(value)
    || normalizeTagName(value) === normalizeTagName(RESERVED_VACANT_TAG_NAME);
}

export function isPickerVisibleForDomain(value: string, domain: TagPickerDomain): boolean {
  void domain;
  if (isReservedAppointmentCancellationTagName(value)) {
    return false;
  }

  return true;
}
