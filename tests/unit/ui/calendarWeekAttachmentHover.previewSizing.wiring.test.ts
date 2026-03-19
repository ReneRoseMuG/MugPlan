/**
 * Test Scope:
 *
 * Feature: FT03/FT24/FT18 - Wochenkalender Attachment-Hover
 * Use Case: UC Wochenkarten-Preview respektiert attachmentPreviewSize und kollidiert sauber mit dem Viewport
 *
 * Abgedeckte Regeln:
 * - Der Wochenkarten-Attachment-Hover leitet seine Groesse aus dem globalen attachmentPreviewSize-Profil ab.
 * - Der Hover nutzt Kollisionsabstaende und end-ausgerichtete Positionierung statt starrer 420x380-Werte.
 * - Die Einzelvorschau und Galerie-Hover verwenden dasselbe Groessenprofil.
 *
 * Fehlerfaelle:
 * - Wochenkarten-Attachment-Previews ignorieren weiterhin attachmentPreviewSize.
 * - Starre Hover-Positionierung laesst Popovers an der Kartenkante aus dem Bild springen.
 *
 * Ziel:
 * Die Verdrahtung fuer konsistente Groesse und robustere Positionierung der Wochenkarten-Attachment-Previews regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03/FT24/FT18 week attachment hover preview sizing wiring", () => {
  it("derives hover dimensions from attachmentPreviewSize and enables collision padding", () => {
    const hoverPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentAttachmentsHover.tsx");
    const hoverSource = readFileSync(hoverPath, "utf8");

    expect(hoverSource).toContain('useSetting("attachmentPreviewSize")');
    expect(hoverSource).toContain("resolveAttachmentPreviewDimensions");
    expect(hoverSource).toContain('align="end"');
    expect(hoverSource).toContain("collisionPadding={24}");
    expect(hoverSource).toContain("maxWidth={previewDimensions.popoverMaxWidth}");
    expect(hoverSource).toContain("minWidth={previewDimensions.popoverMaxWidth}");
    expect(hoverSource).toContain("maxHeight={previewDimensions.popoverMaxHeight}");
  });

  it("uses the same attachment preview size profile in single preview and gallery hover", () => {
    const singlePreviewPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentAttachmentsSinglePreview.tsx");
    const singlePreviewSource = readFileSync(singlePreviewPath, "utf8");
    const galleryPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentAttachmentsGallery.tsx");
    const gallerySource = readFileSync(galleryPath, "utf8");

    expect(singlePreviewSource).toContain('useSetting("attachmentPreviewSize")');
    expect(singlePreviewSource).toContain("resolveAttachmentPreviewDimensions");
    expect(singlePreviewSource).toContain("dimensions.contentMaxHeight");
    expect(singlePreviewSource).toContain("dimensions.iframeHeight");

    expect(gallerySource).toContain('useSetting("attachmentPreviewSize")');
    expect(gallerySource).toContain("resolveAttachmentPreviewDimensions");
    expect(gallerySource).toContain("collisionPadding={24}");
    expect(gallerySource).toContain("minWidth={previewDimensions.popoverMaxWidth}");
  });
});
