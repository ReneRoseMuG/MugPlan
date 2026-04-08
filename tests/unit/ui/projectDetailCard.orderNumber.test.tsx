/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer in der Projekt-Detailkarte
 *
 * Abgedeckte Regeln:
 * - ProjectDetailCard zeigt Projektname, Auftragsnummer und Betrag in getrennten Kopf-Feldern.
 * - Projektinhalt rendert Artikelliste und Anmerkungen ueber den kombinierten Renderer.
 * - Leere Werte fallen sichtbar auf `nicht hinterlegt` zurueck.
 *
 * Fehlerfaelle:
 * - Der Renderer zeigt nur noch rohe HTML-Strings oder versteckt Teilbereiche.
 * - Leere Inhalte rendern eine leere Karte statt des Fallbacks.
 * Ziel:
 * Die Projekt-Detailkarte ueber reales Markup statt ueber Quelltextmarker absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectDetailCard } from "../../../client/src/components/ui/project-detail-card";

describe("FT02 project detail card order number", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders split top row fields for project name, order number and amount", () => {
    const html = renderToStaticMarkup(
      <ProjectDetailCard
        testId="project-detail"
        project={{
          name: "Projekt Nord",
          orderNumber: "ORD-001",
          amount: 1234.5,
          descriptionMd: null,
          isActive: true,
          projectArticleItems: [],
        }}
      />,
    );

    expect(html).toContain("Projektname");
    expect(html).toContain("Projekt Nord");
    expect(html).toContain("Auftragsnummer");
    expect(html).toContain("ORD-001");
    expect(html).toContain("Betrag");
    expect(html).toContain("1.234,50");
    expect(html).toContain("project-detail-name");
    expect(html).toContain("project-detail-order-number");
    expect(html).toContain("project-detail-amount");
  });

  it("renders article items and notes together via the combined renderer", () => {
    const html = renderToStaticMarkup(
      <ProjectDetailCard
        testId="project-detail"
        project={{
          name: "Projekt Nord",
          orderNumber: "ORD-001",
          amount: 1234.5,
          descriptionMd: "<p>Nur Hinweis</p>",
          isActive: true,
          projectArticleItems: [{ label: "Sauna", value: "Modell A" }],
        }}
      />,
    );

    expect(html).toContain("Artikelliste");
    expect(html).toContain("Sauna");
    expect(html).toContain("Modell A");
    expect(html).toContain("Anmerkungen");
    expect(html).toContain("<p>Nur Hinweis</p>");
  });

  it("renders fallback text when project content fields are empty", () => {
    const html = renderToStaticMarkup(
      <ProjectDetailCard
        testId="project-detail"
        project={{
          name: "",
          orderNumber: " ",
          amount: null,
          descriptionMd: null,
          isActive: true,
          projectArticleItems: [],
        }}
      />,
    );

    expect(html).toContain("nicht hinterlegt");
    expect(html).toContain("project-detail-description");
  });
});
