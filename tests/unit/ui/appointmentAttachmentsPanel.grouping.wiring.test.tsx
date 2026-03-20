/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das Termin-Dokumentenpanel rendert drei sichtbare Gruppen fuer Kunde, Projekt und Termin.
 * - Im Create-Fall werden pending Terminanhaenge mit lokalen Blob-URLs dargestellt.
 * - Im Edit-Fall werden serverseitige Termin-Downloadrouten fuer Terminanhaenge genutzt.
 *
 * Fehlerfaelle:
 * - Die Terminanhang-Gruppe verschwindet oder zeigt im Create-Fall keine lokalen Dateien.
 * - Terminanhaenge nutzen im Edit-Fall nicht ihre eigenen Downloadrouten.
 *
 * Ziel:
 * Sichtbares Panel-Verhalten der gruppierten Terminanhaenge absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let appointmentContext: {
  customerAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
  projectAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
  appointmentAttachments: Array<{ id: number; originalName: string; mimeType: string | null }>;
} | null = null;
let customerAttachments: Array<{ id: number; originalName: string; mimeType: string | null }> = [];
let projectAttachments: Array<{ id: number; originalName: string; mimeType: string | null }> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === "/api/appointments" && queryKey[2] === "attachment-context") {
      return { data: appointmentContext, isLoading: false };
    }
    if (queryKey[0] === "/api/customers" && queryKey[2] === "attachments") {
      return { data: customerAttachments, isLoading: false };
    }
    if (queryKey[0] === "/api/projects" && queryKey[2] === "attachments") {
      return { data: projectAttachments, isLoading: false };
    }
    return { data: [], isLoading: false };
  },
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/components/SplitAttachmentsPanel", () => ({
  SplitAttachmentsPanel: ({
    title,
    helpKey,
    sections,
  }: {
    title: string;
    helpKey?: string;
    sections: Array<{
      id: string;
      title: string;
      items: Array<{ id: number; originalName: string }>;
      canUpload?: boolean;
      buildOpenUrl: (id: number) => string;
      buildDownloadUrl: (id: number) => string;
    }>;
  }) => (
    <div data-testid="split-attachments-panel">
      <div>{title}</div>
      <div>{helpKey}</div>
      {sections.map((section) => (
        <section key={section.id} data-testid={`section-${section.id}`}>
          <h2>{section.title}</h2>
          <div>{section.canUpload ? "upload-enabled" : "upload-disabled"}</div>
          {section.items.map((item) => (
            <a
              key={item.id}
              href={section.buildOpenUrl(item.id)}
              data-download={section.buildDownloadUrl(item.id)}
            >
              {item.originalName}
            </a>
          ))}
        </section>
      ))}
    </div>
  ),
}));

import { AppointmentAttachmentsPanel } from "../../../client/src/components/AppointmentAttachmentsPanel";

describe("FT24 UI: appointment attachments panel grouping wiring", () => {
  beforeEach(() => {
    appointmentContext = null;
    customerAttachments = [];
    projectAttachments = [];
    vi.stubGlobal("React", React);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:pending-attachment"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("renders pending appointment attachments in create mode alongside customer and project groups", () => {
    customerAttachments = [{ id: 11, originalName: "kunde.pdf", mimeType: "application/pdf" }];
    projectAttachments = [{ id: 21, originalName: "projekt.pdf", mimeType: "application/pdf" }];

    const markup = renderToStaticMarkup(
      <AppointmentAttachmentsPanel
        customerId={1}
        projectId={2}
        pendingAppointmentAttachments={[
          {
            id: 31,
            originalName: "termin.pdf",
            mimeType: "application/pdf",
            file: { name: "termin.pdf", size: 123, lastModified: 1 } as File,
          },
        ]}
        onUploadPendingAppointmentAttachment={() => undefined}
      />,
    );

    expect(markup).toContain("appointments.sidebar.attachments");
    expect(markup).toContain("Kundendokumente");
    expect(markup).toContain("Projektdokumente");
    expect(markup).toContain("Terminanhaenge");
    expect(markup).toContain("kunde.pdf");
    expect(markup).toContain("projekt.pdf");
    expect(markup).toContain("termin.pdf");
    expect(markup).toContain("href=\"blob:pending-attachment\"");
    expect(markup).toContain("upload-enabled");
  });

  it("uses dedicated appointment download routes in edit mode", () => {
    appointmentContext = {
      customerAttachments: [{ id: 101, originalName: "kunde-live.pdf", mimeType: "application/pdf" }],
      projectAttachments: [{ id: 201, originalName: "projekt-live.pdf", mimeType: "application/pdf" }],
      appointmentAttachments: [{ id: 301, originalName: "termin-live.pdf", mimeType: "application/pdf" }],
    };

    const markup = renderToStaticMarkup(<AppointmentAttachmentsPanel appointmentId={77} />);

    expect(markup).toContain("kunde-live.pdf");
    expect(markup).toContain("projekt-live.pdf");
    expect(markup).toContain("termin-live.pdf");
    expect(markup).toContain("/api/customer-attachments/101/download");
    expect(markup).toContain("/api/project-attachments/201/download");
    expect(markup).toContain("/api/appointment-attachments/301/download");
    expect(markup).toContain("/api/appointment-attachments/301/download?download=1");
  });
});
