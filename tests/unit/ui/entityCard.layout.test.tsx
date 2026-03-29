/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - EntityCard rendert Footer-Inhalt standardmaessig versteckt.
 * - EntityCard kann den Footer sichtbar schalten.
 * - ColoredEntityCard vererbt das Footer-Verhalten ueber EntityCard.
 *
 * Fehlerfaelle:
 * - Footer ist standardmaessig sichtbar.
 * - ColoredEntityCard verliert das sichtbare Footer-Verhalten.
 *
 * Ziel:
 * Gerendertes Kartenverhalten statt Klassen-Suchen im Quelltext absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EntityCard } from "../../../client/src/components/ui/entity-card";
import { ColoredEntityCard } from "../../../client/src/components/ui/colored-entity-card";

describe("FT17 UI: EntityCard global layout", () => {
  it("keeps footer content hidden by default", () => {
    vi.stubGlobal("React", React);
    const html = renderToStaticMarkup(
      <EntityCard testId="entity-card" title="Titel" footer={<span>Footer</span>}>
        <div>Body</div>
      </EntityCard>,
    );

    expect(html).toContain("data-testid=\"entity-card\"");
    expect(html).toContain(">Titel<");
    expect(html).toContain(">Body<");
    expect(html).toContain(">Footer<");
    expect(html).toContain("hidden");
  });

  it("renders visible footer content when requested, also through ColoredEntityCard", () => {
    vi.stubGlobal("React", React);
    const html = renderToStaticMarkup(
      <ColoredEntityCard
        testId="colored-card"
        title="Titel"
        borderColor="#ff0000"
        footer={<span>Sichtbarer Footer</span>}
        footerVisibility="visible"
      >
        <div>Body</div>
      </ColoredEntityCard>,
    );

    expect(html).toContain("data-testid=\"colored-card\"");
    expect(html).toContain(">Titel<");
    expect(html).toContain(">Sichtbarer Footer<");
    expect(html).toContain("flex");
    expect(html).toContain("px-1");
  });
});
