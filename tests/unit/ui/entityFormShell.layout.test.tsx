/**
 * Test Scope:
 *
 * Feature: EntityFormShell — Shell-Architektur mit Amber-Tokens
 * Use Case: UC Layout-Shell fuer alle zukuenftigen Formular-Seiten
 *
 * Abgedeckte Regeln:
 * - Shell rendert ohne Fehler mit Pflicht-Props (footer + children).
 * - data-testid "entity-form-shell" ist im Markup vorhanden.
 * - Sidebar wird nur gerendert wenn sidebar-Prop uebergeben wird.
 * - Header wird nur gerendert wenn header-Prop uebergeben wird.
 * - Footer ist immer vorhanden (kein optionaler Slot).
 * - sidebarWidth-Prop setzt die Inline-Breite (Standard: 240).
 *
 * Fehlerfaelle:
 * - Sidebar oder Header werden immer gerendert (kein konditionaler Check).
 * - Footer fehlt oder ist optional.
 * - sidebarWidth wird ignoriert oder ohne Fallback verwendet.
 *
 * Ziel:
 * Sicherstellen, dass die Shell-Komponente die Slot-Logik korrekt implementiert
 * und der Footer stets sichtbar bleibt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("EntityFormShell layout", () => {
  const filePath = path.resolve(
    process.cwd(),
    "client/src/components/ui/entity-form-shell.tsx"
  );
  const source = readFileSync(filePath, "utf8");

  it("1: Datei existiert und enthaelt die EntityFormShell-Komponente", () => {
    expect(source).toContain("export function EntityFormShell(");
  });

  it("2: data-testid entity-form-shell ist im Markup vorhanden", () => {
    expect(source).toContain('data-testid="entity-form-shell"');
  });

  it("3: Sidebar erscheint nur wenn sidebar-Prop uebergeben wird", () => {
    expect(source).toContain('data-testid="entity-form-shell-sidebar"');
    expect(source).toContain("{sidebar && (");
  });

  it("4: Kein Sidebar-DOM-Element wenn sidebar-Prop fehlt (konditionaler Render)", () => {
    // Der Sidebar-Block darf nur einmal auftreten und muss conditional sein
    const sidebarOccurrences = (source.match(/data-testid="entity-form-shell-sidebar"/g) ?? []).length;
    expect(sidebarOccurrences).toBe(1);
    expect(source).toContain("{sidebar && (");
  });

  it("5: Header erscheint nur wenn header-Prop uebergeben wird", () => {
    expect(source).toContain('data-testid="entity-form-shell-header"');
    expect(source).toContain("{header && (");
  });

  it("6: Kein Header-DOM-Element wenn header-Prop fehlt (konditionaler Render)", () => {
    const headerOccurrences = (source.match(/data-testid="entity-form-shell-header"/g) ?? []).length;
    expect(headerOccurrences).toBe(1);
    expect(source).toContain("{header && (");
  });

  it("7: Footer ist immer vorhanden — kein konditionaler Render", () => {
    expect(source).toContain('data-testid="entity-form-shell-footer"');
    // Footer darf nicht hinter einem konditionalen Check stehen
    expect(source).not.toContain("{footer && (");
  });

  it("8: sidebarWidth-Prop setzt die Inline-Breite mit Standard 240", () => {
    expect(source).toContain("sidebarWidth ?? 240");
    expect(source).toContain("style={{ width: sidebarWidth ?? 240 }}");
  });
});
