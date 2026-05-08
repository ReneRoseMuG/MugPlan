/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Druck-Paginierung der Auftragsliste verschiebt eine nicht mehr passende Karte komplett auf die naechste Seite.
 * - Leere Reports erzeugen trotzdem eine erste Druckseite.
 *
 * Fehlerfaelle:
 * - Eine Karte wird trotz Hoehenueberlauf noch auf die aktuelle Seite gedrueckt.
 * - Leere Daten erzeugen gar keine Druckseite.
 *
 * Ziel:
 * Die clientseitige Seitenaufteilung der Auftragslisten-Druckvorschau isoliert regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import {
  estimateAuftragslisteCardHeight,
  paginateAuftragslistePrintPages,
  paginateMeasuredAuftragslistePrintPages,
} from "../../../client/src/lib/auftragsliste-print-model";
import type { ReportAuftragslisteProjectRow } from "../../../shared/routes";

function buildRow(projectId: number, description = ""): ReportAuftragslisteProjectRow {
  return {
    projectId,
    customerId: 10 + projectId,
    appointmentId: 100 + projectId,
    projectName: `Projekt ${projectId}`,
    orderNumber: `ORD-${projectId}`,
    customerNumber: `C-${projectId}`,
    customerFullName: `Kunde ${projectId}`,
    actualDate: "2099-11-05",
    durationDays: 2,
    tourName: "Tour 1",
    tourColor: "#0f766e",
    employees: [{ id: 1, fullName: "Max Muster" }],
    customerNotesCount: 0,
    projectNotesCount: 0,
    appointmentNotesCount: 0,
    notesCount: 0,
    customerAttachmentsCount: 0,
    projectAttachmentsCount: 0,
    appointmentAttachmentsCount: 0,
    attachmentsCount: 0,
    tags: [],
    articleValues: [
      { categoryId: 1, value: "A" },
      { categoryId: 2, value: "B" },
    ],
    projectDescription: description || null,
  };
}

describe("auftragsliste print model", () => {
  it("moves a full card to the next page when it no longer fits", () => {
    const first = buildRow(1, "kurz");
    const second = buildRow(2, "x".repeat(900));
    const third = buildRow(3, "x".repeat(900));
    const firstCardHeight = estimateAuftragslisteCardHeight(first);

    const pages = paginateAuftragslistePrintPages([first, second, third], firstCardHeight + 10);

    expect(pages).toHaveLength(3);
    expect(pages[0]?.items.map((item) => item.projectId)).toEqual([1]);
    expect(pages[1]?.items.map((item) => item.projectId)).toEqual([2]);
    expect(pages[2]?.items.map((item) => item.projectId)).toEqual([3]);
  });

  it("returns an empty first page for empty reports", () => {
    const pages = paginateAuftragslistePrintPages([], 920);

    expect(pages).toEqual([{ pageNumber: 1, items: [] }]);
  });

  it("uses measured card heights for the browser print path", () => {
    const rows = [
      buildRow(1, "kurz"),
      buildRow(2, "kurz"),
      buildRow(3, "kurz"),
    ];

    const pages = paginateMeasuredAuftragslistePrintPages(rows, 300, {
      1: 120,
      2: 160,
      3: 90,
    });

    expect(pages.map((page) => page.items.map((item) => item.projectId))).toEqual([
      [1, 2],
      [3],
    ]);
  });
});
