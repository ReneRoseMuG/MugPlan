/**
 * Test Scope:
 *
 * Feature: FT21 - Dokumentextraktion Feldreport
 * Use Case: UC Scope-spezifische Erfolgs-/Fehlerdiagnose im Bestaetigungsdialog
 *
 * Abgedeckte Regeln:
 * - Der Feldreport listet nur scope-relevante Felder.
 * - Befuellte Felder erscheinen im Bereich recognized.
 * - Fehlende Felder erhalten deterministische Kurzgruende.
 * - Das optionale Kundenfeld `country` wird als erkannt oder fehlend ausgewiesen.
 * - Firmenkunden ohne Personenname erhalten den speziellen Personenhinweis.
 *
 * Fehlerfaelle:
 * - Projektfelder duerfen im customer_form nicht auftauchen.
 * - Fehlgruende duerfen nicht vom Scope oder von Leerstrings entkoppelt sein.
 *
 * Ziel:
 * Sicherstellen, dass der neue Feldreport stabil und pfadspezifisch erzeugt wird.
 */
import { describe, expect, it } from "vitest";
import { buildExtractionFieldReport, validateAndNormalizeExtraction } from "../../../server/services/extractionValidator";

describe("FT21 extraction field report", () => {
  it("limits customer_form to customer fields and marks missing values with fixed reasons", () => {
    const extraction = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "1001",
        firstName: "Erika",
        lastName: "Muster",
        company: null,
        email: null,
        phone: null,
        addressLine1: "Musterstrasse 1",
        addressLine2: null,
        postalCode: "12345",
        city: "Leipzig",
        country: "Deutschland",
      },
      orderNumber: "A0218229A",
      amount: "17136.00",
      saunaModel: "Sauna Pro",
      articleItems: [{ quantity: "1", description: "Ofen", category: "Technik" }],
      warnings: [],
    });

    const report = buildExtractionFieldReport(extraction, "customer_form");

    expect(report.recognized.map((item) => item.key)).toEqual([
      "customerNumber",
      "firstName",
      "lastName",
      "addressLine1",
      "postalCode",
      "city",
      "country",
    ]);
    expect(report.missing).toEqual([
      {
        key: "company",
        label: "Firma",
        section: "customer",
        reason: "Keine Firmenzeile im Dokumentkopf erkannt.",
      },
      {
        key: "phone",
        label: "Telefon",
        section: "customer",
        reason: "Kein gültiges Mobil- oder Telefonfeld erkannt.",
      },
    ]);
    expect(report.recognized.some((item) => item.key === "orderNumber")).toBe(false);
    expect(report.missing.some((item) => item.key === "amount")).toBe(false);
  });

  it("includes project fields for project_form and uses the company-specific person hint", () => {
    const extraction = validateAndNormalizeExtraction({
      customer: {
        customerNumber: "161979",
        firstName: null,
        lastName: null,
        company: "B&E Wohnprojekte GmbH",
        email: null,
        phone: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: "68305",
        city: "Mannheim",
        country: null,
      },
      orderNumber: null,
      amount: null,
      saunaModel: "Produktinformationen aus Dokument",
      articleItems: [{ quantity: "1", description: "Thermoholz", category: "Artikel" }],
      warnings: [],
    });

    const report = buildExtractionFieldReport(extraction, "project_form");

    expect(report.recognized).toEqual(
      expect.arrayContaining([
        { key: "customerNumber", label: "Kundennummer", section: "customer", value: "161979" },
        { key: "company", label: "Firma", section: "customer", value: "B&E Wohnprojekte GmbH" },
        { key: "postalCode", label: "PLZ", section: "customer", value: "68305" },
        { key: "city", label: "Ort", section: "customer", value: "Mannheim" },
        { key: "saunaModel", label: "Projektname", section: "project", value: "Produktinformationen aus Dokument" },
      ]),
    );
    expect(report.missing).toEqual(
      expect.arrayContaining([
        {
          key: "firstName",
          label: "Vorname",
          section: "customer",
          reason: "Firmenkunde ohne Personenname im Dokumentkopf.",
        },
        {
          key: "lastName",
          label: "Nachname",
          section: "customer",
          reason: "Firmenkunde ohne Personenname im Dokumentkopf.",
        },
        {
          key: "phone",
          label: "Telefon",
          section: "customer",
          reason: "Kein gültiges Mobil- oder Telefonfeld erkannt.",
        },
        {
          key: "addressLine1",
          label: "Strasse",
          section: "customer",
          reason: "Keine Strassenzeile erkannt.",
        },
        {
          key: "orderNumber",
          label: "Auftragsnummer",
          section: "project",
          reason: "Auftragsnummer nicht erkannt.",
        },
        {
          key: "amount",
          label: "Betrag",
          section: "project",
          reason: "Gesamtbetrag nicht erkannt.",
        },
        {
          key: "country",
          label: "Land",
          section: "customer",
          reason: "Keine Länderzeile im Dokumentkopf erkannt.",
        },
      ]),
    );
  });
});
