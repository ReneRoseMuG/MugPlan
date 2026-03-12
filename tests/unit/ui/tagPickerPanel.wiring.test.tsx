/**
 * Test Scope:
 *
 * Feature: FT28 - Tagging System
 *
 * Abgedeckte Regeln:
 * - TagPickerPanel nutzt das bestehende SidebarChildPanel-/EntityEditDialog-Muster.
 * - Zugewiesene Tags werden als entfernbares oder read-only TagBadge gerendert.
 * - Das Hinzufuegen nutzt nur nicht zugewiesene Tags aus dem Katalog.
 *
 * Fehlerfaelle:
 * - Paralleles Eigenlayout statt Panel-/Dialog-Standard.
 * - Editier- und Read-only-Pfade unterscheiden sich nicht sichtbar.
 * - Bereits zugewiesene Tags tauchen erneut in der Add-Liste auf.
 *
 * Ziel:
 * Die strukturelle Picker-Verdrahtung fuer Kunden-, Projekt- und Termin-Tags absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT28 tag picker panel wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/TagPickerPanel.tsx"),
    "utf8",
  );

  it("reuses the sidebar panel and dialog shell", () => {
    expect(source).toContain("<SidebarChildPanel");
    expect(source).toContain("<EntityEditDialog");
  });

  it("renders assigned tags as removable in edit mode and read-only otherwise", () => {
    expect(source).toContain('action={canEdit ? "remove" : "none"}');
    expect(source).toContain("onRemove={canEdit ? () => onRemove(item) : undefined}");
  });

  it("filters the add-list down to unassigned tags only", () => {
    expect(source).toContain("const assignedIds = useMemo(() => new Set(assignedTags.map((item) => item.tag.id))");
    expect(source).toContain("availableTags.filter((tag) => !assignedIds.has(tag.id))");
    expect(source).toContain('action="add"');
  });
});
