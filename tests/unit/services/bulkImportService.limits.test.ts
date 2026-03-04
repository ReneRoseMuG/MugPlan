/**
 * Test Scope:
 *
 * Feature: FT24 - Bulk Import Kunden/Projekte
 * Use Case: UC Analyse-Limits
 *
 * Abgedeckte Regeln:
 * - Analyze lehnt Requests mit mehr als 100 Dateien mit 413 ab.
 * - Analyze lehnt Requests mit zu grosser Einzeldatei mit 413 ab.
 * - Nur PDF-Dateien werden als Bulk-Input weitergegeben.
 *
 * Fehlerfaelle:
 * - Ueberschreitung der konfigurierten Hard-Limits.
 *
 * Ziel:
 * Harte Bulk-Import-Limits und Dateifilterung deterministisch absichern.
 */
import { describe, expect, it } from "vitest";
import {
  BULK_IMPORT_LIMITS,
  BulkImportError,
  analyzeCustomerBulkImport,
  toBulkFileInputs,
} from "../../../server/services/bulkImportService";

describe("FT24 unit: bulk import limits", () => {
  it("rejects analyze when file count exceeds maxFiles", async () => {
    const files = Array.from({ length: BULK_IMPORT_LIMITS.maxFiles + 1 }, (_, index) => ({
      fileName: `file-${index}.pdf`,
      contentType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4"),
    }));

    await expect(analyzeCustomerBulkImport(files)).rejects.toMatchObject<BulkImportError>({
      status: 413,
      code: "BULK_IMPORT_LIMIT_EXCEEDED",
    });
  });

  it("rejects analyze when a single file exceeds maxFileSizeBytes", async () => {
    const files = [{
      fileName: "too-large.pdf",
      contentType: "application/pdf",
      buffer: Buffer.alloc(BULK_IMPORT_LIMITS.maxFileSizeBytes + 1, 0),
    }];

    await expect(analyzeCustomerBulkImport(files)).rejects.toMatchObject<BulkImportError>({
      status: 413,
      code: "BULK_IMPORT_LIMIT_EXCEEDED",
    });
  });

  it("converts only pdf files to bulk import inputs", () => {
    const result = toBulkFileInputs([
      { filename: "a.pdf", contentType: "application/pdf", buffer: Buffer.from("a") },
      { filename: "b.PDF", contentType: "application/pdf", buffer: Buffer.from("b") },
      { filename: "c.txt", contentType: "text/plain", buffer: Buffer.from("c") },
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.fileName)).toEqual(["a.pdf", "b.PDF"]);
  });
});
