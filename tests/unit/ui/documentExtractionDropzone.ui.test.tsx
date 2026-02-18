/**
 * Test Scope:
 *
 * Feature: FT21 - Document Extraction Dropzone UI
 * Use Case: UC Footer-Action-Zone mit rechter Auswahlaktion
 *
 * Abgedeckte Regeln:
 * - Auswahlaktion liegt in einer Footer-Action-Zone.
 * - Beschriftung "PDF auswaehlen" ist vorhanden und mit Plus-Button gekoppelt.
 * - Die Plus-Aktion nutzt den zentralen randlosen PlusActionButton-Standard.
 * - Alter Body-Button mit Textlabel wird nicht mehr gerendert.
 *
 * Fehlerfaelle:
 * - Regression auf altes Layout mit grossem Auswahlbutton im Body.
 *
 * Ziel:
 * Stabilitaet des neuen Dropzone-Layouts absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT21 document extraction dropzone ui", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/DocumentExtractionDropzone.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders footer action zone with label and normalized plus button", () => {
    expect(source).toContain("PDF auswählen");
    expect(source).toContain("<PlusActionButton");
    expect(source).toContain("border-t border-slate-300/80");
    expect(source).not.toContain("variant=\"outline\"");
  });

  it("keeps hidden file input trigger", () => {
    expect(source).toContain("type=\"file\"");
    expect(source).toContain("data-testid=\"button-select-document-extraction\"");
  });
});
