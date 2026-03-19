/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - NoteTemplatesPage verdrahtet cardColor und print fuer Create/Update.
 * - Template-Dialog zeigt Druck-Switch und einen immer aktiven Farbpicker ohne Toggle.
 *
 * Fehlerfaelle:
 * - Vorlagen-Requests senden die neuen Felder nicht.
 * - Dialog behaelt den Farb-Aktivierungs-Toggle oder deaktiviert den Picker optional.
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
    expect(source).toContain("const [formPrint, setFormPrint] = useState(false);");
    expect(source).toContain("setFormPrint(false);");
    expect(source).toContain('colorPickerTestId="button-template-color-picker"');
    expect(source).toContain('data-testid="switch-template-print"');
    expect(source).toContain("cardColor: formCardColor");
    expect(source).toContain("onColorChange={setFormCardColor}");
    expect(source).not.toContain("useCardColor");
    expect(source).not.toContain('data-testid="button-template-toggle-card-color"');
    expect(source).not.toContain("colorPickerDisabled");
  });
});
