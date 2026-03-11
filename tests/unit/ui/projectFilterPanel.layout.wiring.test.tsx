/**
 * Test Scope:
 *
 * Feature: FT02 - Projektlistenfilter Layout
 *
 * Abgedeckte Regeln:
 * - Projektname steht in derselben Zeile wie Nachname, Kundennummer, Auftragsnummer, Switches und Statusfilter ganz links.
 * - Filterpanel-Headlines fuer Projektfilter und Kundenfilter werden nicht mehr gerendert.
 * - Projektname und Nachname sind auf 20 Zeichen, Kundenummer und Auftragsnummer auf 8 Zeichen begrenzt.
 * - Kundennummer und Auftragsnummer bleiben als sichtbare Labels erhalten und nutzen den Placeholder "Suche: Nr.".
 *
 * Fehlerfaelle:
 * - Projektname bleibt in einer separaten Filterzeile.
 * - Projektfilter/Kundenfilter erscheinen weiter als sichtbare Headlines.
 * - Feldbreiten laufen wieder ungebremst auseinander.
 * - Switches oder Statusfilter fallen wieder in eine zweite Zeile zurueck.
 *
 * Ziel:
 * Das refaktorierte Projektfilter-Layout regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02 UI: project filter panel layout wiring", () => {
  const panelSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/filter-panels/project-filter-panel.tsx"),
    "utf8",
  );
  const titleFilterSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/filters/project-title-filter-input.tsx"),
    "utf8",
  );
  const customerNumberFilterSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/filters/customer-number-filter-input.tsx"),
    "utf8",
  );
  const orderNumberFilterSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/filters/project-order-number-filter-input.tsx"),
    "utf8",
  );
  const searchFilterSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/search-filter-input.tsx"),
    "utf8",
  );

  it("uses project name as the left-most field in the shared customer filter row", () => {
    const projectIndex = panelSource.indexOf("<ProjectTitleFilterInput");
    const nameIndex = panelSource.indexOf("<CustomerNameFilterInput");
    const numberIndex = panelSource.indexOf("<CustomerNumberFilterInput");
    const orderIndex = panelSource.indexOf("<ProjectOrderNumberFilterInput");

    expect(projectIndex).toBeGreaterThan(-1);
    expect(nameIndex).toBeGreaterThan(-1);
    expect(numberIndex).toBeGreaterThan(-1);
    expect(orderIndex).toBeGreaterThan(-1);
    expect(panelSource.indexOf('id="project-scope-all"')).toBeGreaterThan(orderIndex);
    expect(panelSource.indexOf("<ProjectStatusFilterInput")).toBeGreaterThan(panelSource.indexOf('id="project-scope-no-appointments"'));
    expect(projectIndex).toBeLessThan(nameIndex);
    expect(nameIndex).toBeLessThan(numberIndex);
    expect(numberIndex).toBeLessThan(orderIndex);
  });

  it("removes visible project/customer filter headlines", () => {
    expect(panelSource).not.toContain('showTitle');
    expect(panelSource).not.toContain('title="Kundenfilter"');
    expect(panelSource).not.toContain('title={title}');
  });

  it("constrains customer-related field widths and renames the project label", () => {
    expect(panelSource).toContain('className="w-full sm:min-w-[12rem] sm:max-w-[20ch]"');
    expect(panelSource).toContain('className="w-full sm:min-w-[8rem] sm:max-w-[8ch]"');
    expect(panelSource).toContain('placeholderLabel="Nr."');
    expect(panelSource).toContain('maxLength={8}');
    expect(panelSource).toContain('maxLength={20}');
    expect(titleFilterSource).toContain('label="Projektname"');
    expect(titleFilterSource).not.toContain('label="Projekttitel"');
    expect(customerNumberFilterSource).toContain('label = "Kundennummer"');
    expect(orderNumberFilterSource).toContain('label = "Auftragsnummer"');
    expect(searchFilterSource).toContain('const resolvedPlaceholder = `Suche: ${placeholderLabel ?? label}`;');
  });
});
