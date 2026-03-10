/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - NoteTemplatesPage verdrahtet cardColor und print fuer Create/Update.
 * - Template-Dialog zeigt Druck-Switch und Kartenfarbesteuerung.
 *
 * Fehlerfaelle:
 * - Vorlagen-Requests senden die neuen Felder nicht.
 * - Dialog zeigt die neuen Steuerungen nicht.
 *
 * Ziel:
 * Quellcodebasierte Verdrahtung der neuen Vorlagenfelder absichern.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("FT13 UI: note templates cardColor/print wiring", () => {
  it("wires cardColor and print in NoteTemplatesPage", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/NoteTemplatesPage.tsx");
    const source = fs.readFileSync(filePath, "utf-8");

    expect(source).toContain("cardColor?: string | null");
    expect(source).toContain("print: boolean");
    expect(source).toContain('colorPickerTestId="button-template-color-picker"');
    expect(source).toContain('data-testid="switch-template-print"');
    expect(source).toContain("cardColor: useCardColor ? formCardColor : null");
  });
});
