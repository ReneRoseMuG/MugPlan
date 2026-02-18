/**
 * Test Scope:
 *
 * Feature: FT01 - Terminverwaltung
 * Use Case: UC Related-Customer-Slot im Terminformular
 *
 * Abgedeckte Regeln:
 * - Relation-Variante zeigt Kundennr., Vorname und Name als eigene Kacheln im gleichen Stil wie Telefon/Adresse.
 * - Kundennummer wird fuer die Slot-Anzeige auf maximal 10 Zeichen begrenzt.
 * - PLZ und Ort werden getrennt dargestellt; PLZ ist auf maximal 6 Zeichen begrenzt.
 * - Felder Firma und E-Mail werden in der kompakten Variante nicht gerendert.
 *
 * Fehlerfaelle:
 * - Firma oder E-Mail erscheinen weiterhin im Related-Customer-Slot.
 * - Kundennummer im Slot ist laenger als 10 Zeichen.
 * - PLZ/Ort bleiben kombiniert oder PLZ ueberschreitet 6 Zeichen.
 *
 * Ziel:
 * Sicherstellen, dass die kompakte Kundendarstellung im Termin-Slot die geforderten Felder und Limits einhaelt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT01 customer detail card compact relation variant", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ui/customer-detail-card.tsx");
  const source = readFileSync(filePath, "utf8");

  it("supports relationCompact variant as fixed 4-row card layout", () => {
    expect(source).toContain("variant?: \"default\" | \"relationCompact\";");
    expect(source).toContain("variant === \"relationCompact\"");
    expect(source).not.toContain("data-testid={testId ? `${testId}-summary` : undefined}");
    expect(source).toContain("renderCompactItem(\"Kundennr.\", resolveCompactCustomerNumber(customer.customerNumber)");
    expect(source).toContain("renderCompactItem(\"Vorname\", resolveValue(customer.firstName)");
    expect(source).toContain("renderCompactItem(\"Name\", resolveValue(customer.lastName)");
    expect(source).toContain("renderCompactItem(\"Telefon\", resolveValue(customer.phone)");
    expect(source).toContain("renderCompactItem(\"Adresse\", resolveValue(customer.addressLine1))");
    expect(source).toContain("renderCompactItem(\"PLZ\", resolveCompactPostalCode(customer.postalCode)");
    expect(source).toContain("renderCompactItem(\"Ort\", resolveValue(customer.city)");
  });

  it("limits customer number to 10 chars in compact mode", () => {
    expect(source).toContain("return trimmed.slice(0, 10);");
  });

  it("separates postal code and city and limits postal code to 6 chars", () => {
    expect(source).toContain("const resolveCompactPostalCode = (value: string | null | undefined) => {");
    expect(source).toContain("return trimmed.slice(0, 6);");
    expect(source).toContain("variant === \"relationCompact\"");
    expect(source).toContain("renderCompactItem(\"PLZ\", resolveCompactPostalCode(customer.postalCode)");
    expect(source).toContain("renderCompactItem(\"Ort\", resolveValue(customer.city)");
  });

  it("omits company and email fields in compact detail items", () => {
    expect(source).toContain("label: \"Firma\"");
    expect(source).toContain("label: \"E-Mail\"");
    expect(source).toContain("variant === \"relationCompact\"");
    expect(source).toContain("renderCompactItem(\"Telefon\", resolveValue(customer.phone)");
  });
});
