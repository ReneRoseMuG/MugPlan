/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Renderer gibt zuerst die formatierte Artikelliste und danach die Projektanmerkungen aus.
 * - Leere Artikelliste oder leere Beschreibung werden nicht gerendert.
 * - Teilweise leere Artikelfelder werden ausgelassen, verwertbare Felder bleiben sichtbar und Kategorienamen bleiben optisch betont.
 *
 * Fehlerfaelle:
 * - Leere Abschnitte erzeugen leere Wrapper oder Ueberschriften.
 * - Anmerkungsblock wird vor der Artikelliste ausgegeben oder verwendet weiter die alte Ueberschrift.
 *
 * Ziel:
 * Das wiederverwendbare Rendern von Projekt-Artikelliste und Projektanmerkungen in mehreren Szenarien integrativ absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ProjectArticleDescriptionRenderer,
  renderProjectArticleListSection,
  renderProjectNotesSection,
} from "../../../client/src/components/ui/project-article-description-renderer";

describe("project article description renderer integration", () => {
  it("renders article list before the notes section and highlights category labels", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectArticleDescriptionRenderer, {
        articleItems: [
          { label: "Saunamodell", value: "Modell A" },
          { label: "Ofen", value: "Ofen XL" },
        ],
        descriptionHtml: "<p>Beschreibung</p>",
        showSectionTitles: true,
      }),
    );

    expect(html.indexOf("Artikelliste")).toBeLessThan(html.indexOf("Anmerkungen"));
    expect(html).toContain('class="mb-1 text-[10px] font-semibold text-slate-900"');
    expect(html).toContain('class="font-semibold text-slate-900"');
    expect(html).toContain("Saunamodell");
    expect(html).toContain("Modell A");
    expect(html).toContain("<p>Beschreibung</p>");
  });

  it("renders the article list as a standalone section with headline", () => {
    const html = renderToStaticMarkup(
      <>{renderProjectArticleListSection({
        articleItems: [{ label: "Ofen", value: "Ofen XL" }],
        showSectionTitles: true,
        testIdPrefix: "articles-only",
      })}</>,
    );

    expect(html).toContain("Artikelliste");
    expect(html).toContain("Ofen XL");
    expect(html).not.toContain("Anmerkungen");
  });

  it("renders the notes as a standalone section with headline", () => {
    const html = renderToStaticMarkup(
      <>{renderProjectNotesSection({
        descriptionHtml: "<p>Nur Hinweis</p>",
        showSectionTitles: true,
        testIdPrefix: "notes-only",
      })}</>,
    );

    expect(html).toContain("Anmerkungen");
    expect(html).toContain("Nur Hinweis");
    expect(html).not.toContain("Artikelliste");
  });

  it("renders only the article section when description is empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectArticleDescriptionRenderer, {
        articleItems: [{ label: "Ofen", value: "Ofen XL" }],
        descriptionHtml: "",
        showSectionTitles: true,
      }),
    );

    expect(html).toContain("Artikelliste");
    expect(html).not.toContain(">Anmerkungen<");
  });

  it("renders only the description when article items are empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectArticleDescriptionRenderer, {
        articleItems: [],
        descriptionHtml: "<p>Nur Beschreibung</p>",
        showSectionTitles: true,
      }),
    );

    expect(html).not.toContain("Artikelliste");
    expect(html).toContain("Anmerkungen");
    expect(html).toContain("Nur Beschreibung");
  });

  it("renders nothing when both fields are empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectArticleDescriptionRenderer, {
        articleItems: [],
        descriptionHtml: "",
      }),
    );

    expect(html).toBe("");
  });

  it("skips article items with missing values and keeps resolvable entries", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectArticleDescriptionRenderer, {
        articleItems: [
          { label: "Saunamodell", value: "Modell A" },
          { label: "Ofen", value: "" },
          { label: "", value: "Ignorieren" },
          { label: "Fenster", value: "Panorama" },
        ],
        descriptionHtml: null,
      }),
    );

    expect(html).toContain("Modell A");
    expect(html).toContain("Panorama");
    expect(html).not.toContain("Ignorieren");
    expect(html).not.toContain(">Ofen<");
  });
});
