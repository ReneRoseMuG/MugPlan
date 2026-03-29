/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - collapsed-Modus rendert Projektname und Auftragsnummer und ist in HoverPreview eingebettet.
 * - expanded-Modus rendert den Artikel-Renderer und optionalen Header.
 * - hideHeader in expanded blendet den h5-Projektnamen aus.
 * - Fehlende Auftragsnummer wird als "-" dargestellt.
 *
 * Fehlerfaelle:
 * - collapsed rendert keinen HoverPreview-Wrapper mehr.
 * - hideHeader hat keinen Effekt in expanded.
 *
 * Ziel:
 * Renderverhalten der ProjectInfoPanel-Komponente in beiden Modi absichern.
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

vi.mock("@/components/ui/project-article-description-renderer", () => ({
  ProjectArticleDescriptionRenderer: ({
    articleItems,
  }: {
    articleItems: Array<{ label: string; value: string }>;
  }) => (
    <div data-testid="article-renderer">
      {articleItems.map((item) => (
        <span key={item.label}>{item.value}</span>
      ))}
    </div>
  ),
}));

import { ProjectInfoPanel } from "../../../client/src/components/ui/project-info-panel";

describe("ProjectInfoPanel render", () => {
  const baseProps = {
    projectName: "Saunabau Nord",
    projectOrderNumber: "ORD-99",
    projectArticleItems: [{ label: "Modell", value: "Classic 200" }],
    projectDescription: null,
  };

  it("collapsed: rendert Projektname und Auftragsnummer im Trigger und HoverPreview-Wrapper im DOM", () => {
    hoverPreviewCalls.length = 0;
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel {...baseProps} mode="collapsed" />,
    );

    expect(markup).toContain("hover-preview-wrapper");
    expect(markup).toContain("Saunabau Nord");
    expect(markup).toContain("ORD-99");
    expect(hoverPreviewCalls[0]).toMatchObject({
      mode: "cursor",
      cursorOffsetX: 20,
      cursorOffsetY: 20,
    });
  });

  it("collapsed: Preview-Content enthaelt Artikel-Renderer", () => {
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel {...baseProps} mode="collapsed" />,
    );

    expect(markup).toContain("hover-preview-content");
    expect(markup).toContain("article-renderer");
    expect(markup).toContain("Classic 200");
  });

  it("expanded: rendert Artikel-Renderer und Header", () => {
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel {...baseProps} mode="expanded" />,
    );

    expect(markup).not.toContain("hover-preview-wrapper");
    expect(markup).toContain("article-renderer");
    expect(markup).toContain("Saunabau Nord");
    expect(markup).toContain("ORD-99");
  });

  it("expanded: reicht zusaetzliche Klassen an die Panel-Huelle durch", () => {
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel {...baseProps} mode="expanded" className="h-full" />,
    );

    expect(markup).toContain("h-full");
  });

  it("expanded im kompakten Modus begrenzt das Panel wieder auf die feste Kartenhoehe", () => {
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel {...baseProps} mode="expanded" compact />,
    );

    expect(markup).toContain("h-[6.5rem]");
    expect(markup).toContain("overflow-hidden");
  });

  it("expanded mit hideHeader: kein h5-Projektname im Output", () => {
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel {...baseProps} mode="expanded" hideHeader />,
    );

    expect(markup).not.toContain("<h5");
    expect(markup).not.toContain("Saunabau Nord");
    expect(markup).toContain("article-renderer");
  });

  it("expanded ohne Projektinhalt zeigt den Fallbacktext im Panel", () => {
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel
        {...baseProps}
        mode="expanded"
        hideHeader
        projectArticleItems={[]}
        projectDescription={null}
      />,
    );

    expect(markup).toContain("Kein Auftrag hinterlegt");
    expect(markup).not.toContain("article-renderer");
  });

  it("fehlende Auftragsnummer wird als Strich dargestellt", () => {
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel
        {...baseProps}
        projectOrderNumber={null}
        mode="collapsed"
      />,
    );

    expect(markup).toContain("- -");
  });

  it("normalisiert den Fallbacktext '--Ohne Projekt' zu 'Kein Auftrag hinterlegt' und oeffnet dann kein Preview", () => {
    const markup = renderToStaticMarkup(
      <ProjectInfoPanel
        {...baseProps}
        projectName="--Ohne Projekt"
        mode="collapsed"
      />,
    );

    expect(markup).toContain("Kein Auftrag hinterlegt");
    expect(markup).not.toContain("--Ohne Projekt");
    expect(markup).not.toContain("hover-preview-wrapper");
  });
});
