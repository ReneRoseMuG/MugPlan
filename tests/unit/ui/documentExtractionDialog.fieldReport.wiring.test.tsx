/**
 * Test Scope:
 *
 * Feature: FT21 - Dokumentextraktion Feldreport im Dialog
 *
 * Abgedeckte Regeln:
 * - Der Dialog zeigt Erfolgs- und Fehlreport sichtbar an.
 * - Der Report bleibt zwischen Warnings und den editierbaren Bereichen.
 *
 * Fehlerfaelle:
 * - Der Report fehlt oder driftet im Dialog an die falsche Stelle.
 *
 * Ziel:
 * Die Report-Darstellung im Extraktionsdialog ueber gerendertes Markup absichern.
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

async function loadDocumentExtractionDialog() {
  vi.resetModules();

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: vi
        .fn()
        .mockImplementationOnce(() => [{
          customerNumber: "C-100",
          firstName: "Ina",
          lastName: "Beispiel",
          company: "",
          email: "",
          phone: "",
          addressLine1: "",
          postalCode: "",
          city: "",
        }, vi.fn()])
        .mockImplementationOnce(() => ["Modell A", vi.fn()])
        .mockImplementationOnce(() => ["ORD-100", vi.fn()])
        .mockImplementationOnce(() => ["1234", vi.fn()])
        .mockImplementationOnce(() => ["<ul><li>Eintrag</li></ul>", vi.fn()])
        .mockImplementationOnce(() => [false, vi.fn()])
        .mockImplementationOnce(() => [false, vi.fn()])
        .mockImplementationOnce(() => [false, vi.fn()]),
    };
  });

  return import("../../../client/src/components/DocumentExtractionDialog");
}

describe("FT21 document extraction dialog field report behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    customerSectionCalls.length = 0;
    projectSectionCalls.length = 0;
  });

  it("renders recognized and missing report blocks between warnings and edit sections", async () => {
    const { DocumentExtractionDialog } = await loadDocumentExtractionDialog();
    const html = renderToStaticMarkup(
      <DocumentExtractionDialog
        open
        onOpenChange={() => undefined}
        data={{
          customer: {
            customerNumber: "C-100",
            firstName: "Ina",
            lastName: "Beispiel",
            company: null,
            email: null,
            phone: null,
            addressLine1: null,
            addressLine2: null,
            postalCode: null,
            city: null,
          },
          orderNumber: "ORD-100",
          amount: "1234",
          saunaModel: "Modell A",
          articleItems: [],
          categorizedItems: [],
          articleListHtml: "<ul><li>Eintrag</li></ul>",
          warnings: ["Warnung A"],
          fieldReport: {
            recognized: [{ key: "customerNumber", label: "Kundennummer", section: "customer", value: "C-100" }],
            missing: [{ key: "email", label: "E-Mail", section: "customer", reason: "Nicht im Dokument gefunden" }],
          },
        }}
      />,
    );

    expect(html).toContain("Warnung A");
    expect(html).toContain("document-extraction-report-recognized");
    expect(html).toContain("Erfolgreich erkannt");
    expect(html).toContain("Kundennummer");
    expect(html).toContain("C-100");
    expect(html).toContain("document-extraction-report-missing");
    expect(html).toContain("Nicht erkannt");
    expect(html).toContain("E-Mail");
    expect(html).toContain("Nicht im Dokument gefunden");

    const warningsIndex = html.indexOf("Warnung A");
    const recognizedIndex = html.indexOf("document-extraction-report-recognized");
    const missingIndex = html.indexOf("document-extraction-report-missing");
    const customerIndex = html.indexOf("document-extraction-customer-section");
    const projectIndex = html.indexOf("document-extraction-project-section");

    expect(recognizedIndex).toBeGreaterThan(warningsIndex);
    expect(missingIndex).toBeGreaterThan(recognizedIndex);
    expect(customerIndex).toBeGreaterThan(missingIndex);
    expect(projectIndex).toBeGreaterThan(customerIndex);
  });
});
