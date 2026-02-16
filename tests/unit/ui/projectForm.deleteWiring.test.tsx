/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projekt im Formular loeschen
 *
 * Abgedeckte Regeln:
 * - Delete-Button wird nur im Edit-Modus als Footer-Action verdrahtet.
 * - Delete-Request nutzt DELETE /api/projects/:id mit Versionspayload.
 * - BUSINESS_CONFLICT und VERSION_CONFLICT werden mit spezifischen Meldungen behandelt.
 *
 * Fehlerfaelle:
 * - Fehlende Delete-Action oder falscher API-Pfad.
 * - Fehlende Code-basierte Konfliktbehandlung.
 *
 * Ziel:
 * Sicherstellen, dass der neue Projekt-Loeschfluss im Formular korrekt verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02 project form delete wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("wires delete footer action only for edit mode", () => {
    expect(source).toContain("footerActions={isEditing ? (");
    expect(source).toContain("data-testid=\"button-delete-project\"");
    expect(source).toContain("setDeleteConfirmOpen(true)");
  });

  it("calls project delete endpoint with version payload", () => {
    expect(source).toContain("apiRequest(\"DELETE\", `/api/projects/${projectId}`, { version: projectVersion })");
    expect(source).toContain("data-testid=\"button-confirm-delete-project\"");
  });

  it("maps BUSINESS_CONFLICT and VERSION_CONFLICT to specific toasts", () => {
    expect(source).toContain("if (code === \"BUSINESS_CONFLICT\")");
    expect(source).toContain("weil Termine vorhanden sind");
    expect(source).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(source).toContain("Bitte neu laden und erneut versuchen.");
  });
});
