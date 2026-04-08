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
  renderSelectiveProjectArticleListSection,
  renderProjectNotesSection,
} from "../../../client/src/components/ui/project-article-description-renderer";

describe("project article description renderer integration", () => {
  it("renders article list before the notes section and highlights category labels", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectArticleDescriptionRenderer, {
        articleItems: [
          { label: "Sauna", value: "Modell A" },
          { label: "Ofen", value: "Ofen XL" },
        ],
        descriptionHtml: "<p>Beschreibung</p>",
        showSectionTitles: true,
      }),
    );

    expect(html.indexOf("Artikelliste")).toBeLessThan(html.indexOf("Anmerkungen"));
    expect(html).toContain('class="mb-1 text-[10px] font-semibold text-slate-900"');
    expect(html).toContain('class="font-semibold text-slate-900"');
    expect(html).toContain("Sauna");
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

  it("renders components only when the selective section is asked to filter components", () => {
    const html = renderToStaticMarkup(
      <>{renderSelectiveProjectArticleListSection({
        articleItems: [
          { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
          { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
          { label: "Fenster", value: "Panorama", source: "component", shortCode: "PAN" },
        ],
        articleListOptions: { filter: "components" },
        showSectionTitles: true,
        testIdPrefix: "components-only",
      })}</>,
    );

    expect(html).toContain("Artikelliste");
    expect(html).toContain("HUUM Core");
    expect(html).toContain("Panorama");
    expect(html).not.toContain("Nord Premium");
  });

  it("renders no article section when components-only filtering removes every item", () => {
    const html = renderToStaticMarkup(
      <>{renderSelectiveProjectArticleListSection({
        articleItems: [
          { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
          { label: "Ofen", value: "HUUM Core" },
        ],
        articleListOptions: { filter: "components" },
        showSectionTitles: true,
        testIdPrefix: "components-empty",
      })}</>,
    );

    expect(html).toBe("");
  });

  it("uses shortcodes when explicitly enabled", () => {
    const html = renderToStaticMarkup(
      <>{renderSelectiveProjectArticleListSection({
        articleItems: [
          { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
          { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
        ],
        articleListOptions: { useShortCodes: true },
        testIdPrefix: "shortcodes",
      })}</>,
    );

    expect(html).toContain("NP");
    expect(html).toContain("HC");
    expect(html).not.toContain("Nord Premium");
    expect(html).not.toContain("HUUM Core");
  });

  it("falls back to item names when shortcodes are missing or blank", () => {
    const html = renderToStaticMarkup(
      <>{renderSelectiveProjectArticleListSection({
        articleItems: [
          { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: null },
          { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "   " },
          { label: "Fenster", value: "Panorama", source: "component" },
        ],
        articleListOptions: { useShortCodes: true },
        testIdPrefix: "shortcodes-fallback",
      })}</>,
    );

    expect(html).toContain("Nord Premium");
    expect(html).toContain("HUUM Core");
    expect(html).toContain("Panorama");
  });

  it("supports combined component filtering and shortcode substitution via the main renderer", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectArticleDescriptionRenderer, {
        articleItems: [
          { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
          { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
          { label: "Fenster", value: "Panorama", source: "component", shortCode: "" },
        ],
        descriptionHtml: "<p>Hinweis</p>",
        articleListOptions: { filter: "components", useShortCodes: true },
        showSectionTitles: true,
      }),
    );

    expect(html).toContain("HC");
    expect(html).toContain("Panorama");
    expect(html).not.toContain("Nord Premium");
    expect(html).toContain("Hinweis");
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

  it("renders only the description when article filtering removes all items", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectArticleDescriptionRenderer, {
        articleItems: [{ label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" }],
        descriptionHtml: "<p>Nur Beschreibung</p>",
        articleListOptions: { filter: "components", useShortCodes: true },
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
          { label: "Sauna", value: "Modell A" },
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

  it("keeps article ordering stable after filtering and value substitution", () => {
    const html = renderToStaticMarkup(
      <>{renderSelectiveProjectArticleListSection({
        articleItems: [
          { label: "Saunamodell", value: "Nord Premium", source: "product", shortCode: "NP" },
          { label: "Ofen", value: "HUUM Core", source: "component", shortCode: "HC" },
          { label: "Fenster", value: "Panorama", source: "component", shortCode: "PAN" },
          { label: "Dach", value: "Schraeg", source: "component", shortCode: null },
        ],
        articleListOptions: { filter: "components", useShortCodes: true },
      })}</>,
    );

    expect(html.indexOf("HC")).toBeLessThan(html.indexOf("PAN"));
    expect(html.indexOf("PAN")).toBeLessThan(html.indexOf("Schraeg"));
  });
});
