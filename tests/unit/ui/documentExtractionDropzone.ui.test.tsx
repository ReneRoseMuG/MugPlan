/**
 * Test Scope:
 *
 * Feature: FT21 - Document Extraction Dropzone
 *
 * Abgedeckte Regeln:
 * - Die Auswahlaktion erscheint sichtbar in der Footer-Zone mit PlusActionButton.
 * - Das versteckte File-Input fuer PDF-Auswahl bleibt vorhanden.
 * - Im Processing-Zustand wechselt die sichtbare Footer-Beschriftung.
 *
 * Fehlerfaelle:
 * - Die Footer-Aktion verschwindet oder der Input-Trigger geht verloren.
 * - Der Processing-Zustand bleibt ohne sichtbare Rueckmeldung.
 *
 * Ziel:
 * Das sichtbare Dropzone-Verhalten statt Quelltextmarker absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  FileUp: () => <span>file-up</span>,
}));

vi.mock("@/components/ui/plus-action-button", () => ({
  PlusActionButton: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children ?? "plus"}</button>
  ),
}));

import { DocumentExtractionDropzone } from "../../../client/src/components/DocumentExtractionDropzone";

describe("FT21 document extraction dropzone behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders footer label, plus action and hidden pdf input", () => {
    const html = renderToStaticMarkup(
      <DocumentExtractionDropzone onFileSelected={() => undefined} />,
    );

    expect(html).toContain("dropzone-document-extraction");
    expect(html).toContain("PDF hier ablegen oder ausw");
    expect(html).toContain("PDF ausw");
    expect(html).toContain("button-select-document-extraction");
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".pdf,application/pdf"');
  });

  it("shows a processing label while extraction is running", () => {
    const html = renderToStaticMarkup(
      <DocumentExtractionDropzone onFileSelected={() => undefined} isProcessing />,
    );

    expect(html).toContain("Extraktion l");
    expect(html).toContain("button-select-document-extraction");
  });
});
