/**
 * Test Scope:
 *
 * Feature: FT21 - Kundenformular Dokumentextraktion
 * Use Case: UC Neuer Kunde mit kundenfokussiertem Extraktionsdialog
 *
 * Abgedeckte Regeln:
 * - Neuer Kunde zeigt eine Extract-Dropzone, Bestandskunde nicht.
 * - Extract-Endpunkt wird mit scope=customer_form aufgerufen.
 * - Dialog wird auf Kundendaten reduziert und mit Kundendaten-Button verdrahtet.
 * - Kundennummer ist nur bei Bestandskunde readOnly und bei Neukunde editierbar.
 * - Kundennummer-Duplikate werden vor Uebernahme blockiert.
 *
 * Fehlerfaelle:
 * - Fehlende Scope-Verdrahtung oder fehlende Duplicate-Blockade.
 *
 * Ziel:
 * Sicherstellen, dass der neue Kunden-Extract-Flow stabil verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT21 customer data document extraction flow wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/CustomerData.tsx");
  const source = readFileSync(filePath, "utf8");

  it("wires customer-form extraction scope", () => {
    expect(source).toContain("/api/document-extraction/extract?scope=customer_form");
    expect(source).toContain("const runDocumentExtractionCustomer = async (file: File)");
  });

  it("shows dropzone only for new customer and opens reduced dialog", () => {
    expect(source).toContain("{!isEditMode ? (");
    expect(source).toContain("<DocumentExtractionDropzone");
    expect(source).toContain("showProjectSection={false}");
    expect(source).toContain("fieldReport: extraction.fieldReport");
  });

  it("blocks duplicate customer numbers before applying extracted data", () => {
    expect(source).toContain("const resolution = await resolveCustomerByNumber(customer.customerNumber)");
    expect(source).toContain("if (resolution.resolution !== \"none\")");
    expect(source).toContain("throw new Error(\"Kundennummer ist bereits vergeben.\")");
  });

  it("keeps customer number editable for new customer and readonly for existing customer", () => {
    expect(source).toContain("const isEditMode = !!customerId;");
    expect(source).toContain("readOnly={isEditMode}");
  });
});
