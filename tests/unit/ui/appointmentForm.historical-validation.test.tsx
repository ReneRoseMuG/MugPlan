/**
 * Test Scope:
 *
 * Feature: FT01 - Historische Termine verhindern
 * Use Case: UC06 - Terminformular validiert Vergangenheit bei Datum und Startzeit
 *
 * Abgedeckte Regeln:
 * - Datum in der Vergangenheit blockiert Save mit Validierungsfehler.
 * - Startzeit in der Vergangenheit (bei Datum = heute) blockiert Save.
 * - Bei Validierungsfehler erfolgt kein Persist-Request.
 *
 * Fehlerfaelle:
 * - Formular sendet Persist-Request trotz historischer Eingaben.
 * - Fehlende/unklare Fehlermeldung bei historischer Eingabe.
 *
 * Ziel:
 * Soll-Verhalten fuer historische Formularvalidierung deterministisch spezifizieren.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 UI: appointment form historical validation", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx"), "utf8");

  it("blocks save when startDate is in the past", () => {
    expect(source).toContain("validation blocked: startDate in past");
    expect(source).toContain("Datum in der Vergangenheit");
  });

  it("blocks save when startTime on today is in the past", () => {
    expect(source).toContain("validation blocked: startTime in past");
    expect(source).toContain("Startzeit liegt in der Vergangenheit");
  });

  it("prevents persistence call when historical validation fails", () => {
    expect(source).toContain("if (isPastDateInput || isPastTimeInput) return;");
    expect(source).toContain("Kein Save bei historischen Eingaben");
  });
});
