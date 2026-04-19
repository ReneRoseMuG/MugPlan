/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - collapsed-Modus rendert Kunden-Name und Kundennummer und ist in HoverPreview eingebettet.
 * - semiexpanded-Modus rendert Header und Adressblock, kein HoverPreview-Wrapper.
 * - expanded-Modus rendert Header, Adresse, Telefon (wenn vorhanden) und E-Mail (wenn vorhanden).
 * - hideHeader in expanded blendet den h5-Namen aus und fuellt fehlende Zeilen sichtbar auf.
 * - Telefon und E-Mail erscheinen nur, wenn sie befuellt sind oder als Platzhalterzeile aufgefuellt werden.
 * - Header- und Adresszeilen bleiben als nicht umbrechende Einheiten mit konsistentem Innenabstand renderbar.
 *
 * Fehlerfaelle:
 * - collapsed rendert keinen HoverPreview-Wrapper mehr.
 * - hideHeader hat keinen Effekt mehr.
 * - Leere Felder werden im headerlosen Expanded-Modus nicht mehr auf feste Zeilen aufgefuellt.
 *
 * Ziel:
 * Renderverhalten der CustomerInfoPanel-Komponente in allen drei Modi absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const hoverPreviewCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
    ...props
  }: {
    children?: React.ReactNode;
    preview?: React.ReactNode;
  }) => {
    hoverPreviewCalls.push(props);
    return (
      <div data-testid="hover-preview-wrapper">
        <div data-testid="hover-preview-trigger">{children}</div>
        <div data-testid="hover-preview-content">{preview}</div>
      </div>
    );
  },
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
    country: "Deutschland",
    phone: "030 123456",
    email: "max@example.com",
  };

  it("collapsed: rendert Name und Nummer im Trigger und HoverPreview-Wrapper im DOM", () => {
    hoverPreviewCalls.length = 0;
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel {...baseProps} mode="collapsed" />,
    );

    expect(markup).toContain("hover-preview-wrapper");
    expect(markup).toContain("Max Mustermann");
    expect(markup).toContain("K-42");
    expect(hoverPreviewCalls[0]).toMatchObject({
      mode: "cursor",
      cursorOffsetX: 20,
      cursorOffsetY: 20,
    });
  });

  it("collapsed: Preview-Content enthaelt erweiterte Informationen", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel {...baseProps} mode="collapsed" />,
    );

    expect(markup).toContain("hover-preview-content");
    expect(markup).toContain("Musterstraße 1");
    expect(markup).toContain("12345 Musterstadt");
    expect(markup).toContain("Deutschland");
    expect(markup).toContain("whitespace-nowrap");
    expect(markup).toContain("px-2 py-1.5");
    expect(markup).toContain("030 123456");
    expect(markup).toContain("max@example.com");
    expect(markup).toContain("customer-info-line-phone");
    expect(markup).toContain("customer-info-line-email");
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
    expect(markup).toContain("Deutschland");
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
    expect(markup).toContain("Deutschland");
    expect(markup).toContain("030 123456");
    expect(markup).toContain("max@example.com");
  });

  it("expanded mit hideHeader: kein h5-Name im Output und feste Informationszeilen", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel {...baseProps} mode="expanded" hideHeader />,
    );

    expect(markup).not.toContain("<h5");
    expect(markup).not.toContain("Max Mustermann");
    expect(markup).toContain("Musterstraße 1");
    expect(markup).toContain("customer-info-line-address");
    expect(markup).toContain("customer-info-line-city");
    expect(markup).toContain("customer-info-line-country");
    expect(markup).toContain("customer-info-line-phone");
    expect(markup).toContain("customer-info-line-email");
  });

  it("expanded mit hideHeader fuellt fehlende Zeilen mit Platzhaltern auf", () => {
    const markup = renderToStaticMarkup(
      <CustomerInfoPanel
        fullName="Anna Beispiel"
        customerNumber="K-7"
        mode="expanded"
        hideHeader
      />,
    );

    expect(markup).not.toContain("Anna Beispiel");
    expect(markup).toContain("customer-info-line-address");
    expect(markup).toContain("customer-info-line-city");
    expect(markup).toContain("customer-info-line-country");
    expect(markup).toContain("customer-info-line-phone");
    expect(markup).toContain("customer-info-line-email");
    expect(markup).toContain("text-transparent");
  });

  it("phone und email fehlen im Output wenn nicht befuellt und der Header sichtbar bleibt", () => {
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
