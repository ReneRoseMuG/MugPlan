import { addWeeks, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";

/**
 * Kanonische ISO-Wochen-Auflösung für den Client.
 *
 * Spiegelt das serverseitige Modell aus `resolveIsoWeekWindow`
 * (server/services/tourWeeksService.ts): Eine Kalenderwoche wird ausschließlich aus
 * explizitem ISO-Jahr und ISO-Woche aufgelöst — nicht aus einem Referenzdatum. So bleibt
 * die Auflösung an Jahreswechseln und in ISO-Jahren mit KW 53 eindeutig.
 */

/**
 * Liefert den ISO-Montag (Wochenstart) für ein explizites ISO-Jahr und eine ISO-Woche.
 * Gibt null zurück, wenn die Kombination im angegebenen ISO-Jahr nicht existiert
 * (z. B. KW 53 in einem 52-Wochen-Jahr).
 */
export function resolveIsoWeekStart(isoWeekYear: number, isoWeek: number): Date | null {
  if (!Number.isInteger(isoWeekYear) || !Number.isInteger(isoWeek) || isoWeek < 1) {
    return null;
  }
  // Der 4. Januar liegt per ISO-Definition immer in KW 1 des jeweiligen ISO-Jahres.
  const isoAnchor = new Date(isoWeekYear, 0, 4, 12, 0, 0);
  const firstWeekStart = startOfISOWeek(isoAnchor);
  const weekStart = startOfISOWeek(addWeeks(firstWeekStart, isoWeek - 1));
  if (getISOWeekYear(weekStart) !== isoWeekYear || getISOWeek(weekStart) !== isoWeek) {
    return null;
  }
  return weekStart;
}

/**
 * Zählt die Anzahl der ISO-Kalenderwochen, die ein Datumsbereich berührt.
 * Ein Bereich von Mittwoch bis zum folgenden Dienstag berührt zwei Wochen.
 */
export function countTouchedIsoWeeks(fromDate: Date, toDate: Date): number {
  const start = startOfISOWeek(fromDate);
  const end = startOfISOWeek(toDate);
  const weeks = Math.round((end.getTime() - start.getTime()) / (7 * 86400000));
  return Math.max(1, weeks + 1);
}
