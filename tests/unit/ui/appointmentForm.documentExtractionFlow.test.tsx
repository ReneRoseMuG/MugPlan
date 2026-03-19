/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Terminformular Extraktionsfluss
 *
 * Abgedeckte Regeln:
 * - Upload ruft den Extract-Endpunkt mit appointment_form auf.
 * - Erfolgsfall oeffnet Dialog und uebergibt Extraktionsdaten.
 * - Apply-Callback oeffnet das neue Projektformular statt direkt ein Projekt zu persistieren.
 * - Disable-Flags fuer Apply sind an selektiertes Projekt gekoppelt.
 * - Bei single-Customer-Konflikt wird bestaetigt und vorhandener Kunde uebernommen.
 *
 * Fehlerfaelle:
 * - Fehlende Verdrahtung kann zu falschen Apply-Aktionen im Terminformular fuehren.
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
    expect(source).toContain("onFileSelected={(file) => {");
    expect(source).toContain("void runDocumentExtraction(file);");
    expect(source).toContain("<DocumentExtractionDialog");
    expect(source).toContain("open={documentExtractionOpen}");
    expect(source).toContain("data={documentExtractionData}");
    expect(source).toContain("fieldReport: extraction.fieldReport");
  });

  it("uses single data apply callback with disable rule", () => {
    expect(source).toContain("onApplyData={applyExtractedProject}");
    expect(source).toContain("dataApplyLabel=");
    expect(source).toContain("disableProjectApply={Boolean(selectedProjectId)}");
    expect(source).not.toContain("onApplyCustomer={applyExtractedCustomer}");
  });

  it("forwards extracted project data into a pending project draft and uses existing customer silently on duplicate conflicts", () => {
    expect(source).toContain("setPendingProjectDraft({");
    expect(source).toContain("extractedArticleListHtml: payload.articleListHtml.trim()");
    expect(source).toContain("productSelections: documentExtractionData");
    expect(source).toContain("amount: extraction.amount ?? null");
    expect(source).toContain("tryPatchExistingCustomerFromExtraction");
    expect(source).toContain("<ProjectForm");
    expect(source).toContain("onProjectCreated={(createdProjectId) => {");
    expect(source).toContain("setSelectedProjectId(createdProjectId);");
    expect(source).toContain("if (resolution.resolution === \"single\")");
    expect(source).toContain("return resolution.customer;");
    expect(source).not.toContain("Kundennummer existiert bereits. Vorhandenen Kunden übernehmen?");
    expect(source).toContain("if (!resolvedCustomer) {");
  });
});
