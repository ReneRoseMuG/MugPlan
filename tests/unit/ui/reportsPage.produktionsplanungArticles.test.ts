/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die gemeinsame Produktionsplanung-Artikellogik gruppiert Werte stabil nach Kategorien.
 * - Die Item-Ableitung erzeugt pro Einzelwert ein `label: value`-Paar fuer den Renderer.
 * - Produktkategorien bleiben vor Komponentenkategorien in der Ausgabe-Reihenfolge.
 *
 * Fehlerfaelle:
 * - Die gemeinsame Helper-Schicht faellt auf einen einzigen Fliesstext pro Projekt zurueck.
 * - Leere Kategorien erscheinen als sichtbare Leerbloecke.
 * - Einzelwerte werden nicht mehr in rendererfaehige `label: value`-Paare ueberfuehrt.
 *
 * Ziel:
 * Die entdoppelte Artikellisten-Logik fuer Produktionsplanungskarten und Drucklayout isoliert regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";

import {
  buildProjectRowArticleGroups,
  buildProjectRowArticleItems,
  resolveProjectRowArticleLabel,
} from "../../../client/src/components/reports/produktionsplanungProjectCard.shared";

const baseRow = {
  projectId: 7,
  customerId: 17,
  appointmentId: 27,
  projectName: "Projekt Test",
  orderNumber: "ORD-007",
  customerNumber: "C-007",
  customerFullName: "Kunde Test",
  actualDate: "2099-11-05",
  durationDays: 2,
  tourName: "Tour A",
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
  projectDescription: null,
} as const;

describe("FT26 UI: ReportsPage produktionsplanung article groups", () => {
  it("groups non-empty category values into highlighted row sections with one item per line", () => {
    const result = buildProjectRowArticleGroups(
      {
        ...baseRow,
        articleValues: [
          { categoryId: 10, value: "Premium IV, Premium V" },
          { categoryId: 20, value: "HUUM UKU 4.1 Local" },
          { categoryId: 30, value: "   " },
        ],
      },
      [
        { id: 10, name: "Fass Saunen" },
        { id: 30, name: "Rueckwaende" },
        { id: 20, name: "Steuerungen" },
      ],
    );

    expect(result).toEqual([
      {
        categoryId: 10,
        categoryName: "Sauna",
        items: ["Premium IV", "Premium V"],
      },
      {
        categoryId: 20,
        categoryName: "Steuerung",
        items: ["HUUM UKU 4.1 Local"],
      },
    ]);
  });

  it("maps grouped values into renderer-ready label-value items and skips empty categories", () => {
    const result = buildProjectRowArticleItems(
      {
        ...baseRow,
        articleValues: [
          { categoryId: 10, value: "Premium IV, Premium V" },
          { categoryId: 20, value: "HUUM UKU 4.1 Local" },
          { categoryId: 30, value: null },
        ],
      },
      [
        { id: 10, name: "Fass Saunen" },
        { id: 30, name: "Rueckwaende" },
        { id: 20, name: "Steuerungen" },
      ],
    );

    expect(result).toEqual([
      { label: "Sauna", value: "Premium IV" },
      { label: "Sauna", value: "Premium V" },
      { label: "Steuerung", value: "HUUM UKU 4.1 Local" },
    ]);
  });

  it("uses project article labels when a category is known and falls back to the category name otherwise", () => {
    expect(resolveProjectRowArticleLabel("Dachvarianten")).toBe("Dach");
    expect(resolveProjectRowArticleLabel("Fass Saunen")).toBe("Sauna");
    expect(resolveProjectRowArticleLabel("Sonderzubehoer")).toBe("Sonderzubehoer");
  });
});
