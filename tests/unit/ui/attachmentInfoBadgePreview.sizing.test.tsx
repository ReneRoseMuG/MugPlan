/**
 * Test Scope:
 *
 * Feature: FT18 - User Settings
 * Use Case: UC Attachment Preview Groessenprofil small/medium/large
 *
 * Abgedeckte Regeln:
 * - Preview-Optionen fuer small/medium/large werden unterschiedlich aufgeloest.
 * - Medium entspricht den festgelegten Zielwerten.
 * - Small und Large folgen den definierten Faktoren zur Medium-Basis.
 *
 * Fehlerfaelle:
 * - Statische Altwerte duerfen nicht mehr als einziges Profil aktiv sein.
 *
 * Ziel:
 * Deterministische Groessensteuerung fuer Attachment-Previews absichern.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AttachmentInfoBadgePreview,
  createAttachmentInfoBadgePreview,
  resolveAttachmentPreviewDimensions,
} from "../../../client/src/components/ui/badge-previews/attachment-info-badge-preview";

describe("FT18 attachment info badge preview sizing", () => {
  it("resolves explicit option sizes for small, medium and large", () => {
    const small = createAttachmentInfoBadgePreview({
      originalName: "a.pdf",
      mimeType: "application/pdf",
      openUrl: "/api/project-attachments/1/download",
      downloadUrl: "/api/project-attachments/1/download?download=1",
      previewSize: "small",
    }).options;
    const medium = createAttachmentInfoBadgePreview({
      originalName: "a.pdf",
      mimeType: "application/pdf",
      openUrl: "/api/project-attachments/1/download",
      downloadUrl: "/api/project-attachments/1/download?download=1",
      previewSize: "medium",
    }).options;
    const large = createAttachmentInfoBadgePreview({
      originalName: "a.pdf",
      mimeType: "application/pdf",
      openUrl: "/api/project-attachments/1/download",
      downloadUrl: "/api/project-attachments/1/download?download=1",
      previewSize: "large",
    }).options;

    expect(small?.maxWidth).toBe(840);
    expect(small?.maxHeight).toBe(785);
    expect(medium?.maxWidth).toBe(988);
    expect(medium?.maxHeight).toBe(923);
    expect(large?.maxWidth).toBe(1136);
    expect(large?.maxHeight).toBe(1061);
  });

  it("keeps size profiles ordered from small to large", () => {
    const small = resolveAttachmentPreviewDimensions("small");
    const medium = resolveAttachmentPreviewDimensions("medium");
    const large = resolveAttachmentPreviewDimensions("large");

    expect(small.popoverMaxWidth).toBeLessThan(medium.popoverMaxWidth);
    expect(medium.popoverMaxWidth).toBeLessThan(large.popoverMaxWidth);

    expect(small.popoverMaxHeight).toBeLessThan(medium.popoverMaxHeight);
    expect(medium.popoverMaxHeight).toBeLessThan(large.popoverMaxHeight);

    expect(small.contentMaxHeight).toBe(602);
    expect(medium.contentMaxHeight).toBe(708);
    expect(large.contentMaxHeight).toBe(814);

    expect(small.iframeHeight).toBe(575);
    expect(medium.iframeHeight).toBe(677);
    expect(large.iframeHeight).toBe(779);
  });

  it("renders dynamic container and iframe heights from the selected profile", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, {
        originalName: "angebot.pdf",
        mimeType: "application/pdf",
        openUrl: "/api/project-attachments/7/download",
        downloadUrl: "/api/project-attachments/7/download?download=1",
        previewSize: "medium",
      }),
    );

    expect(markup).toContain("max-height:708px");
    expect(markup).toContain("height:677px");
  });
});
