/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - PrintSlimFooter rendert die Seitennummer im schlanken Footer.
 *
 * Fehlerfaelle:
 * - Die Seitennummer wird nicht formatiert.
 * - Das optionale Test-Id Attribut fehlt.
 *
 * Ziel:
 * Das schlanke Footer-Primitive fuer aktive Druckseiten isoliert absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintSlimFooter } from "../../../client/src/components/print/PrintSlimFooter";

describe("PrintSlimFooter", () => {
  it("rendert die Seitennummer", () => {
    const html = renderToStaticMarkup(<PrintSlimFooter pageNumber={3} />);

    expect(html).toContain("Seite 3");
  });

  it("setzt testId wenn uebergeben", () => {
    const html = renderToStaticMarkup(<PrintSlimFooter pageNumber={2} testId="print-slim-footer" />);

    expect(html).toContain('data-testid="print-slim-footer"');
  });
});
