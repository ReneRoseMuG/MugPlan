/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetexte Multi-User
 * Use Case: UC Listenansicht oeffnet Fullscreen-Form statt Dialog
 *
 * Abgedeckte Regeln:
 * - "Neuer Hilfetext" delegiert an onCreateHelpText.
 * - Bearbeiten delegiert an onEditHelpText(id) fuer Karte und Tabellenzeile.
 * - Kein lokaler Dialog fuer Bearbeitung in HelpTextsPage.
 *
 * Fehlerfaelle:
 * - Bearbeitung wird weiterhin ueber einen lokalen Dialog abgewickelt.
 *
 * Ziel:
 * Sicherstellen, dass die Hilfetextliste nur Navigation ausloest und keine In-Page-Form mehr rendert.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT16 help texts page form navigation wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/HelpTextsPage.tsx"),
    "utf8",
  );

  it("delegates create/edit actions to parent callbacks", () => {
    expect(source).toContain("onClick={onCreateHelpText}");
    expect(source).toContain("onDoubleClick={() => onEditHelpText(helpText.id)}");
    expect(source).toContain("onRowDoubleClick={(row) => onEditHelpText(row.id)}");
  });

  it("does not render a local dialog anymore", () => {
    expect(source).not.toContain("<Dialog");
    expect(source).not.toContain("dialogOpen");
  });
});
