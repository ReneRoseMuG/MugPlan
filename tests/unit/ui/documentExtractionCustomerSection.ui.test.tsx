/**
 * Test Scope:
 *
 * Feature: FT21 - DocumentExtractionCustomerSection UI
 *
 * Abgedeckte Regeln:
 * - Die editierbare Customer-Section rendert das neue Feld `Land`.
 * - Das Land-Feld bleibt im gleichen Formularblock wie PLZ und Ort sichtbar.
 *
 * Fehlerfaelle:
 * - Das extrahierte Kundenfeld `country` fehlt trotz erkanntem Land im Dialogformular.
 *
 * Ziel:
 * Das sichtbare Land-Feld im Doc-Extract-Kundenformular regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DocumentExtractionCustomerSection,
  type ExtractionCustomerEditableFields,
} from "../../../client/src/components/document-extraction/DocumentExtractionCustomerSection";

describe("FT21 document extraction customer section ui", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders the country field in the editable customer form", () => {
    const value: ExtractionCustomerEditableFields = {
      customerNumber: "160673",
      firstName: "Tom",
      lastName: "Voosen",
      company: "",
      email: "",
      phone: "00352-621222479",
      addressLine1: "1 Tommesknapp",
      postalCode: "7419",
      city: "Brouch",
      country: "Luxemburg",
    };

    const html = renderToStaticMarkup(
      <DocumentExtractionCustomerSection
        value={value}
        onChange={() => undefined}
      />,
    );

    expect(html).toContain("Kundendaten");
    expect(html).toContain("Land");
    expect(html).toContain("input-doc-extract-country");
    expect(html).toContain("Luxemburg");
  });
});
