/**
 * Test Scope:
 *
 * Feature: FT21 - Deterministische Dokumentextraktion
 * Use Case: UC Header-Parsing ohne KI
 *
 * Abgedeckte Regeln:
 * - Kundennummer und Auftragsnummer werden deterministisch extrahiert.
 * - Mobilnummer bleibt optional und darf als null aufgeloest werden.
 * - WaWi-Adresszeilen (Name, Strasse, PLZ/Ort; Anrede optional) werden deterministisch geparst.
 * - Fehlende oder mehrfache Kundennummer fuehren zu Fehlern.
 *
 * Fehlerfaelle:
 * - Keine Kundennummer im Labelbereich.
 * - Widerspruechliche mehrfach extrahierte Kundennummern.
 * - Ungueltiges WaWi-Adressmuster ohne Strassenzeile.
 *
 * Ziel:
 * Sicherstellen, dass der Dokumentkopf deterministisch ohne KI aufgeloest wird.
 */
import { describe, expect, it } from "vitest";
import { parseDocumentHeaderDeterministically } from "../../../server/services/documentHeaderDeterministicParser";

function buildSource(overrides?: { customerValues?: string[]; includeCustomerLabel?: boolean }): string {
  const includeCustomerLabel = overrides?.includeCustomerLabel ?? true;
  const customerValues = overrides?.customerValues ?? ["163214"];
  const labels = ["Auftrag-Nr.", ...(includeCustomerLabel ? ["Kunden-Nr."] : []), "Kunden - Mobil:"];
  const values = ["A0218249A", ...customerValues, "0172-8811909"];

  return [
    "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
    "Frau",
    "Anke Gotthardt",
    "Haupstrasse 69",
    "06917 Jessen / Holzdorf",
    "Deutschland",
    ...labels,
    ...values,
    "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
  ].join("\n");
}

describe("FT21 deterministic header parser", () => {
  it("extracts customer number, order number and mobile", () => {
    const parsed = parseDocumentHeaderDeterministically(buildSource());

    expect(parsed.customerNumber).toBe("163214");
    expect(parsed.orderNumber).toBe("A0218249A");
    expect(parsed.mobile).toBe("0172-8811909");
    expect(parsed.firstName).toBe("Anke");
    expect(parsed.lastName).toBe("Gotthardt");
    expect(parsed.addressLine1).toBe("Haupstrasse 69");
    expect(parsed.postalCode).toBe("06917");
    expect(parsed.city).toBe("Jessen / Holzdorf");
  });

  it("allows missing mobile number and returns null", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Frau",
      "Anke Gotthardt",
      "Haupstrasse 69",
      "06917 Jessen / Holzdorf",
      "Deutschland",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "A0218249A",
      "163214",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.mobile).toBeNull();
    expect(parsed.orderNumber).toBe("A0218249A");
    expect(parsed.customerNumber).toBe("163214");
  });

  it("parses WaWi address lines with spaced house number token", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Thomas Burgardt",
      "Gleina 3 a",
      "07586 Bad Köstritz",
      "Deutschland",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "A0218229A",
      "163183",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.mobile).toBeNull();
    expect(parsed.orderNumber).toBe("A0218229A");
    expect(parsed.customerNumber).toBe("163183");
    expect(parsed.firstName).toBe("Thomas");
    expect(parsed.lastName).toBe("Burgardt");
    expect(parsed.addressLine1).toBe("Gleina 3 a");
    expect(parsed.postalCode).toBe("07586");
    expect(parsed.city).toBe("Bad Köstritz");
  });

  it("parses address block when salutation line is missing", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Anke Gotthardt",
      "Haupstrasse 69",
      "06917 Jessen / Holzdorf",
      "Deutschland",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "A0218249A",
      "163214",
      "0172-8811909",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.firstName).toBe("Anke");
    expect(parsed.lastName).toBe("Gotthardt");
    expect(parsed.addressLine1).toBe("Haupstrasse 69");
    expect(parsed.postalCode).toBe("06917");
    expect(parsed.city).toBe("Jessen / Holzdorf");
  });

  it("throws deterministic address-pattern error when street line is missing", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Frau",
      "Anke Gotthardt",
      "06917 Jessen / Holzdorf",
      "Deutschland",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "A0218249A",
      "163214",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    expect(() => parseDocumentHeaderDeterministically(source)).toThrow("Adressmuster");
  });

  it("throws when customer number is missing", () => {
    expect(() => parseDocumentHeaderDeterministically(buildSource({ includeCustomerLabel: false }))).toThrow(
      "Kundennummer fehlt",
    );
  });

  it("throws when multiple customer numbers are found", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Frau",
      "Anke Gotthardt",
      "Haupstrasse 69",
      "06917 Jessen / Holzdorf",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "A0218249A",
      "163214",
      "999999",
      "0172-8811909",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    expect(() => parseDocumentHeaderDeterministically(source)).toThrow("Mehrfache Kundennummern");
  });
});
