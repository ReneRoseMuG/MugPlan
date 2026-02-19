/**
 * Test Scope:
 *
 * Feature: FT01 - Terminverwaltung
 * Use Case: UC Termin speichern bei Mitarbeiter-Overlap
 *
 * Abgedeckte Regeln:
 * - Save-Flow parst Fehlerpayload robust per response.text + JSON-Parsing.
 * - BUSINESS_CONFLICT wird mit Kontext-Toast inkl. Konfliktmitarbeiter behandelt.
 * - VERSION_CONFLICT wird mit dedizierter Reload-Meldung behandelt.
 *
 * Fehlerfaelle:
 * - Save-Fehler ohne Kontext bei BUSINESS_CONFLICT.
 * - VERSION_CONFLICT wird nur generisch als unbekannter Fehler angezeigt.
 *
 * Ziel:
 * Verdrahtung der kontextreichen Save-Fehlerbehandlung im Terminformular absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 appointment form overlap conflict toast wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("parses save response body via response.text and parseErrorPayload", () => {
    expect(source).toContain("const rawBody = await response.text();");
    expect(source).toContain("const parsed = parseErrorPayload(rawBody);");
  });

  it("maps BUSINESS_CONFLICT to context toast with conflict employee names", () => {
    expect(source).toContain("if (parsed?.code === \"BUSINESS_CONFLICT\")");
    expect(source).toContain("const conflictNames = formatConflictEmployees(parsed.conflictEmployees);");
    expect(source).toContain("Konflikt mit:");
    expect(source).toContain("Termin ueberschneidet sich mit bestehenden Mitarbeiter-Terminen.");
  });

  it("maps VERSION_CONFLICT to explicit reload guidance", () => {
    expect(source).toContain("if (parsed?.code === \"VERSION_CONFLICT\")");
    expect(source).toContain("Termin wurde zwischenzeitlich geaendert. Bitte neu laden und erneut speichern.");
  });
});
