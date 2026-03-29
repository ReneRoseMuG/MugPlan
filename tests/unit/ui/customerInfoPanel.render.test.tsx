/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - collapsed-Modus rendert Kunden-Name und Kundennummer und ist in HoverPreview eingebettet.
 * - semiexpanded-Modus rendert Header und Adressblock, kein HoverPreview-Wrapper.
 * - expanded-Modus rendert Header, Adresse, Telefon (wenn vorhanden) und E-Mail (wenn vorhanden).
 * - hideHeader in expanded blendet den h5-Namen aus.
 * - Telefon und E-Mail erscheinen nur, wenn sie befuellt sind.
 *
 * Fehlerfaelle:
 * - collapsed rendert keinen HoverPreview-Wrapper mehr.
 * - hideHeader hat keinen Effekt mehr.
 * - Leere Felder werden trotzdem gerendert.
 *
 * Ziel:
 * Renderverhalten der CustomerInfoPanel-Komponente in allen drei Modi absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
  }: {
    children?: React.ReactNode;
    preview?: React.ReactNode;
  }) => (
    <div data-testid="hover-preview-wrapper">
      <div data-testid="hover-preview-trigger">{children}</div>
      <div data-testid="hover-preview-content">{preview}</div>
    </div>
  ),
}));

vi.mock("@/lib/domain-icons", () => ({
  domainIcons: {
    customers: () => <span data-testid="customer-icon" />,
    projects: () => <span data-testid="project-icon" />,
  },
}));

import { CustomerInfoPanel } from "../../../client/src/components/ui/customer-info-panel";

describe("CustomerInfoPanel render", () => {
  const baseProps = {
    fullName: "Max Mustermann",
    customerNumber: "K-42",
    addressLine1: "Musterstraße 1",
    postalCode: "12345",
    city: "Musterstadt",
    phone: "030 123456",
    email: "max@example.com",
  };

  it("collapsed: rendert Name und Nummer im Trigger und HoverPreview-Wrapper im DOM", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel {...baseProps} mode="collapsed" />,
    );

    expect(markup).toContain("hover-preview-wrapper");
    expect(markup).toContain("Max Mustermann");
    expect(markup).toContain("K-42");
  });

  it("collapsed: Preview-Content enthaelt erweiterte Informationen", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel {...baseProps} mode="collapsed" />,
    );

    expect(markup).toContain("hover-preview-content");
    expect(markup).toContain("Musterstraße 1");
    expect(markup).toContain("12345 Musterstadt");
    expect(markup).toContain("030 123456");
    expect(markup).toContain("max@example.com");
  });

  it("semiexpanded: kein HoverPreview-Wrapper, zeigt Header und Adressblock", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel {...baseProps} mode="semiexpanded" />,
    );

    expect(markup).not.toContain("hover-preview-wrapper");
    expect(markup).toContain("Max Mustermann");
    expect(markup).toContain("K-42");
    expect(markup).toContain("Musterstraße 1");
    expect(markup).toContain("12345 Musterstadt");
  });

  it("expanded: zeigt alle Felder inklusive Telefon und E-Mail", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel {...baseProps} mode="expanded" />,
    );

    expect(markup).not.toContain("hover-preview-wrapper");
    expect(markup).toContain("Max Mustermann");
    expect(markup).toContain("K-42");
    expect(markup).toContain("Musterstraße 1");
    expect(markup).toContain("12345 Musterstadt");
    expect(markup).toContain("030 123456");
    expect(markup).toContain("max@example.com");
  });

  it("expanded mit hideHeader: kein h5-Name im Output", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel {...baseProps} mode="expanded" hideHeader />,
    );

    expect(markup).not.toContain("<h5");
    expect(markup).not.toContain("Max Mustermann");
    expect(markup).toContain("Musterstraße 1");
  });

  it("phone und email fehlen im Output wenn nicht befuellt", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel
        fullName="Anna Beispiel"
        customerNumber="K-7"
        mode="expanded"
      />,
    );

    expect(markup).not.toContain("030 123456");
    expect(markup).not.toContain("max@example.com");
    expect(markup).toContain("Anna Beispiel");
  });
});
