/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - AppointmentCountBadge rendert standardmaessig das Label "Geplante Termine".
 * - Ein explizites Label ueberschreibt den Standardtext fuer kontextspezifische Karten.
 *
 * Fehlerfaelle:
 * - Das Tour-spezifische Label wird ignoriert.
 * - Der Standardtext geht durch die Erweiterung verloren.
 *
 * Ziel:
 * Das sichtbare Renderverhalten des AppointmentCountBadge fuer Standard- und Override-Label absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentCountBadge } from "../../../client/src/components/ui/appointment-count-badge";

describe("AppointmentCountBadge render", () => {
  it("zeigt standardmaessig den Text 'Geplante Termine'", () => {
    const markup = renderToStaticMarkup(<AppointmentCountBadge count={3} />);

    expect(markup).toContain("Geplante Termine");
    expect(markup).toContain(">3<");
  });

  it("uebernimmt ein explizites Label fuer Tourkarten", () => {
    const markup = renderToStaticMarkup(<AppointmentCountBadge count={2} label="Termine" />);

    expect(markup).toContain("Termine");
    expect(markup).not.toContain("Geplante Termine");
    expect(markup).toContain(">2<");
  });
});
