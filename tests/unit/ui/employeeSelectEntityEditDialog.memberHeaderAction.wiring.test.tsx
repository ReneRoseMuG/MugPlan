/**
 * Test Scope:
 *
 * Feature: FT06/FT07 - Team-/Tourverwaltung
 * Use Case: UC Mitarbeiter in Team-/Tour-Dialog zuweisen
 *
 * Abgedeckte Regeln:
 * - Der Mitarbeiter-Bereich rendert einen Header mit Titel "Mitarbeiter".
 * - Die Zuweisungsaktion bleibt als Plus-Icon-Button im Header erhalten.
 * - Die bestehenden data-testid-Konventionen fuer Team/Tour bleiben stabil.
 * - Die Plus-Aktion nutzt den zentralen randlosen PlusActionButton-Standard.
 * - Der fruehere Textbutton "Hinzufuegen" wird nicht mehr gerendert.
 *
 * Fehlerfaelle:
 * - Header-Action wird aus dem Header entfernt.
 * - Click-Verdrahtung zur Oeffnung des Picker-Dialogs geht verloren.
 *
 * Ziel:
 * Struktur- und Verdrahtungsregeln der gemeinsamen Team-/Tour-Mitarbeitersektion absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT06/FT07 employee select dialog member header action wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ui/employee-select-entity-edit-dialog.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders member section header with border-bottom separation", () => {
    expect(source).toContain("Mitarbeiter");
    expect(source).toContain("border-b border-border");
  });

  it("keeps add action as normalized plus button with stable test ids", () => {
    expect(source).toContain("<PlusActionButton");
    expect(source).toContain("data-testid={`button-add-${entityType}-member`}");
    expect(source).toContain("onClick={() => setSelectionDialogOpen(true)}");
    expect(source).toContain("aria-label=\"Mitarbeiter hinzufügen\"");
    expect(source).not.toContain("variant=\"outline\"");
  });

  it("removes legacy add button label", () => {
    expect(source).not.toContain(">\\n            Hinzuf");
  });
});
