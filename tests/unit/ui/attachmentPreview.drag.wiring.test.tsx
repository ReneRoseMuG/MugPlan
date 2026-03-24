/**
 * Test Scope:
 *
 * Feature: FT-19 – Draggable Attachment Preview
 * Use Case: UC Attachment Preview Drag-Rendering und Schliessen-Button
 *
 * Abgedeckte Regeln:
 * - AttachmentInfoBadgePreview zeigt den Schliessen-Button, wenn onClose uebergeben wird.
 * - AttachmentInfoBadgePreview zeigt keinen Schliessen-Button ohne onClose.
 * - Der Drag-Handle (cursor: grab) ist im Titel-Bereich gesetzt.
 * - Der Schliessen-Button hat das korrekte aria-label.
 * - Der Oeffnen-Link zeigt auf ein neues Tab (target="_blank").
 * - Der Schliessen-Button erscheint sowohl bei Bild- als auch bei PDF-Previews.
 *
 * Fehlerfaelle:
 * - Kein Schliessen-Button darf erscheinen, wenn onClose nicht gesetzt ist.
 * - Ohne Drag-Handle-Cursor fehlt die visuelle Drag-Einladung.
 *
 * Ziel:
 * Korrekte bedingte Darstellung von Schliessen-Button und Drag-Handle
 * in AttachmentInfoBadgePreview absichern (FT-19 Draggable-Ergaenzungen).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AttachmentInfoBadgePreview } from "../../../client/src/components/ui/badge-previews/attachment-info-badge-preview";

const pdfProps = {
  originalName: "bericht.pdf",
  mimeType: "application/pdf",
  openUrl: "/api/project-attachments/1/download",
  downloadUrl: "/api/project-attachments/1/download?download=1",
};

const imageProps = {
  originalName: "foto.png",
  mimeType: "image/png",
  openUrl: "/api/project-attachments/2/download",
  downloadUrl: "/api/project-attachments/2/download?download=1",
};

describe("FT-19 DraggableAttachmentBadge drag wiring", () => {
  it("shows close button when onClose is provided", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, { ...pdfProps, onClose: vi.fn() }),
    );

    expect(markup).toContain("Vorschau schließen");
  });

  it("does not show close button when onClose is not provided", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, pdfProps),
    );

    expect(markup).not.toContain("Vorschau schließen");
  });

  it("title bar has cursor grab style for drag handle", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, pdfProps),
    );

    expect(markup).toContain("cursor:grab");
  });

  it("close button has correct aria-label for accessibility", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, { ...pdfProps, onClose: vi.fn() }),
    );

    expect(markup).toContain('aria-label="Vorschau schließen"');
  });

  it("open link targets new tab", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, pdfProps),
    );

    expect(markup).toContain('target="_blank"');
    expect(markup).toContain(pdfProps.openUrl);
  });

  it("close button appears for image previews as well", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, { ...imageProps, onClose: vi.fn() }),
    );

    expect(markup).toContain("Vorschau schließen");
    expect(markup).toContain("<img");
  });
});
