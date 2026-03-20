/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die relationCompact-Variante zeigt nur die kompakten Felder fuer Relations-Slots.
 * - Kundennummer und PLZ werden sichtbar gekuerzt.
 * - Firma und E-Mail bleiben in der kompakten Variante ausgeblendet.
 *
 * Fehlerfaelle:
 * - Kompaktkarten zeigen wieder Firma oder E-Mail.
 * - Feldwerte werden im Slot nicht mehr auf die geforderte Laenge begrenzt.
 *
 * Ziel:
 * Sichtbares Verhalten der kompakten Kundendarstellung statt Quelltext-Details absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CustomerDetailCard } from "../../../client/src/components/ui/customer-detail-card";

describe("FT01 customer detail card compact relation variant", () => {
  it("renders only compact slot fields and truncates customer number and postal code", () => {
    const html = renderToStaticMarkup(
      <CustomerDetailCard
        testId="customer-card"
        variant="relationCompact"
        customer={{
          fullName: "Max Mustermann",
          firstName: "Max",
          lastName: "Mustermann",
          customerNumber: "12345678901234",
          company: "Firma GmbH",
          phone: "040 12345",
          email: "max@example.com",
          addressLine1: "Hauptstrasse 1",
          postalCode: "123456789",
          city: "Hamburg",
        }}
      />,
    );

    expect(html).toContain(">Kundennr.<");
    expect(html).toContain(">Vorname<");
    expect(html).toContain(">Name<");
    expect(html).toContain(">Telefon<");
    expect(html).toContain(">Adresse<");
    expect(html).toContain(">PLZ<");
    expect(html).toContain(">Ort<");
    expect(html).toContain(">1234567890<");
    expect(html).toContain(">123456<");
    expect(html).not.toContain(">Firma<");
    expect(html).not.toContain(">E-Mail<");
  });
});
