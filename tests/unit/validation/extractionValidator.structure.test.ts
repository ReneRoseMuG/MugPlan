/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Strukturvalidierung und Normalisierung der KI-Ausgabe
 *
 * Abgedeckte Regeln:
 * - Optionalfelder werden konsistent normalisiert (leer -> null).
 * - firstName/lastName sind optional und duerfen null sein.
 * - Artikel werden kategorisiert.
 * - HTML-Ausgabe ist flach (eine UL-Ebene) und escaped nutzernahe Inhalte.
 * - Warnings werden getrimmt und leere Werte entfernt.
 * - Optionale Auftragsumme wird als normalisierter Betrag durchgereicht.
 * - Der Feldreport wird nicht implizit im Validator erzeugt.
 *
 * Fehlerfaelle:
 * - Fehlende Pflichtfelder führen zu Zod-Validierungsfehlern.
 *
 * Ziel:
 * Robuste Absicherung des Extraction-Validators für strukturierte KI-Ausgaben.
 */
import { describe, expect, it } from "vitest";
import { buildExtractionFieldReport, validateAndNormalizeExtraction } from "../../../server/services/extractionValidator";

describe("FT20 extraction validator structure", () => {
  it("normalizes optional fields and trims warnings", () => {
    const result = validateAndNormalizeExtraction({
      customer: {
        customerNumber: " 1001 ",
        firstName: " Erika ",
        lastName: " Muster ",
        company: " ",
        email: "",
        phone: " 12345 ",
        addressLine1: "",
        addressLine2: " Haus B ",
        postalCode: "",
        city: " Leipzig ",
      },
      orderNumber: "  A0218229A ",
      amount: " 17136.00 ",
      saunaModel: "  Modell X ",
      articleItems: [{ quantity: " 1x ", description: " Ofen ", category: " Technik " }],
      warnings: [" ", " Hinweis A "],
    });

    expect(result.customer.customerNumber).toBe("1001");
    expect(result.customer.company).toBeNull();
    expect(result.customer.email).toBeNull();
    expect(result.customer.addressLine1).toBeNull();
    expect(result.customer.addressLine2).toBe("Haus B");
    expect(result.customer.city).toBe("Leipzig");
    expect(result.orderNumber).toBe("A0218229A");
    expect(result.amount).toBe("17136.00");
    expect(result.warnings).toEqual(["Hinweis A"]);
  });

  it("accepts missing firstName and lastName as nullable fields", () => {
    const result = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "1002",
        firstName: null,
        lastName: null,
        phone: null,
      },
      orderNumber: null,
      saunaModel: "Modell N",
      articleItems: [{ quantity: "1", description: "Bank", category: "Holz" }],
      warnings: [],
    });

    expect(result.customer.firstName).toBeNull();
    expect(result.customer.lastName).toBeNull();
  });

  it("categorizes articles and generates flat semantic html", () => {
    const result = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "2002",
        firstName: "A",
        lastName: "B",
        phone: null,
      },
      orderNumber: null,
      saunaModel: "Modell Y",
      articleItems: [
        { quantity: "1", description: "Ofen", category: "Technik" },
        { quantity: "2", description: "Licht", category: "Technik" },
      ],
      warnings: [],
    });

    expect(result.categorizedItems).toHaveLength(1);
    expect(result.categorizedItems[0].category).toBe("Technik");
    expect(result.categorizedItems[0].items).toHaveLength(2);
    expect(result.articleListHtml).toBe("<ul><li>1 Ofen</li><li>2 Licht</li></ul>");
    expect(result.articleListHtml).not.toContain("<strong>");
  });

  it("keeps article html flat across multiple categories", () => {
    const result = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "2100",
        firstName: "A",
        lastName: "B",
        phone: null,
      },
      orderNumber: null,
      saunaModel: "Modell Y2",
      articleItems: [
        { quantity: "1", description: "Ofen", category: "Technik" },
        { quantity: "3", description: "Bank", category: "Holz" },
      ],
      warnings: [],
    });

    expect(result.categorizedItems).toHaveLength(2);
    expect(result.articleListHtml).toBe("<ul><li>1 Ofen</li><li>3 Bank</li></ul>");
    expect(result.articleListHtml).not.toContain("<strong>");
    expect(result.articleListHtml).not.toContain("</ul><ul>");
  });

  it("escapes html-sensitive text", () => {
    const result = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "3003",
        firstName: "A",
        lastName: "B",
        phone: null,
      },
      saunaModel: "Modell Z",
      articleItems: [{ quantity: "<1>", description: "\"Ofen\" & Test", category: "Technik" }],
      warnings: [],
    });

    expect(result.articleListHtml).toContain("&lt;1&gt;");
    expect(result.articleListHtml).toContain("&quot;Ofen&quot; &amp; Test");
  });

  it("throws when required structure is missing", () => {
    expect(() =>
      validateAndNormalizeExtraction({
        customer: {
          customerNumber: "",
          firstName: null,
          lastName: null,
          phone: null,
        },
        saunaModel: "",
        articleItems: [],
      }),
    ).toThrow();
  });

  it("keeps field report generation as explicit follow-up step", () => {
    const extraction = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "1001",
        firstName: "Erika",
        lastName: "Muster",
        phone: "12345",
      },
      orderNumber: null,
      saunaModel: "Modell X",
      articleItems: [{ quantity: "1", description: "Ofen", category: "Technik" }],
      warnings: [],
    });

    const report = buildExtractionFieldReport(extraction, "customer_form");

    expect("fieldReport" in extraction).toBe(false);
    expect(report.recognized.some((item) => item.key === "customerNumber")).toBe(true);
  });
});
