/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - PrintSlimHeader rendert das Label allein oder mit Kontext in einer Zeile.
 *
 * Fehlerfaelle:
 * - Das Kontext-Layout verliert den Gedankenstrich.
 * - Das optionale Test-Id Attribut fehlt.
 *
 * Ziel:
 * Das schlanke Header-Primitive fuer aktive Druckseiten isoliert absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintSlimHeader } from "../../../client/src/components/print/PrintSlimHeader";

describe("PrintSlimHeader", () => {
  it("rendert das Label", () => {
    const html = renderToStaticMarkup(<PrintSlimHeader label="Tourplan" />);

    expect(html).toContain("Tourplan");
  });

  it("rendert label und context in einer Zeile", () => {
    const html = renderToStaticMarkup(<PrintSlimHeader label="Tourplan" context="Tour 1" />);

    expect(html).toContain("Tourplan — Tour 1");
  });

  it("setzt testId wenn uebergeben", () => {
    const html = renderToStaticMarkup(<PrintSlimHeader label="Tourplan" testId="print-slim-header" />);

    expect(html).toContain('data-testid="print-slim-header"');
  });
});
