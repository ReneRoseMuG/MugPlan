/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Terminformular Extraktionsfluss
 *
 * Abgedeckte Regeln:
 * - Upload ruft den Extract-Endpunkt mit appointment_form auf.
 * - Erfolgsfall öffnet Dialog und übergibt Extraktionsdaten.
 * - Apply-Callbacks sind an Customer/Project-Übernahme verdrahtet.
 * - Disable-Flags für Apply sind an selektiertes Projekt gekoppelt.
 *
 * Fehlerfaelle:
 * - Fehlende Verdrahtung kann zu falschen Apply-Aktionen im Terminformular führen.
 *
 * Ziel:
 * Sicherstellen, dass der Terminformular-Flow zur Dokumentextraktion korrekt verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT20 appointment form document extraction flow wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("calls extract endpoint with appointment_form scope", () => {
    expect(source).toContain("/api/document-extraction/extract?scope=appointment_form");
    expect(source).toContain("const runDocumentExtraction = async (file: File)");
  });

  it("wires dropzone and extraction dialog", () => {
    expect(source).toContain("{selectedProjectId === null ? (");
    expect(source).toContain("<DocumentExtractionDropzone");
    expect(source).toContain("onFileSelected={runDocumentExtraction}");
    expect(source).toContain("<DocumentExtractionDialog");
    expect(source).toContain("open={documentExtractionOpen}");
    expect(source).toContain("data={documentExtractionData}");
  });

  it("uses single data apply callback with disable rule", () => {
    expect(source).toContain("onApplyData={applyExtractedProject}");
    expect(source).toContain("dataApplyLabel=\"Daten übernehmen\"");
    expect(source).toContain("disableProjectApply={Boolean(selectedProjectId)}");
    expect(source).not.toContain("onApplyCustomer={applyExtractedCustomer}");
  });

  it("forwards extracted order number and blocks duplicate customer numbers", () => {
    expect(source).toContain("orderNumber: payload.orderNumber.trim() || null");
    expect(source).toContain("throw new Error(\"Vorname und Nachname sind erforderlich\")");
    expect(source).toContain("throw new Error(\"Kundennummer ist bereits vergeben.\")");
  });
});
