/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Artikellistenfilter rendert Sauna und die Komponentenfelder als getrennte Auswahlgruppen.
 * - Die Suche, Anwenden, Abbrechen und Zurücksetzen sind im Dialog erreichbar.
 * - Bereits gesetzte Produkt- und Komponentenfilter werden als gestagte Auswahl in den Gruppen vorselektiert.
 *
 * Fehlerfälle:
 * - Der Dialog verliert Gruppen, Suchfeld oder Aktionsbuttons.
 * - Vorhandene Filterwerte erscheinen nicht mehr als ausgewählte Checkboxen.
 *
 * Ziel:
 * Die lokale Dialogstruktur des Projekt-Artikellistenfilters unabhängig vom Browserfluss absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked }: { checked?: boolean }) => <input type="checkbox" checked={checked} readOnly />,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

import { ProjectArticleFilterInput } from "../../../client/src/components/filters/project-article-filter-input";

describe("FT30 UI: project article filter dialog", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders groups, search, staged selection and actions", () => {
    const now = new Date("2099-01-01T00:00:00Z");
    const markup = renderToStaticMarkup(
      <ProjectArticleFilterInput
        products={[
          { id: 11, name: "Sauna Nord", shortCode: "SN", categoryId: 1, description: null, isActive: true, version: 1, createdAt: now, updatedAt: now },
          { id: 12, name: "Sauna Süd", shortCode: null, categoryId: 1, description: null, isActive: true, version: 1, createdAt: now, updatedAt: now },
        ]}
        components={[
          { id: 21, name: "Ofen Klassik", shortCode: "OK", categoryId: 2, description: null, isActive: true, version: 1, createdAt: now, updatedAt: now },
          { id: 22, name: "Fenster Panorama", shortCode: null, categoryId: 3, description: null, isActive: true, version: 1, createdAt: now, updatedAt: now },
        ]}
        componentCategories={[
          { id: 2, name: "Ofen", isDefault: false, isActive: true, version: 1, createdAt: now, updatedAt: now },
          { id: 3, name: "Fenster", isDefault: false, isActive: true, version: 1, createdAt: now, updatedAt: now },
        ]}
        selectedProductIds={[11]}
        selectedComponentIds={[21]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(markup).toContain("Artikelliste");
    expect(markup).toContain("button-open-project-article-filter");
    expect(markup).toContain("button-reset-project-article-filter");
    expect(markup).toContain("dialog-project-article-filter");
    expect(markup).toContain("input-project-article-filter-search");
    expect(markup).toContain("project-article-filter-group-sauna");
    expect(markup).toContain("project-article-filter-group-oven");
    expect(markup).toContain("project-article-filter-group-window");
    expect(markup).toContain("Sauna Nord");
    expect(markup).toContain("Ofen Klassik");
    expect(markup).toContain("Fenster Panorama");
    expect(markup).toContain("button-cancel-project-article-filter");
    expect(markup).toContain("button-apply-project-article-filter");
    expect((markup.match(/checked=""/g) ?? []).length).toBe(2);
  });

  it("hides reset when no article filter is active", () => {
    const markup = renderToStaticMarkup(
      <ProjectArticleFilterInput
        products={[]}
        components={[]}
        componentCategories={[]}
        selectedProductIds={[]}
        selectedComponentIds={[]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(markup).not.toContain("button-reset-project-article-filter");
  });
});
