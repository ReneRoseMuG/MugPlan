/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - NotesSection zeigt Kartenfarbe und Druck-Switch im Dialog.
 * - Freie Notizen haben einen immer aktiven Farbpicker; template-geerbte Farben bleiben gesperrt.
 *
 * Fehlerfaelle:
 * - Notizdialog behaelt einen Farb-Aktivierungs-Toggle oder sendet cardColor nicht stabil.
 * - Template-Farbsperre fehlt im UI-Wiring.
 *
 * Ziel:
 * Quellcodebasierte Absicherung der neuen NotesSection-Verdrahtung ohne Browserlauf.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("FT13 UI: notes section cardColor/print wiring", () => {
  it("wires cardColor, print and cardColorLocked in NotesSection", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/NotesSection.tsx");
    const source = fs.readFileSync(filePath, "utf-8");

    expect(source).toContain("cardColor?: string | null;");
    expect(source).toContain("print: boolean;");
    expect(source).toContain("const [notePrint, setNotePrint] = useState(false);");
    expect(source).toContain("setNotePrint(false);");
    expect(source).toContain("note.cardColorLocked");
    expect(source).toContain('testId="button-note-card-color-picker"');
    expect(source).toContain('data-testid="switch-note-print"');
    expect(source).toContain('data-testid="text-note-card-color-locked"');
    expect(source).toContain("cardColor: noteCardColor");
    expect(source).toContain("onChange={setNoteCardColor}");
    expect(source).toContain("disabled={cardColorLocked}");
    expect(source).not.toContain("useCardColor");
    expect(source).not.toContain('data-testid="button-note-toggle-card-color"');
  });
});
