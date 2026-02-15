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
    expect(source).toContain("<DocumentExtractionDropzone");
    expect(source).toContain("onFileSelected={runDocumentExtraction}");
    expect(source).toContain("<DocumentExtractionDialog");
    expect(source).toContain("open={documentExtractionOpen}");
    expect(source).toContain("data={documentExtractionData}");
  });

  it("wires apply callbacks and disable rules", () => {
    expect(source).toContain("onApplyCustomer={applyExtractedCustomer}");
    expect(source).toContain("onApplyProject={applyExtractedProject}");
    expect(source).toContain("disableCustomerApply={Boolean(selectedProjectId)}");
    expect(source).toContain("disableProjectApply={Boolean(selectedProjectId)}");
  });
});
