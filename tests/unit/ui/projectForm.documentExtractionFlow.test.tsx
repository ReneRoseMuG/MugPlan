/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Projektformular Extraktionsfluss
 *
 * Abgedeckte Regeln:
 * - Upload ruft den Extract-Endpunkt mit project_form auf.
 * - Erfolgsfall öffnet Dialog und übergibt Extraktionsdaten.
 * - Apply-Callbacks sind an Customer/Project-Übernahme verdrahtet.
 *
 * Fehlerfaelle:
 * - Fehlende Endpunktverdrahtung würde Upload-/Dialog-Flow brechen.
 *
 * Ziel:
 * Sicherstellen, dass der Projektformular-Flow zur Dokumentextraktion korrekt verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT20 project form document extraction flow wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("calls extract endpoint with project_form scope", () => {
    expect(source).toContain("/api/document-extraction/extract?scope=project_form");
    expect(source).toContain("const runDocumentExtraction = async (file: File)");
  });

  it("wires dropzone and dialog state", () => {
    expect(source).toContain("<DocumentExtractionDropzone");
    expect(source).toContain("onFileSelected={runDocumentExtraction}");
    expect(source).toContain("<DocumentExtractionDialog");
    expect(source).toContain("open={documentExtractionOpen}");
    expect(source).toContain("data={documentExtractionData}");
  });

  it("wires customer/project apply callbacks", () => {
    expect(source).toContain("onApplyCustomer={applyExtractedCustomer}");
    expect(source).toContain("onApplyProject={({ saunaModel, articleListHtml }) =>");
  });
});
