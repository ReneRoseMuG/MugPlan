/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Druckansicht rendert nur noch die sichtbaren Blöcke Produktionsplanung und Projekte.
 * - Projektkarten nutzen denselben gemeinsamen Kachelpfad wie die Produktionsplanung-Overlaykarten.
 * - Die alte Projekt-Tabelle und der Sonderblock-Abschnitt entfallen vollständig.
 *
 * Fehlerfälle:
 * - Die Druckansicht fällt auf Tabelle oder Sonderblock-Bereich zurück.
 * - Die Druckansicht pflegt wieder eine eigene parallele Projektkartenstruktur.
 * - Projektkarten verlieren Artikellisten oder Footer-Informationen.
 *
 * Ziel:
 * Die FT26-Druckkomponente in Isolation über statisches Markup regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({
    testId,
    fullName,
    renderMode,
  }: {
    testId?: string;
    fullName?: string;
    renderMode?: string;
  }) => (
    <div data-testid={testId ?? "employee-badge"}>
      {[fullName ?? "leer", renderMode ?? ""].join("|")}
    </div>
  ),
}));

vi.mock("@/components/notes/EntityNotesHoverPreview", () => ({
  EntityNotesHoverPreview: ({ triggerLabel }: { triggerLabel?: string }) => (
    <div data-testid="notes-hover">{triggerLabel ?? "Notizen"}</div>
  ),
}));

vi.mock("@/components/calendar/CalendarWeekAppointmentAttachmentsHover", () => ({
  CalendarWeekAppointmentAttachmentsHover: ({ totalAttachmentsCount }: { totalAttachmentsCount: number }) => (
    <div data-testid="attachments-hover">Anhänge {totalAttachmentsCount}</div>
  ),
}));

vi.mock("@/components/ui/entity-tag-footer-row", () => ({
  EntityTagFooterRow: ({ tags }: { tags: Array<{ name: string }> }) => (
    <div data-testid="tag-row">{tags.map((tag) => tag.name).join(",")}</div>
  ),
}));

import {
  buildProduktionsplanungPrintBlocks,
  paginateMeasuredProduktionsplanungPrintPages,
  ProduktionsplanungPrintLayout,
  PRODUKTIONSPLANUNG_PRINT_BLOCK_GAP_PX,
} from "../../../client/src/components/reports/ProduktionsplanungPrintLayout";

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
    expect(html).toContain("reports-produktionsplanung-project-card-1");
    expect(html).not.toContain("print-produktionsplanung-project-card-1");
    expect(html).toContain("break-inside-avoid");
    expect(html).toContain("Kunde Alpha");
    expect(html).toContain("C-001");
    expect(html).toContain("ORD-001");
    expect(html).toContain("Projekt Alpha");
    expect(html).toContain("05.11.99");
    expect(html).toContain("2 Tage");
    expect(html).toContain("Tour Nord");
    expect(html).not.toContain("Sondermaß");
    expect(html).not.toContain("Anmerkungen");
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
    expect(html).toContain("reports-produktionsplanung-project-card-1-footer-tags-column");
    expect(html).toContain("reports-produktionsplanung-project-card-1-footer-badges-column");
    expect(html).toContain("reports-produktionsplanung-project-card-1-employee-8");
    expect(html).toContain("Max Muster|compact");
    expect(html).toContain("notes-hover");
    expect(html).toContain("attachments-hover");
    expect(html).toContain("Info");
  });

  it("paginates measured production blocks without duplicating or losing project cards", () => {
    const projectRow = (projectId: number) => ({
      projectId,
      customerId: projectId + 100,
      appointmentId: projectId + 200,
      projectName: `Projekt ${projectId}`,
      orderNumber: `ORD-${projectId}`,
      customerNumber: `C-${projectId}`,
      customerFullName: `Kunde ${projectId}`,
      actualDate: "2099-11-05",
      durationDays: 1,
      tourName: "Tour Nord",
      employees: [],
      customerNotesCount: 0,
      projectNotesCount: 0,
      appointmentNotesCount: 0,
      notesCount: 0,
      customerAttachmentsCount: 0,
      projectAttachmentsCount: 0,
      appointmentAttachmentsCount: 0,
      attachmentsCount: 0,
      tags: [],
      reportCardReasonTags: [],
      articleValues: [],
      projectDescription: `Lange Druckbeschreibung ${projectId}`,
    });

    const blocks = buildProduktionsplanungPrintBlocks({
      productCategoryGroups: [{
        categoryId: 10,
        categoryName: "Fass Saunen",
        items: [{ itemName: "Sauna Alpha", totalQuantity: 3 }],
      }],
      componentCategoryGroups: [],
      projectRows: [projectRow(1), projectRow(2), projectRow(3)],
    }, [{ categoryId: 10, block: 1, columns: 1 }]);
    const blockHeights = Object.fromEntries(blocks.map((block) => [
      block.key,
      block.kind === "project" ? 220 : 80,
    ]));

    const pages = paginateMeasuredProduktionsplanungPrintPages(blocks, 360, blockHeights);
    const printedKeys = pages.flatMap((page) => page.blocks.map((block) => block.key));
    const expectedKeys = blocks.map((block) => block.key);

    expect(pages.length).toBeGreaterThan(1);
    expect(printedKeys).toEqual(expectedKeys);
    for (const page of pages) {
      const usedHeight = page.blocks.reduce((sum, block, index) => (
        sum + blockHeights[block.key] + (index > 0 ? PRODUKTIONSPLANUNG_PRINT_BLOCK_GAP_PX : 0)
      ), 0);
      expect(usedHeight).toBeLessThanOrEqual(360);
    }
  });
});
