import { resolveIsoWeekStart } from "@/lib/isoWeekRange";
import { parseIsoWeekNumber } from "@/lib/isoWeekInput";

/**
 * Löst den ISO-Montag einer Ziel-KW über explizites ISO-Jahr + ISO-Woche auf.
 *
 * Die Ziel-KW wird damit nicht mehr an ein Referenzdatum gekoppelt; das Jahr ist ein
 * eigenständiger fachlicher Eingabewert. Gibt null zurück, wenn KW oder Jahr ungültig
 * sind bzw. die KW im angegebenen ISO-Jahr nicht existiert.
 */
export function resolveKwJumpTarget(isoWeekYear: number, kw: number): Date | null {
  const normalizedKw = parseIsoWeekNumber(kw);
  if (!normalizedKw || !Number.isInteger(isoWeekYear)) {
    return null;
  }

  return resolveIsoWeekStart(isoWeekYear, normalizedKw);
}
