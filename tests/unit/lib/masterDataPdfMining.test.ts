/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Clientseitige Partitionierung zerlegt PDF-Listen nach Batch-Dateianzahl und Gesamtgroesse.
 * - Zu grosse Einzeldateien werden lokal als Fehler markiert und nicht an den Server gesendet.
 * - Batch-Resultate werden ueber Produktgruppen deterministisch zusammengefuehrt.
 * - Komponenten bleiben batchuebergreifend nach Namen dedupliziert.
 *
 * Fehlerfaelle:
 * - Einzeldatei ueberschreitet das serverseitige Einzeldatei-Limit.
 * - Mehrere Batch-Resultate enthalten dieselbe Produktgruppe mit ueberschneidenden Komponenten.
 *
 * Ziel:
 * Sicherstellen, dass unbegrenzte Dateilisten im Frontend stabil in serielle Analyse-Batches und ein konsolidiertes Gesamtergebnis ueberfuehrt werden.
 */
import { describe, expect, it } from "vitest";
import {
  createEmptyMiningResult,
  mergeMiningAnalyzeResponses,
  partitionMiningFiles,
  type MiningLimits,
} from "../../../client/src/lib/masterDataPdfMining";

describe("FT24 unit: master data pdf mining client batching", () => {
  const limits: MiningLimits = {
    maxFiles: 2,
    maxFileSizeBytes: 8,
    maxTotalBytes: 10,
  };

  it("partitions files by maxFiles and maxTotalBytes and rejects oversized files locally", () => {
    const files = [
      { name: "a.pdf", size: 4 },
      { name: "b.pdf", size: 4 },
      { name: "c.pdf", size: 4 },
      { name: "too-large.pdf", size: 9 },
      { name: "d.pdf", size: 3 },
    ];

    const result = partitionMiningFiles(files, limits);

    expect(result.rejected).toEqual([
      { fileName: "too-large.pdf", reason: "Datei too-large.pdf ueberschreitet das Einzeldatei-Limit." },
    ]);
    expect(result.batches).toHaveLength(2);
    expect(result.batches[0]?.map((file) => file.name)).toEqual(["a.pdf", "b.pdf"]);
    expect(result.batches[1]?.map((file) => file.name)).toEqual(["c.pdf", "d.pdf"]);
  });

  it("merges batch results deterministically across product groups", () => {
    const initial = createEmptyMiningResult(limits);
    const first = mergeMiningAnalyzeResponses(initial, {
      documents: [{
        fileName: "a.pdf",
        orderNumber: "A-1",
        productName: "XL Sauna",
        productDescription: null,
        articleItems: [
          { kind: "product", quantity: "1", articleNumber: null, name: "XL Sauna", description: null },
          { kind: "component", quantity: "1", articleNumber: null, name: "Ofen", description: null },
        ],
      }],
      productGroups: [{
        productName: "XL Sauna",
        productDescription: null,
        sourceFileNames: ["a.pdf"],
        articleItems: [
          { kind: "product", quantity: "1", articleNumber: null, name: "XL Sauna", description: null },
          { kind: "component", quantity: "1", articleNumber: null, name: "Ofen", description: null },
        ],
      }],
      skipped: [{ fileName: "skip-a.pdf", reason: "skip" }],
      errors: [{ fileName: "error-a.pdf", reason: "error" }],
    });

    const merged = mergeMiningAnalyzeResponses(first, {
      documents: [{
        fileName: "b.pdf",
        orderNumber: "A-2",
        productName: " xl   sauna ",
        productDescription: "Beschreibung",
        articleItems: [
          { kind: "product", quantity: "1", articleNumber: null, name: "XL Sauna", description: "Beschreibung" },
          { kind: "component", quantity: "1", articleNumber: null, name: "Ofen", description: null },
          { kind: "component", quantity: "1", articleNumber: null, name: "Einstiegsstufe", description: null },
        ],
      }],
      productGroups: [{
        productName: " xl   sauna ",
        productDescription: "Beschreibung",
        sourceFileNames: ["b.pdf"],
        articleItems: [
          { kind: "product", quantity: "1", articleNumber: null, name: "XL Sauna", description: "Beschreibung" },
          { kind: "component", quantity: "1", articleNumber: null, name: "Ofen", description: null },
          { kind: "component", quantity: "1", articleNumber: null, name: "Einstiegsstufe", description: null },
        ],
      }],
      skipped: [{ fileName: "skip-b.pdf", reason: "skip-b" }],
      errors: [{ fileName: "error-b.pdf", reason: "error-b" }],
    });

    expect(merged.documents).toHaveLength(2);
    expect(merged.skipped).toEqual([
      { fileName: "skip-a.pdf", reason: "skip" },
      { fileName: "skip-b.pdf", reason: "skip-b" },
    ]);
    expect(merged.errors).toEqual([
      { fileName: "error-a.pdf", reason: "error" },
      { fileName: "error-b.pdf", reason: "error-b" },
    ]);
    expect(merged.productGroups).toHaveLength(1);
    expect(merged.productGroups[0]).toMatchObject({
      productName: "XL Sauna",
      productDescription: "Beschreibung",
      sourceFileNames: ["a.pdf", "b.pdf"],
    });
    expect(merged.productGroups[0]?.articleItems.map((item) => item.name)).toEqual([
      "XL Sauna",
      "Ofen",
      "Einstiegsstufe",
    ]);
  });
});
