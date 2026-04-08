export const RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME = "Storniert";
export const RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR = "#ef4444";
export const MANAGED_REPORT_EXCLUSION_TAG_NAME = "Reklamation";
export const MANAGED_REPORT_EXCLUSION_TAG_COLOR = "#f97316";
export const MANAGED_SPECIAL_MEASURE_TAG_NAME = "Sondermaß";
export const MANAGED_SPECIAL_MEASURE_TAG_COLOR = "#1e3a8a";
export const MANAGED_MESSE_TAG_NAME = "Messe Aufbau/Abbau";
export const MANAGED_MESSE_TAG_COLOR = "#4a7c3f";
export const MANAGED_REMARKS_TAG_NAME = "Anmerkungen";

export type AppointmentCancellationReportState = "default" | "contains_cancelled" | "cancelled_only";
export type TagPickerDomain = "appointment" | "project" | "customer" | "employee";

function normalizeTagName(value: string): string {
  return value.trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
}

export function isReservedAppointmentCancellationTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
}

export function isManagedReportExclusionTagName(value: string): boolean {
  return normalizeTagName(value) === normalizeTagName(MANAGED_REPORT_EXCLUSION_TAG_NAME);
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
    || isManagedReportExclusionTagName(value)
    || isManagedSpecialMeasureTagName(value)
    || isManagedMesseTagName(value);
}

export function isPickerVisibleForDomain(value: string, domain: TagPickerDomain): boolean {
  if (isReservedAppointmentCancellationTagName(value)) {
    return false;
  }

  if (isManagedReportExclusionTagName(value)) {
    return domain === "project" || domain === "appointment";
  }

  if (isManagedSpecialMeasureTagName(value)) {
    return domain === "project" || domain === "appointment";
  }

  if (isManagedMesseTagName(value)) {
    return domain === "project" || domain === "appointment";
  }

  return true;
}
