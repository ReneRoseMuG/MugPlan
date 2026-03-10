/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Projektformular Extraktionsfluss
 *
 * Abgedeckte Regeln:
 * - Upload ruft den Extract-Endpunkt mit project_form auf.
 * - Erfolgsfall oeffnet Dialog und uebergibt Extraktionsdaten.
 * - Apply-Callback schreibt die extrahierte Artikelliste nicht direkt in den Beschreibungseditor.
 * - Projektformular verdrahtet Artikellisten-Slots und ComponentDropdown.
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
  const projectFormPath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const projectOrderFormPath = path.resolve(process.cwd(), "client/src/components/ProjectOrderForm.tsx");
  const source = readFileSync(projectFormPath, "utf8");
  const projectOrderFormSource = readFileSync(projectOrderFormPath, "utf8");

  it("calls extract endpoint with project_form scope", () => {
    expect(source).toContain("/api/document-extraction/extract?scope=project_form");
    expect(source).toContain("const runDocumentExtraction = async (file: File)");
  });

  it("wires dropzone and dialog state", () => {
    expect(source).toContain("{!isEditing ? (");
    expect(source).toContain("<DocumentExtractionDropzone");
    expect(source).toContain("onFileSelected={(file) => {");
    expect(source).toContain("void runDocumentExtraction(file);");
    expect(source).toContain("<DocumentExtractionDialog");
    expect(source).toContain("open={documentExtractionOpen}");
    expect(source).toContain("data={documentExtractionData}");
  });

  it("wires single data apply callback", () => {
    expect(source).toContain("dataApplyLabel=\"Daten übernehmen\"");
    expect(source).toContain("onApplyData={applyExtractedData}");
    expect(source).toContain("setDocumentExtractionOpen(false);");
    expect(source).not.toContain("onApplyCustomer={");
    expect(source).not.toContain("onApplyProject={");
  });

  it("routes article list handling through the new product state instead of the editor", () => {
    expect(source).toContain("setExtractedArticleListHtml(payload.articleListHtml.trim());");
    expect(source).toContain("buildPersistedProjectDescription(productSelections, descriptionMd)");
    expect(source).not.toContain("setDescriptionMd(payload.articleListHtml.trim());");
  });

  it("wires component slot selection and dialog rendering", () => {
    expect(source).toContain("<ComponentDropdown");
    expect(source).toContain("onOpenComponentDialog={setComponentDialogField}");
    expect(projectOrderFormSource).toContain("PROJECT_PRODUCT_FIELDS.map((field) => (");
    expect(projectOrderFormSource).toContain("Auswählen");
  });

  it("keeps order number editable for new project and readonly for existing project", () => {
    expect(source).toContain("const isEditing = !!projectId;");
    expect(source).toContain("isEditing={isEditing}");
    expect(source).toContain("onOrderNumberChange={setOrderNumber}");
    expect(projectOrderFormSource).toContain("readOnly={isEditing}");
  });

  it("maps extracted amount into dialog data and local amount state", () => {
    expect(source).toContain("amount: extraction.amount ?? null");
    expect(source).toContain("const extractedAmount = payload.amount.trim();");
    expect(source).toContain("setAmount(extractedAmount);");
  });

  it("resolves duplicate customer numbers silently and reuses existing customers", () => {
    expect(source).toContain("if (resolution.resolution === \"single\")");
    expect(source).toContain("return resolution.customer;");
    expect(source).toContain("tryPatchExistingCustomerFromExtraction");
    expect(source).toContain("setCustomerId(mergedCustomer.id);");
    expect(source).not.toContain("Kundennummer existiert bereits. Vorhandenen Kunden übernehmen?");
    expect(source).not.toContain("if (resolution.resolution !== \"none\")");
  });
});
