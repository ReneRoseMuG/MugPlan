export { ABSENCE_TOUR_NAME, isAbsenceTourName } from "@shared/absenceAppointments";

export function normalizeSystemTourName(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("de").replace(/ß/g, "ss");
}

export function isMesseTourName(value: string | null | undefined): boolean {
  const normalized = normalizeSystemTourName(value);
  return normalized === normalizeSystemTourName("Messe")
    || normalized === normalizeSystemTourName("Tour Messe");
}

export function isParkplatzTourName(value: string | null | undefined): boolean {
  return normalizeSystemTourName(value) === normalizeSystemTourName("Parkplatz");
}
