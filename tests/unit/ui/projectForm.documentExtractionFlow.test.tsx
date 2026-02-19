/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Projektformular Extraktionsfluss
 *
 * Abgedeckte Regeln:
 * - Upload ruft den Extract-Endpunkt mit project_form auf.
 * - Erfolgsfall oeffnet Dialog und uebergibt Extraktionsdaten.
 * - Apply-Callbacks sind an Customer/Project-Uebernahme verdrahtet.
 * - Auftragsnummer ist nur bei Bestandsprojekt readOnly und bei neuem Projekt editierbar.
 * - Bei single-Customer-Konflikt wird bestaetigt und vorhandener Kunde uebernommen statt Neuanlage.
 *
 * Fehlerfaelle:
 * - Fehlende Endpunktverdrahtung wuerde Upload-/Dialog-Flow brechen.
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
    expect(source).toContain("{!isEditing ? (");
    expect(source).toContain("<DocumentExtractionDropzone");
    expect(source).toContain("onFileSelected={runDocumentExtraction}");
    expect(source).toContain("<DocumentExtractionDialog");
    expect(source).toContain("open={documentExtractionOpen}");
    expect(source).toContain("data={documentExtractionData}");
  });

  it("wires split apply callbacks for customer and project", () => {
    expect(source).toContain("onApplyCustomer={applyExtractedCustomerSuggestion}");
    expect(source).toContain("projectApplyLabel=\"Projektdaten");
    expect(source).toContain("onApplyProject={({ saunaModel, orderNumber, articleListHtml }) =>");
  });

  it("keeps order number editable for new project and readonly for existing project", () => {
    expect(source).toContain("const isEditing = !!projectId;");
    expect(source).toContain("readOnly={isEditing}");
  });

  it("resolves duplicate customer numbers via confirm and existing customer selection", () => {
    expect(source).toContain("if (resolution.resolution === \"single\")");
    expect(source).toContain("const confirmed = window.confirm(\"Kundennummer existiert bereits. Vorhandenen Kunden übernehmen?\")");
    expect(source).toContain("setCustomerId(resolution.customer.id);");
    expect(source).not.toContain("if (resolution.resolution !== \"none\")");
  });
});
