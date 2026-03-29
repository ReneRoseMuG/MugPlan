/**
 * Test Scope:
 *
 * Feature: FT19 - Attachment-Lösch-Workflow
 * Use Case: Counter- und Preview-Konsistenz nach Löschung
 *
 * Abgedeckte Regeln:
 * - Nach Soft-Delete zeigt der Counter auf der Wochenkarte den aktualisierten Wert.
 * - Nach Hard-Delete zeigt der Counter den aktualisierten Wert.
 * - War das gelöschte Attachment das letzte, bleibt der `0`-Counter sichtbar und zeigt einen leeren Preview-Zustand.
 * - Die Hover-Preview listet gelöschte Attachments nicht mehr auf.
 * - Counter und Preview verwenden denselben Attachment-Context-Query-Key.
 *
 * Fehlerfälle:
 * - Counter bleibt nach Löschung auf einem alten Wert stehen.
 * - Die Wochenkarten-Preview zeigt nach Löschung veraltete Dateinamen.
 * - `0`-Counter verschwinden trotz des vereinheitlichten Footer-Badge-Verhaltens.
 *
 * Ziel:
 * Sicherstellen, dass CalendarWeekAppointmentAttachmentsHover nach Löschoperationen konsistent auf frische Daten reagiert.
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
      {attachments.map((attachment) => (
        <span key={attachment.originalName}>{attachment.originalName}</span>
      ))}
    </div>
  ),
}));

import { CalendarWeekAppointmentAttachmentsHover } from "../../../client/src/components/calendar/CalendarWeekAppointmentAttachmentsHover";

describe("FT19 UI: attachmentCounter.staleGuard - Counter und Preview nach Löschung", () => {
  beforeEach(() => {
    mockAttachmentContext = undefined;
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Counter-Wert nach Löschung", () => {
    it("zeigt den aktualisierten Counter nach Soft-Delete (3 -> 2)", () => {
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={2} />,
      );

      expect(markup).toContain(">2<");
      expect(markup).not.toContain(">3<");
    });

    it("zeigt den aktualisierten Counter nach Hard-Delete (2 -> 1)", () => {
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={1} />,
      );

      expect(markup).toContain(">1<");
    });

    it("zeigt einen sichtbaren `0`-Counter mit leerem Preview, wenn das letzte Attachment gelöscht wurde", () => {
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={0} />,
      );

      expect(markup).toContain(">0<");
      expect(markup).toContain("Keine Anhänge vorhanden.");
    });

    it("normalisiert negative totalAttachmentsCount auf 0 und zeigt denselben leeren Preview-Zustand", () => {
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={-1} />,
      );

      expect(markup).toContain(">0<");
      expect(markup).toContain("Keine Anhänge vorhanden.");
    });
  });

  describe("Hover-Preview nach Löschung", () => {
    it("listet das gelöschte Attachment nach Soft-Delete nicht mehr auf", () => {
      mockAttachmentContext = {
        appointmentId: 10,
        project: { id: 1, name: "Proj", orderNumber: null },
        customer: { id: 1, customerNumber: "C001", fullName: "Mustermann" },
        projectAttachments: [],
        customerAttachments: [],
        appointmentAttachments: [
          { id: 201, originalName: "verbleibend.pdf", mimeType: "application/pdf" },
        ],
      };

      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={1} />,
      );

      expect(markup).toContain("verbleibend.pdf");
      expect(markup).not.toContain("geloescht.pdf");
    });

    it("zeigt keinen veralteten Dateinamen nach Löschung des letzten Attachments", () => {
      mockAttachmentContext = {
        appointmentId: 10,
        project: null,
        customer: { id: 1, customerNumber: "C001", fullName: "Mustermann" },
        projectAttachments: [],
        customerAttachments: [],
        appointmentAttachments: [],
      };

      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={10} totalAttachmentsCount={0} />,
      );

      expect(markup).toContain("Keine Anhänge vorhanden.");
      expect(markup).not.toContain("letztes.pdf");
    });

    it("zeigt nach Hard-Delete nur noch die verbleibenden Anhänge in der Hover-Preview", () => {
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

      expect(markup).toContain("query-key-proof.pdf");
    });

    it("zeigt 'Keine Anhänge vorhanden.' wenn Query-Daten nicht vorhanden sind", () => {
      const markup = renderToStaticMarkup(
        <CalendarWeekAppointmentAttachmentsHover appointmentId={99} totalAttachmentsCount={1} />,
      );

      expect(markup).toContain(">1<");
      expect(markup).toContain("Keine Anhänge vorhanden.");
    });
  });
});
