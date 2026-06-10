/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Sichtbares Datum wird als dd.MM.yy formatiert (internes ISO bleibt unangetastet).
 * - „Fix"-Vorauswahl bei fehlender gespeicherter Tag-Auswahl; gespeicherte Auswahl gewinnt; unbekannte IDs werden gefiltert.
 * - Vorausgewählt sind nur verschiebbare Termine; blockierte sind nicht selektierbar.
 * - Auswahl-Toggle ignoriert blockierte Termine.
 * - Execute ist nur bei mindestens einem ausgewählten Termin möglich; Nutzlast enthält nur selektierbare Auswahl.
 *
 * Fehlerfälle:
 * - Toggle auf blockierten Termin ändert die Auswahl nicht.
 * - Leere Auswahl deaktiviert die Ausführung.
 *
 * Ziel:
 * Absicherung der reinen Client-Helfer für die kalenderwochenweise Sammelverschiebung (UC-258).
 */
import { describe, expect, it } from "vitest";
import {
  buildExecuteItems,
  canExecuteSelection,
  formatBulkMoveDate,
  getPreselectedItemIds,
  resolveInitialBlockingTagIds,
  summarizePreview,
  toggleItemSelection,
  type BulkWeekMovePreviewItem,
} from "@/lib/calendar-bulk-week-move";

function buildItem(overrides: Partial<BulkWeekMovePreviewItem> & { appointmentId: number }): BulkWeekMovePreviewItem {
  return {
    appointmentId: overrides.appointmentId,
    version: overrides.version ?? 1,
    title: overrides.title ?? `Termin ${overrides.appointmentId}`,
    tourId: overrides.tourId ?? 10,
    tourName: overrides.tourName ?? "Tour A",
    sourceStartDate: overrides.sourceStartDate ?? "2026-07-06",
    sourceEndDate: overrides.sourceEndDate ?? null,
    startTime: overrides.startTime ?? null,
    targetStartDate: overrides.targetStartDate ?? "2026-07-20",
    targetEndDate: overrides.targetEndDate ?? null,
    status: overrides.status ?? "movable",
    selectable: overrides.selectable ?? true,
    preselected: overrides.preselected ?? true,
    blockReasons: overrides.blockReasons ?? [],
    hints: overrides.hints ?? [],
  };
}

describe("formatBulkMoveDate", () => {
  it("formatiert ISO-Datum als dd.MM.yy", () => {
    expect(formatBulkMoveDate("2026-07-06")).toBe("06.07.26");
  });

  it("gibt ungültige Werte unverändert zurück", () => {
    expect(formatBulkMoveDate("kein-datum")).toBe("kein-datum");
  });
});

describe("resolveInitialBlockingTagIds", () => {
  const tags = [
    { id: 1, name: "Fix" },
    { id: 2, name: "Express" },
  ];

  it("wählt bei fehlender gespeicherter Auswahl das Tag Fix vor", () => {
    expect(resolveInitialBlockingTagIds(undefined, tags)).toEqual([1]);
    expect(resolveInitialBlockingTagIds([], tags)).toEqual([1]);
  });

  it("erkennt Fix unabhängig von Groß-/Kleinschreibung", () => {
    expect(resolveInitialBlockingTagIds(null, [{ id: 9, name: " fix " }])).toEqual([9]);
  });

  it("liefert leere Auswahl, wenn kein Fix-Tag existiert", () => {
    expect(resolveInitialBlockingTagIds(undefined, [{ id: 2, name: "Express" }])).toEqual([]);
  });

  it("bevorzugt die gespeicherte Auswahl und filtert unbekannte IDs", () => {
    expect(resolveInitialBlockingTagIds([2, 999], tags)).toEqual([2]);
  });
});

describe("Auswahllogik des Zwischenreports", () => {
  const items = [
    buildItem({ appointmentId: 100, preselected: true, selectable: true, status: "movable" }),
    buildItem({ appointmentId: 200, preselected: false, selectable: false, status: "blocked" }),
    buildItem({ appointmentId: 300, preselected: true, selectable: true, status: "movable" }),
  ];

  it("wählt nur verschiebbare Termine vor", () => {
    expect(getPreselectedItemIds(items)).toEqual([100, 300]);
  });

  it("ignoriert blockierte Termine beim Toggle", () => {
    const blocked = items[1];
    expect(toggleItemSelection([100, 300], blocked)).toEqual([100, 300]);
  });

  it("schaltet selektierbare Termine an und ab", () => {
    const movable = items[2];
    expect(toggleItemSelection([100], movable)).toEqual([100, 300]);
    expect(toggleItemSelection([100, 300], movable)).toEqual([100]);
  });

  it("aktiviert die Ausführung nur bei mindestens einer Auswahl", () => {
    expect(canExecuteSelection([])).toBe(false);
    expect(canExecuteSelection([100])).toBe(true);
  });

  it("baut die Execute-Nutzlast nur aus selektierbarer Auswahl", () => {
    expect(buildExecuteItems(items, [100, 200, 300])).toEqual([
      { appointmentId: 100, version: 1 },
      { appointmentId: 300, version: 1 },
    ]);
  });

  it("zählt verschiebbare und blockierte Termine", () => {
    expect(summarizePreview(items)).toEqual({ total: 3, movable: 2, blocked: 1 });
  });
});
