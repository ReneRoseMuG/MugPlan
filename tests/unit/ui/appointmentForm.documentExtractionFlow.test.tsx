/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Terminformular Extraktionsfluss
 *
 * Abgedeckte Regeln:
 * - Upload ruft den Extract-Endpunkt mit appointment_form auf.
 * - Erfolgsfall oeffnet Dialog und uebergibt Extraktionsdaten.
 * - Apply-Callbacks sind an Customer/Project-Uebernahme verdrahtet.
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
    expect(source).toContain("onFileSelected={runDocumentExtraction}");
    expect(source).toContain("<DocumentExtractionDialog");
    expect(source).toContain("open={documentExtractionOpen}");
    expect(source).toContain("data={documentExtractionData}");
  });

  it("uses single data apply callback with disable rule", () => {
    expect(source).toContain("onApplyData={applyExtractedProject}");
    expect(source).toContain("dataApplyLabel=");
    expect(source).toContain("disableProjectApply={Boolean(selectedProjectId)}");
    expect(source).not.toContain("onApplyCustomer={applyExtractedCustomer}");
  });

  it("forwards extracted order number and uses existing customer on duplicate conflicts", () => {
    expect(source).toContain("orderNumber: payload.orderNumber.trim() || null");
    expect(source).toContain("formatProjectStoredName(resolvedCustomer.customerNumber, payload.saunaModel)");
    expect(source).toContain("if (resolution.resolution === \"single\")");
    expect(source).toContain("const confirmed = window.confirm(\"Kundennummer existiert bereits.");
    expect(source).toContain("return resolution.customer;");
    expect(source).toContain("if (!resolvedCustomer) {");
    expect(source).not.toContain("name: payload.saunaModel.trim()");
  });
});
