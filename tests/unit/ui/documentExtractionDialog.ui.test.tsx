/**
 * Test Scope:
 *
 * Feature: FT21 - DocumentExtractionDialog UI
 *
 * Abgedeckte Regeln:
 * - Kunden- und Projektsektion werden sichtbar als getrennte Bereiche gerendert.
 * - Split-Buttons fuer Kunde/Projekt und der Single-Apply-Button erscheinen nur im passenden Modus.
 * - Editierbarer Betrag und Artikelliste werden an die Projektsektion weitergereicht.
 *
 * Fehlerfaelle:
 * - Die Dialogmodi verlieren ihre sichtbaren Aktionspfade.
 * - Projektfelder werden nicht mehr an die editierbare Sektion durchgereicht.
 *
 * Ziel:
 * Den Extraktionsdialog ueber sichtbare Modi und weitergereichte Section-Props absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const customerSectionCalls: Array<Record<string, unknown>> = [];
const projectSectionCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <section {...props}>{children}</section>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
}));

vi.mock("@/components/document-extraction/DocumentExtractionCustomerSection", () => ({
  DocumentExtractionCustomerSection: (props: Record<string, unknown>) => {
    customerSectionCalls.push(props);
    return <div data-testid="document-extraction-customer-section">customer-section</div>;
  },
}));

vi.mock("@/components/document-extraction/DocumentExtractionProjectSection", () => ({
  DocumentExtractionProjectSection: (props: Record<string, unknown>) => {
    projectSectionCalls.push(props);
    return <div data-testid="document-extraction-project-section">project-section</div>;
  },
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

async function loadDocumentExtractionDialog(initialState: {
  customerFields: Record<string, string> | null;
  saunaModel: string;
  orderNumber: string;
  amount: string;
  articleListHtml: string;
}) {
  vi.resetModules();

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: vi
        .fn()
        .mockImplementationOnce(() => [initialState.customerFields, vi.fn()])
        .mockImplementationOnce(() => [initialState.saunaModel, vi.fn()])
        .mockImplementationOnce(() => [initialState.orderNumber, vi.fn()])
        .mockImplementationOnce(() => [initialState.amount, vi.fn()])
        .mockImplementationOnce(() => [initialState.articleListHtml, vi.fn()])
        .mockImplementationOnce(() => [false, vi.fn()])
        .mockImplementationOnce(() => [false, vi.fn()])
        .mockImplementationOnce(() => [false, vi.fn()]),
    };
  });

  return import("../../../client/src/components/DocumentExtractionDialog");
}

describe("FT21 document extraction dialog ui behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    customerSectionCalls.length = 0;
    projectSectionCalls.length = 0;
  });

  it("renders split customer/project apply actions and forwards editable project props", async () => {
    const { DocumentExtractionDialog } = await loadDocumentExtractionDialog({
      customerFields: {
        customerNumber: "C-200",
        firstName: "Mia",
        lastName: "Dialog",
        company: "Firma A",
        email: "mia@example.test",
        phone: "123",
        addressLine1: "Strasse 1",
        postalCode: "12345",
        city: "Berlin",
      },
      saunaModel: "Modell B",
      orderNumber: "ORD-200",
      amount: "3333",
      articleListHtml: "<ul><li>Artikel</li></ul>",
    });

    const html = renderToStaticMarkup(
      <DocumentExtractionDialog
        open
        onOpenChange={() => undefined}
        data={dialogData}
        onApplyCustomer={async () => undefined}
        onApplyProject={async () => undefined}
      />,
    );

    expect(html).toContain("document-extraction-overlay");
    expect(html).toContain("button-doc-extract-apply-customer");
    expect(html).toContain("Kundendaten");
    expect(html).toContain("button-doc-extract-apply-project");
    expect(html).toContain("Projektdaten");
    expect(html).not.toContain("button-doc-extract-apply-data");
    expect(customerSectionCalls).toHaveLength(1);
    expect(projectSectionCalls[0]).toMatchObject({
      saunaModel: "Modell B",
      orderNumber: "ORD-200",
      amount: "3333",
      articleListHtml: "<ul><li>Artikel</li></ul>",
    });
  });

  it("renders single apply mode without the split buttons", async () => {
    const { DocumentExtractionDialog } = await loadDocumentExtractionDialog({
      customerFields: {
        customerNumber: "C-200",
        firstName: "Mia",
        lastName: "Dialog",
        company: "Firma A",
        email: "mia@example.test",
        phone: "123",
        addressLine1: "Strasse 1",
        postalCode: "12345",
        city: "Berlin",
      },
      saunaModel: "Modell B",
      orderNumber: "ORD-200",
      amount: "3333",
      articleListHtml: "<ul><li>Artikel</li></ul>",
    });

    const html = renderToStaticMarkup(
      <DocumentExtractionDialog
        open
        onOpenChange={() => undefined}
        data={dialogData}
        onApplyData={async () => undefined}
      />,
    );

    expect(html).toContain("document-extraction-overlay");
    expect(html).toContain("button-doc-extract-apply-data");
    expect(html).toContain("Daten");
    expect(html).not.toContain("button-doc-extract-apply-customer");
    expect(html).not.toContain("button-doc-extract-apply-project");
  });
});
