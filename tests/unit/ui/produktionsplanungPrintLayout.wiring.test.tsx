/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Druckansicht rendert nur noch die sichtbaren Bloecke Produktionsplanung und Projekte.
 * - Projektkarten zeigen Kopf, Gruende, Artikellisten und statischen Footer mit Mitarbeitern/Badges.
 * - Die alte Projekt-Tabelle und der Sonderblock-Abschnitt entfallen vollstaendig.
 *
 * Fehlerfaelle:
 * - Die Druckansicht faellt auf Tabelle oder Sonderblock-Bereich zurueck.
 * - Projektkarten verlieren Gruende, Artikellisten oder Footer-Informationen.
 *
 * Ziel:
 * Die FT26-Druckkomponente in Isolation ueber statisches Markup regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProduktionsplanungPrintLayout } from "../../../client/src/components/reports/ProduktionsplanungPrintLayout";

describe("FT26 UI: ProduktionsplanungPrintLayout wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders category blocks and project cards without legacy table sections", () => {
    const html = renderToStaticMarkup(
      <ProduktionsplanungPrintLayout
        categories={[
          { id: 10, name: "Fass Saunen" },
          { id: 20, name: "Fenster" },
        ]}
        layoutConfig={[
          { categoryId: 10, block: 1, columns: 1 },
          { categoryId: 20, block: 1, columns: 2 },
        ]}
        data={{
          productCategoryGroups: [
            {
              categoryId: 10,
              categoryName: "Fass Saunen",
              items: [
                { itemName: "Sauna Zeta", totalQuantity: 5 },
                { itemName: "Sauna Alpha", totalQuantity: 3 },
                { itemName: "Sauna Beta", totalQuantity: 4 },
              ],
            },
          ],
          componentCategoryGroups: [
            {
              categoryId: 20,
              categoryName: "Fenster",
              items: [
                { itemName: "Fenster Breit", totalQuantity: 3 },
                { itemName: "Fenster Schmal", totalQuantity: 2 },
              ],
            },
          ],
          projectRows: [
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
              projectNotesCount: 1,
              appointmentNotesCount: 1,
              notesCount: 3,
              customerAttachmentsCount: 0,
              projectAttachmentsCount: 1,
              appointmentAttachmentsCount: 0,
              attachmentsCount: 1,
              tags: [{ id: 6, name: "Info", color: "#2563eb", isDefault: false, version: 1 }],
              reportCardReasonTags: [
                { id: 7, name: "Sondermaß", color: "#1e3a8a", isDefault: false, version: 1 },
                { id: 9, name: "Anmerkungen", color: "#2563eb", isDefault: false, version: 1 },
              ],
              articleValues: [
                { categoryId: 10, value: "Sauna Alpha, Sauna Beta" },
                { categoryId: 20, value: "Fenster Breit" },
              ],
              projectDescription: "Beschreibung Alpha",
            },
          ],
        }}
      />,
    );

    expect(html).toContain("Produktionsplanung");
    expect(html).toContain("Projekte");
    expect(html).not.toContain("Projektliste");
    expect(html).not.toContain("Sonderblöcke");
    expect(html).toContain("Kunde Alpha");
    expect(html).toContain("C-001");
    expect(html).toContain("ORD-001");
    expect(html).toContain("Projekt Alpha");
    expect(html).toContain("05.11.99");
    expect(html).toContain("2 Tage");
    expect(html).toContain("Tour Nord");
    expect(html).toContain("Sondermaß");
    expect(html).toContain("Anmerkungen");
    expect(html).toContain("Beschreibung Alpha");
    expect(html).toContain("<li");
    expect(html).toContain("Sauna");
    expect(html).toContain("Sauna Alpha");
    expect(html).toContain("Sauna Beta");
    expect(html).toContain("Fenster");
    expect(html).toContain("Fenster Breit");
    expect(html).toContain("Fenster Schmal");
    expect(html).toContain("grid grid-cols-3 gap-4");
    expect(html).toContain("col-span-1");
    expect(html).toContain("col-span-2");
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("Max Muster");
    expect(html).toContain("Notizen 3");
    expect(html).toContain("Anhänge 1");
    expect(html).toContain("Info");
  });
});
