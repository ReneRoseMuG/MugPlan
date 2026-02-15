/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Strukturvalidierung und Normalisierung der KI-Ausgabe
 *
 * Abgedeckte Regeln:
 * - Optionalfelder werden konsistent normalisiert (leer -> null).
 * - Artikel werden kategorisiert.
 * - HTML-Ausgabe escaped nutzernahe Inhalte.
 * - Warnings werden getrimmt und leere Werte entfernt.
 *
 * Fehlerfaelle:
 * - Fehlende Pflichtfelder führen zu Zod-Validierungsfehlern.
 *
 * Ziel:
 * Robuste Absicherung des Extraction-Validators für strukturierte KI-Ausgaben.
 */
import { describe, expect, it } from "vitest";
import { validateAndNormalizeExtraction } from "../../../server/services/extractionValidator";

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
    expect(result.warnings).toEqual(["Hinweis A"]);
  });

  it("categorizes articles and generates semantic html", () => {
    const result = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "2002",
        firstName: "A",
        lastName: "B",
        phone: "123",
      },
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
    expect(result.articleListHtml).toContain("<ul>");
  });

  it("escapes html-sensitive text", () => {
    const result = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "3003",
        firstName: "A",
        lastName: "B",
        phone: "123",
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
          firstName: "",
          lastName: "",
          phone: "",
        },
        saunaModel: "",
        articleItems: [],
      }),
    ).toThrow();
  });
});
