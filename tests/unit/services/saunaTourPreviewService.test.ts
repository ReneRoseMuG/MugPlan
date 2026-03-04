/**
 * Test Scope:
 *
 * Feature: TBD - Admin Import Saunatourenliste Preview
 * Use Case: TBD - Schritt-1 Wochen-Erkennung und Vorschau-Chunking
 *
 * Abgedeckte Regeln:
 * - Jahresblaetter 2025/2026 sind Pflicht fuer die Preview.
 * - Wochenenden werden ueber den Sonntag als Wochenende erkannt.
 * - Week-Preview liefert chunkweise Zeilen und unterstuetzt Session-Cleanup.
 *
 * Fehlerfaelle:
 * - Fehlendes Pflichtblatt fuehrt zu MISSING_REQUIRED_SHEETS.
 * - Zugriff nach Cleanup liefert PREVIEW_SESSION_NOT_FOUND.
 *
 * Ziel:
 * Sicherstellen, dass der Preview-Splitter fuer die Einstellungen deterministisch arbeitet.
 */
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  SaunaTourPreviewError,
  cleanupSaunaTourPreviewSession,
  createSaunaTourPreview,
  getSaunaTourPreviewWeekRows,
} from "../../../server/services/saunaTourPreviewService";

function buildWorkbookBuffer(include2026: boolean): Buffer {
  const workbook = XLSX.utils.book_new();

  const buildYearSheet = (year: number) => {
    const dateRow = [
      null,
      null,
      new Date(year, 0, 6),
      new Date(year, 0, 7),
      new Date(year, 0, 8),
      new Date(year, 0, 9),
      new Date(year, 0, 10),
      new Date(year, 0, 11),
      new Date(year, 0, 12),
      new Date(year, 0, 13),
    ];
    return XLSX.utils.aoa_to_sheet([
      ["Tour", "Mitarbeiter", "KW-Daten", "KW-Daten", "KW-Daten", "KW-Daten", "KW-Daten", "KW-Daten", "KW-Daten", "KW-Daten"],
      dateRow,
      ["T1", "M1", "X", "X", "X", "X", "X", "X", "X", "X"],
      ["T2", "M2", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],
    ]);
  };

  XLSX.utils.book_append_sheet(workbook, buildYearSheet(2025), "2025");
  if (include2026) {
    XLSX.utils.book_append_sheet(workbook, buildYearSheet(2026), "2026");
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("TBD unit: sauna tour preview service", () => {
  it("splits detected weeks by sunday and serves chunked rows", async () => {
    const preview = await createSaunaTourPreview({
      filename: "tourenliste.xlsx",
      buffer: buildWorkbookBuffer(true),
    });

    const year2025 = preview.years.find((year) => year.year === "2025");
    expect(year2025).toBeTruthy();
    expect(year2025?.weeks.length).toBeGreaterThanOrEqual(2);
    expect(year2025?.weeks[0].startColumn).toBe(3);
    expect(year2025?.weeks[0].endColumn).toBe(9);
    expect(year2025?.weeks[1].startColumn).toBe(10);
    expect(year2025?.weeks[1].endColumn).toBe(10);

    const firstWeekId = year2025!.weeks[0].weekId;
    const firstChunk = await getSaunaTourPreviewWeekRows({
      previewSessionId: preview.previewSessionId,
      year: "2025",
      weekId: firstWeekId,
      offset: 0,
      limit: 2,
    });

    expect(firstChunk.rows.length).toBe(2);
    expect(firstChunk.totalRows).toBeGreaterThanOrEqual(4);
    expect(firstChunk.hasMore).toBe(true);
  });

  it("rejects workbook without required 2025/2026 sheets", async () => {
    await expect(createSaunaTourPreview({
      filename: "tourenliste.xlsx",
      buffer: buildWorkbookBuffer(false),
    })).rejects.toMatchObject<SaunaTourPreviewError>({
      status: 422,
      code: "MISSING_REQUIRED_SHEETS",
    });
  });

  it("returns PREVIEW_SESSION_NOT_FOUND after cleanup", async () => {
    const preview = await createSaunaTourPreview({
      filename: "tourenliste.xlsx",
      buffer: buildWorkbookBuffer(true),
    });

    await cleanupSaunaTourPreviewSession(preview.previewSessionId);

    const weekId = preview.years[0].weeks[0].weekId;
    await expect(getSaunaTourPreviewWeekRows({
      previewSessionId: preview.previewSessionId,
      year: "2025",
      weekId,
      offset: 0,
      limit: 20,
    })).rejects.toMatchObject<SaunaTourPreviewError>({
      status: 404,
      code: "PREVIEW_SESSION_NOT_FOUND",
    });
  });
});
