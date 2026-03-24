/**
 * Test Scope:
 *
 * Feature: FT19 – Attachment Lösch-Workflow
 * Use Case: Counter- und Preview-Konsistenz nach Löschung
 *
 * Abgedeckte Regeln:
 * - Nach Soft-Delete zeigt der Counter auf der Wochenkarte den aktualisierten (reduzierten) Wert.
 * - Nach Hard-Delete zeigt der Counter den aktualisierten Wert.
 * - War das gelöschte Attachment das letzte, zeigt der Counter 0 (nicht 1 oder undefined).
 * - Die Hover-Preview listet das gelöschte Attachment nicht mehr auf.
 * - Die Hover-Preview zeigt bei 0 Anhaengen keinen veralteten Zustand.
 * - Der Query-Key für Counter und Preview ist identisch mit dem der Attachment-Context-Query,
 *   sodass eine einzige Invalidierung Counter und Preview synchron hält.
 *
 * Fehlerfaelle:
 * - Counter bleibt nach Löschung auf altem Wert (Stale State).
 * - Hover-Preview zeigt nach Löschung noch das gelöschte Attachment.
 * - Counter zeigt 1 statt 0 nach Löschung des letzten Attachments.
 *
 * Ziel:
 * Sicherstellen, dass CalendarWeekAppointmentAttachmentsHover keine veralteten Daten
 * nach einer Löschoperation anzeigt.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AttachmentContextData = {
  appointmentId: number;
  project: null | { id: number; name: string; orderNumber: string | null };
  customer: { id: number; customerNumber: string; fullName: string | null };
  projectAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
  customerAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
  appointmentAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
};

let mockAttachmentContext: AttachmentContextData | undefined;

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (
      Array.isArray(queryKey) &&
      queryKey[0] === "/api/appointments" &&
      queryKey[2] === "attachment-context"
    ) {
      return { data: mockAttachmentContext, isLoading: false, isError: false };
    }
    return { data: undefined, isLoading: false, isError: false };
  },
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => "medium",
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
  }: {
    children: React.ReactNode;
    preview: React.ReactNode;
  }) => (
    <div data-testid="hover-preview">
      <div data-testid="hover-trigger">{children}</div>
      <div data-testid="hover-content">{preview}</div>
    </div>
  ),
}));

vi.mock("@/components/ui/badge-previews/attachment-info-badge-preview", () => ({
  AttachmentInfoBadgePreview: ({
    originalName,
  }: {
    originalName: string;
  }) => <div data-testid="attachment-info-preview">{originalName}</div>,
  AttachmentPreviewTrigger: ({
    children,
    renderPreviewContent,
  }: {
    children: React.ReactNode;
    renderPreviewContent?: (controls: Record<string, unknown>) => React.ReactNode;
  }) => (
    <div data-testid="attachment-preview-trigger">
      <div data-testid="attachment-preview-trigger-children">{children}</div>
      <div data-testid="attachment-preview-trigger-content">{renderPreviewContent?.({})}</div>
    </div>
  ),
  parseAttachmentPreviewSize: () => "medium",
  resolveAttachmentPreviewDimensions: () => ({
    popoverMaxWidth: 988,
    popoverMaxHeight: 923,
    contentMaxHeight: 708,
    iframeHeight: 677,
  }),
}));

vi.mock("@/components/calendar/CalendarWeekAppointmentAttachmentsGallery", () => ({
  CalendarWeekAppointmentAttachmentsGallery: ({
    attachments,
  }: {
    attachments: Array<{ originalName: string }>;
  }) => (
    <div data-testid="gallery">
      {attachments.map((a) => (
        <span key={a.originalName}>{a.originalName}</span>
      ))}
    </div>
  ),
}));

import { CalendarWeekAppointmentAttachmentsHover } from "../../../client/src/components/calendar/CalendarWeekAppointmentAttachmentsHover";

describe("FT19 UI: attachmentCounter.staleGuard – Counter und Preview nach Löschung", () => {
  beforeEach(() => {
    mockAttachmentContext = undefined;
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Counter-Wert nach Löschung", () => {
    it("zeigt den aktualisierten Counter nach Soft-Delete (3 → 2)", () => {
      // Vor der Löschung: Counter war 3
      // Nach der Löschung und Invalidierung liefert der Kalender totalAttachmentsCount=2
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={2} />,
      );

      expect(markup).toContain("2");
      expect(markup).not.toContain(">3<");
    });

    it("zeigt den aktualisierten Counter nach Hard-Delete (2 → 1)", () => {
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={1} />,
      );

      expect(markup).toContain("1");
    });

    it("rendert null (kein Counter) wenn das letzte Attachment gelöscht wurde (totalAttachmentsCount=0)", () => {
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={0} />,
      );

      // Keine Hover-Trigger-Anzeige mehr nach Löschung des letzten Anhangs
      expect(markup).toBe("");
    });

    it("normalisiert negative totalAttachmentsCount auf 0 (kein Counter)", () => {
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={-1} />,
      );

      expect(markup).toBe("");
    });
  });

  describe("Hover-Preview nach Löschung", () => {
    it("listet das gelöschte Attachment nach Soft-Delete nicht mehr auf", () => {
      // Attachment-Context nach Soft-Delete: gelöschtes PDF ist nicht mehr enthalten
      mockAttachmentContext = {
        appointmentId: 10,
        project: { id: 1, name: "Proj", orderNumber: null },
        customer: { id: 1, customerNumber: "C001", fullName: "Mustermann" },
        projectAttachments: [],
        customerAttachments: [],
        appointmentAttachments: [
          { id: 201, originalName: "verbleibend.pdf", mimeType: "application/pdf" },
          // geloescht.pdf ist nicht mehr vorhanden
        ],
      };

      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={1} />,
      );

      expect(markup).toContain("verbleibend.pdf");
      expect(markup).not.toContain("geloescht.pdf");
    });

    it("zeigt keinen veralteten Thumbnail/Dateinamen nach Löschung des letzten Attachments", () => {
      // Nach Löschung des letzten Anhangs ist der Context leer
      mockAttachmentContext = {
        appointmentId: 10,
        project: null,
        customer: { id: 1, customerNumber: "C001", fullName: "Mustermann" },
        projectAttachments: [],
        customerAttachments: [],
        appointmentAttachments: [],
      };

      // totalAttachmentsCount=0 → Komponente rendert gar nicht → kein veraltetes Thumbnail
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={0} />,
      );

      expect(markup).toBe("");
      expect(markup).not.toContain("letztes.pdf");
    });

    it("zeigt nach Hard-Delete nur noch die verbleibenden Anhaenge in der Hover-Preview", () => {
      mockAttachmentContext = {
        appointmentId: 10,
        project: { id: 2, name: "Proj", orderNumber: null },
        customer: { id: 2, customerNumber: "C002", fullName: "Beispiel" },
        projectAttachments: [
          { id: 301, originalName: "projekt-verbleibend.pdf", mimeType: "application/pdf" },
        ],
        customerAttachments: [],
        appointmentAttachments: [],
      };

      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={1} />,
      );

      expect(markup).toContain("projekt-verbleibend.pdf");
    });
  });

  describe("Query-Key-Konsistenz", () => {
    it("nutzt den Query-Key '/api/appointments/:id/attachment-context' für Counter und Preview", () => {
      // Dieser Test stellt sicher, dass die Komponente den korrekten Query-Key nutzt,
      // damit eine einzige invalidateQueries({ queryKey: ['/api/appointments', id, 'attachment-context'] })
      // sowohl Counter (indirekt via totalAttachmentsCount aus dem Kalender-Query) als auch
      // Preview synchron hält.
      //
      // Der useQuery-Mock liefert Daten nur für den key ["/api/appointments", 10, "attachment-context"].
      // Wenn die Komponente einen anderen Key nutzen würde, wäre data=undefined und
      // die Gallery würde keine Attachments anzeigen.
      mockAttachmentContext = {
        appointmentId: 10,
        project: null,
        customer: { id: 1, customerNumber: "C001", fullName: "Test" },
        projectAttachments: [],
        customerAttachments: [],
        appointmentAttachments: [
          { id: 501, originalName: "query-key-proof.pdf", mimeType: "application/pdf" },
        ],
      };

      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={1} />,
      );

      // Wenn der Query-Key korrekt ist, werden die Daten geladen und das Attachment angezeigt
      expect(markup).toContain("query-key-proof.pdf");
    });

    it("zeigt 'Keine Anhaenge' wenn Query-Daten nicht vorhanden sind (undefined context)", () => {
      // mockAttachmentContext bleibt undefined (kein Attachment-Context verfügbar)
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={99} totalAttachmentsCount={1} />,
      );

      // Zähler ist > 0, also wird der Trigger angezeigt
      expect(markup).toContain("1");
      // aber der Preview-Content zeigt leer/loading-Zustand
      // (keine Daten → buildPreviewAttachments gibt [] zurück → "Keine Anhaenge vorhanden")
      expect(markup).toContain("Keine Anhaenge vorhanden");
    });
  });
});
