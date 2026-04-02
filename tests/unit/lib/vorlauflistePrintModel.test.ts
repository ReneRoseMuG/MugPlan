/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - buildVorlauflistePrintPages gruppiert Druckzeilen zuerst nach ISO-Kalenderwochen und paginiert diese deterministisch in Landscape-Seiten.
 * - Sichtbare Spalten und Reihenfolge werden unverändert in jede Druckseite übernommen.
 * - Spaltenbreiten werden proportional auf die verfügbare Druckbreite skaliert.
 *
 * Fehlerfälle:
 * - Kalenderwochen werden im Druckmodell nicht als getrennte oder fortgesetzte Abschnitte geführt.
 * - Spaltenreihenfolge oder Indikatorspalte gehen im Druckmodell verloren.
 * - Leere Datensätze erzeugen dennoch Druckseiten.
 *
 * Ziel:
 * Das clientseitige Seitenmodell der Vorlaufliste inklusive KW-Gruppierung unabhängig von der UI absichern.
 */
import { describe, expect, it } from "vitest";

import {
  buildVorlauflistePrintPages,
  type VorlauflistePrintColumn,
} from "../../../client/src/lib/vorlaufliste-print-model";

type TestRow = {
  projectId: number;
  actualDate: string;
  label: string;
};

describe("vorlaufliste print model", () => {
  const columns: VorlauflistePrintColumn[] = [
    { id: "__indicator", headerText: "", width: 8, isIndicator: true },
    { id: "amount", headerText: "Auftragssumme", width: 200 },
    { id: "city", headerText: "Ort", width: 300 },
    { id: "product-7", headerText: "Sauna", width: 500 },
  ];

  it("splits rows into stable ISO-week sections and carries long weeks onto follow-up pages", () => {
    const rows: TestRow[] = [
      { projectId: 1, actualDate: "2026-04-06", label: "Projekt 1" },
      { projectId: 2, actualDate: "2026-04-07", label: "Projekt 2" },
      { projectId: 3, actualDate: "2026-04-08", label: "Projekt 3" },
      { projectId: 4, actualDate: "2026-04-09", label: "Projekt 4" },
      { projectId: 5, actualDate: "2026-04-13", label: "Projekt 5" },
      { projectId: 6, actualDate: "2026-04-14", label: "Projekt 6" },
    ];

    const pages = buildVorlauflistePrintPages<TestRow>({
      columns,
      rows,
      rowsPerPage: 4,
      availableWidthPx: 1000,
    });

    expect(pages).toHaveLength(3);
    expect(pages[0]).toMatchObject({
      pageIndex: 0,
      pageNumber: 1,
      totalPages: 3,
      orientation: "landscape",
    });
    expect(pages[0].rows.map((row) => row.projectId)).toEqual([1, 2, 3]);
    expect(pages[0].weekSections).toEqual([
      {
        weekStart: "2026-04-06",
        weekEnd: "2026-04-12",
        weekNumber: 15,
        continuedFromPrevious: false,
        rows: rows.slice(0, 3),
      },
    ]);
    expect(pages[1].weekSections).toEqual([
      {
        weekStart: "2026-04-06",
        weekEnd: "2026-04-12",
        weekNumber: 15,
        continuedFromPrevious: true,
        rows: [rows[3]],
      },
      {
        weekStart: "2026-04-13",
        weekEnd: "2026-04-19",
        weekNumber: 16,
        continuedFromPrevious: false,
        rows: [rows[4]],
      },
    ]);
    expect(pages[2].weekSections).toEqual([
      {
        weekStart: "2026-04-13",
        weekEnd: "2026-04-19",
        weekNumber: 16,
        continuedFromPrevious: true,
        rows: [rows[5]],
      },
    ]);
    expect(pages[0].columns.map((column) => column.id)).toEqual(["__indicator", "amount", "city", "product-7"]);
  });

  it("scales widths proportionally for the available print width", () => {
    const rows = [{ projectId: 1, actualDate: "2026-04-06", label: "Projekt 1" }];

    const pagesAt1000 = buildVorlauflistePrintPages<TestRow>({
      columns,
      rows,
      availableWidthPx: 1008,
    });
    const pagesAt800 = buildVorlauflistePrintPages<TestRow>({
      columns,
      rows,
      availableWidthPx: 808,
    });

    expect(pagesAt1000[0].columns.map((column) => column.scaledWidthPx)).toEqual([8, 200, 300, 500]);
    expect(pagesAt800[0].columns.map((column) => column.scaledWidthPx)).toEqual([8, 160, 240, 400]);
  });

  it("returns an empty page list for empty rows", () => {
    expect(buildVorlauflistePrintPages<TestRow>({
      columns,
      rows: [],
      rowsPerPage: 20,
      availableWidthPx: 1000,
    })).toEqual([]);
  });
});
