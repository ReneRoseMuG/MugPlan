/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - buildVorlauflistePrintPages paginiert Vorlauflistenzeilen deterministisch in Landscape-Seiten.
 * - Sichtbare Spalten und Reihenfolge werden unverändert in jede Druckseite übernommen.
 * - Spaltenbreiten werden proportional auf die verfügbare Druckbreite skaliert.
 *
 * Fehlerfälle:
 * - Die Seitengrenze weicht von rowsPerPage ab.
 * - Spaltenreihenfolge oder Indikatorspalte gehen im Druckmodell verloren.
 * - Leere Datensätze erzeugen dennoch Druckseiten.
 *
 * Ziel:
 * Das clientseitige Seitenmodell der Vorlaufliste unabhängig von der UI absichern.
 */
import { describe, expect, it } from "vitest";

import {
  buildVorlauflistePrintPages,
  type VorlauflistePrintColumn,
} from "../../../client/src/lib/vorlaufliste-print-model";

type TestRow = {
  projectId: number;
  label: string;
};

describe("vorlaufliste print model", () => {
  const columns: VorlauflistePrintColumn[] = [
    { id: "__indicator", headerText: "", width: 8, isIndicator: true },
    { id: "amount", headerText: "Auftragssumme", width: 200 },
    { id: "city", headerText: "Ort", width: 300 },
    { id: "product-7", headerText: "Sauna", width: 500 },
  ];

  it("splits 25 rows into 20 and 5 with stable metadata", () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      projectId: index + 1,
      label: `Projekt ${index + 1}`,
    }));

    const pages = buildVorlauflistePrintPages<TestRow>({
      columns,
      rows,
      rowsPerPage: 20,
      availableWidthPx: 1000,
    });

    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({
      pageIndex: 0,
      pageNumber: 1,
      totalPages: 2,
      orientation: "landscape",
    });
    expect(pages[0].rows).toHaveLength(20);
    expect(pages[1].rows).toHaveLength(5);
    expect(pages[0].columns.map((column) => column.id)).toEqual(["__indicator", "amount", "city", "product-7"]);
  });

  it("scales widths proportionally for the available print width", () => {
    const rows = [{ projectId: 1, label: "Projekt 1" }];

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
