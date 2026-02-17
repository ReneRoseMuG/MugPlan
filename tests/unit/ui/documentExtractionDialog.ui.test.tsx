/**
 * Test Scope:
 *
 * Feature: FT21 - DocumentExtractionDialog UI-Refactor
 * Use Case: UC Reduzierte Dialog-UI mit semantischem HTML-Editor und stabilen Payload-Shapes
 *
 * Abgedeckte Regeln:
 * - Headline-/Untertitel-Elemente und Kundendaten-Zwischenheadline sind entfernt.
 * - Felder Firma und Adresszusatz werden weder gerendert noch als editierbarer State geführt.
 * - Projektbereich ist in Projektdaten/Projektname umbenannt.
 * - RichTextEditor wird controlled mit articleListHtml verwendet.
 * - Apply-Payloads behalten das bestehende Shape inkl. unveränderter Feldnamen.
 *
 * Fehlerfälle:
 * - Regression auf Textarea/HTML-Plaintext-Anzeige.
 * - Unbeabsichtigte Payload-Shape-Änderungen bei onApplyCustomer/onApplyProject.
 *
 * Ziel:
 * Sicherstellen, dass der Dialog ausschließlich die geforderte UI-Anpassung umsetzt, ohne Schnittstellenbruch.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT21 document extraction dialog ui refactor", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/DocumentExtractionDialog.tsx");
  const source = readFileSync(filePath, "utf8");

  it("removes dialog headline elements and customer heading", () => {
    expect(source).not.toContain("DialogHeader");
    expect(source).not.toContain("DialogTitle");
    expect(source).not.toContain("DialogDescription");
    expect(source).not.toContain(">Kundendaten<");
  });

  it("removes company and addressLine2 fields from rendered inputs and editable state", () => {
    expect(source).not.toContain("<Label>Firma</Label>");
    expect(source).not.toContain("<Label>Adresszusatz</Label>");
    expect(source).not.toContain("setCustomerFields({ ...customerFields, company:");
    expect(source).not.toContain("setCustomerFields({ ...customerFields, addressLine2:");
  });

  it("renames project section labels", () => {
    expect(source).toContain(">Projektdaten<");
    expect(source).toContain("<Label>Projektname</Label>");
    expect(source).not.toContain(">Projektvorschlag<");
    expect(source).not.toContain("Saunamodell (Titelvorschlag)");
  });

  it("uses RichTextEditor in controlled mode with enlarged scrollable editor area", () => {
    expect(source).toContain("<RichTextEditor");
    expect(source).toContain("value={articleListHtml}");
    expect(source).toContain("onChange={setArticleListHtml}");
    expect(source).toContain("[&_[data-testid='richtext-editor']]:min-h-[460px]");
    expect(source).toContain("[&_[data-testid='richtext-editor']]:overflow-y-auto");
    expect(source).not.toContain("<Textarea");
  });

  it("keeps payload shapes unchanged for customer and project apply actions", () => {
    expect(source).toContain("void onApplyCustomer(customer)");
    expect(source).toContain("void onApplyProject({ saunaModel, articleListHtml, customer })");
    expect(source).toContain("company: fallback.company");
    expect(source).toContain("addressLine2: fallback.addressLine2");
  });

  it("keeps dialog size constraints and separated apply button labels", () => {
    expect(source).toContain('className="max-w-4xl max-h-[90vh] overflow-y-auto"');
    expect(source).toContain('customerApplyLabel = "Kundendaten übernehmen"');
    expect(source).toContain('projectApplyLabel = "Projektdaten übernehmen"');
    expect(source).toContain('data-testid="button-doc-extract-apply-customer"');
    expect(source).toContain('data-testid="button-doc-extract-apply-project"');
  });
});
