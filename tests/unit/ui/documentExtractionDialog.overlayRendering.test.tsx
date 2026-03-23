/**
 * Test Scope:
 *
 * Feature: FT21 - DocumentExtractionDialog Overlay
 *
 * Abgedeckte Regeln:
 * - Der Extraktionsdialog rendert als explizites Overlay statt als Dialog-Wrapper.
 * - Closed-State rendert keine sichtbare Struktur.
 * - Close- und Cancel-Aktion bleiben sichtbar verfuegbar.
 *
 * Fehlerfaelle:
 * - Das Overlay rendert nicht vollflaechig oder verliert seine Schliesspfade.
 *
 * Ziel:
 * Das neue Overlay-Grundlayout des Extraktionsdialogs ueber statisches Markup absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentExtractionDialog } from "../../../client/src/components/DocumentExtractionDialog";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock("@/components/document-extraction/DocumentExtractionCustomerSection", () => ({
  DocumentExtractionCustomerSection: () => <div data-testid="document-extraction-customer-section">customer-section</div>,
}));

vi.mock("@/components/document-extraction/DocumentExtractionProjectSection", () => ({
  DocumentExtractionProjectSection: () => <div data-testid="document-extraction-project-section">project-section</div>,
}));

const dialogData = {
  customer: {
    customerNumber: "C-200",
    firstName: "Mia",
    lastName: "Dialog",
    company: "Firma A",
    email: "mia@example.test",
    phone: "123",
    addressLine1: "Strasse 1",
    addressLine2: "Etage 2",
    postalCode: "12345",
    city: "Berlin",
  },
  orderNumber: "ORD-200",
  amount: "3333",
  saunaModel: "Modell B",
  articleItems: [],
  categorizedItems: [],
  articleListHtml: "<ul><li>Artikel</li></ul>",
  warnings: [],
  fieldReport: { recognized: [], missing: [] },
};

describe("FT21 document extraction dialog overlay rendering", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders nothing when open is false", () => {
    const html = renderToStaticMarkup(
      <DocumentExtractionDialog
        open={false}
        onOpenChange={() => undefined}
        data={dialogData}
        onApplyData={async () => undefined}
      />,
    );

    expect(html).toBe("");
  });

  it("renders a full overlay with close and cancel controls when open is true", () => {
    const html = renderToStaticMarkup(
      <DocumentExtractionDialog
        open
        onOpenChange={() => undefined}
        data={dialogData}
        onApplyData={async () => undefined}
      />,
    );

    expect(html).toContain("document-extraction-overlay");
    expect(html).toContain("fixed");
    expect(html).toContain("inset-0");
    expect(html).toContain("button-doc-extract-close");
    expect(html).toContain("Dokumentextraktion schlie");
    expect(html).toContain("Abbrechen");
  });
});
