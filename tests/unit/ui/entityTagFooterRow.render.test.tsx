/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Footer-Tag-Zeile bleibt auch ohne Tags sichtbar und zeigt den Fallbacktext an.
 * - Vorhandene Tags werden weiterhin als kompakte Footer-Badges gerendert.
 *
 * Fehlerfälle:
 * - Die Tag-Zeile verschwindet bei leerer Tag-Liste komplett.
 * - Der Fallbacktext fehlt oder echte Tags werden nicht mehr ausgegeben.
 *
 * Ziel:
 * Das sichtbare Renderverhalten der gemeinsamen Footer-Tag-Zeile für Leer- und Belegt-Zustände absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/tag-badge", () => ({
  TagBadge: ({ tag }: { tag: { name: string } }) => <span>{tag.name}</span>,
}));

import { EntityTagFooterRow } from "../../../client/src/components/ui/entity-tag-footer-row";

describe("EntityTagFooterRow render", () => {
  it("zeigt bei leerer Tag-Liste den sichtbaren Fallbacktext", () => {
    const markup = renderToStaticMarkup(
      <EntityTagFooterRow tags={[]} testId="empty-tags-row" />,
    );

    expect(markup).toContain("empty-tags-row");
    expect(markup).toContain("Keine Tags");
    expect(markup).toContain("text-slate-400");
  });

  it("rendert vorhandene Tags weiter als sichtbare Footer-Badges", () => {
    const markup = renderToStaticMarkup(
      <EntityTagFooterRow
        tags={[
          { id: 1, name: "Montage", color: "#123456", isDefault: false, version: 1 },
        ]}
        testId="filled-tags-row"
      />,
    );

    expect(markup).toContain("filled-tags-row");
    expect(markup).toContain("Montage");
    expect(markup).not.toContain("Keine Tags");
  });
});
