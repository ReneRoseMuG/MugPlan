export const ABSENCE_TOUR_NAME = "Abwesenheiten";
export const ABSENCE_TOUR_COLOR = "#64748B";
export const ABSENCE_CUSTOMER_NUMBER = "MUG-PERSONALPLANUNG";
export const ABSENCE_CUSTOMER_NAME = "MuG Personalplanung";

export const absenceTypeValues = ["vacation", "sick", "absent"] as const;
export type AbsenceType = (typeof absenceTypeValues)[number];

export const ABSENCE_TAG_DEFINITIONS: Record<AbsenceType, { name: string; color: string }> = {
  vacation: { name: "Urlaub", color: "#0F766E" },
  sick: { name: "Krankheit", color: "#B91C1C" },
  absent: { name: "Abwesend", color: "#6B7280" },
};

export const ABSENCE_TAG_NAMES = Object.values(ABSENCE_TAG_DEFINITIONS).map((definition) => definition.name);

function normalizeAbsenceValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("de");
}

export function isAbsenceTagName(value: string | null | undefined): boolean {
  const normalized = normalizeAbsenceValue(value);
  return ABSENCE_TAG_NAMES.some((name) => normalizeAbsenceValue(name) === normalized);
}

export function getAbsenceTagName(absenceType: AbsenceType): string {
  return ABSENCE_TAG_DEFINITIONS[absenceType].name;
}

export function resolveAbsenceTypeFromTagName(value: string | null | undefined): AbsenceType | null {
  const normalized = normalizeAbsenceValue(value);
  for (const [absenceType, definition] of Object.entries(ABSENCE_TAG_DEFINITIONS)) {
    if (normalizeAbsenceValue(definition.name) === normalized) {
      return absenceType as AbsenceType;
    }
  }
  return null;
}

export function isAbsenceTourName(value: string | null | undefined): boolean {
  return normalizeAbsenceValue(value) === normalizeAbsenceValue(ABSENCE_TOUR_NAME);
}
