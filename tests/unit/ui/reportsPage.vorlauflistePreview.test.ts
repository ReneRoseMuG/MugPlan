/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Vorlaufliste baut fuer Tabellenzeilen denselben Projekt-Preview-Datensatz wie die Projekttabelle.
 * - Der Projekt-Aktivstatus bleibt im Preview-Datensatz erhalten.
 * - Das optionale Kundenfeld `country` bleibt im Preview-Projekt erhalten.
 * - Mehrzeilige Report-Zelltexte bleiben auf drei Zeilen begrenzt.
 *
 * Fehlerfaelle:
 * - Der Report-Preview verliert Projekt-, Kunden- oder Artikelkontext.
 * - Der Aktivstatus geht zwischen Report-Payload und Preview verloren.
 * - Das neue Kundenfeld `country` geht im Preview-Mapping verloren.
 * - Der visuelle Zeilen-Clamp wird versehentlich entfernt.
 */
import { describe, expect, it } from "vitest";

import {
  buildVorlauflistePreviewProject,
  VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME,
  type VorlauflistePreviewItem,
} from "../../../client/src/components/reports/vorlauflistePreview";

describe("FT26 UI: Vorlaufliste preview helpers", () => {
  it("builds project table preview data from a vorlaufliste row", () => {
    const row: VorlauflistePreviewItem = {
      projectId: 31,
      projectName: "Report Projekt",
      isActive: true,
      orderNumber: " REP-31 ",
      customerId: 7,
      customerNumber: " K-31 ",
      tags: [],
      customerFullName: "Kunde Drei Eins",
      postalCode: "26135",
      city: "Oldenburg",
      country: "Deutschland",
      articleValues: [
        { categoryId: 1, value: " Sehr langes Produkt mit vielen Worten " },
        { categoryId: 2, value: "Panorama Fenster Extra Breit" },
        { categoryId: 999, value: "Wird ignoriert" },
        { categoryId: 1, value: "   " },
      ],
      projectDescription: "Ein extrem langer Beschreibungstext fuer die Vorlaufliste",
      notesCount: 4,
      plannedAppointmentsCount: 2,
      attachmentsCount: 1,
    };

    expect(buildVorlauflistePreviewProject(
      row,
      [{ id: 1, name: "Fass Saunen" }],
      [{ id: 2, name: "Fenster" }],
    )).toEqual({
      id: 31,
      name: "Report Projekt",
      isActive: true,
      orderNumber: "REP-31",
      descriptionMd: "Ein extrem langer Beschreibungstext fuer die Vorlaufliste",
      notesCount: 4,
      plannedAppointmentsCount: 2,
      attachmentsCount: 1,
      tags: [],
      customer: {
        id: 7,
        customerNumber: "K-31",
        fullName: "Kunde Drei Eins",
        postalCode: "26135",
        city: "Oldenburg",
        country: "Deutschland",
      },
      projectArticleItems: [
        { label: "Fass Saunen", value: "Sehr langes Produkt mit vielen Worten" },
        { label: "Fenster", value: "Panorama Fenster Extra Breit" },
      ],
    });
  });

  it("keeps wrapped report text clamped to three lines", () => {
    expect(VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME).toContain("[-webkit-line-clamp:3]");
    expect(VORLAUFLISTE_WRAPPED_TEXT_CLASSNAME).toContain("[display:-webkit-box]");
  });
});
