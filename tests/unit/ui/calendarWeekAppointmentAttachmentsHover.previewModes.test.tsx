/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein einzelner Wochenkarten-Anhang nutzt direkt den gemeinsamen AttachmentPreviewTrigger.
 * - Mehrere Wochenkarten-Anhaenge nutzen weiterhin ein Hover mit Gallery-Inhalt.
 * - Die Gallery-Hover-Vorschau erzwingt keine feste Mindestbreite mehr.
 *
 * Fehlerfaelle:
 * - Einzelanhaenge landen im Gallery-Hover statt im direkten Preview-Trigger.
 * - Die Mehrfach-Gallery bleibt auf eine starre, ueberbreite Mindestbreite verdrahtet.
 *
 * Ziel:
 * Preview-Modus und Breitenverdrahtung des Attachment-Hovers auf Wochenkarten regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type AttachmentContext = {
  appointmentId: number;
  project: null | { id: number; name: string; orderNumber: string | null };
  customer: { id: number; customerNumber: string; fullName: string | null };
  projectAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
  customerAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
  appointmentAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
};

const hoverCalls: Array<Record<string, unknown>> = [];
const previewTriggerCalls: Array<Record<string, unknown>> = [];
let mockAttachmentContext: AttachmentContext | undefined;

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: mockAttachmentContext,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: () => "medium",
}));

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: (props: Record<string, unknown>) => {
    hoverCalls.push(props);
    return <div data-testid="hover-preview">{props.children as React.ReactNode}</div>;
  },
}));

vi.mock("@/components/ui/badge-previews/attachment-info-badge-preview", async () => {
  const actual = await vi.importActual<typeof import("../../../client/src/components/ui/badge-previews/attachment-info-badge-preview")>(
    "../../../client/src/components/ui/badge-previews/attachment-info-badge-preview",
  );

  return {
    ...actual,
    AttachmentPreviewTrigger: (props: Record<string, unknown>) => {
      previewTriggerCalls.push(props);
      return <div data-testid="attachment-preview-trigger">{props.children as React.ReactNode}</div>;
    },
  };
});

vi.mock("@/components/calendar/CalendarWeekAppointmentAttachmentsGallery", () => ({
  CalendarWeekAppointmentAttachmentsGallery: ({
    attachments,
  }: {
    attachments: Array<{ originalName: string }>;
  }) => <div data-testid="attachments-gallery">{attachments.map((item) => item.originalName).join(",")}</div>,
}));

import { CalendarWeekAppointmentAttachmentsHover } from "../../../client/src/components/calendar/CalendarWeekAppointmentAttachmentsHover";

describe("FT19/FT24 calendar week attachment hover preview modes", () => {
  beforeEach(() => {
    hoverCalls.length = 0;
    previewTriggerCalls.length = 0;
    mockAttachmentContext = undefined;
    vi.stubGlobal("React", React);
  });

  it("uses the shared attachment preview trigger when exactly one attachment exists", () => {
    mockAttachmentContext = {
      appointmentId: 17,
      project: null,
      customer: { id: 1, customerNumber: "C001", fullName: "Test" },
      projectAttachments: [],
      customerAttachments: [],
      appointmentAttachments: [
        { id: 301, originalName: "einzeln.pdf", mimeType: "application/pdf" },
      ],
    };

    renderToStaticMarkup(
      <CalendarWeekAppointmentAttachmentsHover appointmentId={17} totalAttachmentsCount={1} />,
    );

    expect(previewTriggerCalls).toHaveLength(1);
    expect(hoverCalls).toHaveLength(0);
    expect(String(previewTriggerCalls[0]?.originalName)).toBe("einzeln.pdf");
  });

  it("keeps multiple attachments on the gallery hover without a fixed minimum width", () => {
    mockAttachmentContext = {
      appointmentId: 18,
      project: null,
      customer: { id: 1, customerNumber: "C001", fullName: "Test" },
      projectAttachments: [
        { id: 401, originalName: "kunde.pdf", mimeType: "application/pdf" },
      ],
      customerAttachments: [
        { id: 402, originalName: "projekt.pdf", mimeType: "application/pdf" },
      ],
      appointmentAttachments: [],
    };

    const markup = renderToStaticMarkup(
      <CalendarWeekAppointmentAttachmentsHover appointmentId={18} totalAttachmentsCount={2} />,
    );

    expect(previewTriggerCalls).toHaveLength(0);
    expect(hoverCalls).toHaveLength(1);
    expect(hoverCalls[0]?.minWidth).toBeUndefined();
    expect(String(hoverCalls[0]?.className)).toContain("w-auto");
    expect(markup).toContain("Anhaenge");
  });
});
