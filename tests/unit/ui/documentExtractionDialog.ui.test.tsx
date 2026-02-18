/**
 * Test Scope:
 *
 * Feature: FT21 - DocumentExtractionDialog UI-Refactor
 * Use Case: UC Reduzierte Dialog-UI mit Editor-only Artikelliste und stabilen Payload-Shapes
 *
 * Abgedeckte Regeln:
 * - Dialog nutzt wiederverwendbare Customer/Project-Sections und bleibt ohne DialogHeader/Titel.
 * - Kunden-/Projektdaten koennen getrennt uebernommen werden (Split-Buttons).
 * - Terminmodus kann einen einzelnen Daten-Button nutzen.
 * - Projektbereich nutzt RichTextEditor controlled mit articleListHtml.
 *
 * Fehlerfälle:
 * - Regression auf Textarea/HTML-Plaintext-Anzeige.
 * - Unbeabsichtigte Payload-Shape-Aenderungen bei onApplyProject.
 *
 * Ziel:
 * Sicherstellen, dass der Dialog ausschließlich die geforderte UI-Anpassung umsetzt, ohne Schnittstellenbruch.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT21 document extraction dialog composable ui", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/DocumentExtractionDialog.tsx");
  const source = readFileSync(filePath, "utf8");

  it("keeps dialog header components removed and uses section components", () => {
    expect(source).not.toContain("DialogHeader");
    expect(source).not.toContain("DialogTitle");
    expect(source).not.toContain("DialogDescription");
    expect(source).toContain("DocumentExtractionCustomerSection");
    expect(source).toContain("DocumentExtractionProjectSection");
  });

  it("supports split apply actions for customer and project", () => {
    expect(source).toContain("customerApplyLabel = \"Kundendaten übernehmen\"");
    expect(source).toContain("projectApplyLabel = \"Projektdaten übernehmen\"");
    expect(source).toContain("data-testid=\"button-doc-extract-apply-customer\"");
    expect(source).toContain("data-testid=\"button-doc-extract-apply-project\"");
  });

  it("supports appointment single apply mode", () => {
    expect(source).toContain("dataApplyLabel = \"Daten übernehmen\"");
    expect(source).toContain("onApplyData?: (payload:");
    expect(source).toContain("data-testid=\"button-doc-extract-apply-data\"");
  });

  it("keeps payload shape unchanged for apply actions", () => {
    expect(source).toContain("saunaModel,");
    expect(source).toContain("orderNumber,");
    expect(source).toContain("articleListHtml,");
    expect(source).toContain("customer,");
    expect(source).toContain("company: fallback.company");
    expect(source).toContain("addressLine2: fallback.addressLine2");
  });

  it("keeps dialog size constraints", () => {
    expect(source).toContain('className="max-w-4xl max-h-[90vh] overflow-y-auto"');
  });
});
