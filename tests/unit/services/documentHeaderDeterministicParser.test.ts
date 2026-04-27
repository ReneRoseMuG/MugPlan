/**
 * Test Scope:
 *
 * Feature: FT21 - Deterministische Dokumentextraktion
 * Use Case: UC Header-Parsing ohne KI
 *
 * Abgedeckte Regeln:
 * - Kundennummer und Auftragsnummer werden deterministisch extrahiert.
 * - Mobilnummer bleibt optional und darf als null aufgeloest werden.
 * - Telefonlabels (Tel/Telefon/Fon) werden zusaetzlich zur Mobil-Erkennung unterstuetzt.
 * - Bei mehreren validen Telefonnummern wird deterministisch priorisiert (Mobil vor Tel/Telefon).
 * - Inline-Headerzeilen (Label + Wert in einer Zeile) werden robust erkannt.
 * - Feldvalidierung verhindert Fehlzuordnung von Bearbeiter/Datum auf Nummernfelder.
 * - WaWi-Adresszeilen (Identitaet, Strasse, PLZ/Ort; Anrede optional) werden deterministisch geparst.
 * - Explizite Laenderzeilen werden aus dem Adressblock in `country` uebernommen.
 * - Auslandsadressen mit fuehrender Hausnummer in der Strassenzeile werden erkannt.
 * - Identitaet wird je nach Muster als Person, Firma oder Person+Firma aufgeloest.
 * - Personenzeilen mit Unicode-Namen und OCR-Sonderzeichen werden robust erkannt.
 * - Slash-getrennte Nachnamenzeilen ohne Vorname koennen als Nachname uebernommen werden.
 * - Projekt-Extraktion darf bei unlesbarer Strassenzeile mit Warnhinweis partiell fortgesetzt werden.
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
import {
  parseDocumentHeaderDeterministically,
  parseDocumentHeaderForProjectExtraction,
} from "../../../server/services/documentHeaderDeterministicParser";

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
  it("extracts inline label-value header fields in one line", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr. A0118067A",
      "Kunden-Nr. 163033",
      "Kunden - Mobil: 0152-53500769",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.orderNumber).toBe("A0118067A");
    expect(parsed.customerNumber).toBe("163033");
    expect(parsed.mobile).toBe("0152-53500769");
  });

  it("extracts phone from label Kunden - Tel.", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Tel.:",
      "A0118067A",
      "163033",
      "05751-7052150",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.orderNumber).toBe("A0118067A");
    expect(parsed.customerNumber).toBe("163033");
    expect(parsed.mobile).toBe("05751-7052150");
  });

  it("extracts phone from inline label Kunden Tel.", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr. A0118067A",
      "Kunden-Nr. 163033",
      "Kunden Tel.: 05751-7052150",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.mobile).toBe("05751-7052150");
  });

  it("extracts phone from Telefon label without customer prefix", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Telefon:",
      "A0118067A",
      "163033",
      "05751/7052150",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.mobile).toBe("05751/7052150");
  });

  it("extracts customer number, order number and mobile", () => {
    const parsed = parseDocumentHeaderDeterministically(buildSource());

    expect(parsed.customerNumber).toBe("163214");
    expect(parsed.orderNumber).toBe("A0218249A");
    expect(parsed.mobile).toBe("0172-8811909");
    expect(parsed.firstName).toBe("Anke");
    expect(parsed.lastName).toBe("Gotthardt");
    expect(parsed.company).toBeNull();
    expect(parsed.addressLine1).toBe("Haupstrasse 69");
    expect(parsed.postalCode).toBe("06917");
    expect(parsed.city).toBe("Jessen / Holzdorf");
    expect(parsed.country).toBe("Deutschland");
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
    expect(parsed.company).toBeNull();
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
    expect(parsed.company).toBeNull();
    expect(parsed.addressLine1).toBe("Gleina 3 a");
    expect(parsed.postalCode).toBe("07586");
    expect(parsed.city).toBe("Bad Köstritz");
    expect(parsed.country).toBe("Deutschland");
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
    expect(parsed.company).toBeNull();
    expect(parsed.addressLine1).toBe("Haupstrasse 69");
    expect(parsed.postalCode).toBe("06917");
    expect(parsed.city).toBe("Jessen / Holzdorf");
    expect(parsed.country).toBe("Deutschland");
  });

  it("skips interleaved generic lines and still maps correct numeric values", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "Bearbeiter: Michael Meisel",
      "Datum: 26.01.2026",
      "A0118067A",
      "163033",
      "0152-53500769",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.orderNumber).toBe("A0118067A");
    expect(parsed.customerNumber).toBe("163033");
    expect(parsed.mobile).toBe("0152-53500769");
  });

  it("returns null mobile when mobil label has no valid number", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Frau",
      "Anke Gotthardt",
      "Haupstrasse 69",
      "06917 Jessen / Holzdorf",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "A0218249A",
      "163214",
      "Bearbeiter: Michael Meisel",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.orderNumber).toBe("A0218249A");
    expect(parsed.customerNumber).toBe("163214");
    expect(parsed.mobile).toBeNull();
  });

  it("prefers mobile when both mobile and tel labels contain different valid numbers", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "Kunden - Tel.:",
      "A0118067A",
      "163033",
      "0152-53500769",
      "05751-7052150",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.mobile).toBe("0152-53500769");
  });

  it("selects first valid mobile when multiple mobile numbers exist", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "Kunden - Mobil:",
      "A0118067A",
      "163033",
      "0152-53500769",
      "0172-8811909",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.mobile).toBe("0152-53500769");
  });

  it("selects first valid tel when no mobile number exists", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Tel.:",
      "Kunden - Telefon:",
      "A0118067A",
      "163033",
      "05751-7052150",
      "04242/78088",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.mobile).toBe("05751-7052150");
  });

  it("does not map date values as mobile numbers", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "A0118067A",
      "163033",
      "26.01.2026",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.orderNumber).toBe("A0118067A");
    expect(parsed.customerNumber).toBe("163033");
    expect(parsed.mobile).toBeNull();
  });

  it("does not map date values as tel numbers", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Leif Doepking",
      "Ellerdamm 28",
      "27339 Riede, Kreis Verden",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Tel.:",
      "A0118067A",
      "163033",
      "26.01.2026",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.mobile).toBeNull();
  });

  it("ignores free text after mobile label", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Frau",
      "Anke Gotthardt",
      "Haupstrasse 69",
      "06917 Jessen / Holzdorf",
      "Auftrag-Nr. A0218249A",
      "Kunden-Nr. 163214",
      "Kunden - Mobil: Michael Meisel",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.orderNumber).toBe("A0218249A");
    expect(parsed.customerNumber).toBe("163214");
    expect(parsed.mobile).toBeNull();
  });

  it("ignores free text after tel label", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Frau",
      "Anke Gotthardt",
      "Haupstrasse 69",
      "06917 Jessen / Holzdorf",
      "Auftrag-Nr. A0218249A",
      "Kunden-Nr. 163214",
      "Kunden - Tel.: Michael Meisel",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.orderNumber).toBe("A0218249A");
    expect(parsed.customerNumber).toBe("163214");
    expect(parsed.mobile).toBeNull();
  });

  it("parses company-only identity without forcing person names", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "B&E Wohnprojekte GmbH",
      "Carl-Reuther-Str. 1",
      "68305 Mannheim",
      "Deutschland",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "A0218253A",
      "161979",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.firstName).toBeNull();
    expect(parsed.lastName).toBeNull();
    expect(parsed.company).toBe("B&E Wohnprojekte GmbH");
    expect(parsed.addressLine1).toBe("Carl-Reuther-Str. 1");
    expect(parsed.postalCode).toBe("68305");
    expect(parsed.city).toBe("Mannheim");
    expect(parsed.country).toBe("Deutschland");
  });

  it("parses inline salutation person plus dedicated company line", () => {
    const source = [
      "Meisel & Gerken GmbH - Barrier Str. 29 - 28857 Syke",
      "Herr Lars Bartilla",
      "Fahrrad Meinhold GmbH",
      "Hannoversche Straße 164",
      "30823 Garbsen",
      "Deutschland",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "BE19322",
      "163180",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.firstName).toBe("Lars");
    expect(parsed.lastName).toBe("Bartilla");
    expect(parsed.company).toBe("Fahrrad Meinhold GmbH");
    expect(parsed.addressLine1).toBe("Hannoversche Straße 164");
    expect(parsed.postalCode).toBe("30823");
    expect(parsed.city).toBe("Garbsen");
  });

  it("parses person identity with unicode letters and OCR accent artifacts", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Ren\u00E9\u00B4 R\u00E4pple",
      "H\u00F6lderlinstra\u00DFe 6",
      "68542 Heddesheim",
      "Deutschland",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "A0118075A",
      "162765",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.firstName).toBe("Ren\u00E9");
    expect(parsed.lastName).toBe("R\u00E4pple");
    expect(parsed.customerNumber).toBe("162765");
    expect(parsed.orderNumber).toBe("A0118075A");
    expect(parsed.addressLine1).toBe("H\u00F6lderlinstra\u00DFe 6");
    expect(parsed.postalCode).toBe("68542");
    expect(parsed.city).toBe("Heddesheim");
  });

  it("parses slash-separated surname line without forcing a first name", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Scholz / Fischer",
      "Kiesstrasse 44",
      "12209 Berlin",
      "Deutschland",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "A0118104A",
      "163127",
      "01734963936",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);
    expect(parsed.firstName).toBeNull();
    expect(parsed.lastName).toBe("Scholz / Fischer");
    expect(parsed.company).toBeNull();
    expect(parsed.orderNumber).toBe("A0118104A");
    expect(parsed.customerNumber).toBe("163127");
    expect(parsed.mobile).toBe("01734963936");
    expect(parsed.addressLine1).toBe("Kiesstrasse 44");
    expect(parsed.postalCode).toBe("12209");
    expect(parsed.city).toBe("Berlin");
    expect(parsed.country).toBe("Deutschland");
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

  it("parses a foreign address block with a leading house number and country line", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Tom Voosen",
      "1 Tommesknapp",
      "7419 Brouch",
      "Luxemburg",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "A0218277A",
      "160673",
      "00352-621222479",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const parsed = parseDocumentHeaderDeterministically(source);

    expect(parsed.orderNumber).toBe("A0218277A");
    expect(parsed.customerNumber).toBe("160673");
    expect(parsed.mobile).toBe("00352-621222479");
    expect(parsed.firstName).toBe("Tom");
    expect(parsed.lastName).toBe("Voosen");
    expect(parsed.addressLine1).toBe("1 Tommesknapp");
    expect(parsed.postalCode).toBe("7419");
    expect(parsed.city).toBe("Brouch");
    expect(parsed.country).toBe("Luxemburg");
  });

  it("returns partial project extraction with warning when only the customer address line is unreadable", () => {
    const source = [
      "Fasssauna.de - Barrier Str. 29 - 28857 Syke",
      "Herr",
      "Tom Voosen",
      "Adresszeile unleserlich",
      "7419 Brouch",
      "Luxemburg",
      "Auftrag-Nr.",
      "Kunden-Nr.",
      "Kunden - Mobil:",
      "A0218277A",
      "160673",
      "00352-621222479",
      "Menge Art.Nr. / Bezeichnung MwSt. E-Preis G-Preis",
    ].join("\n");

    const result = parseDocumentHeaderForProjectExtraction(source);

    expect(result.header.orderNumber).toBe("A0218277A");
    expect(result.header.customerNumber).toBe("160673");
    expect(result.header.mobile).toBe("00352-621222479");
    expect(result.header.firstName).toBe("Tom");
    expect(result.header.lastName).toBe("Voosen");
    expect(result.header.addressLine1).toBeNull();
    expect(result.header.postalCode).toBe("7419");
    expect(result.header.city).toBe("Brouch");
    expect(result.header.country).toBe("Luxemburg");
    expect(result.warnings).toEqual([
      "Kundendaten konnten nur teilweise erkannt werden. Projektdaten können trotzdem übernommen werden.",
    ]);
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
