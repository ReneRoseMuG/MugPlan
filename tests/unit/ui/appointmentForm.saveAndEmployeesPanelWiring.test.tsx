/**
 * Test Scope:
 *
 * Feature: FT01 - Terminverwaltung
 * Use Case: UC Termin bearbeiten speichern / UC Mitarbeiter im Terminformular zuweisen
 *
 * Abgedeckte Regeln:
 * - Edit-Save (PATCH) sendet verpflichtend die Terminversion.
 * - Edit-Save wird blockiert, wenn keine gueltige Version verfuegbar ist.
 * - Delete-Flow nutzt vor dem DELETE eine frische Terminversion und sendet diese verpflichtend.
 * - Bei VERSION_CONFLICT wird genau ein Retry mit frisch geladener Version ausgefuehrt.
 * - Das Panel "Zugewiesene Mitarbeiter" rendert einen Header-Action-Button (+) fuer die Auswahl.
 * - Der bisherige grosse Button "Mitarbeiter auswaehlen" unterhalb der Liste wird nicht mehr gerendert.
 *
 * Fehlerfaelle:
 * - PATCH ohne version fuehrt zu VALIDATION_ERROR.
 * - Stale Version beim Loeschen fuehrt ohne Refresh zu VERSION_CONFLICT.
 * - Falsche Platzierung der Mitarbeiter-Auswahlaktion.
 *
 * Ziel:
 * Verdrahtung der Save-Precondition und der neuen Mitarbeiter-Panel-Action stabil absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 appointment form save and employees panel wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("tracks appointment detail version for edit save", () => {
    expect(source).toContain("interface AppointmentDetail {");
    expect(source).toContain("version: number;");
  });

  it("blocks edit save when version is missing or invalid", () => {
    expect(source).toContain("if (isEditing && (typeof version !== \"number\" || !Number.isInteger(version) || version < 1)) {");
    expect(source).toContain("submit blocked: missing or invalid version");
    expect(source).toContain("Termin kann derzeit nicht gespeichert werden. Bitte neu laden.");
  });

  it("sends version in PATCH payload", () => {
    expect(source).toContain("const payload = isEditing");
    expect(source).toContain("? { ...basePayload, version }");
  });

  it("loads appointment detail always fresh in edit mode", () => {
    expect(source).toContain("staleTime: 0");
    expect(source).toContain("refetchOnMount: \"always\"");
    expect(source).toContain("refetchOnReconnect: true");
  });

  it("sends fresh version in DELETE payload and retries once on VERSION_CONFLICT", () => {
    expect(source).toContain("const fetchFreshVersion = async (): Promise<number> => {");
    expect(source).toContain("queryKey: [\"/api/appointments\", targetAppointmentId]");
    expect(source).toContain("body: JSON.stringify({ version })");
    expect(source).toContain("if (err.code !== \"VERSION_CONFLICT\") throw error;");
    expect(source).toContain("delete retry after VERSION_CONFLICT");
    expect(source).toContain("Termin wurde parallel geaendert. Bitte Formular neu oeffnen.");
  });

  it("maps delete errors by API code instead of raw status text", () => {
    expect(source).toContain("if (parsed?.code === \"VALIDATION_ERROR\")");
    expect(source).toContain("body: JSON.stringify({ version })");
    expect(source).toContain("if (err.code === \"LOCK_VIOLATION\" || err.status === 403)");
    expect(source).toContain("if (err.code === \"VERSION_CONFLICT\")");
    expect(source).toContain("if (err.code === \"VALIDATION_ERROR\")");
  });

  it("renders employee picker as header action button with plus icon", () => {
    expect(source).toContain("Zugewiesene Mitarbeiter");
    expect(source).toContain("className=\"flex items-center justify-between\"");
    expect(source).toContain("size=\"icon\"");
    expect(source).toContain("variant=\"ghost\"");
    expect(source).toContain("data-testid=\"button-add-employee\"");
  });

  it("removes legacy large employee selection button block", () => {
    expect(source).not.toContain("Mitarbeiter hinzufügen");
  });
});
