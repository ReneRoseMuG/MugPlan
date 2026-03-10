/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Artikellistenzeilen werden aus den gepflegten Produktslots in stabiler Reihenfolge erzeugt.
 * - Persistierte Projektbeschreibung trennt Artikelliste und Beschreibung ueber sichtbare H2-Abschnitte.
 * - Beim Oeffnen des Formulars wird nur der Beschreibungsteil in den Editor zurueckgefuehrt.
 *
 * Fehlerfälle:
 * - Artikelliste wird leer oder in falscher Reihenfolge gespeichert.
 * - Editor liest beim Oeffnen den Artikellistenblock erneut mit ein.
 *
 * Ziel:
 * Die neue Trennung zwischen Artikelliste und Beschreibungseditor fachlich absichern.
 */
import { describe, expect, it } from "vitest";
import {
  buildPersistedProjectDescription,
  buildProjectArticleLines,
  createEmptyProjectProductSelections,
  extractEditorDescriptionHtml,
} from "../../../client/src/lib/project-product-form";

describe("project product form description helpers", () => {
  it("builds article lines in slot order", () => {
    const selections = createEmptyProjectProductSelections();
    selections.saunaModel.componentName = "Modell S";
    selections.oven.componentName = "Ofen X";
    selections.window.componentName = "Panoramafenster";

    expect(buildProjectArticleLines(selections)).toEqual([
      "Saunamodell: Modell S",
      "Ofen: Ofen X",
      "Fenster: Panoramafenster",
    ]);
  });

  it("persists article list and description with visible section headings", () => {
    const selections = createEmptyProjectProductSelections();
    selections.saunaModel.componentName = "Modell S";

    const persisted = buildPersistedProjectDescription(selections, "<p>Freie Beschreibung</p>");

    expect(persisted).toContain("<h2>Artikelliste</h2>");
    expect(persisted).toContain("Saunamodell: Modell S");
    expect(persisted).toContain("<h2>Beschreibung</h2><p>Freie Beschreibung</p>");
  });

  it("extracts only the description section back into the editor", () => {
    const persisted = "<h2>Artikelliste</h2><ul><li>Ofen: X</li></ul><h2>Beschreibung</h2><p>Nur Editor</p>";
    expect(extractEditorDescriptionHtml(persisted)).toBe("<p>Nur Editor</p>");
  });
});
