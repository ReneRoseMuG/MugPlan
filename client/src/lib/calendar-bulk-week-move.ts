import type { z } from "zod";
import { api } from "@shared/routes";

export type BulkWeekMovePreviewResponse = z.infer<(typeof api.calendarBulkWeekMove.preview.responses)[200]>;
export type BulkWeekMovePreviewItem = BulkWeekMovePreviewResponse["items"][number];
export type BulkWeekMoveExecuteResponse = z.infer<(typeof api.calendarBulkWeekMove.execute.responses)[200]>;
export type BulkWeekMoveBlockReason = BulkWeekMovePreviewItem["blockReasons"][number];
export type BulkWeekMoveHint = BulkWeekMovePreviewItem["hints"][number];

export const FIX_TAG_NAME = "Fix";

/** Wandelt ein internes ISO-Datum (yyyy-MM-dd) in das sichtbare Kurzformat dd.MM.yy. */
export function formatBulkMoveDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year.slice(-2)}`;
}

function normalizeTagName(value: string): string {
  return value.trim().toLocaleLowerCase("de");
}

/**
 * Vorauswahl der blockierenden Tags: gespeicherte Auswahl gewinnt; ist keine gespeichert,
 * wird bei Erstnutzung das Tag „Fix" vorausgewählt (sofern vorhanden), sonst leer.
 */
export function resolveInitialBlockingTagIds(
  savedTagIds: number[] | undefined | null,
  tags: ReadonlyArray<{ id: number; name: string }>,
): number[] {
  const existingIds = new Set(tags.map((tag) => tag.id));
  if (savedTagIds && savedTagIds.length > 0) {
    return savedTagIds.filter((id) => existingIds.has(id));
  }
  const fixTag = tags.find((tag) => normalizeTagName(tag.name) === normalizeTagName(FIX_TAG_NAME));
  return fixTag ? [fixTag.id] : [];
}

/** Vorausgewählte (verschiebbare) Termine des Zwischenreports. */
export function getPreselectedItemIds(items: ReadonlyArray<BulkWeekMovePreviewItem>): number[] {
  return items.filter((item) => item.preselected).map((item) => item.appointmentId);
}

export function isItemSelectable(item: BulkWeekMovePreviewItem): boolean {
  return item.selectable;
}

/** Schaltet die Auswahl eines Termins um; blockierte (nicht selektierbare) Termine bleiben unverändert. */
export function toggleItemSelection(
  selectedIds: ReadonlyArray<number>,
  item: BulkWeekMovePreviewItem,
): number[] {
  if (!item.selectable) return [...selectedIds];
  if (selectedIds.includes(item.appointmentId)) {
    return selectedIds.filter((id) => id !== item.appointmentId);
  }
  return [...selectedIds, item.appointmentId];
}

/** Die Ausführung ist nur möglich, wenn mindestens ein Termin ausgewählt ist. */
export function canExecuteSelection(selectedIds: ReadonlyArray<number>): boolean {
  return selectedIds.length > 0;
}

/** Baut die Execute-Nutzlast nur aus tatsächlich ausgewählten, selektierbaren Terminen. */
export function buildExecuteItems(
  items: ReadonlyArray<BulkWeekMovePreviewItem>,
  selectedIds: ReadonlyArray<number>,
): Array<{ appointmentId: number; version: number }> {
  const selected = new Set(selectedIds);
  return items
    .filter((item) => item.selectable && selected.has(item.appointmentId))
    .map((item) => ({ appointmentId: item.appointmentId, version: item.version }));
}

export function summarizePreview(items: ReadonlyArray<BulkWeekMovePreviewItem>): {
  total: number;
  movable: number;
  blocked: number;
} {
  const movable = items.filter((item) => item.status === "movable").length;
  return { total: items.length, movable, blocked: items.length - movable };
}

export function itemHasHoliday(item: BulkWeekMovePreviewItem): boolean {
  return item.hints.some((hint) => hint.code === "PUBLIC_HOLIDAY");
}

export function itemHasNotes(item: BulkWeekMovePreviewItem): boolean {
  return item.hints.some((hint) => hint.code === "NOTES");
}
