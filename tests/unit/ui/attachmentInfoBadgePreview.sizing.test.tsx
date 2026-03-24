/**
 * Test Scope:
 *
 * Feature: FT18 - User Settings, FT-19 - Attachment Preview Bilder in Originalgroesse
 * Use Case: UC Attachment Preview Groessenprofil small/medium/large
 *
 * Abgedeckte Regeln:
 * - Preview-Optionen fuer small/medium/large werden unterschiedlich aufgeloest.
 * - Medium entspricht den festgelegten Zielwerten.
 * - Small und Large folgen den definierten Faktoren zur Medium-Basis.
 * - Bilder erhalten keinen maxHeight-Inline-Style am Content-Container.
 * - PDFs erhalten weiterhin maxHeight am Content-Container.
 *
 * Fehlerfaelle:
 * - Statische Altwerte duerfen nicht mehr als einziges Profil aktiv sein.
 * - Fuer Bilder darf kein maxHeight-Inline-Style am Content-Container erscheinen.
 *
 * Ziel:
 * Deterministische Groessensteuerung fuer Attachment-Previews absichern.
 * Bilder werden in natuerlicher Groesse dargestellt, begrenzt nur durch den Popover.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AttachmentInfoBadgePreview,
  createAttachmentInfoBadgePreview,
  resolveAttachmentPreviewPortalPosition,
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

  it("renders image without a maxHeight constraint on the content container", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, {
        originalName: "foto.png",
        mimeType: "image/png",
        openUrl: "/api/project-attachments/8/download",
        downloadUrl: "/api/project-attachments/8/download?download=1",
        previewSize: "medium",
      }),
    );

    expect(markup).not.toContain("max-height:");
    expect(markup).toContain("<img");
  });

  it("renders image the same way regardless of previewSize", () => {
    const markupSmall = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, {
        originalName: "bild.jpg",
        mimeType: "image/jpeg",
        openUrl: "/api/project-attachments/9/download",
        downloadUrl: "/api/project-attachments/9/download?download=1",
        previewSize: "small",
      }),
    );
    const markupLarge = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, {
        originalName: "bild.jpg",
        mimeType: "image/jpeg",
        openUrl: "/api/project-attachments/9/download",
        downloadUrl: "/api/project-attachments/9/download?download=1",
        previewSize: "large",
      }),
    );

    expect(markupSmall).toContain("<img");
    expect(markupLarge).toContain("<img");
    expect(markupSmall).not.toContain("max-height:");
    expect(markupLarge).not.toContain("max-height:");
  });

  it("renders PDF with maxHeight on content container", () => {
    const markup = renderToStaticMarkup(
      createElement(AttachmentInfoBadgePreview, {
        originalName: "vertrag.pdf",
        mimeType: "application/pdf",
        openUrl: "/api/project-attachments/10/download",
        downloadUrl: "/api/project-attachments/10/download?download=1",
        previewSize: "medium",
      }),
    );

    expect(markup).toContain("max-height:708px");
  });

  it("positions image previews with their actual rendered width instead of the maximum width", () => {
    const position = resolveAttachmentPreviewPortalPosition({
      triggerRect: {
        left: 900,
        top: 120,
        right: 940,
      },
      viewportWidth: 1220,
      viewportHeight: 900,
      portalWidth: 280,
      portalHeight: 360,
    });

    expect(position).toEqual({ x: 612, y: 120 });
  });

  it("keeps image previews pinned inside the viewport vertically", () => {
    const position = resolveAttachmentPreviewPortalPosition({
      triggerRect: {
        left: 40,
        top: 760,
        right: 120,
      },
      viewportWidth: 1280,
      viewportHeight: 900,
      portalWidth: 280,
      portalHeight: 220,
    });

    expect(position).toEqual({ x: 128, y: 672 });
  });
});
