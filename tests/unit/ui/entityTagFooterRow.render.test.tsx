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

const useTagContainerWidthMock = vi.fn(() => 0 as 0 | 1 | 2 | 3);

vi.mock("@/hooks/useTagContainerWidth", () => ({
  useTagContainerWidth: (...args: unknown[]) => useTagContainerWidthMock(...args),
}));

vi.mock("@/components/ui/tag-badge", () => ({
  TagBadge: ({ tag, level }: { tag: { name: string }; level?: 0 | 1 | 2 | 3 }) => <span>{`${tag.name}:${level ?? "none"}`}</span>,
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
    expect(markup).toContain("text-[9px]");
    expect(markup).toContain("flex-nowrap");
    expect(markup).toContain("overflow-hidden");
  });

  it("rendert vorhandene Tags weiter als sichtbare Footer-Badges", () => {
    useTagContainerWidthMock.mockReturnValue(2);

    const markup = renderToStaticMarkup(
      <EntityTagFooterRow
        tags={[
          { id: 1, name: "Montage", color: "#123456", isDefault: false, version: 1 },
        ]}
        testId="filled-tags-row"
      />,
    );

    expect(markup).toContain("filled-tags-row");
    expect(markup).toContain("Montage:2");
    expect(markup).not.toContain("Keine Tags");
  });
});
