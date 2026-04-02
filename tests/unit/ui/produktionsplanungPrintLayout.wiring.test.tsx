/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Druckansicht rendert die drei sichtbaren Bloecke Produktionsplanung, Projektliste und Sonderbloecke.
 * - Die Projektliste rendert genau eine Tabellenzeile pro uebergebenem Projekt mit fortlaufendem Index.
 * - Sonderbloecke erscheinen nur fuer Projekte mit matchedSonderblockTagIds.
 *
 * Fehlerfaelle:
 * - Die Druckansicht verliert einen ihrer Hauptabschnitte.
 * - Die Projektliste rendert nicht alle uebergebenen Projekte oder verliert Index/Tour/Kategorieinhalte.
 * - Projekte ohne Sonderblock-Tags landen trotzdem im Sonderblock-Bereich.
 *
 * Ziel:
 * Die vorhandene Produktionsplanung-Druckkomponente in Isolation ueber statisches Markup regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProduktionsplanungPrintLayout } from "../../../client/src/components/reports/ProduktionsplanungPrintLayout";

describe("FT26/FT32 UI: ProduktionsplanungPrintLayout wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders the visible print sections with one project row per entry and selective sonderbloecke", () => {
    const html = renderToStaticMarkup(
      <ProduktionsplanungPrintLayout
        categories={[
          { id: 10, name: "Fass Saunen" },
          { id: 20, name: "Fenster" },
        ]}
        data={{
          productCategoryGroups: [
            {
              categoryId: 10,
              categoryName: "Fass Saunen",
              items: [{ itemName: "Sauna Alpha", totalQuantity: 5 }],
            },
          ],
          componentCategoryGroups: [
            {
              categoryId: 20,
              categoryName: "Fenster",
              items: [{ itemName: "Fenster Breit", totalQuantity: 3 }],
            },
          ],
          specialMeasureProjects: [],
          projectRows: [
            {
              projectId: 1,
              projectName: "Projekt Alpha",
              orderNumber: "ORD-001",
              actualDate: "2099-11-05",
              tourName: "Tour Nord",
              articleValues: [
                { categoryId: 10, value: "Sauna Alpha" },
                { categoryId: 20, value: "Fenster Breit" },
              ],
              projectDescription: "Beschreibung Alpha",
              matchedSonderblockTagIds: [7],
            },
            {
              projectId: 2,
              projectName: "Projekt Beta",
              orderNumber: "ORD-002",
              actualDate: "2099-11-06",
              tourName: null,
              articleValues: [
                { categoryId: 10, value: "Sauna Beta" },
                { categoryId: 20, value: null },
              ],
              projectDescription: "Beschreibung Beta",
              matchedSonderblockTagIds: [],
            },
            {
              projectId: 3,
              projectName: "Projekt Gamma",
              orderNumber: "ORD-003",
              actualDate: "2099-11-07",
              tourName: "Tour Sued",
              articleValues: [
                { categoryId: 10, value: null },
                { categoryId: 20, value: "Fenster Panorama" },
              ],
              projectDescription: "Beschreibung Gamma",
              matchedSonderblockTagIds: [8, 9],
            },
          ],
        }}
      />,
    );

    expect(html).toContain("Produktionsplanung");
    expect(html).toContain("Projektliste");
    expect(html).toContain("Sonderblöcke");
    expect(html).toContain("Fass Saunen");
    expect(html).toContain("Fenster");
    expect(html).toContain("Tatsächlicher Termin");
    expect(html).toContain("Projekt / Auftragsnummer");
    expect(html).toContain("Tour Nord");
    expect(html).toContain("Tour Sued");
    expect(html).toContain("Projekt Alpha / ORD-001");
    expect(html).toContain("Projekt Beta / ORD-002");
    expect(html).toContain("Projekt Gamma / ORD-003");
    expect(html).toContain("05.11.2099");
    expect(html).toContain("06.11.2099");
    expect(html).toContain("07.11.2099");
    expect(html).toContain("Sauna Alpha");
    expect(html).toContain("Fenster Panorama");
    expect(html).not.toContain("Kunde Unsichtbar");

    expect(html.match(/<tr/g)?.length).toBe(4);
    expect(html.match(/<td class="border-b border-slate-200 px-2 py-2 whitespace-nowrap">1<\/td>/g)?.length).toBe(1);
    expect(html.match(/<td class="border-b border-slate-200 px-2 py-2 whitespace-nowrap">2<\/td>/g)?.length).toBe(1);
    expect(html.match(/<td class="border-b border-slate-200 px-2 py-2 whitespace-nowrap">3<\/td>/g)?.length).toBe(1);

    expect(html).toContain("#1 - 05.11.2099 - Projekt Alpha");
    expect(html).toContain("#2 - 07.11.2099 - Projekt Gamma");
    expect(html).toContain("Beschreibung Alpha");
    expect(html).toContain("Beschreibung Gamma");
    expect(html).not.toContain("#3 - 06.11.2099 - Projekt Beta");
  });
});



