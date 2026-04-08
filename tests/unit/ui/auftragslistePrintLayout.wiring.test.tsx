/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auftragslisten-Druckkarte rendert ohne Footer-Zeile.
 * - Der Header zeigt optional das Sondermaß-Tag links vor Auftragsnummer und Projektname.
 * - Rechts stehen Kundennummer und Kunde vor Tour-, Datums- und Dauerinfos.
 * - Sichtbare Projekt-, Artikel- und Beschreibungsinhalte bleiben in der Druckansicht erhalten.
 *
 * Fehlerfaelle:
 * - Der Druck-Footer bleibt sichtbar oder der Header nutzt weiter die alte Reihenfolge.
 * - Das Sondermaß-Tag fehlt trotz Datenlage oder verliert seine sichtbare Farbverdrahtung.
 *
 * Ziel:
 * Das sichtbare Header- und Footer-Layout der Auftragslisten-Druckvorschau regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuftragslistePrintLayout } from "../../../client/src/components/reports/AuftragslistePrintLayout";

describe("FT26 UI: AuftragslistePrintLayout wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders the reordered header without a footer row", () => {
    const html = renderToStaticMarkup(
      <AuftragslistePrintLayout
        categories={[
          { id: 10, name: "Fass Saunen" },
          { id: 20, name: "Fenster" },
        ]}
        items={[
          {
            projectId: 1,
            customerId: 2,
            appointmentId: 3,
            projectName: "Projekt Alpha",
            orderNumber: "ORD-001",
            customerNumber: "C-001",
            customerFullName: "Kunde Alpha",
            actualDate: "2099-11-05",
            durationDays: 2,
            tourName: "Tour Nord",
            employees: [{ id: 8, fullName: "Max Muster" }],
            customerNotesCount: 1,
            projectNotesCount: 2,
            appointmentNotesCount: 3,
            notesCount: 6,
            customerAttachmentsCount: 1,
            projectAttachmentsCount: 1,
            appointmentAttachmentsCount: 1,
            attachmentsCount: 3,
            tags: [
              { id: 6, name: "Info", color: "#2563eb", isDefault: false, version: 1 },
              { id: 7, name: "Sondermaß", color: "#1e3a8a", isDefault: false, version: 1 },
            ],
            articleValues: [
              { categoryId: 10, value: "Sauna Alpha" },
              { categoryId: 20, value: "Fenster Breit" },
            ],
            projectDescription: "Beschreibung Alpha",
          },
        ]}
      />,
    );

    expect(html).toContain("C-001");
    expect(html).toContain("Kunde Alpha");
    expect(html).toContain("ORD-001");
    expect(html).toContain("Projekt Alpha");
    expect(html).toContain("Tour Nord");
    expect(html).toContain("05.11.2099");
    expect(html).toContain("2 Tage");
    expect(html).toContain("Sondermaß");
    expect(html).toContain("background-color:#1e3a8a");
    expect(html).toContain("Sauna");
    expect(html).toContain("Sauna Alpha");
    expect(html).toContain("Fenster");
    expect(html).toContain("Fenster Breit");
    expect(html).toContain("Beschreibung Alpha");
    expect(html).not.toContain(">Info<");
    expect(html).not.toContain("Max Muster");
    expect(html).not.toContain("Notizen 6");
    expect(html).not.toContain("Anhänge 3");
  });
});
